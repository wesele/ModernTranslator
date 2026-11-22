const SOURCE_RATE_LIMIT_RE =
  /\b(?:429|rate[\s_-]*limit|too\s+many|quota|exhausted|throttl|cooldown|http\s*4\d\d|http\s*5\d\d)\b|(?:限流|配额|额度|并发|频繁|过多|超限|饱和|错误|失败|状态码)/i;

const HTTP_429_TAG_RE =
  /(?:^|[\s\[({"'【:])(?:http|status|code|err(?:or)?|resp(?:onse)?)\s*[:：=\-]?\s*429\b/i;

const CODE_429_WITH_CONTEXT_RE =
  /\b429\b[^\n]{0,40}(?:too\s+many\s+requests|rate[\s_-]*limit|quota|exhausted|throttl|cooldown|overload|busy|retry|exceeded|error|failed|unavailable|forbidden|denied|blocked|resource[\s_-]*exhausted|请求过多|请求过于频繁|限流|并发|超限|配额|饱和|负载|重试|错误|失败|异常|过多|忙碌|冷却|不可用)/i;

const CONTEXT_WITH_429_RE =
  /(?:too\s+many\s+requests|rate[\s_-]*limit|quota|exhausted|throttl|cooldown|overload|busy|retry|exceeded|error|failed|unavailable|resource[\s_-]*exhausted|请求过多|请求过于频繁|限流|并发|超限|配额|饱和|负载|重试|错误|失败|异常|服务器返回|接口返回|调用失败|请求失败)[^\n]{0,40}\b429\b/i;

const PREFIX_429_RE = /^(?:\[[^\]]*\]|【[^】]*】)?\s*429\s*(?:[:：\-]|$)/;

const RATE_LIMIT_PHRASE_RE =
  /\b(?:you exceeded your current quota|exceeded your current quota|insufficient_quota|rate[_\s-]*limit[_\s-]*(?:reached|exceeded)|too many requests(?:\s*[,.!:]|$)|resource has been exhausted|RESOURCE_EXHAUSTED|requests per min(?:ute)? limit|tokens per min(?:ute)? limit|model_cooldown|no available channel)\b|(?:请求过于频繁|触发限流|并发(?:数)?(?:已)?(?:达上限|过高|超限)|当前(?:模型|分组)?负载(?:过高|已饱和)|配额不足|额度已用尽|上游负载已饱和)/i;

const SERVICE_PREFIX_ERROR_RE =
  /^【[^】]{1,40}】.*?(?:\b429\b|too\s+many\s+requests|rate[\s_-]*limit|quota|error|failed|错误|失败|限流|超限)/i;

/**
 * Extract an API error message from a parsed JSON response or SSE chunk,
 * supporting OpenAI, New-API/One-API, CLIProxyAPI, Anthropic, Tencent, and
 * generic HTTP-status-wrapped JSON payloads.
 */
export function extractApiErrorMessage(payload) {
  if (!payload || typeof payload !== "object") return "";

  if (payload.error) {
    if (typeof payload.error === "string") {
      return payload.error.trim() || "Unknown API error";
    }
    if (typeof payload.error === "object") {
      const msg =
        payload.error.message ||
        payload.error.Message ||
        payload.error.msg ||
        payload.error.error_msg ||
        payload.error.detail;
      const code = payload.error.code ?? payload.error.status;
      if (msg) {
        const msgStr = String(msg).trim();
        if (code != null && code !== "" && !msgStr.includes(String(code))) {
          return `${code}: ${msgStr}`;
        }
        return msgStr;
      }
      return JSON.stringify(payload.error);
    }
  }

  if (payload.Response?.Error) {
    const errObj = payload.Response.Error;
    return String(errObj.Message || errObj.message || JSON.stringify(errObj));
  }

  if (payload.type === "error") {
    return String(
      payload.message || payload.msg || payload.error?.message || payload.error || "API error"
    );
  }

  if (payload.success === false && !payload.choices) {
    return String(payload.message || payload.msg || payload.error_msg || "API request failed");
  }

  if (!payload.choices) {
    const numCode = Number(payload.code ?? payload.status ?? payload.statusCode);
    if (Number.isFinite(numCode) && numCode >= 400) {
      const msg = payload.message || payload.msg || payload.error_msg || payload.detail || "";
      const msgStr = String(msg).trim();
      if (!msgStr) return `HTTP ${numCode}`;
      return msgStr.includes(String(numCode)) ? msgStr : `${numCode} ${msgStr}`;
    }
  }

  const choice0 = Array.isArray(payload.choices) ? payload.choices[0] : null;
  if (choice0?.error) {
    if (typeof choice0.error === "string") return choice0.error;
    return String(choice0.error.message || choice0.error.msg || JSON.stringify(choice0.error));
  }
  if (
    choice0?.finish_reason === "error" &&
    !choice0?.delta?.content &&
    !choice0?.message?.content
  ) {
    return String(payload.message || choice0.finish_details || "Upstream model error");
  }

  return "";
}

/**
 * Detect whether translated text is actually a 429/rate-limit/API error message
 * (for example, returned by a proxy inside assistant content or previously
 * poisoned into the translation cache).
 */
export function isLikelyApiErrorText(translatedText, sourceText = "") {
  const raw = String(translatedText ?? "").trim();
  if (!raw) return false;

  const src = String(sourceText ?? "").trim();

  if (raw.startsWith("{") && raw.endsWith("}")) {
    try {
      const parsed = JSON.parse(raw);
      if (extractApiErrorMessage(parsed) && !src.startsWith("{")) {
        return true;
      }
    } catch {
      // Non-JSON text
    }
  }

  if (!src.includes("【") && SERVICE_PREFIX_ERROR_RE.test(raw)) {
    return true;
  }

  if (raw.includes("429")) {
    const srcHasNonBare429 = src.includes("429") && !/^\s*429\s*$/.test(src);
    if (!srcHasNonBare429) {
      if (
        HTTP_429_TAG_RE.test(raw) ||
        CODE_429_WITH_CONTEXT_RE.test(raw) ||
        CONTEXT_WITH_429_RE.test(raw) ||
        (raw !== "429" && PREFIX_429_RE.test(raw))
      ) {
        return true;
      }
    } else if (
      /^(?:http\s+)?429[\s:：\-]+too\s+many\s+requests$/i.test(raw) &&
      !/too\s+many\s+requests/i.test(src)
    ) {
      return true;
    }
  }

  if (!SOURCE_RATE_LIMIT_RE.test(src) && RATE_LIMIT_PHRASE_RE.test(raw)) {
    return true;
  }

  return false;
}
