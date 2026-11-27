import { VI as ServiceId } from "../shared/constants/services.js";
import { g2 as defaultOptions } from "../shared/constants/defaults.js";
import {
  buildBatchPrompt,
  createBatchStreamParser,
} from "../shared/llmBatchProtocol.js";
import {
  DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY,
  DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY,
  OFFICIAL_LLM_BASE_URL,
  OFFICIAL_LLM_NAME,
  isCustomOpenAIServiceId,
  normalizeLlmConcurrency,
  resolveChatCompletionsUrl,
} from "../shared/openaiUtils.js";
import { runWithLlmConcurrency } from "./llmConcurrency.js";
import {
  lookupBatchTranslationCache,
  saveBatchTranslationCache,
} from "./translationCache.js";
import { t, getServiceDisplayName } from "../shared/i18n/index.js";
import {
  extractApiErrorMessage,
  isLikelyApiErrorText,
  isRateLimitOrOverload,
} from "../shared/llmErrorUtils.js";

function safePost(port, msg) {
  try {
    port.postMessage(msg);
  } catch {
    // Port disconnected; ignore
  }
}

async function readErrorMessage(response) {
  const fallback = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  try {
    const text = await response.text();
    if (!text) return fallback;
    try {
      const json = JSON.parse(text);
      const msg = extractApiErrorMessage(json);
      if (msg) return String(msg);
    } catch {
      // Non-JSON error body
    }
    return text.slice(0, 240);
  } catch {
    return fallback;
  }
}

async function consumeSSEStream(response, extractDelta, onChunkText, signal) {
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!response.body) {
    throw new Error(t("error.emptyResponseBody"));
  }

  // Fallback for proxies that return plain JSON even when stream: true is sent
  if (contentType.includes("application/json")) {
    const rawText = await response.text();
    let json;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      throw new Error(rawText.slice(0, 240) || t("error.emptyResponseBody"));
    }
    const errMsg = extractApiErrorMessage(json);
    if (errMsg) {
      throw new Error(errMsg);
    }
    const text = extractDelta(json, true);
    if (text) onChunkText(text);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let lineBuffer = "";
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

    const errMsg = extractApiErrorMessage(parsed);
    if (errMsg) {
      throw new Error(errMsg);
    }

    const delta = extractDelta(parsed, false);
    if (delta) onChunkText(delta);
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
        if (processLine(line)) return;
      }
    }

    const tail = lineBuffer + decoder.decode();
    if (tail.trim()) {
      for (const line of tail.split(/\r?\n/)) {
        if (processLine(line)) return;
      }
    }

    if (!sawSseData && nonSseSample.trim()) {
      const trimmed = nonSseSample.trim();
      try {
        const json = JSON.parse(trimmed);
        const errMsg = extractApiErrorMessage(json);
        if (errMsg) {
          throw new Error(errMsg);
        }
        const text = extractDelta(json, true);
        if (text) onChunkText(text);
        return;
      } catch (parseOrApiErr) {
        if (
          parseOrApiErr instanceof Error &&
          !(parseOrApiErr instanceof SyntaxError)
        ) {
          throw parseOrApiErr;
        }
      }
      if (isLikelyApiErrorText(trimmed) || /^(?:<!doctype|<html)/i.test(trimmed)) {
        throw new Error(trimmed.slice(0, 240));
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}

async function streamDirectOpenAIChat(
  { endpoint, apiKey, model, customPrompt, streamEnabled = true, isOfficial = false },
  batchInput,
  onChunkText,
  signal
) {
  const { prompt } = buildBatchPrompt({
    ...batchInput,
    customPrompt,
  });

  const headers = { "Content-Type": "application/json" };
  const trimmedKey = String(apiKey || "").trim();
  if (trimmedKey) {
    headers.Authorization = `Bearer ${trimmedKey}`;
  }

  const shouldStream = streamEnabled !== false;
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      stream: shouldStream,
      messages: [{ role: "user", content: prompt }],
    }),
    signal,
  });

  if (!res.ok) {
    const detail = await readErrorMessage(res);
    if (isOfficial && isRateLimitOrOverload(res.status, detail)) {
      throw new Error(t("error.officialBusy", { detail: String(detail).slice(0, 160) }));
    }
    throw new Error(detail);
  }

  if (!shouldStream) {
    const rawText = await res.text();
    let json;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      throw new Error(rawText.slice(0, 240) || t("error.emptyResponseBody"));
    }
    const errMsg = extractApiErrorMessage(json);
    if (errMsg) {
      throw new Error(errMsg);
    }
    const content = json?.choices?.[0]?.message?.content || "";
    if (content) onChunkText(content);
    return true;
  }

  await consumeSSEStream(
    res,
    (json, isFullJson) => {
      if (isFullJson) {
        return json?.choices?.[0]?.message?.content || "";
      }
      return json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content ?? "";
    },
    onChunkText,
    signal
  );

  return true;
}

async function streamOfficialLlm(batchInput, onChunkText, signal) {
  const stored = await chrome.storage.local.get({
    officialLLMBaseUrl: defaultOptions.officialLLMBaseUrl ?? OFFICIAL_LLM_BASE_URL,
    officialLLMKey: "",
    officialLLMModel: "",
    officialLLMPrompt: "",
    officialLLMStreamEnabled: true,
    officialLLMMaxConcurrency:
      defaultOptions.officialLLMMaxConcurrency ?? DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY,
  });

  const apiKey = String(stored.officialLLMKey || "").trim();
  if (!apiKey) {
    throw new Error(t("error.officialNeedKeyBatch"));
  }
  const model = String(stored.officialLLMModel || "").trim();
  if (!model) {
    throw new Error(t("error.officialNeedModelBatch"));
  }

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
      signal,
    },
    () =>
      streamDirectOpenAIChat(
        {
          endpoint,
          apiKey,
          model,
          customPrompt: stored.officialLLMPrompt,
          isOfficial: true,
          streamEnabled:
            batchInput?.streamEnabled !== undefined
              ? batchInput.streamEnabled
              : stored.officialLLMStreamEnabled !== false,
        },
        batchInput,
        onChunkText,
        signal
      )
  );
}

async function streamCustomOpenAIService(apiCode, batchInput, onChunkText, signal) {
  const { customOpenAIServices = [] } = await chrome.storage.local.get({
    customOpenAIServices: [],
  });
  const svc = customOpenAIServices.find((item) => item?.id === apiCode);
  if (!svc) {
    throw new Error(t("error.customNotFound"));
  }
  const baseUrl = String(svc.baseUrl || "").trim();
  if (!baseUrl) {
    throw new Error(t("error.customNeedBaseUrl", { name: svc.name || apiCode }));
  }
  const model = String(svc.model || "").trim();
  if (!model) {
    throw new Error(t("error.customNeedModel", { name: svc.name || apiCode }));
  }

  const endpoint = resolveChatCompletionsUrl(baseUrl);
  const maxConcurrency = normalizeLlmConcurrency(
    svc.maxConcurrency,
    DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY
  );

  return runWithLlmConcurrency(
    {
      apiCode,
      maxConcurrency,
      signal,
    },
    () =>
      streamDirectOpenAIChat(
        {
          endpoint,
          apiKey: svc.apiKey,
          model,
          customPrompt: svc.prompt,
          streamEnabled:
            batchInput?.streamEnabled !== undefined
              ? batchInput.streamEnabled
              : svc.streamEnabled !== false,
        },
        batchInput,
        onChunkText,
        signal
      )
  );
}

async function invokeStreamProvider(apiCode, batchInput, onChunkText, signal) {
  if (apiCode === ServiceId.OfficialLLM) {
    return streamOfficialLlm(batchInput, onChunkText, signal);
  }
  if (isCustomOpenAIServiceId(apiCode)) {
    return streamCustomOpenAIService(apiCode, batchInput, onChunkText, signal);
  }
  return false;
}

export function registerLlmBatchStreamHandler() {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "ndt-llm-batch-stream") return;

    const controller = new AbortController();
    port.onDisconnect.addListener(() => {
      controller.abort();
    });

    port.onMessage.addListener(async (msg) => {
      if (!msg || msg.action !== "translate batch stream") return;

      const { apiCode, source, destination, texts, streamEnabled } = msg.data || {};
      if (!Array.isArray(texts) || !texts.length) {
        safePost(port, { type: "done", results: [] });
        return;
      }

      let serviceName = apiCode;
      if (apiCode === ServiceId.OfficialLLM) {
        serviceName = getServiceDisplayName(ServiceId.OfficialLLM);
      } else if (isCustomOpenAIServiceId(apiCode)) {
        const { customOpenAIServices = [] } = await chrome.storage.local.get({
          customOpenAIServices: [],
        });
        const matched = customOpenAIServices.find((item) => item?.id === apiCode);
        if (matched?.name) serviceName = matched.name;
      }

      try {
        const cachedHits = await lookupBatchTranslationCache({
          apiCode,
          source,
          destination,
          texts,
        });
        if (controller.signal.aborted) return;

        cachedHits.forEach((cachedText, origIdx) => {
          safePost(port, { type: "item-done", index: origIdx, text: cachedText });
        });

        const missEntries = [];
        texts.forEach((txt, origIdx) => {
          if (!cachedHits.has(origIdx)) {
            missEntries.push({ origIndex: origIdx, text: txt });
          }
        });

        if (!missEntries.length) {
          safePost(port, {
            type: "done",
            results: texts.map((_, idx) => (cachedHits.has(idx) ? cachedHits.get(idx) : null)),
          });
          return;
        }

        const missTexts = missEntries.map((item) => item.text);
        const deltaTimers = new Map();
        const pendingDeltas = new Map();

        const flushDelta = (id) => {
          const timer = deltaTimers.get(id);
          if (timer) {
            clearTimeout(timer);
            deltaTimers.delete(id);
          }
          if (pendingDeltas.has(id)) {
            const text = pendingDeltas.get(id);
            pendingDeltas.delete(id);
            if (isLikelyApiErrorText(text, missEntries[id]?.text)) return;
            const orig = missEntries[id]?.origIndex;
            if (orig != null) {
              safePost(port, { type: "delta", index: orig, text });
            }
          }
        };

        const parser = createBatchStreamParser({
          onDelta(id, text) {
            if (id < 0 || id >= missTexts.length) return;
            pendingDeltas.set(id, text);
            if (!deltaTimers.has(id)) {
              deltaTimers.set(
                id,
                setTimeout(() => {
                  deltaTimers.delete(id);
                  flushDelta(id);
                }, 32)
              );
            }
          },
          onDone(id, text) {
            if (id < 0 || id >= missTexts.length) return;
            const timer = deltaTimers.get(id);
            if (timer) {
              clearTimeout(timer);
              deltaTimers.delete(id);
            }
            pendingDeltas.delete(id);
            if (isLikelyApiErrorText(text, missEntries[id]?.text)) return;
            const orig = missEntries[id]?.origIndex;
            if (orig != null) {
              safePost(port, { type: "item-done", index: orig, text });
            }
          },
        });

        try {
          const supported = await invokeStreamProvider(
            apiCode,
            { texts: missTexts, source, destination, streamEnabled },
            (chunkText) => parser.push(chunkText),
            controller.signal
          );
          if (!supported) {
            throw new Error(t("error.unsupportedStreamLlm", { name: serviceName }));
          }
        } finally {
          for (const timer of deltaTimers.values()) clearTimeout(timer);
          deltaTimers.clear();
          pendingDeltas.clear();
        }

        if (controller.signal.aborted) return;

        const { completedResults, rawFullText } = parser.finish(missTexts.length);
        let firstSegmentError = "";
        let validSegmentCount = 0;
        for (const [localIdx, val] of Array.from(completedResults.entries())) {
          const srcText = missEntries[localIdx]?.text ?? "";
          if (isLikelyApiErrorText(val, srcText)) {
            if (!firstSegmentError) firstSegmentError = String(val).trim();
            completedResults.delete(localIdx);
          } else {
            validSegmentCount += 1;
          }
        }

        if (
          validSegmentCount === 0 &&
          (firstSegmentError ||
            (rawFullText.trim() && isLikelyApiErrorText(rawFullText, missTexts[0])))
        ) {
          const errDetail = firstSegmentError || rawFullText.trim();
          throw new Error(errDetail.slice(0, 240));
        }

        const missResults = missTexts.map((_, idx) =>
          completedResults.has(idx) ? completedResults.get(idx) : null
        );

        await saveBatchTranslationCache({
          apiCode,
          source,
          destination,
          items: missEntries.map((entry, localIdx) => ({
            text: entry.text,
            translatedText: missResults[localIdx],
          })),
        });

        const merged = texts.map((_, idx) => (cachedHits.has(idx) ? cachedHits.get(idx) : null));
        missEntries.forEach((entry, localIdx) => {
          if (missResults[localIdx] != null) {
            merged[entry.origIndex] = missResults[localIdx];
          }
        });
        safePost(port, { type: "done", results: merged });
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err && typeof err === "object" && "message" in err && err.message
            ? String(err.message)
            : String(err || t("content.translateFailed"));
        const formattedMessage = message.startsWith(`【${serviceName}】`)
          ? message
          : `【${serviceName}】${message}`;
        safePost(port, {
          type: "error",
          error: {
            message: formattedMessage,
            link: err?.link,
          },
        });
      }
    });
  });
}
