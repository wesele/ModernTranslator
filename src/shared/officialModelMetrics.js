import { resolveOfficialQuotaOrigin } from "./openaiUtils.js";

const HEALTH_BUCKET_COUNT = 24;
const HOUR_SECONDS = 3600;
const PERF_SUMMARY_BATCH_SIZE = 50;

function buildOptionalAuthHeaders(apiKey, extra = {}) {
  const headers = { Accept: "application/json", ...extra };
  const trimmedKey = String(apiKey || "").trim();
  if (trimmedKey) {
    headers.Authorization = `Bearer ${trimmedKey}`;
  }
  return headers;
}

/**
 * Select the active billing group and multiplier for a model from `/api/pricing`.
 */
export function resolveEffectiveGroup(pricingItem, groupRatioMap = {}, autoGroups = []) {
  const enabled = Array.isArray(pricingItem?.enable_groups)
    ? pricingItem.enable_groups
    : [];
  const validGroups = enabled.filter((g) => Number.isFinite(Number(groupRatioMap?.[g])));

  let group = "default";
  if (validGroups.includes("default")) {
    group = "default";
  } else {
    const autoMatch = Array.isArray(autoGroups)
      ? autoGroups.find((g) => validGroups.includes(g))
      : null;
    if (autoMatch) {
      group = autoMatch;
    } else if (validGroups.length > 0) {
      group = validGroups[0];
    } else if (enabled.length > 0) {
      group = enabled[0];
    }
  }

  const rawRatio = Number(groupRatioMap?.[group]);
  const groupRatio = Number.isFinite(rawRatio) && rawRatio >= 0 ? rawRatio : 1;
  return { group, groupRatio };
}

/**
 * Parse a New-API `tier("...", ...)` expression into base USD prices.
 * Supports `p * rate` / `rate * p`, `c * rate` / `rate * c`, and `fixed(rate)`.
 */
export function parseTieredExprPrices(billingExpr) {
  if (typeof billingExpr !== "string" || !billingExpr.trim()) return null;

  // Match the first tier("label", body) body (handles nested parens up to 1 level such as max(...)/fixed(...))
  const tierMatch = billingExpr.match(
    /tier\s*\(\s*["'][^"']*["']\s*,\s*((?:[^()]+|\([^()]*\))+)\s*\)/
  );
  const body = tierMatch ? tierMatch[1] : billingExpr;

  const fixedMatch = body.match(/fixed\s*\(\s*([0-9]+(?:\.[0-9]+)?)\s*\)/);
  if (fixedMatch) {
    const requestUsd = Number(fixedMatch[1]);
    return Number.isFinite(requestUsd) ? { kind: "request", requestUsd } : null;
  }

  const readVarCoeff = (varName) => {
    const forward = body.match(
      new RegExp(`(?:^|[+\\s(])${varName}\\s*\\*\\s*([0-9]+(?:\\.[0-9]+)?)`)
    );
    if (forward) return Number(forward[1]);
    const reverse = body.match(
      new RegExp(`([0-9]+(?:\\.[0-9]+)?)\\s*\\*\\s*${varName}(?:$|[+\\s)])`)
    );
    if (reverse) return Number(reverse[1]);
    return null;
  };

  let inputUsd = readVarCoeff("p");
  if (inputUsd === null) {
    // Handle `max(0, len - ai) * rate` pattern mapped to prompt pricing
    const maxLenMatch = body.match(
      /max\s*\([^)]*len\s*-\s*ai[^)]*\)\s*\*\s*([0-9]+(?:\.[0-9]+)?)/
    );
    if (maxLenMatch) inputUsd = Number(maxLenMatch[1]);
  }
  const outputUsd = readVarCoeff("c");

  if (Number.isFinite(inputUsd) && Number.isFinite(outputUsd)) {
    return { kind: "token", inputUsd, outputUsd };
  }
  if (Number.isFinite(inputUsd)) {
    return { kind: "token", inputUsd, outputUsd: inputUsd };
  }
  return null;
}

/**
 * Compute USD unit prices for a New-API `model.Pricing` item.
 */
export function extractModelUsdPricing(pricingItem, groupRatioMap = {}, autoGroups = []) {
  if (!pricingItem || typeof pricingItem !== "object") return null;
  const { group, groupRatio } = resolveEffectiveGroup(pricingItem, groupRatioMap, autoGroups);

  if (pricingItem.billing_mode === "tiered_expr" && pricingItem.billing_expr) {
    const parsed = parseTieredExprPrices(pricingItem.billing_expr);
    if (parsed) {
      if (parsed.kind === "request") {
        return {
          kind: "request",
          requestUsd: parsed.requestUsd * groupRatio,
          group,
          groupRatio,
        };
      }
      return {
        kind: "token",
        inputUsd: parsed.inputUsd * groupRatio,
        outputUsd: parsed.outputUsd * groupRatio,
        group,
        groupRatio,
      };
    }
  }

  if (pricingItem.quota_type === 1 && Number.isFinite(Number(pricingItem.model_price))) {
    return {
      kind: "request",
      requestUsd: Number(pricingItem.model_price) * groupRatio,
      group,
      groupRatio,
    };
  }

  if (pricingItem.quota_type === 0 && Number.isFinite(Number(pricingItem.model_ratio))) {
    const baseUsd = Number(pricingItem.model_ratio) * 2 * groupRatio;
    const completionRatio = Number.isFinite(Number(pricingItem.completion_ratio))
      ? Number(pricingItem.completion_ratio)
      : 1;
    return {
      kind: "token",
      inputUsd: baseUsd,
      outputUsd: baseUsd * completionRatio,
      group,
      groupRatio,
    };
  }

  return null;
}

/**
 * Build 24 hourly health bars from `recent_success_series`.
 */
export function buildHealthBuckets(series, windowEnd, bucketCount = HEALTH_BUCKET_COUNT) {
  const endHour =
    Math.floor((Number.isFinite(Number(windowEnd)) ? Number(windowEnd) : Date.now() / 1000) / HOUR_SECONDS) *
    HOUR_SECONDS;
  const startHour = endHour - (bucketCount - 1) * HOUR_SECONDS;

  const byHour = new Map();
  if (Array.isArray(series)) {
    for (const point of series) {
      const ts = Number(point?.ts);
      const rate = Number(point?.success_rate);
      if (!Number.isFinite(ts) || !Number.isFinite(rate)) continue;
      const bucketTs = Math.floor(ts / HOUR_SECONDS) * HOUR_SECONDS;
      byHour.set(bucketTs, Math.max(0, Math.min(100, rate)));
    }
  }

  const buckets = [];
  for (let i = 0; i < bucketCount; i++) {
    const ts = startHour + i * HOUR_SECONDS;
    const rate = byHour.has(ts) ? byHour.get(ts) : null;
    let status = "empty";
    if (rate !== null) {
      if (rate >= 95) status = "ok";
      else if (rate >= 80) status = "warn";
      else status = "bad";
    }
    buckets.push({ ts, successRate: rate, status });
  }
  return buckets;
}

async function safeFetchJson(url, options) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchPerfSummaryBatches(origin, headers, modelIds, signal) {
  const uniqueIds = [...new Set((modelIds || []).filter(Boolean))];
  const chunks = [];
  if (uniqueIds.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < uniqueIds.length; i += PERF_SUMMARY_BATCH_SIZE) {
      chunks.push(uniqueIds.slice(i, i + PERF_SUMMARY_BATCH_SIZE));
    }
  }

  const results = await Promise.all(
    chunks.map((chunk) => {
      const params = new URLSearchParams({ hours: "24" });
      for (const id of chunk) {
        params.append("recent_model", id);
      }
      return safeFetchJson(`${origin}/api/perf-metrics/summary?${params.toString()}`, {
        method: "GET",
        headers,
        cache: "no-store",
        signal,
      });
    })
  );

  const metricsMap = new Map();
  let windowStart = null;
  let windowEnd = null;

  for (const json of results) {
    const data = json?.data;
    if (!json?.success || !data) continue;
    if (Number.isFinite(Number(data.window_start))) windowStart = Number(data.window_start);
    if (Number.isFinite(Number(data.window_end))) windowEnd = Number(data.window_end);

    for (const item of data.models || []) {
      if (!item?.model_name) continue;
      metricsMap.set(item.model_name, {
        ...item,
        window_start: data.window_start,
        window_end: data.window_end,
      });
    }

    if (data.recent_success_series && typeof data.recent_success_series === "object") {
      for (const [modelName, series] of Object.entries(data.recent_success_series)) {
        const existing = metricsMap.get(modelName);
        metricsMap.set(modelName, {
          avg_latency_ms: NaN,
          avg_tps: NaN,
          success_rate: NaN,
          ...(existing || {}),
          model_name: modelName,
          recent_success_series: series,
          window_start: data.window_start,
          window_end: data.window_end,
        });
      }
    }
  }

  return { metricsMap, windowStart, windowEnd };
}

function matchUptimeMonitor(modelId, monitors) {
  if (!Array.isArray(monitors) || monitors.length === 0) return null;
  const lower = String(modelId || "").toLowerCase();
  return (
    monitors.find((m) => {
      const name = String(m?.name || m?.monitor_name || "").toLowerCase();
      return name && (name === lower || name.includes(lower) || lower.includes(name));
    }) || null
  );
}

/**
 * Fetch pricing, 24h performance health, and uptime data
 * from a New-API origin. Each sub-request degrades gracefully if disabled.
 */
export async function fetchOfficialModelsMetadata({
  baseUrl,
  apiKey,
  modelIds = [],
  signal,
} = {}) {
  const origin = resolveOfficialQuotaOrigin(baseUrl);
  const authHeaders = buildOptionalAuthHeaders(apiKey);

  const [pricingJson, uptimeJson] = await Promise.all([
    safeFetchJson(`${origin}/api/pricing`, {
      method: "GET",
      headers: authHeaders,
      cache: "no-store",
      signal,
    }),
    safeFetchJson(`${origin}/api/uptime/status`, {
      method: "GET",
      headers: authHeaders,
      cache: "no-store",
      signal,
    }),
  ]);

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const pricingItems = Array.isArray(pricingJson?.data) ? pricingJson.data : [];
  const groupRatioMap = pricingJson?.group_ratio || {};
  const autoGroups = pricingJson?.auto_groups || [];
  const usableGroup = pricingJson?.usable_group || {};
  const uptimeMonitors = Array.isArray(uptimeJson?.data) ? uptimeJson.data : [];

  const pricingModelNames = pricingItems.map((item) => item?.model_name).filter(Boolean);
  const combinedIds = [...new Set([...(modelIds || []), ...pricingModelNames])];

  const { metricsMap, windowStart, windowEnd } = await fetchPerfSummaryBatches(
    origin,
    authHeaders,
    combinedIds,
    signal
  );

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const pricingByModel = new Map();
  for (const item of pricingItems) {
    if (item?.model_name) {
      pricingByModel.set(item.model_name, item);
    }
  }

  const byModel = {};
  for (const id of combinedIds) {
    const pricingItem = pricingByModel.get(id) || null;
    const pricing = extractModelUsdPricing(pricingItem, groupRatioMap, autoGroups);
    const metric = metricsMap.get(id) || null;
    const series = metric?.recent_success_series || null;
    const hasMetrics = Boolean(
      metric &&
        (Number.isFinite(Number(metric.success_rate)) ||
          (Array.isArray(series) && series.length > 0))
    );
    const healthBuckets = hasMetrics
      ? buildHealthBuckets(series, metric?.window_end ?? windowEnd)
      : null;

    byModel[id] = {
      modelName: id,
      description: pricingItem?.description || "",
      group: pricing?.group || "default",
      groupLabel: usableGroup[pricing?.group] || pricing?.group || "default",
      pricing,
      health: hasMetrics
        ? {
            successRate: Number.isFinite(Number(metric.success_rate))
              ? Number(metric.success_rate)
              : null,
            avgLatencyMs: Number.isFinite(Number(metric.avg_latency_ms))
              ? Number(metric.avg_latency_ms)
              : null,
            avgTps: Number.isFinite(Number(metric.avg_tps)) ? Number(metric.avg_tps) : null,
            buckets: healthBuckets,
            activeBuckets: healthBuckets.filter((b) => b.status !== "empty").length,
          }
        : null,
      uptime: matchUptimeMonitor(id, uptimeMonitors),
    };
  }

  return {
    origin,
    pricingModelNames,
    windowStart,
    windowEnd,
    uptimeMonitors,
    byModel,
  };
}

/**
 * Fetch per-model & per-group telemetry detail (`avg_ttft_ms`, `avg_latency_ms`,
 * `success_rate`, `avg_tps`) via `GET /api/perf-metrics`.
 */
export async function fetchOfficialModelPerfDetail({
  baseUrl,
  apiKey,
  model,
  group = "default",
  hours = 24,
  signal,
} = {}) {
  const trimmedModel = String(model || "").trim();
  if (!trimmedModel) return null;

  const origin = resolveOfficialQuotaOrigin(baseUrl);
  const params = new URLSearchParams({
    model: trimmedModel,
    group: group || "default",
    hours: String(hours),
  });

  const json = await safeFetchJson(`${origin}/api/perf-metrics?${params.toString()}`, {
    method: "GET",
    headers: buildOptionalAuthHeaders(apiKey),
    cache: "no-store",
    signal,
  });

  const data = json?.data;
  if (!json?.success || !data) return null;

  const groupEntry =
    (data.groups || []).find((g) => g?.group === group) || data.groups?.[0] || null;
  const lastPoint = Array.isArray(data.series) && data.series.length > 0
    ? data.series[data.series.length - 1]
    : null;

  const avgTtftMs = Number.isFinite(Number(groupEntry?.avg_ttft_ms))
    ? Number(groupEntry.avg_ttft_ms)
    : Number.isFinite(Number(lastPoint?.avg_ttft_ms))
      ? Number(lastPoint.avg_ttft_ms)
      : null;

  return {
    avgTtftMs,
    avgLatencyMs: Number.isFinite(Number(data.summary?.avg_latency_ms))
      ? Number(data.summary.avg_latency_ms)
      : null,
    successRate: Number.isFinite(Number(data.summary?.success_rate))
      ? Number(data.summary.success_rate)
      : null,
    avgTps: Number.isFinite(Number(data.summary?.avg_tps))
      ? Number(data.summary.avg_tps)
      : null,
  };
}
