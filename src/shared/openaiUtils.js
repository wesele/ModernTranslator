import { t } from "./i18n/index.js";

export const OFFICIAL_LLM_ID = "OfficialLLM";
export const OFFICIAL_LLM_NAME = "友情赞助商";
export const OFFICIAL_LLM_BASE_URL = "https://api.19781018.xyz/v1";
export const OFFICIAL_LLM_PORTAL_URL = "https://api.19781018.xyz";
export const DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY = 1;
export const DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY = 4;
export const MIN_LLM_MAX_CONCURRENCY = 1;
export const MAX_LLM_MAX_CONCURRENCY = 32;

export function normalizeLlmConcurrency(
  value,
  fallback = DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY
) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < MIN_LLM_MAX_CONCURRENCY) {
    return fallback;
  }
  return Math.min(MAX_LLM_MAX_CONCURRENCY, Math.floor(num));
}

export function isCustomOpenAIServiceId(apiCode) {
  return typeof apiCode === "string" && apiCode.startsWith("custom-openai-");
}

export function getConfiguredTranslationServices(customOpenAIServices = [], localeOverride) {
  const list = [
    { id: "Microsoft", name: t("service.microsoft", null, localeOverride) },
    { id: "GoogleWeb", name: t("service.google", null, localeOverride) },
    { id: OFFICIAL_LLM_ID, name: t("service.officialLlm", null, localeOverride) },
  ];
  for (const svc of customOpenAIServices || []) {
    if (svc?.id) {
      list.push({
        id: svc.id,
        name: svc.name || t("service.customOpenAI", null, localeOverride),
      });
    }
  }
  return list;
}

export function filterSelectionAPIs(selectedAPIs, customOpenAIServices = []) {
  if (!Array.isArray(selectedAPIs)) return [];
  const allowed = new Set(getConfiguredTranslationServices(customOpenAIServices).map((s) => s.id));
  return selectedAPIs.filter((id) => allowed.has(id));
}

/**
 * Normalize an OpenAI-compatible base URL (trim whitespace, remove trailing
 * slashes and any pasted `/chat/completions` suffix).
 */
export function normalizeOpenAIBaseUrl(rawUrl, fallback = "") {
  const input = String(rawUrl || "").trim();
  if (!input) return fallback;
  let cleaned = input.replace(/\/+$/, "");
  if (cleaned.endsWith("/chat/completions")) {
    cleaned = cleaned.slice(0, -"/chat/completions".length).replace(/\/+$/, "");
  }
  return cleaned;
}

/**
 * Resolve `/chat/completions` endpoint from a base URL, origin, or full endpoint.
 */
export function resolveChatCompletionsUrl(
  rawUrl,
  fallback = `${OFFICIAL_LLM_BASE_URL}/chat/completions`
) {
  const input = String(rawUrl || "").trim().replace(/\/+$/, "");
  if (!input) return fallback;
  if (
    input.endsWith("/chat/completions") ||
    input.endsWith("/text/chatcompletion_v2")
  ) {
    return input;
  }
  try {
    const parsed = new URL(input);
    if (!parsed.pathname || parsed.pathname === "/") {
      return `${parsed.origin}/v1/chat/completions`;
    }
  } catch {
    // Fall back to string concatenation for partial/non-standard URLs
  }
  return `${input}/chat/completions`;
}

/**
 * Resolve `/models` endpoint from a base URL, origin, or full chat endpoint.
 */
export function resolveModelsUrl(rawUrl) {
  const base = normalizeOpenAIBaseUrl(rawUrl);
  if (!base) return "";
  try {
    const parsed = new URL(base);
    if (!parsed.pathname || parsed.pathname === "/") {
      return `${parsed.origin}/v1/models`;
    }
  } catch {
    // Fall back to string concatenation
  }
  return `${base}/models`;
}

export async function readApiErrorDetail(response) {
  const fallback = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  try {
    const text = await response.text();
    if (!text) return fallback;
    try {
      const json = JSON.parse(text);
      const errObj = json?.error || json;
      const msg = errObj?.message || errObj?.msg || json?.message;
      if (msg) return String(msg);
    } catch {
      // Plain text error body
    }
    return text.slice(0, 240);
  } catch {
    return fallback;
  }
}

/**
 * Fetch available model IDs from an OpenAI-compatible `/models` endpoint.
 */
export async function fetchOpenAIModels(baseUrl, apiKey, signal) {
  const url = resolveModelsUrl(baseUrl);
  if (!url) {
    throw new Error(t("error.openaiInvalidBaseUrl"));
  }

  const headers = { Accept: "application/json" };
  const trimmedKey = String(apiKey || "").trim();
  if (trimmedKey) {
    headers.Authorization = `Bearer ${trimmedKey}`;
  }

  const res = await fetch(url, {
    method: "GET",
    headers,
    signal,
  });

  if (!res.ok) {
    const detail = await readApiErrorDetail(res);
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        trimmedKey
          ? t("error.openaiAuthFail", { status: res.status, detail })
          : t("error.openaiNeedKeyForModels", { status: res.status })
      );
    }
    if (res.status === 404) {
      throw new Error(t("error.openaiModels404"));
    }
    throw new Error(t("error.openaiModelsFail", { detail }));
  }

  const json = await res.json();
  const rawList = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.models)
      ? json.models
      : Array.isArray(json)
        ? json
        : [];

  const seen = new Set();
  const models = [];
  for (const item of rawList) {
    const id = typeof item === "string" ? item : item?.id || item?.name;
    if (id && typeof id === "string" && !seen.has(id)) {
      seen.add(id);
      models.push(id);
    }
  }
  models.sort((a, b) => a.localeCompare(b));
  return models;
}

export function resolveOfficialQuotaOrigin(rawBaseUrl) {
  const input = String(rawBaseUrl || "").trim() || OFFICIAL_LLM_BASE_URL;
  try {
    return new URL(input).origin;
  } catch {
    return new URL(OFFICIAL_LLM_PORTAL_URL).origin;
  }
}

export function formatQuotaRmb(rmb) {
  if (!Number.isFinite(rmb) || rmb <= 0) {
    return "¥0.0000";
  }
  return `¥${rmb.toFixed(4)}`;
}

/**
 * Fetch remaining RMB quota for an official New-API compatible key via
 * `/api/usage/token/` and `/api/status`.
 */
export async function fetchOfficialQuotaRmb({ baseUrl, apiKey, signal } = {}) {
  const trimmedKey = String(apiKey || "").trim();
  if (!trimmedKey) {
    throw new Error(t("error.quotaMissingKey"));
  }

  const origin = resolveOfficialQuotaOrigin(baseUrl);
  const [tokenRes, statusRes] = await Promise.all([
    fetch(`${origin}/api/usage/token/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${trimmedKey}`,
      },
      cache: "no-store",
      signal,
    }),
    fetch(`${origin}/api/status`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal,
    }),
  ]);

  if (!tokenRes.ok) {
    throw new Error(await readApiErrorDetail(tokenRes));
  }

  const tokenJson = await tokenRes.json();
  const tokenData = tokenJson?.data;
  if (
    !tokenData ||
    typeof tokenData !== "object" ||
    tokenJson?.success === false ||
    tokenJson?.code === false
  ) {
    throw new Error(tokenJson?.message || t("error.quotaReadFail"));
  }

  const unlimitedQuota = Boolean(tokenData.unlimited_quota);
  const totalAvailable = Number(tokenData.total_available);
  if (!unlimitedQuota && !Number.isFinite(totalAvailable)) {
    throw new Error(t("error.quotaBadFormat"));
  }

  let quotaPerUnit = 500000;
  let usdExchangeRate = null;

  if (statusRes.ok) {
    const statusJson = await statusRes.json().catch(() => null);
    const statusData = statusJson?.data;
    const parsedQuotaPerUnit = Number(statusData?.quota_per_unit);
    if (Number.isFinite(parsedQuotaPerUnit) && parsedQuotaPerUnit > 0) {
      quotaPerUnit = parsedQuotaPerUnit;
    }
    const parsedRate = Number(statusData?.usd_exchange_rate);
    if (Number.isFinite(parsedRate) && parsedRate > 0) {
      usdExchangeRate = parsedRate;
    }
  } else if (!unlimitedQuota) {
    throw new Error(await readApiErrorDetail(statusRes));
  }

  if (!unlimitedQuota && (!Number.isFinite(usdExchangeRate) || usdExchangeRate <= 0)) {
    throw new Error(t("error.quotaNoRate"));
  }

  const rmb = unlimitedQuota
    ? null
    : (Math.max(0, totalAvailable) / quotaPerUnit) * usdExchangeRate;

  return {
    origin,
    unlimitedQuota,
    totalAvailable: Number.isFinite(totalAvailable) ? totalAvailable : 0,
    quotaPerUnit,
    usdExchangeRate,
    rmb,
  };
}
