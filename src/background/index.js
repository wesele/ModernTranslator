import EventEmitter from "eventemitter3";
import createDebug from "debug";
import invert from "lodash/invert";
import pick from "lodash/pick";
import noop from "lodash/noop";
import { c as TranslatorBase, f as normalizeText } from "../services/base/TranslatorBase.js";
import {
  googleTranslator,
  translateGoogleChromeExt,
} from "../services/translators/providers/google.js";
import { microsoftTranslator } from "../services/translators/providers/microsoft.js";
import { T as callMicrosoftTranslate } from "../services/translators/providers/microsoftClient.js";
import { g2 as defaultOptions, Ne as secondaryOptions } from "../shared/constants/defaults.js";
import { VI as ServiceId } from "../shared/constants/services.js";
import { A as watchStorage } from "../shared/storage/watchStorage.js";
import { _ as sendMessage, x as onMessage } from "../shared/messaging/index.js";
import { _ as abortTimeout } from "../shared/utils/abortTimeout.js";
import * as errors from "../shared/errors/index.js";
import { registerLlmBatchStreamHandler } from "./llmBatchStream.js";
import { runWithLlmConcurrency } from "./llmConcurrency.js";
import { extractApiErrorMessage, isLikelyApiErrorText } from "../shared/llmErrorUtils.js";
import {
  DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY,
  DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY,
  OFFICIAL_LLM_BASE_URL,
  OFFICIAL_LLM_NAME,
  OFFICIAL_LLM_PORTAL_URL,
  isCustomOpenAIServiceId,
  normalizeLlmConcurrency,
  resolveChatCompletionsUrl,
} from "../shared/openaiUtils.js";
import {
  t,
  getUiLocale,
  getServiceDisplayName,
  subscribeUiLocale,
} from "../shared/i18n/index.js";
import {
  lookupSingleTranslationCache,
  saveSingleTranslationCache,
  lookupBatchTranslationCache,
  saveBatchTranslationCache,
  getTranslationCacheStats,
  clearTranslationCache,
} from "./translationCache.js";
import { fetchBilibiliSubtitles, parseBilibiliVideoUrl } from "../shared/bilibiliSubtitle.js";
import {
  fetchYouTubeSubtitles,
  fetchYouTubeSingleTrack,
  parseYouTubeVideoUrl,
} from "../shared/youtubeSubtitle.js";
import {
  extractClassroomVocabulary,
  registerClassroomStreamHandler,
} from "./languageClassroom.js";
import { writeToClipboard, playWithAudio, playWithSpeech } from "../shared/domMedia.js";

// Forward iframe selection messages between frames
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.action !== "forward between frames") return;
  const tabId = sender.tab?.id;
  if (tabId == null) return;
  if (msg.target === "top") {
    chrome.tabs.sendMessage(tabId, msg, { frameId: 0 }).catch(noop);
  } else {
    chrome.tabs.sendMessage(tabId, msg).catch(noop);
  }
});

// Auto-full-text-translate mode store per tab/window
const aftrLog = createDebug("@hcfyapp/aftr");
function removeArrItem(arr, item) {
  const idx = arr.indexOf(item);
  if (idx >= 0) arr.splice(idx, 1);
  return idx;
}
function pushUnique(arr, item) {
  if (!arr.includes(item)) arr.push(item);
}

let memoryAutoStore = { tabIds: [], winIds: [] };
const autoModeStore = new (class extends EventEmitter {
  async getData() {
    if (chrome.storage?.session) {
      return (
        (await chrome.storage.session.get("AutoStore")).AutoStore ?? {
          tabIds: [],
          winIds: [],
        }
      );
    }
    return {
      tabIds: [...memoryAutoStore.tabIds],
      winIds: [...memoryAutoStore.winIds],
    };
  }
  setData(data) {
    if (chrome.storage?.session) {
      return chrome.storage.session.set({ AutoStore: data });
    }
    memoryAutoStore = {
      tabIds: [...data.tabIds],
      winIds: [...data.winIds],
    };
    return Promise.resolve();
  }
  async #clearWindowTabs(windowId) {
    const tabs = await chrome.tabs.query({ windowId });
    const data = await this.getData();
    tabs.forEach((tab) => {
      if (tab.id != null) removeArrItem(data.tabIds, tab.id);
    });
    await this.setData(data);
  }
  async getMode(tabInfo) {
    const data = await this.getData();
    if (data.winIds.includes(tabInfo.windowId)) return "window";
    if (data.tabIds.includes(tabInfo.id)) return "tab";
    return "close";
  }
  async setMode(tabInfo, mode) {
    const data = await this.getData();
    const prev = await this.getMode(tabInfo);
    switch (mode) {
      case "close":
        removeArrItem(data.winIds, tabInfo.windowId);
        removeArrItem(data.tabIds, tabInfo.id);
        if (prev === "window") this.emit("change-other-tabs-to", tabInfo, "close");
        break;
      case "window":
        pushUnique(data.winIds, tabInfo.windowId);
        removeArrItem(data.tabIds, tabInfo.id);
        this.#clearWindowTabs(tabInfo.windowId).catch(noop);
        this.emit("change-other-tabs-to", tabInfo, "window");
        break;
      case "tab":
        pushUnique(data.tabIds, tabInfo.id);
        removeArrItem(data.winIds, tabInfo.windowId);
        if (prev === "window") this.emit("change-other-tabs-to", tabInfo, "close");
        break;
    }
    await this.setData(data);
  }
})();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!sender.tab || sender.tab.id == null) return;
  if (typeof msg !== "object" || msg === null || !("__aftrMessage__" in msg)) return;
  const tabInfo = { id: sender.tab.id, windowId: sender.tab.windowId };
  switch (msg.__aftrAction__) {
    case "getMode":
      autoModeStore.getMode(tabInfo).then((res) => sendResponse(res));
      return true;
    case "setMode":
      autoModeStore.setMode(tabInfo, msg.__aftrPayload__).then(() => sendResponse());
      return true;
  }
});

autoModeStore.on("change-other-tabs-to", async (tabInfo, mode) => {
  aftrLog("通知同窗口其他标签页更新自动模式：%s", mode);
  const tabs = await chrome.tabs.query({ windowId: tabInfo.windowId });
  tabs.forEach((tab) => {
    if (tab.id != null && tab.id !== tabInfo.id) {
      chrome.tabs
        .sendMessage(tab.id, {
          __aftrMessage__: true,
          __aftrAction__: "setMode",
          __aftrPayload__: mode,
        })
        .catch(noop);
    }
  });
});

// Direct OpenAI-compatible request helper
async function requestOpenAIChatDirect({
  endpoint,
  apiKey,
  model,
  content,
  serviceName,
  sourceText = "",
}) {
  const headers = { "Content-Type": "application/json" };
  const trimmedKey = String(apiKey || "").trim();
  if (trimmedKey) {
    headers.Authorization = `Bearer ${trimmedKey}`;
  }
  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content }],
      }),
    });
  } catch (err) {
    throw new errors.Fw(
      t("error.networkFailed", { name: serviceName, msg: err?.message || err })
    );
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          detail =
            extractApiErrorMessage(json) ||
            json?.error?.message ||
            json?.message ||
            text.slice(0, 200);
        } catch {
          detail = text.slice(0, 200);
        }
      }
    } catch {
      // ignore read failure
    }
    throw new errors.Fw(t("error.serverReturned", { name: serviceName, detail }), {
      type: res.status === 401 || res.status === 403 ? errors.VC.NEED_KEY : errors.VC.API_SERVER_ERROR,
    });
  }
  const rawText = await res.text();
  let json;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new errors.Fw(
      t("error.serverReturned", {
        name: serviceName,
        detail: rawText.slice(0, 200) || `HTTP ${res.status}`,
      }),
      { type: errors.VC.API_SERVER_ERROR }
    );
  }
  const apiErr = extractApiErrorMessage(json);
  if (apiErr) {
    throw new errors.Fw(
      t("error.serverReturned", { name: serviceName, detail: apiErr.slice(0, 240) }),
      { type: errors.VC.API_SERVER_ERROR }
    );
  }
  const msgContent = json?.choices?.[0]?.message?.content;
  if (typeof msgContent === "string" && isLikelyApiErrorText(msgContent, sourceText)) {
    throw new errors.Fw(
      t("error.serverReturned", {
        name: serviceName,
        detail: msgContent.trim().slice(0, 240),
      }),
      { type: errors.VC.API_SERVER_ERROR }
    );
  }
  return json;
}

const officialLlmTranslator = new (class extends TranslatorBase {
  constructor() {
    super({
      id: ServiceId.OfficialLLM,
      name: OFFICIAL_LLM_NAME,
    });
  }
  async call(req) {
    const stored = await chrome.storage.local.get({
      officialLLMBaseUrl: OFFICIAL_LLM_BASE_URL,
      officialLLMKey: "",
      officialLLMModel: "",
      officialLLMPrompt: "",
      officialLLMMaxConcurrency:
        defaultOptions.officialLLMMaxConcurrency ?? DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY,
    });
    const apiKey = String(stored.officialLLMKey || "").trim();
    if (!apiKey) {
      throw new errors.Fw(t("error.officialNeedKey"), {
        type: errors.VC.NEED_KEY,
      });
    }
    const model = String(stored.officialLLMModel || "").trim();
    if (!model) {
      throw new errors.Fw(t("error.officialNeedModel"), {
        type: errors.VC.NEED_KEY,
      });
    }
    const promptTpl = stored.officialLLMPrompt || "将下面的文本翻译为{{target}}：\n{{text}}";
    if (stored.officialLLMPrompt && !stored.officialLLMPrompt.includes("{{text}}")) {
      throw new errors.Fw(t("error.promptMissingText"), {
        type: errors.VC.OTHER,
      });
    }
    const content = promptTpl
      .replaceAll("{{text}}", req.text)
      .replaceAll("{{target}}", req.destination);
    const endpoint = resolveChatCompletionsUrl(
      stored.officialLLMBaseUrl || OFFICIAL_LLM_BASE_URL,
      `${OFFICIAL_LLM_BASE_URL}/chat/completions`
    );
    const maxConcurrency = normalizeLlmConcurrency(
      stored.officialLLMMaxConcurrency,
      DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY
    );
    return runWithLlmConcurrency(
      {
        apiCode: ServiceId.OfficialLLM,
        maxConcurrency,
      },
      () =>
        requestOpenAIChatDirect({
          endpoint,
          apiKey,
          model,
          content,
          serviceName: getServiceDisplayName(ServiceId.OfficialLLM),
          sourceText: req.text,
        })
    );
  }
  transform(req, rawResponse) {
    const dest = req.destinations[req.destIndex];
    const out = {
      text: req.text,
      link: OFFICIAL_LLM_PORTAL_URL,
      from: req.source && this.convertToStandard(req.source),
      to: dest && this.convertToStandard(dest),
    };
    const msgContent = rawResponse?.choices?.[0]?.message?.content;
    if (msgContent) {
      out.result = normalizeText(msgContent.trim()).split("\n");
    }
    return out;
  }
})();

class CustomOpenAITranslator extends TranslatorBase {
  constructor(serviceId) {
    super({
      id: serviceId,
      name: t("service.customDefault"),
    });
    this.customServiceId = serviceId;
  }
  async call(req) {
    const { customOpenAIServices = [] } = await chrome.storage.local.get({
      customOpenAIServices: [],
    });
    const svc = customOpenAIServices.find((item) => item?.id === this.customServiceId);
    if (!svc) {
      throw new errors.Fw(t("error.customNotFound"), {
        type: errors.VC.NEED_KEY,
      });
    }
    this.service.name = svc.name || t("service.customDefault");
    const baseUrl = String(svc.baseUrl || "").trim();
    if (!baseUrl) {
      throw new errors.Fw(t("error.customNeedBaseUrl", { name: this.service.name }), {
        type: errors.VC.NEED_KEY,
      });
    }
    const model = String(svc.model || "").trim();
    if (!model) {
      throw new errors.Fw(t("error.customNeedModel", { name: this.service.name }), {
        type: errors.VC.NEED_KEY,
      });
    }
    const rawPrompt = svc.prompt || "";
    if (rawPrompt && !rawPrompt.includes("{{text}}")) {
      throw new errors.Fw(t("error.promptMissingText"), {
        type: errors.VC.OTHER,
      });
    }
    const content = (rawPrompt || "将下面的文本翻译为{{target}}：\n{{text}}")
      .replaceAll("{{text}}", req.text)
      .replaceAll("{{target}}", req.destination);
    const endpoint = resolveChatCompletionsUrl(baseUrl);
    const maxConcurrency = normalizeLlmConcurrency(
      svc.maxConcurrency,
      DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY
    );
    return runWithLlmConcurrency(
      {
        apiCode: this.customServiceId,
        maxConcurrency,
      },
      () =>
        requestOpenAIChatDirect({
          endpoint,
          apiKey: svc.apiKey,
          model,
          content,
          serviceName: this.service.name,
          sourceText: req.text,
        })
    );
  }
  transform(req, rawResponse) {
    const dest = req.destinations[req.destIndex];
    const out = {
      text: req.text,
      from: req.source && this.convertToStandard(req.source),
      to: dest && this.convertToStandard(dest),
    };
    const msgContent = rawResponse?.choices?.[0]?.message?.content;
    if (msgContent) {
      out.result = normalizeText(msgContent.trim()).split("\n");
    }
    return out;
  }
}

function getTranslator(apiCode) {
  switch (apiCode) {
    case ServiceId.OfficialLLM:
      return officialLlmTranslator;
    case ServiceId.Microsoft:
      return microsoftTranslator;
    case ServiceId.Google:
      return googleTranslator;
    default:
      if (isCustomOpenAIServiceId(apiCode)) {
        return new CustomOpenAITranslator(apiCode);
      }
      throw new errors.Fw(t("error.serviceDisabled", { apiCode }));
  }
}

registerLlmBatchStreamHandler();
registerClassroomStreamHandler();

watchStorage(pick(defaultOptions, ["googleRegion", "googleMirror"]), (changes) => {
  if (changes.googleRegion) {
    googleTranslator.region = changes.googleRegion === "cn" ? "com" : changes.googleRegion;
  }
  if (changes.googleMirror != null) {
    googleTranslator.mirror = changes.googleMirror;
  }
});

// Offscreen document helper (used in Chrome MV3 Service Worker; Firefox MV3 runs an Event Page with direct DOM access)
let creatingOffscreenPromise = null;
async function ensureOffscreenDocument() {
  if (__TARGET_BROWSER__ === "firefox") return;
  if (typeof chrome === "undefined" || !chrome.offscreen?.createDocument) return;
  const offscreenPath = "offscreen.html";
  const offscreenUrl = chrome.runtime.getURL(offscreenPath);
  const exists =
    "getContexts" in chrome.runtime
      ? Boolean(
          (
            await chrome.runtime.getContexts({
              contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
              documentUrls: [offscreenUrl],
            })
          ).length
        )
      : typeof clients !== "undefined"
        ? (await clients.matchAll()).some((client) => client.url.startsWith(offscreenUrl))
        : false;
  if (exists) return;
  if (creatingOffscreenPromise) {
    await creatingOffscreenPromise;
    return;
  }
  creatingOffscreenPromise = chrome.offscreen.createDocument({
    url: offscreenPath,
    reasons: [chrome.offscreen.Reason.CLIPBOARD, chrome.offscreen.Reason.AUDIO_PLAYBACK],
    justification: "Audio TTS playback and copying translated text to the clipboard.",
  });
  try {
    await creatingOffscreenPromise;
  } finally {
    creatingOffscreenPromise = null;
  }
}

async function playAudioInHost(url, options) {
  if (__TARGET_BROWSER__ !== "firefox" && typeof chrome !== "undefined" && chrome.offscreen?.createDocument) {
    await ensureOffscreenDocument();
    return sendMessage({
      action: "dom: play with audio",
      url,
      options,
    });
  }
  return playWithAudio(url, options);
}

async function playSpeechInHost(text, options) {
  if (__TARGET_BROWSER__ !== "firefox" && typeof chrome !== "undefined" && chrome.offscreen?.createDocument) {
    await ensureOffscreenDocument();
    return sendMessage({
      action: "dom: play with speech",
      text,
      options,
    });
  }
  return playWithSpeech(text, options);
}

async function writeClipboardInHost(text) {
  if (__TARGET_BROWSER__ !== "firefox" && typeof chrome !== "undefined" && chrome.offscreen?.createDocument) {
    await ensureOffscreenDocument();
    return sendMessage({
      action: "dom: write to clipboard",
      text,
    });
  }
  return writeToClipboard(text);
}

// TTS settings & language map
const TTS_LANG_MAP = {
  "中文(简体)": "zh-CN",
  "中文(粤语)": "zh-HK",
  "中文(繁体)": "zh-TW",
  英语: "en",
  "英语(英国)": "en-GB",
  "英语(美国)": "en-US",
  "英语(加拿大)": "en-CA",
  "英语(澳大利亚)": "en-AU",
  "英语(印度)": "en-IN",
  "英语(爱尔兰)": "en-IE",
  "英语(南非)": "en-ZA",
  德语: "de-DE",
  西班牙语: "es-ES",
  "西班牙语(墨西哥)": "es-MX",
  "西班牙语(美国)": "es-US",
  "西班牙语(阿根廷)": "es-AR",
  法语: "fr-FR",
  "法语(加拿大)": "fr-CA",
  印地语: "hi-IN",
  印尼语: "id-ID",
  意大利语: "it-IT",
  日语: "ja-JP",
  韩语: "ko-KR",
  荷兰语: "nl-NL",
  "荷兰语(比利时)": "nl-BE",
  波兰语: "pl-PL",
  葡萄牙语: "pt-PT",
  "葡萄牙语(巴西)": "pt-BR",
  俄语: "ru-RU",
  土耳其语: "tr-TR",
  瑞典语: "sv-SE",
  希伯来语: "he-IL",
  罗马尼亚语: "ro-RO",
  泰语: "th-TH",
  斯洛伐克语: "sk-SK",
  阿拉伯语: "ar-SA",
  匈牙利语: "hu-HU",
  希腊语: "el-GR",
  挪威语: "nb-NO",
  丹麦语: "da-DK",
  芬兰语: "fi-FI",
  捷克语: "cs-CZ",
};
const ACCENT_GROUP_MAP = {
  "中文(简体)": "zh",
  英语: "en",
  法语: "fr",
  西班牙语: "es",
  荷兰语: "nl",
  葡萄牙语: "pt",
};
invert(TTS_LANG_MAP);

const audioDebug = createDebug("audio");
const AUDIO_STORAGE_KEYS = pick(defaultOptions, [
  "audioVolume",
  "audioRate",
  "systemTTS",
  "systemTTSVoice",
  "systemTTSAccent",
]);
let audioVolume = defaultOptions.audioVolume;
let audioRate = defaultOptions.audioRate;
let systemTTS = defaultOptions.systemTTS;
let systemTTSVoice = defaultOptions.systemTTSVoice;
let systemTTSAccent = defaultOptions.systemTTSAccent;

watchStorage(AUDIO_STORAGE_KEYS, (changes) => {
  if (changes.audioRate != null) audioRate = changes.audioRate;
  if (changes.audioVolume != null) audioVolume = changes.audioVolume;
  if (changes.systemTTS != null) systemTTS = changes.systemTTS;
  if (changes.systemTTSVoice != null) systemTTSVoice = changes.systemTTSVoice;
  if (changes.systemTTSAccent != null) systemTTSAccent = changes.systemTTSAccent;
});

async function getActiveTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tabs[0] || (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
}

const DEST_KEYS = {
  ...pick(defaultOptions, ["destination", "secondDestination", "secondDestinationLatestSource"]),
  ...pick(secondaryOptions, ["latestSource"]),
};

const optionsUrl = chrome.runtime.getURL("settings.html");

onMessage((msg, ctx) => {
  switch (msg.action) {
    case "open options page":
      return msg.suffix
        ? chrome.tabs.create({ url: optionsUrl + msg.suffix }).then(noop)
        : chrome.runtime.openOptionsPage();

    case "translate":
      return (async (data) => {
        const translator = getTranslator(data.apiCode);
        let destinations = data.destinations;
        if (!destinations) {
          const cfg = await chrome.storage.local.get(DEST_KEYS);
          const second =
            cfg.secondDestinationLatestSource && cfg.latestSource
              ? cfg.latestSource
              : cfg.secondDestination;
          destinations =
            cfg.destination === second ? [cfg.destination] : [cfg.destination, second];
        }
        const primaryDest = destinations?.[0];
        const destKey = Array.isArray(destinations) ? destinations.join("\u0001") : "";
        if (!data.skipCache && primaryDest) {
          const cached = await lookupSingleTranslationCache({
            apiCode: data.apiCode,
            source: data.source,
            destination: primaryDest,
            destKey,
            text: data.text,
          });
          if (cached) return cached;
        }
        const res = await translator.translate({
          text: data.text,
          destinations,
          source: data.source,
        });
        if (!data.skipCache && primaryDest && res && !res.error) {
          await saveSingleTranslationCache({
            apiCode: data.apiCode,
            source: data.source,
            destination: primaryDest,
            destKey,
            text: data.text,
            response: res,
          });
        }
        return res;
      })(msg.data);

    case "translate batch texts":
      return (async (data) => {
        const texts = Array.isArray(data?.texts) ? data.texts : [];
        if (!texts.length) return { results: [] };
        const translator = getTranslator(data.apiCode);
        let destinations = data.destinations;
        if (!destinations || !destinations.length) {
          const cfg = await chrome.storage.local.get(DEST_KEYS);
          destinations = [cfg.destination];
        }
        const primaryDest = destinations[0];
        const cachedHits =
          !data.skipCache && primaryDest
            ? await lookupBatchTranslationCache({
                apiCode: data.apiCode,
                source: data.source,
                destination: primaryDest,
                texts,
              })
            : new Map();
        const missIndices = [];
        const missTexts = [];
        texts.forEach((txt, idx) => {
          if (!cachedHits.has(idx)) {
            missIndices.push(idx);
            missTexts.push(txt);
          }
        });
        if (!missTexts.length) {
          return {
            results: texts.map((_, idx) => cachedHits.get(idx) ?? ""),
          };
        }
        const ctx = {
          text: missTexts[0],
          normalizedText: missTexts.slice(0, 3).join("\n"),
          hcfySource: data.source,
          hcfyDestinations: destinations,
          destinations: [],
          destIndex: 0,
        };
        try {
          await translator.convertLanguages(
            {
              text: ctx.normalizedText,
              destinations,
              source: data.source,
            },
            ctx
          );
          const destCode = ctx.destinations[ctx.destIndex];
          const sourceCode = ctx.source;
          let missResults = null;
          if (data.apiCode === ServiceId.Google) {
            missResults = await translateGoogleChromeExt(
              missTexts,
              destCode,
              sourceCode || "auto",
              { signal: abortTimeout(12000) },
              translator.mirror
            );
          } else if (data.apiCode === ServiceId.Microsoft) {
            const res = await callMicrosoftTranslate(missTexts, destCode, {
              from: sourceCode || undefined,
            });
            missResults = Array.isArray(res)
              ? res.map((item) => item?.translations?.[0]?.text ?? "")
              : [];
          } else {
            const settled = await Promise.all(
              missTexts.map((text) =>
                translator.translate({
                  text,
                  destinations,
                  source: data.source,
                })
              )
            );
            const firstErr = settled.find((item) => item?.error)?.error;
            if (firstErr) return { error: firstErr };
            missResults = settled.map((item) =>
              item?.result ? item.result.join("\n") : (item?.dict?.[0]?.terms?.[0] ?? "")
            );
          }
          if (!data.skipCache && primaryDest && Array.isArray(missResults)) {
            await saveBatchTranslationCache({
              apiCode: data.apiCode,
              source: data.source,
              destination: primaryDest,
              items: missIndices.map((origIdx, localIdx) => ({
                text: texts[origIdx],
                translatedText: missResults[localIdx],
              })),
            });
          }
          const finalResults = texts.map((_, idx) => cachedHits.get(idx) ?? "");
          missIndices.forEach((origIdx, localIdx) => {
            finalResults[origIdx] = missResults?.[localIdx] ?? "";
          });
          return { results: finalResults };
        } catch (err) {
          return { error: errors.xh(err).toJSON() };
        }
      })(msg.data);

    case "audio":
      return (async (audioReq) => {
        try {
          if (systemTTS === "prior") {
            throw new Error("始终使用系统语音朗读");
          }
          let ttsUrl;
          if (audioReq.ttsURI) {
            ttsUrl = audioReq.ttsURI;
          } else if (audioReq.source) {
            const translator = getTranslator(audioReq.apiId);
            ttsUrl = await translator.getTTS(audioReq.text, audioReq.source);
          }
          if (!ttsUrl) throw new Error("跳过");
          audioDebug("开始用接口自带 TTS 地址朗读 %O", audioReq);
          await playAudioInHost(ttsUrl, {
            volume: audioVolume / 100,
            playbackRate: audioRate,
          });
        } catch (err) {
          if (systemTTS === "none") throw err;
          audioDebug("回退系统语音朗读 %O", audioReq);
          const speechOpts = {
            volume: audioVolume / 100,
            rate: audioRate,
            uiLocale: getUiLocale(),
          };
          const group = audioReq.source && ACCENT_GROUP_MAP[audioReq.source];
          if (group && systemTTSAccent[group]) {
            speechOpts.lang = systemTTSAccent[group];
          }
          const voiceLang = speechOpts.lang || (audioReq.source && TTS_LANG_MAP[audioReq.source]);
          speechOpts.systemVoiceLang = voiceLang;
          if (voiceLang) {
            if (!speechOpts.lang) speechOpts.lang = voiceLang;
            speechOpts.voiceName = systemTTSVoice[voiceLang];
          }
          return playSpeechInHost(audioReq.text, speechOpts);
        }
      })(msg.url);

    case "get translation cache stats":
      return getTranslationCacheStats(msg.apiCode);

    case "clear translation cache":
      return clearTranslationCache(msg.apiCode);

    case "write to clipboard":
      return writeClipboardInHost(msg.text);

    case "fetch video subtitles":
    case "fetch bilibili subtitles":
    case "fetch bilibili first subtitle":
      return (async () => {
        const pageUrl = msg.pageUrl || ctx?.sender?.tab?.url || "";
        if (parseYouTubeVideoUrl(pageUrl)) {
          return fetchYouTubeSubtitles({
            pageUrl,
            tabId: ctx?.sender?.tab?.id,
            targetLanguage: msg.targetLanguage || "",
            trackKey: msg.trackKey || "",
            forceRefresh: Boolean(msg.forceRefresh),
          });
        }
        if (parseBilibiliVideoUrl(pageUrl)) {
          const res = await fetchBilibiliSubtitles({ pageUrl });
          return { platform: "bilibili", ...res };
        }
        return { ok: false, platform: "other", reason: "NOT_SUPPORTED_VIDEO_SITE" };
      })();

    case "fetch video subtitle track":
      return (async () => {
        const pageUrl = msg.pageUrl || ctx?.sender?.tab?.url || "";
        if (parseYouTubeVideoUrl(pageUrl)) {
          return fetchYouTubeSingleTrack({
            pageUrl,
            tabId: ctx?.sender?.tab?.id,
            trackKey: msg.trackKey || "",
            subtitleUrl: msg.subtitleUrl || "",
          });
        }
        return { ok: false, platform: "other", reason: "NOT_SUPPORTED_VIDEO_SITE" };
      })();

    case "extract classroom vocabulary":
      return extractClassroomVocabulary(msg.data || msg);
  }
});

// Context menus (only shown features: selection translation & webpage full-text translation)
function getContextMenus() {
  return [
    {
      id: "translate",
      title: t("contextMenu.translateSelection"),
      contexts: ["selection"],
    },
    {
      id: "page-translate",
      title: t("contextMenu.pageTranslate"),
      contexts: ["page", "frame"],
      documentUrlPatterns: ["*://*/*", "file://*/*", "ftp://*/*"],
    },
  ];
}

let contextMenuSetupChain = Promise.resolve();
function setupContextMenus() {
  contextMenuSetupChain = contextMenuSetupChain
    .then(
      () =>
        new Promise((resolve) => {
          const menus = getContextMenus();
          chrome.contextMenus.removeAll(() => {
            void chrome.runtime.lastError;
            menus.forEach((item) => {
              chrome.contextMenus.create(item, () => {
                void chrome.runtime.lastError;
              });
            });
            resolve();
          });
        })
    )
    .catch(noop);
  return contextMenuSetupChain;
}

chrome.runtime.onInstalled.addListener(setupContextMenus);
chrome.runtime.onStartup.addListener(setupContextMenus);
subscribeUiLocale(() => {
  setupContextMenus();
});

async function sendTabMessageWithInject(message, tabId) {
  try {
    return await sendMessage(message, tabId, { frameId: 0 });
  } catch {
    const extApi = typeof browser !== "undefined" ? browser : chrome;
    if (!extApi.scripting?.executeScript) return;
    try {
      await extApi.scripting.executeScript({
        target: { tabId },
        files: ["c.js"],
      });
      extApi.scripting
        .executeScript({
          target: { tabId, allFrames: true },
          files: ["ca.js"],
        })
        .catch(noop);
      await new Promise((r) => setTimeout(r, 150));
      return await sendMessage(message, tabId, { frameId: 0 });
    } catch {
      // restricted page or permission not granted
    }
  }
}

const extPermissionsApi = (typeof browser !== "undefined" ? browser : chrome).permissions;
if (extPermissionsApi?.onAdded?.addListener) {
  extPermissionsApi.onAdded.addListener(async (perms) => {
    if (!perms?.origins?.length) return;
    try {
      const tab = await getActiveTab();
      if (!tab?.id) return;
      const extApi = typeof browser !== "undefined" ? browser : chrome;
      if (!extApi.scripting?.executeScript) return;
      await extApi.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["c.js"],
      });
      extApi.scripting
        .executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ["ca.js"],
        })
        .catch(noop);
    } catch {
      // ignore restricted pages
    }
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  if (info.menuItemId === "translate") {
    sendTabMessageWithInject("translate", tab.id).catch(noop);
  } else if (info.menuItemId === "page-translate") {
    sendTabMessageWithInject("page translate", tab.id).catch(noop);
  }
});

// Keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  const tab = await getActiveTab();
  if (!tab?.id) return;
  switch (command) {
    case "translate":
      sendTabMessageWithInject("translate", tab.id).catch(noop);
      break;
    case "page":
      sendTabMessageWithInject("page translate", tab.id).catch(noop);
      break;
    case "pageSwitchMode":
      sendTabMessageWithInject("page translate switch mode", tab.id).catch(noop);
      break;
    case "play":
      sendTabMessageWithInject("play", tab.id).catch(noop);
      break;
  }
});
