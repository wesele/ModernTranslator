import Dexie from "dexie";
import { VI as ServiceId } from "../shared/constants/services.js";
import { isCustomOpenAIServiceId } from "../shared/openaiUtils.js";
import { isLikelyApiErrorText } from "../shared/llmErrorUtils.js";

export const CACHE_MAX_WORDS = 5;
export const CACHE_MAX_TEXT_LENGTH = 160;

const wordSegmenter =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("zh", { granularity: "word" })
    : null;

const translationCacheDb = new (class extends Dexie {
  constructor() {
    super("ndt_translation_cache");
    this.version(1).stores({
      entries: "key, apiCode, updatedAt",
    });
    this.entries = this.table("entries");
  }
})();

export function normalizeCacheText(text) {
  return String(text ?? "").trim();
}

export function normalizeSourceLang(source) {
  const s = String(source ?? "").trim();
  return s || "auto";
}

export function countTranslationUnitWords(text) {
  const trimmed = normalizeCacheText(text);
  if (!trimmed) return 0;
  if (wordSegmenter) {
    let count = 0;
    for (const part of wordSegmenter.segment(trimmed)) {
      if (part.isWordLike) {
        count += 1;
        if (count >= CACHE_MAX_WORDS) return count;
      }
    }
    return count;
  }
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function isCacheableTranslationUnit(text) {
  const trimmed = normalizeCacheText(text);
  if (!trimmed || trimmed.length > CACHE_MAX_TEXT_LENGTH) return false;
  const wordCount = countTranslationUnitWords(trimmed);
  return wordCount > 0 && wordCount < CACHE_MAX_WORDS;
}

function buildCacheKey({ apiCode, source, destination, text }) {
  return `${apiCode}\u0000${normalizeSourceLang(source)}\u0000${destination}\u0000${normalizeCacheText(text)}`;
}

async function resolveServiceCacheModel(apiCode) {
  if (!apiCode) return "";
  try {
    if (apiCode === ServiceId.OfficialLLM) {
      const data = await chrome.storage.local.get({ officialLLMModel: "" });
      return String(data.officialLLMModel || "").trim();
    }
    if (isCustomOpenAIServiceId(apiCode)) {
      const data = await chrome.storage.local.get({ customOpenAIServices: [] });
      const matched = (data.customOpenAIServices || []).find((item) => item?.id === apiCode);
      return String(matched?.model || "").trim();
    }
  } catch {
    // ignore storage read issues
  }
  return "";
}

function isModelCompatible(entry, activeModel) {
  if (!activeModel) return !entry.model;
  if (!entry.model) return true;
  return entry.model === activeModel;
}

export async function lookupSingleTranslationCache({
  apiCode,
  source,
  destination,
  destKey,
  text,
}) {
  if (!apiCode || !destination || !isCacheableTranslationUnit(text)) {
    return null;
  }
  try {
    const key = buildCacheKey({ apiCode, source, destination, text });
    const [entry, activeModel] = await Promise.all([
      translationCacheDb.entries.get(key),
      resolveServiceCacheModel(apiCode),
    ]);
    if (!entry || !isModelCompatible(entry, activeModel)) {
      return null;
    }
    const cachedText =
      entry.translatedText ||
      (entry.singleResult?.result?.length ? entry.singleResult.result.join("\n") : "");
    if (entry.singleResult?.error || isLikelyApiErrorText(cachedText, text)) {
      translationCacheDb.entries.delete(key).catch(() => {});
      return null;
    }
    if (entry.singleResult && entry.singleDestKey === destKey) {
      return entry.singleResult;
    }
    if (entry.translatedText) {
      const normSource = normalizeSourceLang(source);
      return {
        text: normalizeCacheText(text),
        from: entry.from || (normSource === "auto" ? undefined : source),
        to: destination,
        result: [entry.translatedText],
      };
    }
    return null;
  } catch (err) {
    console.warn("[NDT cache] single lookup failed:", err);
    return null;
  }
}

export async function saveSingleTranslationCache({
  apiCode,
  source,
  destination,
  destKey,
  text,
  response,
}) {
  if (!apiCode || !destination || !response || response.error || !isCacheableTranslationUnit(text)) {
    return;
  }
  const translatedText = response.result?.length
    ? response.result.join("\n").trim()
    : String(response.dict?.[0]?.terms?.[0] || "").trim();
  if (!translatedText || isLikelyApiErrorText(translatedText, text)) return;

  try {
    const trimmed = normalizeCacheText(text);
    const key = buildCacheKey({ apiCode, source, destination, text: trimmed });
    const activeModel = await resolveServiceCacheModel(apiCode);
    await translationCacheDb.entries.put({
      key,
      apiCode,
      model: activeModel,
      text: trimmed,
      source: normalizeSourceLang(source),
      destination,
      from: response.from || "",
      translatedText,
      singleDestKey: destKey,
      singleResult: response,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn("[NDT cache] single save failed:", err);
  }
}

export async function lookupBatchTranslationCache({ apiCode, source, destination, texts }) {
  const hits = new Map();
  if (!apiCode || !destination || !Array.isArray(texts) || !texts.length) {
    return hits;
  }
  const candidates = [];
  texts.forEach((text, index) => {
    if (isCacheableTranslationUnit(text)) {
      candidates.push({
        index,
        key: buildCacheKey({ apiCode, source, destination, text }),
      });
    }
  });
  if (!candidates.length) {
    return hits;
  }

  try {
    const [entries, activeModel] = await Promise.all([
      translationCacheDb.entries.bulkGet(candidates.map((c) => c.key)),
      resolveServiceCacheModel(apiCode),
    ]);
    const poisonedKeys = [];
    entries.forEach((entry, i) => {
      if (!entry || !entry.translatedText) return;
      if (!isModelCompatible(entry, activeModel)) return;
      const candidate = candidates[i];
      if (
        entry.singleResult?.error ||
        isLikelyApiErrorText(entry.translatedText, texts[candidate.index])
      ) {
        poisonedKeys.push(candidate.key);
        return;
      }
      hits.set(candidate.index, entry.translatedText);
    });
    if (poisonedKeys.length) {
      translationCacheDb.entries.bulkDelete(poisonedKeys).catch(() => {});
    }
  } catch (err) {
    console.warn("[NDT cache] batch lookup failed:", err);
  }
  return hits;
}

export async function saveBatchTranslationCache({ apiCode, source, destination, items }) {
  if (!apiCode || !destination || !Array.isArray(items) || !items.length) {
    return;
  }
  const deduped = new Map();
  for (const item of items) {
    if (!item || !isCacheableTranslationUnit(item.text)) continue;
    const translatedText = String(item.translatedText ?? "").trim();
    if (!translatedText || isLikelyApiErrorText(translatedText, item.text)) continue;
    const trimmed = normalizeCacheText(item.text);
    const key = buildCacheKey({ apiCode, source, destination, text: trimmed });
    deduped.set(key, {
      key,
      apiCode,
      text: trimmed,
      source: normalizeSourceLang(source),
      destination,
      translatedText,
    });
  }
  if (!deduped.size) return;

  try {
    const keys = Array.from(deduped.keys());
    const [existingEntries, activeModel] = await Promise.all([
      translationCacheDb.entries.bulkGet(keys),
      resolveServiceCacheModel(apiCode),
    ]);
    const now = Date.now();
    const records = keys.map((key, idx) => {
      const payload = deduped.get(key);
      const existing = existingEntries[idx];
      const keepSingle =
        existing &&
        existing.singleResult &&
        existing.translatedText === payload.translatedText &&
        isModelCompatible(existing, activeModel);
      return {
        ...payload,
        model: activeModel,
        from: keepSingle ? existing.from : "",
        singleDestKey: keepSingle ? existing.singleDestKey : undefined,
        singleResult: keepSingle ? existing.singleResult : undefined,
        updatedAt: now,
      };
    });
    await translationCacheDb.entries.bulkPut(records);
  } catch (err) {
    console.warn("[NDT cache] batch save failed:", err);
  }
}

export async function getTranslationCacheStats(apiCode) {
  try {
    if (apiCode) {
      const count = await translationCacheDb.entries.where("apiCode").equals(apiCode).count();
      return { counts: { [apiCode]: count } };
    }
    const keys = await translationCacheDb.entries.orderBy("apiCode").keys();
    const counts = {};
    for (const id of keys) {
      counts[id] = (counts[id] || 0) + 1;
    }
    return { counts };
  } catch (err) {
    console.warn("[NDT cache] stats failed:", err);
    return { counts: {} };
  }
}

export async function clearTranslationCache(apiCode) {
  try {
    if (apiCode) {
      await translationCacheDb.entries.where("apiCode").equals(apiCode).delete();
    } else {
      await translationCacheDb.entries.clear();
    }
    return getTranslationCacheStats(apiCode);
  } catch (err) {
    console.warn("[NDT cache] clear failed:", err);
    return { counts: apiCode ? { [apiCode]: 0 } : {} };
  }
}
