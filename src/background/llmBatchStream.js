import { VI as ServiceId } from "../shared/constants/services.js";
import { g2 as defaultOptions } from "../shared/constants/defaults.js";
import {
  buildBatchPrompt,
  createBatchStreamParser,
} from "../shared/llmBatchProtocol.js";
import {
  OFFICIAL_LLM_BASE_URL,
  OFFICIAL_LLM_NAME,
  isCustomOpenAIServiceId,
  resolveChatCompletionsUrl,
} from "../shared/openaiUtils.js";
import {
  lookupBatchTranslationCache,
  saveBatchTranslationCache,
} from "./translationCache.js";

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
      const errObj = json?.error || json?.Response?.Error || json;
      const msg =
        errObj?.message ||
        errObj?.Message ||
        errObj?.error_msg ||
        json?.message;
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
    throw new Error("响应体为空");
  }

  // Fallback for proxies that return plain JSON even when stream: true is sent
  if (contentType.includes("application/json")) {
    const json = await response.json();
    const err = json?.error || json?.Response?.Error;
    if (err) {
      throw new Error(err.message || err.Message || JSON.stringify(err));
    }
    const text = extractDelta(json, true);
    if (text) onChunkText(text);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let lineBuffer = "";

  const processLine = (rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith(":")) return false;
    if (!line.startsWith("data:")) return false;

    const payload = line.slice(5).trim();
    if (!payload) return false;
    if (payload === "[DONE]") return true;

    let parsed;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return false;
    }

    if (parsed?.error) {
      throw new Error(parsed.error.message || JSON.stringify(parsed.error));
    }
    if (parsed?.Response?.Error) {
      throw new Error(parsed.Response.Error.Message || JSON.stringify(parsed.Response.Error));
    }
    if (parsed?.type === "error" && parsed?.error?.message) {
      throw new Error(parsed.error.message);
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
        processLine(line);
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
  { endpoint, apiKey, model, customPrompt, streamEnabled = true },
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
    throw new Error(await readErrorMessage(res));
  }

  if (!shouldStream) {
    const json = await res.json();
    const err = json?.error || json?.Response?.Error;
    if (err) {
      throw new Error(err.message || err.Message || JSON.stringify(err));
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
  });

  const apiKey = String(stored.officialLLMKey || "").trim();
  if (!apiKey) {
    throw new Error("请先在配置页面填写友情赞助商服务的 API Key，可点击「免费获取」前往赞助方页面获取。");
  }
  const model = String(stored.officialLLMModel || "").trim();
  if (!model) {
    throw new Error("请先在配置页面点击模型下拉框并选择一个模型。");
  }

  const endpoint = resolveChatCompletionsUrl(
    stored.officialLLMBaseUrl || OFFICIAL_LLM_BASE_URL,
    `${OFFICIAL_LLM_BASE_URL}/chat/completions`
  );

  return streamDirectOpenAIChat(
    {
      endpoint,
      apiKey,
      model,
      customPrompt: stored.officialLLMPrompt,
      streamEnabled:
        batchInput?.streamEnabled !== undefined
          ? batchInput.streamEnabled
          : stored.officialLLMStreamEnabled !== false,
    },
    batchInput,
    onChunkText,
    signal
  );
}

async function streamCustomOpenAIService(apiCode, batchInput, onChunkText, signal) {
  const { customOpenAIServices = [] } = await chrome.storage.local.get({
    customOpenAIServices: [],
  });
  const svc = customOpenAIServices.find((item) => item?.id === apiCode);
  if (!svc) {
    throw new Error("未找到对应的自定义 OpenAI 兼容服务配置，请检查配置页面。");
  }
  const baseUrl = String(svc.baseUrl || "").trim();
  if (!baseUrl) {
    throw new Error(`请先为「${svc.name || apiCode}」填写接口地址 (Base URL)。`);
  }
  const model = String(svc.model || "").trim();
  if (!model) {
    throw new Error(`请先为「${svc.name || apiCode}」选择模型。`);
  }

  const endpoint = resolveChatCompletionsUrl(baseUrl);
  return streamDirectOpenAIChat(
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
        serviceName = OFFICIAL_LLM_NAME;
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
            throw new Error(`不支持的流式大模型服务：${serviceName}`);
          }
        } finally {
          for (const timer of deltaTimers.values()) clearTimeout(timer);
          deltaTimers.clear();
          pendingDeltas.clear();
        }

        if (controller.signal.aborted) return;

        const { completedResults } = parser.finish(missTexts.length);
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
            : String(err || "翻译失败");
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
