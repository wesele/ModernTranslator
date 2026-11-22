import {
  DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY,
  DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY,
  OFFICIAL_LLM_ID,
  normalizeLlmConcurrency,
} from "../shared/openaiUtils.js";

const buckets = new Map();

function createAbortError() {
  try {
    return new DOMException("The operation was aborted.", "AbortError");
  } catch {
    const err = new Error("The operation was aborted.");
    err.name = "AbortError";
    return err;
  }
}

function getDefaultConcurrency(apiCode) {
  return apiCode === OFFICIAL_LLM_ID
    ? DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY
    : DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY;
}

function cleanupBucketIfEmpty(apiCode, bucket) {
  if (bucket && bucket.active === 0 && bucket.waiters.length === 0) {
    buckets.delete(apiCode);
  }
}

function drainBucket(apiCode) {
  const bucket = buckets.get(apiCode);
  if (!bucket) return;
  while (bucket.active < bucket.limit && bucket.waiters.length > 0) {
    const waiter = bucket.waiters.shift();
    waiter.cleanup();
    bucket.active += 1;
    waiter.resolve();
  }
  cleanupBucketIfEmpty(apiCode, bucket);
}

function acquireSlot(apiCode, limit, signal) {
  if (signal?.aborted) {
    return Promise.reject(createAbortError());
  }

  let bucket = buckets.get(apiCode);
  if (!bucket) {
    bucket = { active: 0, limit, waiters: [] };
    buckets.set(apiCode, bucket);
  } else {
    bucket.limit = limit;
  }

  if (bucket.active < bucket.limit && bucket.waiters.length === 0) {
    bucket.active += 1;
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const waiter = {
      resolve,
      reject,
      cleanup: () => {},
    };

    if (signal) {
      const onAbort = () => {
        const idx = bucket.waiters.indexOf(waiter);
        if (idx >= 0) {
          bucket.waiters.splice(idx, 1);
        }
        waiter.cleanup();
        cleanupBucketIfEmpty(apiCode, bucket);
        reject(createAbortError());
      };
      signal.addEventListener("abort", onAbort, { once: true });
      waiter.cleanup = () => {
        signal.removeEventListener("abort", onAbort);
      };
    }

    bucket.waiters.push(waiter);
    drainBucket(apiCode);
  });
}

export function updateLlmConcurrencyLimit(apiCode, maxConcurrency) {
  const key = String(apiCode || "default");
  const bucket = buckets.get(key);
  if (!bucket) return;
  bucket.limit = normalizeLlmConcurrency(maxConcurrency, getDefaultConcurrency(key));
  drainBucket(key);
}

if (typeof chrome !== "undefined" && chrome.storage?.onChanged?.addListener) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes.officialLLMMaxConcurrency) {
      updateLlmConcurrencyLimit(
        OFFICIAL_LLM_ID,
        changes.officialLLMMaxConcurrency.newValue
      );
    }
    if (changes.customOpenAIServices && Array.isArray(changes.customOpenAIServices.newValue)) {
      for (const svc of changes.customOpenAIServices.newValue) {
        if (svc?.id) {
          updateLlmConcurrencyLimit(svc.id, svc.maxConcurrency);
        }
      }
    }
  });
}

/**
 * Execute an LLM API call bounded by the configured per-service max concurrency.
 */
export async function runWithLlmConcurrency({ apiCode, maxConcurrency, signal }, fn) {
  const key = String(apiCode || "default");
  const limit = normalizeLlmConcurrency(maxConcurrency, getDefaultConcurrency(key));
  await acquireSlot(key, limit, signal);
  try {
    return await fn();
  } finally {
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.active = Math.max(0, bucket.active - 1);
      drainBucket(key);
    }
  }
}
