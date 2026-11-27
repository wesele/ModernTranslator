import { VI as ServiceId } from "../shared/constants/services.js";
import { g2 as defaultOptions } from "../shared/constants/defaults.js";
import {
  DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY,
  DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY,
  OFFICIAL_LLM_BASE_URL,
  isCustomOpenAIServiceId,
  normalizeLlmConcurrency,
  resolveChatCompletionsUrl,
} from "../shared/openaiUtils.js";
import { runWithLlmConcurrency } from "./llmConcurrency.js";
import { extractApiErrorMessage } from "../shared/llmErrorUtils.js";
import { getServiceDisplayName, t } from "../shared/i18n/index.js";
import { mapSubtitleLangToTtsSource } from "../shared/wordbook.js";
import { formatSubtitleTime } from "../shared/subtitleTimeline.js";
import { hasArabicScript, normalizeTextForMatch } from "../shared/textScript.js";
import {
  cleanSubtitleCues,
  computeSectionVocabTarget,
  estimateUniqueLexicalUnits,
  splitSectionIntoBatches,
} from "../shared/classroomSections.js";

const CLASSROOM_CACHE_LIMIT = 64;
const classroomCache = new Map();

function safePost(port, msg) {
  try {
    port.postMessage(msg);
  } catch {
    // Port disconnected
  }
}

function buildBatchPrompt({
  transcript,
  videoTitle,
  platform = "bilibili",
  trackLabel,
  trackLang,
  targetLanguage,
  ratio,
  minCount,
  maxCount,
  sectionTitle = "",
  sectionTimeRange = "",
  excludeTerms = [],
  needSummary = true,
}) {
  const platformName = platform === "youtube" ? "YouTube" : "B 站";
  const sectionLine = sectionTitle
    ? `当前小节：${sectionTitle}${sectionTimeRange ? `（${sectionTimeRange}）` : ""}\n`
    : "";
  const excludeLine =
    excludeTerms.length > 0
      ? `6. 以下词条在本小节前一批中已提取，请勿重复挑选：${excludeTerms.slice(0, 40).join("、")}\n`
      : "";
  const isArabicTrack =
    hasArabicScript(transcript) ||
    /(?:^|[-_\s])(ar|ara)(?:$|[-_\s])|阿拉伯|arabic|العربية|عربي/i.test(
      `${trackLang || ""} ${trackLabel || ""}`
    );
  const arabicNote = isArabicTrack
    ? `\n- 阿拉伯语特别说明：term 可保留完整标音（Tashkeel/Harakat）便于学习发音，并在 phonetic 中提供拉丁转写或 IPA 读音；surfaceForm 与 videoQuote 请尽量直接摘录下方字幕原样拼写（不要改写词形）；detectedLanguage 请填写「阿拉伯语」。`
    : "";

  return `你是一位经验丰富的外语教学专家。用户即将在 ${platformName} 观看一部外语学习视频，希望在观看前通过「语言课堂」提前预习视频字幕中最难的词汇和短语。

视频标题：${videoTitle || "未命名视频"}
${sectionLine}字幕轨道：${trackLabel || trackLang || "未知语言"}
释义与讲解目标语言：${targetLanguage || "中文(简体)"}

任务要求：
1. 仔细通读下方字幕片段，按**最难的约 ${ratio}%** 的标准，挑选出 ${minCount} 到 ${maxCount} 个最值得课前预习的高价值**难词**与**实用短语/固定搭配/习语**。
2. 既要包含进阶单词（type: "word"），也要包含字幕中出现的高价值短语、动词搭配、习语或地道表达（type: "phrase"）。
3. 剔除过于基础的常见词、纯数字、无意义语气词；优先挑选对理解这段内容最关键、最容易卡壳的词汇和短语。
4. 按学习难度与重要程度从高到低排序。
5. 严格只输出合法的 JSON 对象，不要输出任何额外说明文字或 Markdown 注释。
${excludeLine}JSON 结构如下：
{
  "detectedLanguage": "字幕语言名称（如 阿拉伯语 / 法语 / 西班牙语 / 英语 / 日语 等）",
  "summary": "${needSummary ? `用${targetLanguage || "中文(简体)"}一句话概括本段主题与词汇难度特点` : ""}",
  "items": [
    {
      "term": "单词原型或标准短语表达",
      "surfaceForm": "字幕中实际出现的形态（如动词变位或原样，没有变化可与 term 相同）",
      "type": "word 或 phrase",
      "phonetic": "国际音标、拉丁转写读音、假名读音或拼音（不适用可留空字符串）",
      "pos": "词性简写（如 v. / n. / adj. / adv. / phrase / idiom）",
      "level": "难度等级标签（如 B2 / C1 / C2 / N1 / 高级）",
      "difficulty": 4,
      "translation": "精准简洁的${targetLanguage || "中文(简体)"}核心释义（结合视频语境）",
      "explanation": "用${targetLanguage || "中文(简体)"}写1句简明用法提示、语感辨析或语法要点",
      "videoQuote": "该词在字幕中出现的原句（直接摘自下方字幕，不要带时间戳）",
      "videoQuoteTranslation": "上述 videoQuote 字幕原句对应的地道${targetLanguage || "中文(简体)"}译文",
      "examples": [
        {
          "sentence": "1条地道自然的原语例句",
          "translation": "对应的${targetLanguage || "中文(简体)"}译文"
        },
        {
          "sentence": "第2条不同场景的实用例句",
          "translation": "对应的${targetLanguage || "中文(简体)"}译文"
        }
      ]
    }
  ]
}

注意：
- difficulty 取值 1-5 的整数（4=较难，5=高难）。
- 每个词条提供 1-2 条高质量例句，例句简洁实用。
- 必须确保 JSON 语法完全合法（字符串内双引号正确转义）。${arabicNote}

以下是本段字幕内容：
${transcript}`;
}

function stripThinkAndFences(rawText) {
  let text = String(rawText || "").trim();
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    text = fenceMatch[1].trim();
  }
  return text;
}

function salvageTruncatedItems(text) {
  const itemsStart = text.indexOf('"items"');
  const arrayStart = itemsStart >= 0 ? text.indexOf("[", itemsStart) : text.indexOf("[");
  if (arrayStart < 0) return [];

  const results = [];
  let inString = false;
  let escape = false;
  let depth = 0;
  let objStart = -1;

  for (let i = arrayStart + 1; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) objStart = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && objStart >= 0) {
        const snippet = text.slice(objStart, i + 1);
        try {
          const parsed = JSON.parse(snippet);
          if (parsed && parsed.term) {
            results.push(parsed);
          }
        } catch {
          // ignore broken snippet
        }
        objStart = -1;
      }
    }
  }
  return results;
}

function parseClassroomJson(rawContent) {
  const cleaned = stripThinkAndFences(rawContent);
  if (!cleaned) {
    throw new Error("大模型返回了空内容，请重试或切换模型。");
  }

  const tryDirect = (candidate) => {
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  };

  let parsed = tryDirect(cleaned);
  if (!parsed) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      parsed = tryDirect(cleaned.slice(firstBrace, lastBrace + 1));
    }
  }
  if (!parsed) {
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      const arr = tryDirect(cleaned.slice(firstBracket, lastBracket + 1));
      if (Array.isArray(arr)) {
        parsed = { items: arr };
      }
    }
  }

  if (parsed && Array.isArray(parsed)) {
    parsed = { items: parsed };
  }

  if (!parsed || !Array.isArray(parsed.items)) {
    const salvaged = salvageTruncatedItems(cleaned);
    if (salvaged.length > 0) {
      const summaryMatch = cleaned.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const langMatch = cleaned.match(/"detectedLanguage"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      parsed = {
        detectedLanguage: langMatch ? langMatch[1] : "",
        summary: summaryMatch ? summaryMatch[1] : "",
        items: salvaged,
      };
    }
  }

  if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new Error("未能从大模型回复中解析出有效词条，请点击重试或切换能力更强的模型。");
  }

  return parsed;
}

function findMatchingCueWithIndex(cues, item) {
  if (!Array.isArray(cues) || cues.length === 0) return null;
  const candidates = [
    String(item?.videoQuote || "").trim(),
    String(item?.surfaceForm || "").trim(),
    String(item?.term || "").trim(),
  ].filter(Boolean);

  for (const needle of candidates) {
    const lowerNeedle = needle.toLowerCase();
    if (lowerNeedle.length < 2) continue;
    const idx = cues.findIndex((c) => String(c.content || "").toLowerCase().includes(lowerNeedle));
    if (idx >= 0) return { cue: cues[idx], index: idx };
  }

  // Normalized pass: tolerates Arabic harakat/tashkeel, tatweel, Alif/Ya/Ta-Marbuta variants & Arabic punctuation
  const normalizedCues = cues.map((c) => normalizeTextForMatch(c.content || ""));
  for (const needle of candidates) {
    const normNeedle = normalizeTextForMatch(needle);
    if (normNeedle.length < 2) continue;
    const idx = normalizedCues.findIndex((nc) => nc.includes(normNeedle));
    if (idx >= 0) return { cue: cues[idx], index: idx };
  }

  const fallbackSource = normalizeTextForMatch(
    item?.surfaceForm || item?.term || item?.videoQuote || ""
  );
  const fallbackWords = fallbackSource
    .split(/[\s,.;:!?'"()،؛؟«»\-—–/\\[\]{}]+/)
    .filter((w) => (hasArabicScript(w) ? w.length >= 3 : w.length >= 4))
    .sort((a, b) => b.length - a.length);

  for (const word of fallbackWords) {
    const idx = normalizedCues.findIndex((nc) => nc.includes(word));
    if (idx >= 0) return { cue: cues[idx], index: idx };
  }

  return null;
}

function normalizeVocabularyItems(rawItems, cleanedCues) {
  const seen = new Set();
  const normalized = [];

  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const term = String(raw.term || raw.word || raw.phrase || "").trim();
    if (!term) continue;
    const dedupeKey = normalizeTextForMatch(term) || term.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const matched = findMatchingCueWithIndex(cleanedCues, raw);
    const rawType = String(raw.type || "").toLowerCase();
    const isPhrase =
      rawType === "phrase" ||
      rawType === "idiom" ||
      rawType.includes("短语") ||
      term.trim().includes(" ");

    const rawExamples = Array.isArray(raw.examples)
      ? raw.examples
      : raw.example
        ? [raw.example]
        : [];
    const examples = rawExamples
      .map((ex) => {
        if (typeof ex === "string") {
          return { sentence: ex.trim(), translation: "" };
        }
        return {
          sentence: String(ex?.sentence || ex?.text || ex?.original || "").trim(),
          translation: String(ex?.translation || ex?.meaning || ex?.zh || "").trim(),
        };
      })
      .filter((ex) => ex.sentence.length > 0)
      .slice(0, 3);

    const diffNum = Number(raw.difficulty);
    const difficulty = Number.isFinite(diffNum)
      ? Math.min(5, Math.max(1, Math.round(diffNum)))
      : 4;

    normalized.push({
      id: `item_${normalized.length}_${Math.random().toString(36).slice(2, 7)}`,
      term,
      surfaceForm: String(raw.surfaceForm || "").trim(),
      type: isPhrase ? "phrase" : "word",
      phonetic: String(raw.phonetic || raw.pronunciation || "").trim(),
      pos: String(raw.pos || (isPhrase ? "phrase" : "")).trim(),
      level: String(raw.level || raw.cefr || "").trim(),
      difficulty,
      translation: String(raw.translation || raw.meaning || "").trim(),
      explanation: String(raw.explanation || raw.note || raw.usage || "").trim(),
      videoQuote: String(raw.videoQuote || matched?.cue?.content || "").trim(),
      videoQuoteTranslation: String(
        raw.videoQuoteTranslation || raw.quoteTranslation || raw.videoQuoteZh || ""
      ).trim(),
      videoTime: matched?.cue ? matched.cue.from : null,
      examples,
    });
  }

  return normalized;
}

async function resolveLlmConfig(requestedApiCode) {
  const stored = await chrome.storage.local.get({
    pageTrsApi: defaultOptions.pageTrsApi,
    officialLLMBaseUrl: defaultOptions.officialLLMBaseUrl ?? OFFICIAL_LLM_BASE_URL,
    officialLLMKey: "",
    officialLLMModel: "",
    officialLLMStreamEnabled: true,
    officialLLMMaxConcurrency:
      defaultOptions.officialLLMMaxConcurrency ?? DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY,
    customOpenAIServices: [],
  });

  const customServices = Array.isArray(stored.customOpenAIServices)
    ? stored.customOpenAIServices
    : [];

  const isOfficialReady = Boolean(
    String(stored.officialLLMKey || "").trim() && String(stored.officialLLMModel || "").trim()
  );

  let targetApi = requestedApiCode;
  if (!targetApi) {
    if (
      stored.pageTrsApi === ServiceId.OfficialLLM ||
      isCustomOpenAIServiceId(stored.pageTrsApi)
    ) {
      targetApi = stored.pageTrsApi;
    } else {
      const readyCustom = customServices.find(
        (svc) => String(svc?.baseUrl || "").trim() && String(svc?.model || "").trim()
      );
      if (readyCustom) {
        targetApi = readyCustom.id;
      } else if (isOfficialReady) {
        targetApi = ServiceId.OfficialLLM;
      } else if (customServices[0]?.id) {
        targetApi = customServices[0].id;
      } else {
        targetApi = ServiceId.OfficialLLM;
      }
    }
  }

  if (targetApi === ServiceId.OfficialLLM) {
    const apiKey = String(stored.officialLLMKey || "").trim();
    const model = String(stored.officialLLMModel || "").trim();
    const serviceName = getServiceDisplayName(ServiceId.OfficialLLM);
    if (!apiKey) {
      const err = new Error(t("error.officialNeedKey"));
      err.needConfig = true;
      throw err;
    }
    if (!model) {
      const err = new Error(t("error.officialNeedModel"));
      err.needConfig = true;
      throw err;
    }
    return {
      apiCode: ServiceId.OfficialLLM,
      serviceName,
      endpoint: resolveChatCompletionsUrl(
        stored.officialLLMBaseUrl || OFFICIAL_LLM_BASE_URL,
        `${OFFICIAL_LLM_BASE_URL}/chat/completions`
      ),
      apiKey,
      model,
      streamEnabled: stored.officialLLMStreamEnabled !== false,
      maxConcurrency: normalizeLlmConcurrency(
        stored.officialLLMMaxConcurrency,
        DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY
      ),
    };
  }

  if (isCustomOpenAIServiceId(targetApi)) {
    const svc = customServices.find((item) => item?.id === targetApi);
    if (!svc) {
      const err = new Error(t("error.customNotFound"));
      err.needConfig = true;
      throw err;
    }
    const serviceName = svc.name || t("service.customDefault");
    const baseUrl = String(svc.baseUrl || "").trim();
    const model = String(svc.model || "").trim();
    if (!baseUrl) {
      const err = new Error(t("error.customNeedBaseUrl", { name: serviceName }));
      err.needConfig = true;
      throw err;
    }
    if (!model) {
      const err = new Error(t("error.customNeedModel", { name: serviceName }));
      err.needConfig = true;
      throw err;
    }
    return {
      apiCode: svc.id,
      serviceName,
      endpoint: resolveChatCompletionsUrl(baseUrl),
      apiKey: String(svc.apiKey || "").trim(),
      model,
      streamEnabled: svc.streamEnabled !== false,
      maxConcurrency: normalizeLlmConcurrency(
        svc.maxConcurrency,
        DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY
      ),
    };
  }

  const err = new Error("请先在扩展配置页配置一个大模型服务（如友情赞助商或自定义 OpenAI 兼容服务）。");
  err.needConfig = true;
  throw err;
}

async function consumeClassroomSSE(response, onDelta, signal) {
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!response.body || contentType.includes("application/json")) {
    const rawText = await response.text();
    let json;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      throw new Error(rawText.slice(0, 200) || "无效 JSON 响应");
    }
    const apiErr = extractApiErrorMessage(json);
    if (apiErr) throw new Error(apiErr.slice(0, 240));
    const full = json?.choices?.[0]?.message?.content || "";
    if (full) onDelta(full);
    return full;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let lineBuffer = "";
  let accumulated = "";
  let sawSseData = false;
  let nonSseSample = "";

  const processLine = (rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith(":")) return false;
    if (!line.startsWith("data:")) {
      if (!sawSseData && nonSseSample.length < 4096) {
        nonSseSample += (nonSseSample ? "\n" : "") + line;
      }
      return false;
    }
    sawSseData = true;
    const payload = line.slice(5).trim();
    if (!payload) return false;
    if (payload === "[DONE]") return true;

    let parsed;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return false;
    }
    const apiErr = extractApiErrorMessage(parsed);
    if (apiErr) throw new Error(apiErr.slice(0, 240));

    const delta =
      parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content ?? "";
    if (delta) {
      accumulated += delta;
      onDelta(delta);
    }
    return false;
  };

  try {
    while (true) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop() ?? "";
      for (const line of lines) {
        if (processLine(line)) return accumulated;
      }
    }

    const tail = lineBuffer + decoder.decode();
    if (tail.trim()) {
      for (const line of tail.split(/\r?\n/)) {
        if (processLine(line)) return accumulated;
      }
    }

    if (!sawSseData && nonSseSample.trim()) {
      try {
        const json = JSON.parse(nonSseSample.trim());
        const apiErr = extractApiErrorMessage(json);
        if (apiErr) throw new Error(apiErr.slice(0, 240));
        const full = json?.choices?.[0]?.message?.content || "";
        if (full) {
          accumulated += full;
          onDelta(full);
        }
      } catch (e) {
        if (e instanceof Error && !(e instanceof SyntaxError)) throw e;
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }

  return accumulated;
}

async function requestClassroomCompletion(llmCfg, prompt, { signal, onDelta } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (llmCfg.apiKey) {
    headers.Authorization = `Bearer ${llmCfg.apiKey}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 95000);
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  const useStream = Boolean(onDelta && llmCfg.streamEnabled !== false);
  let res;
  try {
    res = await fetch(llmCfg.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: llmCfg.model,
        temperature: 0.3,
        stream: useStream,
        messages: [
          {
            role: "system",
            content:
              "You are a professional language teacher. Always respond with strict valid JSON only, without markdown explanations outside the JSON object.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onExternalAbort);
    if (signal?.aborted) {
      throw err;
    }
    if (err?.name === "AbortError") {
      throw new Error(`【${llmCfg.serviceName}】分析字幕超时，请重试或切换响应更快的模型。`);
    }
    throw new Error(
      t("error.networkFailed", { name: llmCfg.serviceName, msg: err?.message || String(err) })
    );
  }

  try {
    if (!res.ok) {
      const rawText = await res.text();
      let detail = `HTTP ${res.status}`;
      if (rawText) {
        try {
          const errJson = JSON.parse(rawText);
          detail =
            extractApiErrorMessage(errJson) ||
            errJson?.error?.message ||
            errJson?.message ||
            rawText.slice(0, 240);
        } catch {
          detail = rawText.slice(0, 240);
        }
      }
      const err = new Error(t("error.serverReturned", { name: llmCfg.serviceName, detail }));
      if (res.status === 401 || res.status === 403) err.needConfig = true;
      throw err;
    }

    if (useStream) {
      const content = await consumeClassroomSSE(res, onDelta, controller.signal);
      if (!content || typeof content !== "string") {
        throw new Error(`【${llmCfg.serviceName}】未返回有效文本内容，请稍后重试。`);
      }
      return content;
    }

    const rawText = await res.text();
    let json;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      throw new Error(
        t("error.serverReturned", {
          name: llmCfg.serviceName,
          detail: rawText.slice(0, 200) || "无效 JSON 响应",
        })
      );
    }

    const apiErr = extractApiErrorMessage(json);
    if (apiErr) {
      throw new Error(
        t("error.serverReturned", { name: llmCfg.serviceName, detail: apiErr.slice(0, 240) })
      );
    }

    const content = json?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error(`【${llmCfg.serviceName}】未返回有效文本内容，请稍后重试。`);
    }
    return content;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}

function createStreamingProgressScanner(batchCues) {
  let buffer = "";
  let scannedLen = 0;
  let lastCount = 0;
  let maxMatchedCueIdx = -1;
  let latestTerm = "";

  return {
    push(delta) {
      buffer += delta;
      // Avoid rescanning on every tiny 1-token delta unless closing brace arrived or enough chars accumulated
      const shouldScan = delta.includes("}") || buffer.length - scannedLen >= 180;
      if (!shouldScan) {
        return {
          changed: false,
          charCount: buffer.length,
          itemCount: lastCount,
          maxMatchedCueIdx,
          latestTerm,
        };
      }
      scannedLen = buffer.length;
      const cleaned = stripThinkAndFences(buffer);
      const items = salvageTruncatedItems(cleaned);
      const prevCount = lastCount;
      if (items.length > lastCount) {
        for (let i = lastCount; i < items.length; i += 1) {
          const it = items[i];
          if (it?.term) latestTerm = String(it.term).trim();
          const matched = findMatchingCueWithIndex(batchCues, it);
          if (matched && matched.index > maxMatchedCueIdx) {
            maxMatchedCueIdx = matched.index;
          }
        }
        lastCount = items.length;
      }
      return {
        changed: lastCount !== prevCount,
        charCount: buffer.length,
        itemCount: lastCount,
        maxMatchedCueIdx,
        latestTerm,
      };
    },
  };
}

function setCacheEntry(key, value) {
  if (classroomCache.has(key)) {
    classroomCache.delete(key);
  }
  classroomCache.set(key, value);
  while (classroomCache.size > CLASSROOM_CACHE_LIMIT) {
    const oldestKey = classroomCache.keys().next().value;
    classroomCache.delete(oldestKey);
  }
}

export async function extractClassroomVocabulary(
  {
    apiCode,
    track,
    cues,
    videoTitle = "",
    platform = "bilibili",
    bvid = "",
    videoId = "",
    pageUrl = "",
    difficultyRatio = 20,
    targetLanguage = "",
    sectionId = "sec-1",
    sectionIndex = 0,
    sectionTitle = "",
    sectionTimeRange = "",
    isMultiSection = false,
    forceRefresh = false,
  } = {},
  { signal, onProgress } = {}
) {
  try {
    const cleanedCues = cleanSubtitleCues(
      Array.isArray(cues) ? cues : Array.isArray(track?.cues) ? track.cues : []
    );
    if (cleanedCues.length === 0) {
      return {
        ok: false,
        error: "所选字幕轨道为空，请选择其他包含字幕内容的轨道。",
      };
    }

    const storedDest = await chrome.storage.local.get({
      destination: defaultOptions.destination,
      pageTrsDest: defaultOptions.pageTrsDest,
    });
    const resolvedTarget =
      String(targetLanguage || "").trim() ||
      storedDest.pageTrsDest?.[0] ||
      storedDest.destination ||
      "中文(简体)";

    const llmCfg = await resolveLlmConfig(apiCode);
    const ratio = Math.min(50, Math.max(5, Number(difficultyRatio) || 20));
    const cacheKey = [
      "v3",
      videoId || bvid || pageUrl,
      track?.key || track?.id || track?.lan || "default",
      sectionId || "sec-1",
      ratio,
      resolvedTarget,
      llmCfg.apiCode,
      llmCfg.model,
    ].join("::");

    if (!forceRefresh && classroomCache.has(cacheKey)) {
      const cached = classroomCache.get(cacheKey);
      onProgress?.({
        sectionId,
        sectionIndex,
        stage: "done",
        processedCues: cleanedCues.length,
        totalCues: cleanedCues.length,
        batchIndex: 1,
        batchCount: 1,
        extractedCount: cached.items?.length || 0,
        latestTerm: cached.items?.[cached.items.length - 1]?.term || "",
      });
      return {
        ...cached,
        fromCache: true,
      };
    }

    const estimatedWords = estimateUniqueLexicalUnits(cleanedCues);
    const { minCount, maxCount } = computeSectionVocabTarget(
      estimatedWords,
      ratio,
      Boolean(isMultiSection)
    );
    const batches = splitSectionIntoBatches(cleanedCues);
    const totalCues = cleanedCues.length;

    const emitProgress = (info) => {
      if (!onProgress || signal?.aborted) return;
      onProgress({
        sectionId,
        sectionIndex,
        totalCues,
        batchCount: batches.length,
        ...info,
      });
    };

    emitProgress({
      stage: "analyzing",
      processedCues: 0,
      batchIndex: 1,
      extractedCount: 0,
      latestTerm: "",
    });

    const combinedRawItems = [];
    const seenTerms = [];
    let detectedLanguage = "";
    let summary = "";
    let highestReportedCues = 0;

    for (let bIdx = 0; bIdx < batches.length; bIdx += 1) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const batch = batches[bIdx];
      const batchWeight = batch.cues.length / Math.max(1, totalCues);
      const batchMin = Math.max(
        4,
        Math.round(minCount * batchWeight)
      );
      const batchMax = Math.max(
        batchMin + 2,
        Math.round(maxCount * batchWeight)
      );
      const expectedBatchItems = Math.max(4, Math.round((batchMin + batchMax) / 2));

      const transcript = batch.cues
        .map((c) => `[${formatSubtitleTime(c.from)}] ${c.content}`)
        .join("\n");

      const prompt = buildBatchPrompt({
        transcript,
        videoTitle,
        platform,
        trackLabel: track?.lanDoc || track?.lan || "",
        trackLang: track?.lan || "",
        targetLanguage: resolvedTarget,
        ratio,
        minCount: batchMin,
        maxCount: batchMax,
        sectionTitle,
        sectionTimeRange,
        excludeTerms: seenTerms,
        needSummary: bIdx === 0,
      });

      const scanner = createStreamingProgressScanner(batch.cues);
      let lastEmitTs = 0;
      const batchLen = batch.cues.length;

      emitProgress({
        stage: "analyzing",
        processedCues: Math.max(highestReportedCues, batch.startOffset),
        batchIndex: bIdx + 1,
        extractedCount: combinedRawItems.length,
        latestTerm: seenTerms[seenTerms.length - 1] || "",
      });

      const rawContent = await runWithLlmConcurrency(
        {
          apiCode: llmCfg.apiCode,
          maxConcurrency: llmCfg.maxConcurrency,
          signal,
        },
        () =>
          requestClassroomCompletion(llmCfg, prompt, {
            signal,
            onDelta: onProgress
              ? (delta) => {
                  const status = scanner.push(delta);
                  const now = Date.now();
                  if (!status.changed && now - lastEmitTs < 140) return;
                  lastEmitTs = now;

                  // Blend item completion ratio + matched cue position + gentle token ramp
                  const itemProgress = Math.min(0.94, status.itemCount / expectedBatchItems);
                  const charProgress = Math.min(0.22, status.charCount / (expectedBatchItems * 420));
                  const cueProgress =
                    status.maxMatchedCueIdx >= 0
                      ? Math.min(0.95, (status.maxMatchedCueIdx + 1) / Math.max(1, batchLen))
                      : 0;
                  const blendedRatio = Math.min(
                    0.96,
                    Math.max(charProgress, itemProgress * 0.72 + cueProgress * 0.28, itemProgress)
                  );
                  const estimatedInBatch = Math.min(
                    Math.max(0, batchLen - 1),
                    Math.max(1, Math.round(batchLen * blendedRatio))
                  );
                  const currentProcessed = Math.min(
                    totalCues - 1,
                    Math.max(highestReportedCues, batch.startOffset + estimatedInBatch)
                  );
                  highestReportedCues = currentProcessed;

                  emitProgress({
                    stage: "streaming",
                    processedCues: currentProcessed,
                    batchIndex: bIdx + 1,
                    extractedCount: combinedRawItems.length + status.itemCount,
                    latestTerm: status.latestTerm || seenTerms[seenTerms.length - 1] || "",
                  });
                }
              : undefined,
          })
      );

      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const parsed = parseClassroomJson(rawContent);
      if (!detectedLanguage && parsed.detectedLanguage) {
        detectedLanguage = String(parsed.detectedLanguage).trim();
      }
      if (!summary && parsed.summary) {
        summary = String(parsed.summary).trim();
      }

      for (const item of parsed.items || []) {
        if (!item || !item.term) continue;
        combinedRawItems.push(item);
        const cleanT = String(item.term).trim();
        if (cleanT && !seenTerms.includes(cleanT)) {
          seenTerms.push(cleanT);
        }
      }

      highestReportedCues = Math.max(highestReportedCues, batch.endOffset);
      emitProgress({
        stage: bIdx === batches.length - 1 ? "finalizing" : "analyzing",
        processedCues: highestReportedCues,
        batchIndex: bIdx + 1,
        extractedCount: combinedRawItems.length,
        latestTerm: seenTerms[seenTerms.length - 1] || "",
      });
    }

    const items = normalizeVocabularyItems(combinedRawItems, cleanedCues);
    if (items.length === 0) {
      return {
        ok: false,
        error: "大模型未能提取出有效单词或短语，请尝试重新提取。",
      };
    }

    // Sort highest difficulty first while preserving relative order for ties
    items.sort((a, b) => (b.difficulty || 4) - (a.difficulty || 4));

    const ttsSource =
      mapSubtitleLangToTtsSource(track?.lan, track?.lanDoc) ||
      mapSubtitleLangToTtsSource("", detectedLanguage || "") ||
      (hasArabicScript(items[0]?.term || cleanedCues[0]?.content || "") ? "阿拉伯语" : "");

    const payload = {
      ok: true,
      fromCache: false,
      sectionId,
      sectionIndex,
      sectionTitle,
      sectionTimeRange,
      apiCode: llmCfg.apiCode,
      serviceName: llmCfg.serviceName,
      model: llmCfg.model,
      difficultyRatio: ratio,
      targetLanguage: resolvedTarget,
      detectedLanguage: String(detectedLanguage || track?.lanDoc || track?.lan || "").trim(),
      ttsSource,
      summary: String(summary || "").trim(),
      estimatedWords,
      totalCues,
      batchCount: batches.length,
      items,
      generatedAt: Date.now(),
    };

    setCacheEntry(cacheKey, payload);
    emitProgress({
      stage: "done",
      processedCues: totalCues,
      batchIndex: batches.length,
      extractedCount: items.length,
      latestTerm: items[items.length - 1]?.term || "",
    });
    return payload;
  } catch (err) {
    if (signal?.aborted || err?.name === "AbortError") {
      return { ok: false, aborted: true, error: "已取消分析" };
    }
    return {
      ok: false,
      error: err?.message || "提取难点词汇失败，请稍后重试。",
      needConfig: Boolean(err?.needConfig),
    };
  }
}

export function registerClassroomStreamHandler() {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "ndt-classroom-stream") return;

    const controller = new AbortController();
    port.onDisconnect.addListener(() => {
      controller.abort();
    });

    port.onMessage.addListener(async (msg) => {
      if (!msg || msg.action !== "extract classroom vocabulary") return;
      const res = await extractClassroomVocabulary(msg.data || {}, {
        signal: controller.signal,
        onProgress(progress) {
          if (!controller.signal.aborted) {
            safePost(port, { type: "progress", progress });
          }
        },
      });
      if (controller.signal.aborted) return;
      if (res?.ok) {
        safePost(port, { type: "done", result: res });
      } else {
        safePost(port, {
          type: "error",
          error: res?.error || "提取难点词汇失败，请重试。",
          needConfig: Boolean(res?.needConfig),
          aborted: Boolean(res?.aborted),
        });
      }
    });
  });
}
