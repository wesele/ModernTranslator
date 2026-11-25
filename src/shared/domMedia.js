import noop from "lodash/noop";
import forEach from "lodash/forEach";
import invert from "lodash/invert";
import { L as retryAsync } from "./utils/retryAsync.js";
import { MESSAGES } from "./i18n/messages.js";
import { normalizeUiLocale, detectDefaultUiLocale } from "./i18n/locales.js";
import { getLocalizedLanguageName } from "./i18n/languageNames.js";

function domMediaT(key, vars, locale) {
  const loc = normalizeUiLocale(locale) || detectDefaultUiLocale();
  const dict = MESSAGES[loc] || MESSAGES.en;
  let tpl = dict[key] ?? MESSAGES.en[key] ?? key;
  if (!vars || typeof tpl !== "string") return tpl;
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

const LANG_CODE_TO_NAME = invert({
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
});

let hiddenTextarea = null;
let ensureTextareaInit = () => {
  ensureTextareaInit = noop;
  hiddenTextarea = document.createElement("textarea");
  hiddenTextarea.style.position = "absolute";
  hiddenTextarea.style.top = "-99999px";
  document.body.appendChild(hiddenTextarea);
};

let voicesPromise = null;
function getVoicesInfo() {
  if (typeof speechSynthesis === "undefined") {
    return Promise.reject(new Error(domMediaT("error.ttsVoicesFail")));
  }
  return (
    voicesPromise ||
    (voicesPromise = retryAsync(
      () =>
        new Promise((resolve, reject) => {
          const voices = speechSynthesis.getVoices();
          if (voices.length) {
            resolve(voices);
          } else {
            reject(new Error(domMediaT("error.ttsVoicesFail")));
          }
        }),
      { delay: 500, count: 10 }
    )
      .then((voices) => {
        const voicesGroup = {};
        const multipleLang = {};
        voices.forEach((voice) => {
          const lang = voice.lang;
          if (voicesGroup[lang]) voicesGroup[lang].push(voice);
          else voicesGroup[lang] = [voice];
          const sepIdx = lang.indexOf("-");
          const prefix = sepIdx >= 0 ? lang.slice(0, sepIdx) : lang;
          if (multipleLang[prefix]) {
            if (!multipleLang[prefix].includes(lang)) multipleLang[prefix].push(lang);
          } else {
            multipleLang[prefix] = [lang];
          }
        });
        const singleList = [];
        const singleVoiceMap = {};
        forEach(voicesGroup, (list, lang) => {
          if (list.length === 1) {
            singleList.push(lang);
            singleVoiceMap[lang] = list[0];
            delete voicesGroup[lang];
          }
        });
        forEach(multipleLang, (list, prefix) => {
          if (list.length === 1) delete multipleLang[prefix];
        });
        return { singleVoiceMap, singleList, voicesGroup, multipleLang };
      })
      .catch((err) => {
        voicesPromise = null;
        throw err;
      }))
  );
}

let currentAudio = null;

export function stopPlayback() {
  try {
    currentAudio?.pause();
  } catch {
    // ignore
  }
  if (typeof speechSynthesis !== "undefined") {
    try {
      speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export async function writeToClipboard(text) {
  const value = String(text ?? "");
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall back to execCommand("copy") (e.g. unfocused Chrome offscreen documents)
    }
  }
  if (typeof document !== "undefined" && document.body) {
    ensureTextareaInit();
    hiddenTextarea.value = value;
    hiddenTextarea.select();
    return document.execCommand("copy");
  }
  return false;
}

export function playWithAudio(url, options) {
  if (typeof Audio === "undefined") {
    return Promise.reject(new Error("Audio API is unavailable in this context."));
  }
  stopPlayback();
  const audio = new Audio(url);
  currentAudio = audio;
  if (options && typeof options === "object") {
    Object.assign(audio, options);
  }
  return new Promise((res, rej) => {
    audio.addEventListener("canplay", () => {
      audio.play().then(res, rej);
    });
    audio.addEventListener("error", (err) => {
      rej(err);
    });
  });
}

export function playWithSpeech(text, options) {
  if (typeof speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined") {
    return Promise.reject(new Error(domMediaT("error.ttsVoicesFail", null, options?.uiLocale)));
  }
  stopPlayback();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isMac = ua.includes("Mac");
  const isChrome = ua.includes("Chrome") && !ua.includes("Edg");

  const utter = new SpeechSynthesisUtterance(text);
  const { voiceName, systemVoiceLang, uiLocale, ...rest } = options || {};
  Object.assign(utter, rest);

  return new Promise(async (res, rej) => {
    const timer = setTimeout(() => {
      speechSynthesis.cancel();
      const rawLangName = utter.lang ? LANG_CODE_TO_NAME[utter.lang] : "";
      const langLabel = rawLangName ? getLocalizedLanguageName(rawLangName, uiLocale, "") : "";
      const langSuffix = langLabel ? ` (${langLabel})` : "";
      rej(
        new Error(
          domMediaT("error.ttsTimeout", null, uiLocale) +
            (isChrome ? " " + domMediaT("error.ttsChromeNetwork", { lang: langSuffix }, uiLocale) : "")
        )
      );
    }, 1000);

    utter.addEventListener("start", () => {
      clearTimeout(timer);
      res();
    });
    utter.addEventListener("error", (err) => {
      clearTimeout(timer);
      rej(err);
    });

    if (systemVoiceLang) {
      if (!utter.lang) utter.lang = systemVoiceLang;
      if (voiceName) {
        try {
          const { voicesGroup } = await getVoicesInfo();
          const matched = voicesGroup[systemVoiceLang]?.find((v) => v.name === voiceName);
          if (matched) utter.voice = matched;
        } catch (err) {
          console.error("查找系统语音朗读者失败：", err);
        }
      } else if (isMac && systemVoiceLang === "en-US") {
        const noveltyNames = [
          "Albert",
          "Bad News",
          "Bahh",
          "Bells",
          "Boing",
          "Bubbles",
          "Cellos",
          "Wobble",
          "Eddy",
          "Flo",
        ];
        try {
          const { voicesGroup } = await getVoicesInfo();
          const matched = voicesGroup[systemVoiceLang]?.find((v) =>
            noveltyNames.every((prefix) => !v.name.startsWith(prefix))
          );
          if (matched) utter.voice = matched;
        } catch (err) {
          console.error("选择系统语音朗读者失败：", err);
        }
      }
    }
    speechSynthesis.speak(utter);
  });
}
