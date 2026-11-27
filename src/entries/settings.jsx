import "../shared/utils/setupIcons.js";
import * as React from "react";
import { createRoot } from "react-dom/client";
import pick from "lodash/pick";
import { Classes, Icon } from "@blueprintjs/core";
import { y as InteractionModeEngine } from "../shared/utils/InteractionModeEngine.js";
import { A as useStorage } from "../shared/hooks/useStorage.js";
import { A as useDarkMode } from "../shared/hooks/useDarkMode.js";
import * as messaging from "../shared/messaging/index.js";
import { g2 as defaultOptions } from "../shared/constants/defaults.js";
import { VI as ServiceId } from "../shared/constants/services.js";
import {
  DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY,
  DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY,
  MAX_LLM_MAX_CONCURRENCY,
  MIN_LLM_MAX_CONCURRENCY,
  OFFICIAL_LLM_ID,
  OFFICIAL_LLM_BASE_URL,
  OFFICIAL_LLM_PORTAL_URL,
  fetchOfficialQuotaRmb,
  fetchOpenAIModels,
  formatQuotaRmb,
  normalizeLlmConcurrency,
  normalizeOpenAIBaseUrl,
  readApiErrorDetail,
  resolveChatCompletionsUrl,
  resolveOfficialQuotaOrigin,
} from "../shared/openaiUtils.js";
import {
  fetchOfficialModelPerfDetail,
  fetchOfficialModelsMetadata,
} from "../shared/officialModelMetrics.js";
import { UiLanguageSelect } from "../components/UiLanguageSelect.jsx";
import { UI_LOCALE_TO_BCP47, useI18n } from "../shared/i18n/index.js";
import {
  exportWordbookToTsv,
  mapSubtitleLangToTtsSource,
  useWordbook,
} from "../shared/wordbook.js";
import { hasArabicScript, normalizeTextForMatch } from "../shared/textScript.js";
import { WordbookBoard } from "../components/WordbookBoard.jsx";

const TOP_TAB_LLM = "llm";
const TOP_TAB_WORDBOOK = "wordbook";
const TOP_TAB_OTHER = "other";

function getInitialTopTab() {
  if (typeof window === "undefined") return TOP_TAB_LLM;
  const hash = (window.location.hash || "").replace(/^#/, "").toLowerCase();
  if (hash === TOP_TAB_WORDBOOK || hash === TOP_TAB_OTHER || hash === TOP_TAB_LLM) {
    return hash;
  }
  return TOP_TAB_LLM;
}

if (typeof document !== "undefined") {
  new InteractionModeEngine(document.documentElement, Classes.FOCUS_DISABLED).start();
}

const SETTINGS_STORAGE_DEFAULTS = pick(defaultOptions, [
  "darkMode",
  "selectedAPIs",
  "pageTrsApi",
  "googleMirror",
  "googleHidePhonetic",
  "officialLLMBaseUrl",
  "officialLLMKey",
  "officialLLMModel",
  "officialLLMPrompt",
  "officialLLMBatchEnabled",
  "officialLLMBatchMaxBytes",
  "officialLLMStreamEnabled",
  "officialLLMMaxConcurrency",
  "customOpenAIServices",
  "bilibiliVideoIntegration",
  "youtubeVideoIntegration",
]);

const TEST_PROBE_BY_LOCALE = {
  zh: { sourceText: "Hello, world!", destZhName: "中文(简体)", promptLang: "Simplified Chinese" },
  en: { sourceText: "你好，世界！", destZhName: "英语", promptLang: "English" },
  es: { sourceText: "Hello, world!", destZhName: "西班牙语", promptLang: "Spanish" },
  fr: { sourceText: "Hello, world!", destZhName: "法语", promptLang: "French" },
  de: { sourceText: "Hello, world!", destZhName: "德语", promptLang: "German" },
  ja: { sourceText: "Hello, world!", destZhName: "日语", promptLang: "Japanese" },
  ko: { sourceText: "Hello, world!", destZhName: "韩语", promptLang: "Korean" },
};

function ServiceGlyph({ kind }) {
  if (kind === "official") {
    return <img src={chrome.runtime.getURL("official-llm.svg")} alt="" />;
  }
  if (kind === "microsoft") {
    return <img src={chrome.runtime.getURL("microsoft-engine.svg")} alt="" />;
  }
  if (kind === "google") {
    return <img src={chrome.runtime.getURL("google-engine.svg")} alt="" />;
  }
  return <img src={chrome.runtime.getURL("custom-llm.svg")} alt="" />;
}

function UsageToggleCard({ checked, onToggle, isPageDefault, onTogglePageDefault }) {
  const { t } = useI18n();
  return (
    <div className="usage-merged-row">
      <div className="usage-merged-cell">
        <span className="usage-row-title">{t("settings.useForSelection")}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          className={`ndt-switch ${checked ? "is-checked" : ""}`}
          onClick={onToggle}
        />
      </div>

      <div className="usage-merged-cell">
        <span className="usage-row-title">{t("settings.useForPage")}</span>
        <button
          type="button"
          role="switch"
          aria-checked={isPageDefault}
          className={`ndt-switch ${isPageDefault ? "is-checked" : ""}`}
          onClick={onTogglePageDefault}
        />
      </div>
    </div>
  );
}

function LlmDeliveryConfigRow({
  batchEnabled,
  batchMaxBytes,
  streamEnabled,
  maxConcurrency,
  defaultMaxConcurrency,
  onBatchChange,
  onBatchMaxBytesChange,
  onStreamChange,
  onMaxConcurrencyChange,
}) {
  const { t } = useI18n();
  const [limitText, setLimitText] = React.useState(String(batchMaxBytes ?? 10000));
  const resolvedConcurrency = normalizeLlmConcurrency(maxConcurrency, defaultMaxConcurrency);
  const [concurrencyText, setConcurrencyText] = React.useState(String(resolvedConcurrency));

  React.useEffect(() => {
    setLimitText(String(batchMaxBytes ?? 10000));
  }, [batchMaxBytes]);

  React.useEffect(() => {
    setConcurrencyText(String(resolvedConcurrency));
  }, [resolvedConcurrency]);

  return (
    <div className="delivery-row">
      <div className="delivery-group">
        <div className="delivery-toggle">
          <span className="delivery-label">{t("settings.batchSend")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={batchEnabled}
            className={`ndt-switch ${batchEnabled ? "is-checked" : ""}`}
            onClick={() => onBatchChange(!batchEnabled)}
          />
        </div>

        {batchEnabled && (
          <div className="delivery-limit-box">
            <span className="delivery-limit-label">{t("settings.batchMaxLimit")}</span>
            <div className="delivery-limit-input-wrap">
              <input
                type="number"
                min={500}
                max={200000}
                step={500}
                className="delivery-limit-input"
                value={limitText}
                onChange={(e) => {
                  const raw = e.target.value;
                  setLimitText(raw);
                  const num = parseInt(raw, 10);
                  if (Number.isFinite(num) && num >= 500) {
                    onBatchMaxBytesChange(num);
                  }
                }}
                onBlur={() => {
                  const num = parseInt(limitText, 10);
                  const clamped = Number.isFinite(num) ? Math.min(200000, Math.max(500, num)) : 10000;
                  setLimitText(String(clamped));
                  onBatchMaxBytesChange(clamped);
                }}
              />
              <span className="delivery-limit-unit">{t("settings.bytesUnit")}</span>
            </div>
          </div>
        )}
      </div>

      <div className="delivery-group">
        <div className="delivery-toggle">
          <span className="delivery-label">{t("settings.maxConcurrency")}</span>
          <input
            type="number"
            min={MIN_LLM_MAX_CONCURRENCY}
            max={MAX_LLM_MAX_CONCURRENCY}
            step={1}
            className="delivery-concurrency-input"
            value={concurrencyText}
            onChange={(e) => {
              const raw = e.target.value;
              setConcurrencyText(raw);
              const num = parseInt(raw, 10);
              if (Number.isFinite(num) && num >= MIN_LLM_MAX_CONCURRENCY) {
                onMaxConcurrencyChange(Math.min(MAX_LLM_MAX_CONCURRENCY, num));
              }
            }}
            onBlur={() => {
              const num = parseInt(concurrencyText, 10);
              const clamped = Number.isFinite(num)
                ? Math.min(MAX_LLM_MAX_CONCURRENCY, Math.max(MIN_LLM_MAX_CONCURRENCY, num))
                : defaultMaxConcurrency;
              setConcurrencyText(String(clamped));
              onMaxConcurrencyChange(clamped);
            }}
          />
        </div>

        <div className="delivery-toggle">
          <span className="delivery-label">{t("settings.streamCall")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={streamEnabled}
            className={`ndt-switch ${streamEnabled ? "is-checked" : ""}`}
            onClick={() => onStreamChange(!streamEnabled)}
          />
        </div>
      </div>
    </div>
  );
}

function SecretKeyInput({ value, onChange, placeholder }) {
  const { t } = useI18n();
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="ndt-input-wrap">
      <input
        type={visible ? "text" : "password"}
        className="ndt-input is-mono has-right-tools"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="ndt-input-tools">
        {value && (
          <button
            type="button"
            className="ndt-icon-btn"
            title={t("settings.clearKey")}
            onClick={() => onChange("")}
          >
            <Icon icon="cross" size={12} />
          </button>
        )}
        <button
          type="button"
          className="ndt-icon-btn"
          title={visible ? t("settings.hideKey") : t("settings.showKey")}
          onClick={() => setVisible((v) => !v)}
        >
          <Icon icon={visible ? "eye-off" : "eye-open"} size={13} />
        </button>
      </div>
    </div>
  );
}

function formatUsd2(value) {
  if (!Number.isFinite(Number(value))) return "—";
  return `$${Number(value).toFixed(2)}`;
}

function formatDurationMs(ms) {
  const num = Number(ms);
  if (!Number.isFinite(num) || num < 0) return "—";
  if (num >= 1000) return `${(num / 1000).toFixed(2)}s`;
  return `${Math.round(num)}ms`;
}

function formatTps(tps) {
  const num = Number(tps);
  if (!Number.isFinite(num) || num <= 0) return "—";
  return `${num.toFixed(1)}t/s`;
}

function formatBucketHour(ts) {
  try {
    const date = new Date(ts * 1000);
    const hh = String(date.getHours()).padStart(2, "0");
    return `${hh}:00`;
  } catch {
    return "";
  }
}

function HealthStatusBars({ health, uptime, t }) {
  if (!health?.buckets?.length) {
    const uptimeText =
      uptime && Number.isFinite(Number(uptime.uptime))
        ? `Uptime ${(Number(uptime.uptime) * 100).toFixed(1)}%`
        : "";
    return (
      <span
        className="model-health-wrap is-empty"
        title={uptimeText || t("settings.modelHealthNoData")}
      >
        <span className="model-health-bars" aria-hidden="true">
          {Array.from({ length: 24 }, (_, idx) => (
            <span key={idx} className="model-health-bar is-empty" />
          ))}
        </span>
        <span className="model-health-rate">—</span>
      </span>
    );
  }

  const rateText =
    health.successRate !== null ? `${Math.round(health.successRate * 10) / 10}%` : "—";
  const latencyText = formatDurationMs(health.avgLatencyMs);
  const tpsText = formatTps(health.avgTps);
  let tooltip = t("settings.modelHealthTooltip", {
    rate: health.successRate !== null ? health.successRate.toFixed(1) : "—",
    latency: latencyText,
    tps: tpsText,
  });
  if (uptime && Number.isFinite(Number(uptime.uptime))) {
    tooltip += ` · Uptime ${(Number(uptime.uptime) * 100).toFixed(1)}%`;
  }

  const rateClass =
    health.successRate === null
      ? ""
      : health.successRate >= 95
        ? "is-ok"
        : health.successRate >= 80
          ? "is-warn"
          : "is-bad";

  return (
    <span className="model-health-wrap" title={tooltip}>
      <span className="model-health-bars" aria-hidden="true">
        {health.buckets.map((bucket) => {
          const hourLabel = formatBucketHour(bucket.ts);
          const bucketTitle =
            bucket.successRate !== null
              ? `${hourLabel} · ${bucket.successRate.toFixed(1)}%`
              : `${hourLabel} · —`;
          return (
            <span
              key={bucket.ts}
              className={`model-health-bar is-${bucket.status}`}
              title={bucketTitle}
            />
          );
        })}
      </span>
      <span className={`model-health-rate ${rateClass}`}>{rateText}</span>
    </span>
  );
}

function getPriceTierClass(pricing) {
  if (!pricing) return "";
  const raw = pricing.kind === "request" ? pricing.requestUsd : pricing.inputUsd;
  const num = Number(raw);
  if (!Number.isFinite(num)) return "";
  // Compare against the displayed 2-decimal USD price so e.g. $0.014 -> $0.01 matches the green tier
  const rounded = Math.round(num * 100) / 100;
  if (rounded <= 0.01) return "is-price-green";
  if (rounded < 0.1) return "is-price-blue";
  if (rounded < 2) return "is-price-orange";
  return "is-price-red";
}

function ModelPricingSnippet({ pricing, t }) {
  if (!pricing) {
    return <span className="model-price-muted">{t("settings.modelPriceUnavailable")}</span>;
  }

  const tierClass = getPriceTierClass(pricing);

  if (pricing.kind === "request") {
    return (
      <span className="model-price-group">
        <span className={`model-price-text ${tierClass}`}>
          {t("settings.modelPricePerRequest")} <strong>{formatUsd2(pricing.requestUsd)}</strong>
        </span>
      </span>
    );
  }

  return (
    <span className="model-price-group">
      <span className={`model-price-text ${tierClass}`}>
        {t("settings.modelPriceInput")} <strong>{formatUsd2(pricing.inputUsd)}</strong>
        <span className="model-price-sep">·</span>
        {t("settings.modelPriceOutput")} <strong>{formatUsd2(pricing.outputUsd)}</strong>
        <span className="model-price-unit">/1M</span>
      </span>
    </span>
  );
}

function ModelSelectorDropdown({
  baseUrl,
  apiKey,
  model,
  onSelectModel,
  showRichMetrics = false,
  richMetadata = null,
  onRichMetadataLoaded = null,
}) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [models, setModels] = React.useState([]);
  const [fetchError, setFetchError] = React.useState("");
  const [previewNotice, setPreviewNotice] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [manualModel, setManualModel] = React.useState("");

  const rootRef = React.useRef(null);
  const abortRef = React.useRef(null);
  const lastSignatureRef = React.useRef("");

  const signature = `${baseUrl || ""}__${apiKey || ""}`;
  React.useEffect(() => {
    if (lastSignatureRef.current !== signature) {
      lastSignatureRef.current = signature;
      setModels([]);
      setFetchError("");
      setPreviewNotice("");
    }
  }, [signature]);

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  const loadModels = React.useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setFetchError("");
    setPreviewNotice("");
    try {
      if (!showRichMetrics) {
        const list = await fetchOpenAIModels(baseUrl, apiKey, controller.signal);
        if (controller.signal.aborted) return;
        setModels(list);
        if (!list.length) {
          setFetchError(t("settings.modelEmptyListError"));
        }
        return;
      }

      const [modelsOutcome, metaOutcome] = await Promise.allSettled([
        fetchOpenAIModels(baseUrl, apiKey, controller.signal),
        fetchOfficialModelsMetadata({
          baseUrl,
          apiKey,
          signal: controller.signal,
        }),
      ]);

      if (controller.signal.aborted) return;

      const meta = metaOutcome.status === "fulfilled" ? metaOutcome.value : null;
      if (meta && onRichMetadataLoaded) {
        onRichMetadataLoaded(meta);
      }

      if (modelsOutcome.status === "fulfilled") {
        const list = modelsOutcome.value;
        setModels(list);
        if (!list.length) {
          setFetchError(t("settings.modelEmptyListError"));
        }
        const missingMetaIds = list.filter((id) => !meta?.byModel?.[id]?.health);
        if (missingMetaIds.length > 0 && list.length > 0) {
          fetchOfficialModelsMetadata({
            baseUrl,
            apiKey,
            modelIds: list,
            signal: controller.signal,
          })
            .then((enriched) => {
              if (!controller.signal.aborted && enriched && onRichMetadataLoaded) {
                onRichMetadataLoaded(enriched);
              }
            })
            .catch(() => {});
        }
        return;
      }

      const err = modelsOutcome.reason;
      if (err?.name === "AbortError") return;

      // If no API key is entered yet and `/api/pricing` returned public models, show preview list
      const trimmedKey = String(apiKey || "").trim();
      const publicList = (meta?.pricingModelNames || [])
        .slice()
        .sort((a, b) => a.localeCompare(b));
      if (!trimmedKey && publicList.length > 0) {
        setModels(publicList);
        setPreviewNotice(t("settings.modelPublicPreviewHint"));
      } else {
        setFetchError(err?.message || t("settings.modelFetchFail"));
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      setFetchError(err?.message || t("settings.modelFetchFail"));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [baseUrl, apiKey, showRichMetrics, onRichMetadataLoaded, t]);

  const handleToggleOpen = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      setSearch("");
      setManualModel(model || "");
      loadModels();
    } else {
      abortRef.current?.abort();
    }
  };

  const filteredModels = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return models;
    return models.filter((id) => id.toLowerCase().includes(q));
  }, [models, search]);

  return (
    <div className="model-dropdown" ref={rootRef}>
      <button
        type="button"
        className={`model-dropdown-trigger ${isOpen ? "is-open" : ""}`}
        aria-expanded={isOpen}
        onClick={handleToggleOpen}
      >
        <span className={`model-dropdown-value ${model ? "" : "is-placeholder"}`}>
          {model || t("settings.modelDropdownPlaceholder")}
        </span>
        <span className="model-dropdown-right">
          {loading && <Icon icon="refresh" size={12} className="ndt-spin" />}
          <Icon icon={isOpen ? "chevron-up" : "chevron-down"} size={13} />
        </span>
      </button>

      {isOpen && (
        <div className={`model-popover ${showRichMetrics ? "is-rich" : ""}`} role="listbox">
          <div className="model-popover-search">
            <Icon icon="search" size={12} />
            <input
              type="text"
              value={search}
              placeholder={t("settings.modelFilterPlaceholder")}
              autoFocus
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              className="ndt-icon-btn"
              title={t("settings.modelRefreshTitle")}
              onClick={loadModels}
            >
              <Icon icon="refresh" size={12} className={loading ? "ndt-spin" : ""} />
            </button>
          </div>

          {loading && (
            <div className="model-popover-status is-loading">
              <span>{t("settings.modelLoading")}</span>
            </div>
          )}

          {!loading && previewNotice && (
            <div className="model-popover-status is-info">
              <span>{previewNotice}</span>
            </div>
          )}

          {!loading && fetchError && (
            <div className="model-popover-status is-error">
              <span style={{ minWidth: 0, wordBreak: "break-word" }}>{fetchError}</span>
              <button
                type="button"
                className="ndt-btn is-compact"
                onClick={loadModels}
              >
                {t("common.retry")}
              </button>
            </div>
          )}

          <div className={`model-popover-list ${showRichMetrics ? "is-rich" : ""}`}>
            {filteredModels.length > 0 ? (
              filteredModels.map((id) => {
                const selected = id === model;
                const info = showRichMetrics ? richMetadata?.byModel?.[id] : null;
                if (!showRichMetrics) {
                  return (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`model-option ${selected ? "is-selected" : ""}`}
                      onClick={() => {
                        onSelectModel(id);
                        setIsOpen(false);
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{id}</span>
                      {selected && <Icon icon="tick" size={12} />}
                    </button>
                  );
                }

                const latencyMs = info?.health?.avgLatencyMs;
                const tps = info?.health?.avgTps;
                const hasPerfSub = Number.isFinite(latencyMs) || Number.isFinite(tps);

                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`model-option is-rich ${selected ? "is-selected" : ""}`}
                    onClick={() => {
                      onSelectModel(id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="model-option-top">
                      <span className="model-option-name-wrap">
                        <span className="model-option-name" title={info?.description || id}>
                          {id}
                        </span>
                        {selected && <Icon icon="tick" size={12} className="model-option-tick" />}
                      </span>
                      <HealthStatusBars health={info?.health} uptime={info?.uptime} t={t} />
                    </div>
                    <div className="model-option-bottom">
                      <ModelPricingSnippet pricing={info?.pricing} t={t} />
                      {hasPerfSub && (
                        <span className="model-perf-sub">
                          {Number.isFinite(latencyMs) && <span>{formatDurationMs(latencyMs)}</span>}
                          {Number.isFinite(latencyMs) && Number.isFinite(tps) && <span>·</span>}
                          {Number.isFinite(tps) && <span>{formatTps(tps)}</span>}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              !loading &&
              !fetchError && <div className="model-empty-hint">{t("settings.modelNoMatch")}</div>
            )}
          </div>

          <form
            className="model-manual-row"
            onSubmit={(e) => {
              e.preventDefault();
              const next = manualModel.trim();
              if (!next) return;
              onSelectModel(next);
              setIsOpen(false);
            }}
          >
            <input
              type="text"
              value={manualModel}
              placeholder={t("settings.modelManualPlaceholder")}
              onChange={(e) => setManualModel(e.target.value)}
            />
            <button
              type="submit"
              className="ndt-btn is-compact"
              disabled={!manualModel.trim()}
            >
              {t("common.confirm")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function OfficialModelSummaryBar({ model, metadata, perfDetail, t }) {
  const info = model ? metadata?.byModel?.[model] : null;
  if (!model || (!info?.pricing && !info?.health && !perfDetail)) return null;

  const latencyMs = perfDetail?.avgLatencyMs ?? info?.health?.avgLatencyMs;
  const ttftMs = perfDetail?.avgTtftMs;
  const tps = perfDetail?.avgTps ?? info?.health?.avgTps;

  return (
    <div className="official-model-meta-bar">
      <div className="official-model-meta-left">
        <ModelPricingSnippet pricing={info?.pricing} t={t} />
      </div>
      <div className="official-model-meta-right">
        {Number.isFinite(ttftMs) && (
          <span className="official-model-stat">
            {t("settings.modelTtftLabel", { ttft: formatDurationMs(ttftMs) })}
          </span>
        )}
        {Number.isFinite(latencyMs) && (
          <span className="official-model-stat">
            {t("settings.modelLatencyLabel", { latency: formatDurationMs(latencyMs) })}
          </span>
        )}
        {Number.isFinite(tps) && <span className="official-model-stat">{formatTps(tps)}</span>}
        <HealthStatusBars health={info?.health} uptime={info?.uptime} t={t} />
      </div>
    </div>
  );
}

async function runOpenAIConnectionTest({ baseUrl, apiKey, model, requireKey, locale, t }) {
  const cleanedBase = normalizeOpenAIBaseUrl(baseUrl);
  if (!cleanedBase) {
    throw new Error(t("settings.testNeedBaseUrl"));
  }
  if (requireKey && !String(apiKey || "").trim()) {
    throw new Error(t("settings.testNeedApiKey"));
  }
  const trimmedModel = String(model || "").trim();
  if (!trimmedModel) {
    throw new Error(t("settings.testNeedModel"));
  }

  const probe = TEST_PROBE_BY_LOCALE[locale] || TEST_PROBE_BY_LOCALE.en;
  const endpoint = resolveChatCompletionsUrl(cleanedBase);
  const headers = { "Content-Type": "application/json" };
  if (String(apiKey || "").trim()) {
    headers.Authorization = `Bearer ${String(apiKey).trim()}`;
  }

  const startedAt = performance.now();
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: trimmedModel,
      messages: [
        {
          role: "user",
          content: `Translate to ${probe.promptLang} only: ${probe.sourceText}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorDetail(res));
  }
  const json = await res.json();
  const output = json?.choices?.[0]?.message?.content?.trim();
  if (!output) {
    throw new Error(t("settings.testEmptyOutput"));
  }
  const ms = Math.round(performance.now() - startedAt);
  return { ms, output };
}

function ServiceCacheBar({ count, loading, clearing, onClear }) {
  const { t } = useI18n();
  return (
    <div className="service-cache-bar">
      <div className="service-cache-info">
        <div className="service-cache-title-row">
          <span className="service-cache-title">{t("settings.cacheTitle")}</span>
          <span className="service-cache-count">
            {loading ? t("settings.cacheLoading") : t("settings.cacheCount", { count })}
          </span>
        </div>
        <span className="service-cache-desc">{t("settings.cacheDesc")}</span>
      </div>
      <button
        type="button"
        className="ndt-btn is-compact"
        disabled={loading || clearing || count === 0}
        onClick={onClear}
      >
        <Icon icon={clearing ? "refresh" : "trash"} size={12} className={clearing ? "ndt-spin" : ""} />
        <span>{clearing ? t("settings.cacheClearing") : t("settings.cacheClearBtn")}</span>
      </button>
    </div>
  );
}

function SettingsApp() {
  useDarkMode();
  const { locale, t, getServiceName } = useI18n();

  React.useEffect(() => {
    document.title = t("settings.pageTitle");
    document.documentElement.lang = UI_LOCALE_TO_BCP47[locale] || "en";
  }, [locale, t]);

  const [settings, setSettings] = useStorage(SETTINGS_STORAGE_DEFAULTS);
  const [topTab, setTopTab] = React.useState(getInitialTopTab);
  const [activeId, setActiveId] = React.useState(OFFICIAL_LLM_ID);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState(null);
  const [showPromptEditor, setShowPromptEditor] = React.useState(false);
  const [savedTick, setSavedTick] = React.useState(0);
  const [testState, setTestState] = React.useState({
    serviceId: "",
    loading: false,
    ok: false,
    message: "",
  });
  const [cacheCounts, setCacheCounts] = React.useState({});
  const [cacheLoading, setCacheLoading] = React.useState(true);
  const [clearingCacheId, setClearingCacheId] = React.useState("");

  const refreshCacheStats = React.useCallback(async () => {
    try {
      const res = await messaging._({ action: "get translation cache stats" });
      if (res?.counts && typeof res.counts === "object") {
        setCacheCounts(res.counts);
      }
    } catch {
      // ignore cache stats fetch error
    } finally {
      setCacheLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshCacheStats();
  }, [refreshCacheStats, activeId]);

  React.useEffect(() => {
    const onFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        refreshCacheStats();
      }
    };
    window.addEventListener("focus", refreshCacheStats);
    document.addEventListener("visibilitychange", onFocusOrVisible);
    return () => {
      window.removeEventListener("focus", refreshCacheStats);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, [refreshCacheStats]);

  const handleClearServiceCache = async (id) => {
    if (!id || clearingCacheId) return;
    setClearingCacheId(id);
    try {
      await messaging._({
        action: "clear translation cache",
        apiCode: id,
      });
      setCacheCounts((prev) => ({ ...prev, [id]: 0 }));
    } catch {
      // ignore error, refresh stats below
    } finally {
      setClearingCacheId("");
      refreshCacheStats();
    }
  };

  const saveTimerRef = React.useRef(null);
  const markSaved = React.useCallback(() => {
    setSavedTick(Date.now());
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSavedTick(0);
    }, 1800);
  }, []);

  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    setConfirmDeleteId(null);
    setShowPromptEditor(false);
    setTestState({ serviceId: activeId, loading: false, ok: false, message: "" });
  }, [activeId]);

  const updateStorage = React.useCallback(
    (patch) => {
      markSaved();
      return setSettings(patch);
    },
    [setSettings, markSaved]
  );

  const selectedAPIs = settings?.selectedAPIs || SETTINGS_STORAGE_DEFAULTS.selectedAPIs;
  const pageTrsApi = settings?.pageTrsApi || SETTINGS_STORAGE_DEFAULTS.pageTrsApi;
  const customServices = settings?.customOpenAIServices || [];
  const darkMode = settings?.darkMode || SETTINGS_STORAGE_DEFAULTS.darkMode;
  const bilibiliVideoIntegration = settings?.bilibiliVideoIntegration !== false;
  const youtubeVideoIntegration = settings?.youtubeVideoIntegration !== false;

  const officialBaseUrl =
    settings?.officialLLMBaseUrl ?? OFFICIAL_LLM_BASE_URL;
  const officialKey = settings?.officialLLMKey ?? "";
  const officialModel = settings?.officialLLMModel ?? "";
  const officialPrompt = settings?.officialLLMPrompt ?? "";
  const officialBatchEnabled = settings?.officialLLMBatchEnabled !== false;
  const officialBatchMaxBytes = settings?.officialLLMBatchMaxBytes ?? 10000;
  const officialStreamEnabled = settings?.officialLLMStreamEnabled !== false;
  const officialMaxConcurrency = normalizeLlmConcurrency(
    settings?.officialLLMMaxConcurrency,
    DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY
  );
  const officialReady = Boolean(officialKey.trim() && officialModel.trim());

  const [officialQuota, setOfficialQuota] = React.useState({
    loading: false,
    origin: "",
    apiKey: "",
    data: null,
  });
  const officialQuotaAbortRef = React.useRef(null);

  const refreshOfficialQuota = React.useCallback(
    async ({ baseUrl, apiKey } = {}) => {
      const targetBaseUrl = baseUrl ?? officialBaseUrl ?? OFFICIAL_LLM_BASE_URL;
      const trimmedKey = String(apiKey ?? officialKey ?? "").trim();
      const targetOrigin = resolveOfficialQuotaOrigin(targetBaseUrl);

      if (officialQuotaAbortRef.current) {
        officialQuotaAbortRef.current.abort();
      }

      if (!trimmedKey) {
        officialQuotaAbortRef.current = null;
        setOfficialQuota({ loading: false, origin: "", apiKey: "", data: null });
        return;
      }

      const controller = new AbortController();
      officialQuotaAbortRef.current = controller;

      setOfficialQuota((prev) => {
        const sameTarget = prev.origin === targetOrigin && prev.apiKey === trimmedKey;
        return {
          loading: true,
          origin: targetOrigin,
          apiKey: trimmedKey,
          data: sameTarget ? prev.data : null,
        };
      });

      try {
        const data = await fetchOfficialQuotaRmb({
          baseUrl: targetBaseUrl,
          apiKey: trimmedKey,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setOfficialQuota({
          loading: false,
          origin: targetOrigin,
          apiKey: trimmedKey,
          data,
        });
      } catch (err) {
        if (controller.signal.aborted || err?.name === "AbortError") return;
        setOfficialQuota({
          loading: false,
          origin: targetOrigin,
          apiKey: trimmedKey,
          data: null,
        });
      }
    },
    [officialBaseUrl, officialKey]
  );

  React.useEffect(() => {
    const trimmedKey = String(officialKey || "").trim();
    if (!trimmedKey) {
      if (officialQuotaAbortRef.current) {
        officialQuotaAbortRef.current.abort();
        officialQuotaAbortRef.current = null;
      }
      setOfficialQuota({ loading: false, origin: "", apiKey: "", data: null });
      return undefined;
    }

    if (topTab !== TOP_TAB_LLM || activeId !== OFFICIAL_LLM_ID) {
      return undefined;
    }

    const timer = setTimeout(() => {
      refreshOfficialQuota();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [topTab, activeId, officialBaseUrl, officialKey, refreshOfficialQuota]);

  React.useEffect(() => {
    const onFocusOrVisible = () => {
      if (
        document.visibilityState === "visible" &&
        topTab === TOP_TAB_LLM &&
        activeId === OFFICIAL_LLM_ID &&
        String(officialKey || "").trim()
      ) {
        refreshOfficialQuota();
      }
    };
    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);
    return () => {
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
      if (officialQuotaAbortRef.current) {
        officialQuotaAbortRef.current.abort();
      }
    };
  }, [topTab, activeId, officialKey, refreshOfficialQuota]);

  const [officialModelsMeta, setOfficialModelsMeta] = React.useState(null);
  const [officialPerfDetail, setOfficialPerfDetail] = React.useState(null);
  const officialMetaSigRef = React.useRef("");

  React.useEffect(() => {
    const targetBaseUrl = officialBaseUrl || OFFICIAL_LLM_BASE_URL;
    const sig = `${resolveOfficialQuotaOrigin(targetBaseUrl)}__${officialKey || ""}`;
    if (officialMetaSigRef.current !== sig) {
      officialMetaSigRef.current = sig;
      setOfficialModelsMeta(null);
      setOfficialPerfDetail(null);
    }
  }, [officialBaseUrl, officialKey]);

  React.useEffect(() => {
    if (topTab !== TOP_TAB_LLM || activeId !== OFFICIAL_LLM_ID) return undefined;
    const trimmedModel = String(officialModel || "").trim();
    if (!trimmedModel) {
      setOfficialPerfDetail(null);
      return undefined;
    }

    const controller = new AbortController();
    const targetBaseUrl = officialBaseUrl || OFFICIAL_LLM_BASE_URL;

    const loadSelectedMeta = async () => {
      let meta = officialModelsMeta;
      if (!meta || !meta.byModel?.[trimmedModel]) {
        meta = await fetchOfficialModelsMetadata({
          baseUrl: targetBaseUrl,
          apiKey: officialKey,
          modelIds: [trimmedModel],
          signal: controller.signal,
        }).catch(() => null);
        if (controller.signal.aborted) return;
        if (meta) setOfficialModelsMeta(meta);
      }

      const group = meta?.byModel?.[trimmedModel]?.group || "default";
      const detail = await fetchOfficialModelPerfDetail({
        baseUrl: targetBaseUrl,
        apiKey: officialKey,
        model: trimmedModel,
        group,
        signal: controller.signal,
      }).catch(() => null);
      if (controller.signal.aborted) return;
      setOfficialPerfDetail(detail);
    };

    const timer = setTimeout(loadSelectedMeta, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [topTab, activeId, officialBaseUrl, officialKey, officialModel]);

  const activeCustomService = customServices.find((item) => item.id === activeId) || null;
  const wordbook = useWordbook();
  const [wbSearch, setWbSearch] = React.useState("");
  const [wbFilter, setWbFilter] = React.useState("all");
  const [wbViewMode, setWbViewMode] = React.useState("focus");

  React.useEffect(() => {
    if (
      activeId !== OFFICIAL_LLM_ID &&
      activeId !== ServiceId.Microsoft &&
      activeId !== ServiceId.Google &&
      !activeCustomService
    ) {
      setActiveId(OFFICIAL_LLM_ID);
    }
  }, [activeId, activeCustomService]);

  const toggleSelectionApi = (id) => {
    const exists = selectedAPIs.includes(id);
    const next = exists ? selectedAPIs.filter((item) => item !== id) : [...selectedAPIs, id];
    updateStorage({ selectedAPIs: next });
  };

  const togglePageDefault = (id) => {
    if (pageTrsApi === id) {
      if (id !== ServiceId.Microsoft) {
        updateStorage({ pageTrsApi: ServiceId.Microsoft });
      }
      return;
    }
    updateStorage({ pageTrsApi: id });
  };

  const updateCustomService = (id, patch) => {
    updateStorage((draft) => {
      const list = draft.customOpenAIServices || [];
      const target = list.find((item) => item.id === id);
      if (target) {
        Object.assign(target, patch);
      }
    });
  };

  const handleAddCustomService = () => {
    const count = customServices.length + 1;
    const svc = {
      id: `custom-openai-${Date.now().toString(36)}`,
      name:
        count === 1
          ? t("service.customOpenAI")
          : t("service.customOpenAINumbered", { n: count }),
      baseUrl: "",
      apiKey: "",
      model: "",
      prompt: "",
      batchEnabled: true,
      batchMaxBytes: 10000,
      streamEnabled: true,
      maxConcurrency: DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY,
    };
    updateStorage((draft) => {
      if (!Array.isArray(draft.customOpenAIServices)) {
        draft.customOpenAIServices = [];
      }
      draft.customOpenAIServices.push(svc);
    });
    setActiveId(svc.id);
  };

  const handleDeleteCustomService = (id) => {
    updateStorage((draft) => {
      draft.customOpenAIServices = (draft.customOpenAIServices || []).filter(
        (item) => item.id !== id
      );
      if (Array.isArray(draft.selectedAPIs)) {
        draft.selectedAPIs = draft.selectedAPIs.filter((item) => item !== id);
      }
      if (draft.pageTrsApi === id) {
        draft.pageTrsApi = ServiceId.Microsoft;
      }
    });
    setConfirmDeleteId(null);
    setActiveId(OFFICIAL_LLM_ID);
    messaging
      ._({
        action: "clear translation cache",
        apiCode: id,
      })
      .then(() => {
        setCacheCounts((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      })
      .catch(() => {});
  };

  const handleRunTest = async (id) => {
    setTestState({ serviceId: id, loading: true, ok: false, message: "" });
    try {
      if (id === OFFICIAL_LLM_ID) {
        const res = await runOpenAIConnectionTest({
          baseUrl: officialBaseUrl,
          apiKey: officialKey,
          model: officialModel,
          requireKey: true,
          locale,
          t,
        });
        setTestState({
          serviceId: id,
          loading: false,
          ok: true,
          message: t("settings.testSuccess", { ms: res.ms, output: res.output }),
        });
        refreshOfficialQuota();
        return;
      }

      if (activeCustomService && activeCustomService.id === id) {
        const res = await runOpenAIConnectionTest({
          baseUrl: activeCustomService.baseUrl,
          apiKey: activeCustomService.apiKey,
          model: activeCustomService.model,
          requireKey: false,
          locale,
          t,
        });
        setTestState({
          serviceId: id,
          loading: false,
          ok: true,
          message: t("settings.testSuccess", { ms: res.ms, output: res.output }),
        });
        return;
      }

      const probe = TEST_PROBE_BY_LOCALE[locale] || TEST_PROBE_BY_LOCALE.en;
      const startedAt = performance.now();
      const result = await messaging._({
        action: "translate",
        data: {
          apiCode: id,
          text: probe.sourceText,
          destinations: [probe.destZhName],
          source: "",
          skipCache: true,
        },
      });
      if (result?.error) {
        throw new Error(result.error.message || t("settings.testReturnError"));
      }
      const text = result?.result?.join(" ") || "";
      if (!text) {
        throw new Error(t("settings.testNoValidResult"));
      }
      const ms = Math.round(performance.now() - startedAt);
      setTestState({
        serviceId: id,
        loading: false,
        ok: true,
        message: t("settings.testSuccess", { ms, output: text }),
      });
    } catch (err) {
      setTestState({
        serviceId: id,
        loading: false,
        ok: false,
        message: err?.message || t("settings.testFail"),
      });
    }
  };

  const renderTestStatus = (id) => {
    if (testState.serviceId !== id || !testState.message) return null;
    return (
      <div
        className={`test-result-pill ${testState.ok ? "is-ok" : "is-err"}`}
        title={testState.message}
      >
        <Icon icon={testState.ok ? "tick-circle" : "error"} size={13} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{testState.message}</span>
      </div>
    );
  };

  const renderInspector = () => {
    if (activeId === OFFICIAL_LLM_ID) {
      return (
        <>
          <div className="inspector-header">
            <div className="inspector-title-wrap">
              <div className="inspector-icon">
                <ServiceGlyph kind="official" />
              </div>
              <div>
                <div className="inspector-heading-row">
                  <h1 className="inspector-heading">{t("service.officialLlm")}</h1>
                  <span className={`inspector-badge ${officialReady ? "is-ready" : "is-warn"}`}>
                    {officialReady ? t("settings.statusReady") : t("settings.statusPendingConfig")}
                  </span>
                </div>
                <p className="inspector-subtitle">{t("settings.officialSubtitle")}</p>
              </div>
            </div>

            <div className="inspector-header-actions">
              {officialQuota.data && (
                <button
                  type="button"
                  className={`official-quota-pill ${
                    !officialQuota.data.unlimitedQuota && officialQuota.data.rmb <= 0
                      ? "is-empty"
                      : ""
                  }`}
                  onClick={() => refreshOfficialQuota()}
                  disabled={officialQuota.loading}
                  title={
                    officialQuota.data.unlimitedQuota
                      ? t("settings.quotaUnlimitedTooltip")
                      : t("settings.quotaLimitedTooltip", {
                          total: officialQuota.data.totalAvailable.toLocaleString(),
                          rate: officialQuota.data.usdExchangeRate,
                        })
                  }
                >
                  <span className="official-quota-label">{t("settings.quotaLabel")}</span>
                  <span className="official-quota-value">
                    {officialQuota.data.unlimitedQuota
                      ? t("settings.quotaUnlimited")
                      : formatQuotaRmb(officialQuota.data.rmb)}
                  </span>
                </button>
              )}
              <a
                className="free-get-btn"
                href={OFFICIAL_LLM_PORTAL_URL}
                target="_blank"
                rel="noreferrer"
              >
                <Icon icon="key" size={13} />
                <span>{t("settings.freeGet")}</span>
                <Icon icon="share" size={11} />
              </a>
            </div>
          </div>

          <div className="settings-form">
            <UsageToggleCard
              checked={selectedAPIs.includes(OFFICIAL_LLM_ID)}
              onToggle={() => toggleSelectionApi(OFFICIAL_LLM_ID)}
              isPageDefault={pageTrsApi === OFFICIAL_LLM_ID}
              onTogglePageDefault={() => togglePageDefault(OFFICIAL_LLM_ID)}
            />

            <div className="field-card">
              <div className="field-block">
                <div className="field-head">
                  <label className="field-title">{t("settings.baseUrlLabel")}</label>
                  {officialBaseUrl !== OFFICIAL_LLM_BASE_URL && (
                    <button
                      type="button"
                      className="field-action-link"
                      onClick={() => updateStorage({ officialLLMBaseUrl: OFFICIAL_LLM_BASE_URL })}
                    >
                      {t("settings.restoreDefaultUrl")}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  className="ndt-input is-mono"
                  value={officialBaseUrl}
                  placeholder={OFFICIAL_LLM_BASE_URL}
                  onChange={(e) =>
                    updateStorage({ officialLLMBaseUrl: e.target.value.trim() })
                  }
                />
              </div>

              <div className="field-block">
                <label className="field-title">API Key</label>
                <SecretKeyInput
                  value={officialKey}
                  placeholder="sk-..."
                  onChange={(val) => updateStorage({ officialLLMKey: val.trim() })}
                />
              </div>

              <div className="field-block">
                <label className="field-title">{t("settings.modelLabel")}</label>
                <div className="model-test-row">
                  <ModelSelectorDropdown
                    baseUrl={officialBaseUrl || OFFICIAL_LLM_BASE_URL}
                    apiKey={officialKey}
                    model={officialModel}
                    onSelectModel={(nextModel) => updateStorage({ officialLLMModel: nextModel })}
                    showRichMetrics
                    richMetadata={officialModelsMeta}
                    onRichMetadataLoaded={setOfficialModelsMeta}
                  />
                  <button
                    type="button"
                    className="ndt-btn is-primary model-test-btn"
                    disabled={testState.loading && testState.serviceId === OFFICIAL_LLM_ID}
                    onClick={() => handleRunTest(OFFICIAL_LLM_ID)}
                  >
                    <Icon
                      icon={testState.loading ? "refresh" : "flash"}
                      size={13}
                      className={testState.loading ? "ndt-spin" : ""}
                    />
                    <span>
                      {testState.loading ? t("settings.testing") : t("settings.testConnection")}
                    </span>
                  </button>
                </div>
                <OfficialModelSummaryBar
                  model={officialModel}
                  metadata={officialModelsMeta}
                  perfDetail={officialPerfDetail}
                  t={t}
                />
                {renderTestStatus(OFFICIAL_LLM_ID)}
              </div>

              <div className="field-block">
                <div className="field-head">
                  <span className="field-title">{t("settings.promptLabel")}</span>
                  <button
                    type="button"
                    className="field-action-link"
                    onClick={() => setShowPromptEditor((v) => !v)}
                  >
                    {showPromptEditor
                      ? t("settings.promptCollapse")
                      : officialPrompt
                        ? t("settings.promptEditCustom")
                        : t("settings.promptExpand")}
                  </button>
                </div>
                {showPromptEditor && (
                  <textarea
                    className="ndt-textarea"
                    placeholder={t("settings.promptPlaceholder")}
                    value={officialPrompt}
                    onChange={(e) => updateStorage({ officialLLMPrompt: e.target.value })}
                  />
                )}
              </div>
            </div>

            <LlmDeliveryConfigRow
              batchEnabled={officialBatchEnabled}
              batchMaxBytes={officialBatchMaxBytes}
              streamEnabled={officialStreamEnabled}
              maxConcurrency={officialMaxConcurrency}
              defaultMaxConcurrency={DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY}
              onBatchChange={(val) => updateStorage({ officialLLMBatchEnabled: val })}
              onBatchMaxBytesChange={(val) => updateStorage({ officialLLMBatchMaxBytes: val })}
              onStreamChange={(val) => updateStorage({ officialLLMStreamEnabled: val })}
              onMaxConcurrencyChange={(val) => updateStorage({ officialLLMMaxConcurrency: val })}
            />
          </div>
        </>
      );
    }

    if (activeId === ServiceId.Microsoft) {
      return (
        <>
          <div className="inspector-header">
            <div className="inspector-title-wrap">
              <div className="inspector-icon">
                <ServiceGlyph kind="microsoft" />
              </div>
              <div>
                <div className="inspector-heading-row">
                  <h1 className="inspector-heading">{t("service.microsoft")}</h1>
                  <span className="inspector-badge is-ready">{t("settings.statusBuiltInFree")}</span>
                  <span className="inspector-badge">{t("settings.statusNativeBatch")}</span>
                </div>
                <p className="inspector-subtitle">{t("settings.msSubtitle")}</p>
              </div>
            </div>
          </div>

          <div className="settings-form">
            <UsageToggleCard
              checked={selectedAPIs.includes(ServiceId.Microsoft)}
              onToggle={() => toggleSelectionApi(ServiceId.Microsoft)}
              isPageDefault={pageTrsApi === ServiceId.Microsoft}
              onTogglePageDefault={() => togglePageDefault(ServiceId.Microsoft)}
            />

            <div className="field-card">
              <div className="field-block">
                <span className="field-title">{t("settings.msEndpointLabel")}</span>
                <div className="ndt-input is-mono" style={{ display: "flex", alignItems: "center", opacity: 0.85 }}>
                  https://edge.microsoft.com/translate/translatetext
                </div>
                <span className="field-help">{t("settings.msEndpointHelp")}</span>
              </div>
            </div>
          </div>

          <div className="inspector-footer">
            {renderTestStatus(ServiceId.Microsoft) || (
              <span className="field-help">{t("settings.msFooterHelp")}</span>
            )}
            <button
              type="button"
              className="ndt-btn is-primary"
              disabled={testState.loading && testState.serviceId === ServiceId.Microsoft}
              onClick={() => handleRunTest(ServiceId.Microsoft)}
            >
              <Icon
                icon={testState.loading ? "refresh" : "flash"}
                size={13}
                className={testState.loading ? "ndt-spin" : ""}
              />
              <span>
                {testState.loading ? t("settings.testingAlt") : t("settings.testConnection")}
              </span>
            </button>
          </div>
        </>
      );
    }

    if (activeId === ServiceId.Google) {
      const googleMirror = settings?.googleMirror ?? SETTINGS_STORAGE_DEFAULTS.googleMirror;
      const googleHidePhonetic = Boolean(settings?.googleHidePhonetic);

      return (
        <>
          <div className="inspector-header">
            <div className="inspector-title-wrap">
              <div className="inspector-icon">
                <ServiceGlyph kind="google" />
              </div>
              <div>
                <div className="inspector-heading-row">
                  <h1 className="inspector-heading">{t("service.google")}</h1>
                  <span className="inspector-badge is-ready">{t("settings.statusBuiltInFree")}</span>
                  <span className="inspector-badge">{t("settings.statusNativeBatch")}</span>
                </div>
                <p className="inspector-subtitle">{t("settings.googleSubtitle")}</p>
              </div>
            </div>
          </div>

          <div className="settings-form">
            <UsageToggleCard
              checked={selectedAPIs.includes(ServiceId.Google)}
              onToggle={() => toggleSelectionApi(ServiceId.Google)}
              isPageDefault={pageTrsApi === ServiceId.Google}
              onTogglePageDefault={() => togglePageDefault(ServiceId.Google)}
            />

            <div className="field-card">
              <div className="field-block">
                <div className="field-head">
                  <label className="field-title">{t("settings.googleMirrorLabel")}</label>
                  {googleMirror && (
                    <button
                      type="button"
                      className="field-action-link"
                      onClick={() => updateStorage({ googleMirror: "" })}
                    >
                      {t("settings.googleMirrorReset")}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  className="ndt-input is-mono"
                  placeholder="https://translate.googleapis.com"
                  value={googleMirror}
                  onChange={(e) => updateStorage({ googleMirror: e.target.value.trim() })}
                />
                <span className="field-help">{t("settings.googleMirrorHelp")}</span>
              </div>
            </div>

            <div className="usage-row">
              <div className="usage-row-text">
                <span className="usage-row-title">{t("settings.googleHidePhonetic")}</span>
                <span className="usage-row-desc">{t("settings.googleHidePhoneticDesc")}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={googleHidePhonetic}
                className={`ndt-switch ${googleHidePhonetic ? "is-checked" : ""}`}
                onClick={() => updateStorage({ googleHidePhonetic: !googleHidePhonetic })}
              />
            </div>
          </div>

          <div className="inspector-footer">
            {renderTestStatus(ServiceId.Google) || (
              <span className="field-help">{t("settings.googleFooterHelp")}</span>
            )}
            <button
              type="button"
              className="ndt-btn is-primary"
              disabled={testState.loading && testState.serviceId === ServiceId.Google}
              onClick={() => handleRunTest(ServiceId.Google)}
            >
              <Icon
                icon={testState.loading ? "refresh" : "flash"}
                size={13}
                className={testState.loading ? "ndt-spin" : ""}
              />
              <span>
                {testState.loading ? t("settings.testingAlt") : t("settings.testConnection")}
              </span>
            </button>
          </div>
        </>
      );
    }

    if (activeCustomService) {
      const svc = activeCustomService;
      const isReady = Boolean(svc.baseUrl?.trim() && svc.model?.trim());
      const isConfirmingDelete = confirmDeleteId === svc.id;
      const svcBatchEnabled = svc.batchEnabled !== false;
      const svcBatchMaxBytes = svc.batchMaxBytes ?? 10000;
      const svcStreamEnabled = svc.streamEnabled !== false;
      const svcMaxConcurrency = normalizeLlmConcurrency(
        svc.maxConcurrency,
        DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY
      );

      return (
        <>
          <div className="inspector-header">
            <div className="inspector-title-wrap">
              <div className="inspector-icon">
                <ServiceGlyph kind="custom" />
              </div>
              <div>
                <div className="inspector-heading-row">
                  <h1 className="inspector-heading">{svc.name || t("service.customDefault")}</h1>
                  <span className={`inspector-badge ${isReady ? "is-ready" : "is-warn"}`}>
                    {isReady ? t("settings.statusReady") : t("settings.statusPendingModel")}
                  </span>
                  <span className="inspector-badge">{t("settings.statusOpenAICompat")}</span>
                </div>
                <p className="inspector-subtitle">{t("settings.customSubtitle")}</p>
              </div>
            </div>

            <div className="inspector-header-actions">
              {isConfirmingDelete ? (
                <>
                  <button
                    type="button"
                    className="ndt-btn is-danger is-compact"
                    onClick={() => handleDeleteCustomService(svc.id)}
                  >
                    {t("common.confirmDelete")}
                  </button>
                  <button
                    type="button"
                    className="ndt-btn is-compact"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    {t("common.cancel")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="ndt-btn is-compact"
                  onClick={() => setConfirmDeleteId(svc.id)}
                >
                  <Icon icon="trash" size={12} />
                  <span>{t("common.delete")}</span>
                </button>
              )}
            </div>
          </div>

          <div className="settings-form" key={svc.id}>
            <UsageToggleCard
              checked={selectedAPIs.includes(svc.id)}
              onToggle={() => toggleSelectionApi(svc.id)}
              isPageDefault={pageTrsApi === svc.id}
              onTogglePageDefault={() => togglePageDefault(svc.id)}
            />

            <div className="field-card">
              <div className="field-block">
                <label className="field-title">{t("settings.customNameLabel")}</label>
                <input
                  type="text"
                  className="ndt-input"
                  value={svc.name || ""}
                  placeholder={t("settings.customNamePlaceholder")}
                  onChange={(e) => updateCustomService(svc.id, { name: e.target.value })}
                />
              </div>

              <div className="field-block">
                <label className="field-title">{t("settings.customBaseUrlLabel")}</label>
                <input
                  type="text"
                  className="ndt-input is-mono"
                  value={svc.baseUrl || ""}
                  placeholder="https://api.openai.com/v1"
                  autoFocus={!svc.baseUrl}
                  onChange={(e) => updateCustomService(svc.id, { baseUrl: e.target.value.trim() })}
                />
              </div>

              <div className="field-block">
                <label className="field-title">API Key</label>
                <SecretKeyInput
                  value={svc.apiKey || ""}
                  placeholder={t("settings.customApiKeyPlaceholder")}
                  onChange={(val) => updateCustomService(svc.id, { apiKey: val.trim() })}
                />
              </div>

              <div className="field-block">
                <label className="field-title">{t("settings.modelLabel")}</label>
                <div className="model-test-row">
                  <ModelSelectorDropdown
                    baseUrl={svc.baseUrl}
                    apiKey={svc.apiKey}
                    model={svc.model || ""}
                    onSelectModel={(nextModel) => updateCustomService(svc.id, { model: nextModel })}
                  />
                  <button
                    type="button"
                    className="ndt-btn is-primary model-test-btn"
                    disabled={testState.loading && testState.serviceId === svc.id}
                    onClick={() => handleRunTest(svc.id)}
                  >
                    <Icon
                      icon={testState.loading ? "refresh" : "flash"}
                      size={13}
                      className={testState.loading ? "ndt-spin" : ""}
                    />
                    <span>
                      {testState.loading ? t("settings.testing") : t("settings.testConnection")}
                    </span>
                  </button>
                </div>
                {renderTestStatus(svc.id)}
              </div>

              <div className="field-block">
                <div className="field-head">
                  <span className="field-title">{t("settings.promptLabel")}</span>
                  <button
                    type="button"
                    className="field-action-link"
                    onClick={() => setShowPromptEditor((v) => !v)}
                  >
                    {showPromptEditor
                      ? t("settings.promptCollapse")
                      : svc.prompt
                        ? t("settings.promptEditCustom")
                        : t("settings.promptExpand")}
                  </button>
                </div>
                {showPromptEditor && (
                  <textarea
                    className="ndt-textarea"
                    placeholder={t("settings.promptPlaceholder")}
                    value={svc.prompt || ""}
                    onChange={(e) => updateCustomService(svc.id, { prompt: e.target.value })}
                  />
                )}
              </div>
            </div>

            <LlmDeliveryConfigRow
              batchEnabled={svcBatchEnabled}
              batchMaxBytes={svcBatchMaxBytes}
              streamEnabled={svcStreamEnabled}
              maxConcurrency={svcMaxConcurrency}
              defaultMaxConcurrency={DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY}
              onBatchChange={(val) => updateCustomService(svc.id, { batchEnabled: val })}
              onBatchMaxBytesChange={(val) => updateCustomService(svc.id, { batchMaxBytes: val })}
              onStreamChange={(val) => updateCustomService(svc.id, { streamEnabled: val })}
              onMaxConcurrencyChange={(val) =>
                updateCustomService(svc.id, { maxConcurrency: val })
              }
            />
          </div>
        </>
      );
    }

    return null;
  };

  const renderWordbookPanel = () => {
    const q = wbSearch.trim().toLowerCase();
    const normQ = normalizeTextForMatch(wbSearch);
    const filtered = wordbook.items.filter((item) => {
      if (wbFilter === "learning" && item.mastered) return false;
      if (wbFilter === "mastered" && !item.mastered) return false;
      if (!q) return true;
      return (
        String(item.term || "").toLowerCase().includes(q) ||
        (normQ && normalizeTextForMatch(item.term || "").includes(normQ)) ||
        String(item.translation || "").toLowerCase().includes(q) ||
        String(item.sourceTitle || "").toLowerCase().includes(q) ||
        String(item.languageLabel || "").toLowerCase().includes(q)
      );
    });

    const handleExportTsv = () => {
      if (wordbook.items.length === 0) return;
      const tsv = exportWordbookToTsv(wordbook.items);
      const blob = new Blob([tsv], { type: "text/tab-separated-values;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `language-classroom-wordbook-${new Date().toISOString().slice(0, 10)}.tsv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    const handleSpeakText = (text, item) => {
      const clean = String(text || "").trim();
      if (!clean) return;
      messaging
        ._({
          action: "audio",
          url: {
            apiId: "GoogleWeb",
            source:
              mapSubtitleLangToTtsSource(item?.language, item?.languageLabel) ||
              (hasArabicScript(clean) ? "阿拉伯语" : ""),
            text: clean,
          },
        })
        .catch(() => {});
    };

    return (
      <>
        <div className="inspector-header">
          <div className="inspector-title-wrap">
            <div className="inspector-icon wb-inspector-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M10 2.4l2.3 4.65 5.13.75-3.71 3.62.88 5.11L10 14.12l-4.6 2.41.88-5.11-3.71-3.62 5.13-.75L10 2.4z"
                  fill="#f97316"
                  stroke="#f97316"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className="inspector-heading-row">
                <h1 className="inspector-heading">{t("wordbook.settingsHeading")}</h1>
                <span className="inspector-badge is-ready">
                  {t("wordbook.itemCountBadge", { count: wordbook.items.length })}
                </span>
              </div>
              <p className="inspector-subtitle">{t("wordbook.settingsSubtitle")}</p>
            </div>
          </div>

          <div className="inspector-header-actions">
            <button
              type="button"
              className="ndt-btn"
              disabled={wordbook.items.length === 0}
              onClick={handleExportTsv}
            >
              {t("wordbook.exportTsvBtn")}
            </button>
          </div>
        </div>

        <div className="wb-settings-toolbar">
          <input
            type="text"
            className="ndt-input wb-settings-search"
            placeholder={t("wordbook.settingsSearchPlaceholder")}
            value={wbSearch}
            onChange={(e) => setWbSearch(e.target.value)}
          />
          <div className="wb-settings-toolbar-right">
            <div className="theme-segmented">
              <button
                type="button"
                className={`theme-segmented-btn ${wbFilter === "all" ? "is-active" : ""}`}
                onClick={() => setWbFilter("all")}
              >
                {t("wordbook.filterAll", { count: wordbook.items.length })}
              </button>
              <button
                type="button"
                className={`theme-segmented-btn ${wbFilter === "learning" ? "is-active" : ""}`}
                onClick={() => setWbFilter("learning")}
              >
                {t("wordbook.filterLearning", {
                  count: wordbook.items.filter((i) => !i.mastered).length,
                })}
              </button>
              <button
                type="button"
                className={`theme-segmented-btn ${wbFilter === "mastered" ? "is-active" : ""}`}
                onClick={() => setWbFilter("mastered")}
              >
                {t("wordbook.filterMastered", {
                  count: wordbook.items.filter((i) => i.mastered).length,
                })}
              </button>
            </div>

            {wordbook.items.length > 0 && (
              <div className="theme-segmented">
                <button
                  type="button"
                  className={`theme-segmented-btn ${wbViewMode === "focus" ? "is-active" : ""}`}
                  onClick={() => setWbViewMode("focus")}
                >
                  {t("classroom.viewFocus")}
                </button>
                <button
                  type="button"
                  className={`theme-segmented-btn ${wbViewMode === "grid" ? "is-active" : ""}`}
                  onClick={() => setWbViewMode("grid")}
                >
                  {t("classroom.viewGrid")}
                </button>
              </div>
            )}
          </div>
        </div>

        <WordbookBoard
          items={filtered}
          totalCount={wordbook.items.length}
          viewMode={wbViewMode}
          onViewModeChange={setWbViewMode}
          onSpeak={handleSpeakText}
          onToggleMastered={(item) => wordbook.toggleMastered(item.id)}
          onRemove={(item) => wordbook.removeItem(item.id)}
          emptyHint={t("wordbook.settingsEmptyHint")}
          enableKeyboardShortcuts={topTab === TOP_TAB_WORDBOOK}
          className={`wb-settings-board ${wbViewMode === "grid" ? "is-grid-mode" : ""}`}
        />
      </>
    );
  };

  const renderOtherSettingsPanel = () => (
    <>
      <div className="inspector-header">
        <div className="inspector-title-wrap">
          <div className="inspector-icon">
            <Icon icon="cog" size={18} />
          </div>
          <div>
            <div className="inspector-heading-row">
              <h1 className="inspector-heading">{t("settings.otherTitle")}</h1>
            </div>
            <p className="inspector-subtitle">{t("settings.otherSubtitle")}</p>
          </div>
        </div>
      </div>

      <div className="settings-form">
        <section className="other-settings-section">
          <div className="other-section-title">{t("settings.otherVideoSection")}</div>
          <div className="other-switch-list">
            <div className="usage-row is-feature-row">
              <div className="feature-row-left">
                <span className="feature-row-icon is-bilibili" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M6.5 3.5L8.6 5.6M13.5 3.5L11.4 5.6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <rect
                      x="2.8"
                      y="5.6"
                      width="14.4"
                      height="10.6"
                      rx="2.6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M7.3 9.5v2.2M12.7 9.5v2.2"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <div className="usage-row-text">
                  <span className="usage-row-title">{t("settings.bilibiliIntegrationTitle")}</span>
                  <span className="usage-row-desc">{t("settings.bilibiliIntegrationDesc")}</span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={bilibiliVideoIntegration}
                aria-label={t("settings.bilibiliIntegrationTitle")}
                className={`ndt-switch ${bilibiliVideoIntegration ? "is-checked" : ""}`}
                onClick={() =>
                  updateStorage({ bilibiliVideoIntegration: !bilibiliVideoIntegration })
                }
              />
            </div>

            <div className="usage-row is-feature-row">
              <div className="feature-row-left">
                <span className="feature-row-icon is-youtube" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <rect
                      x="2.4"
                      y="4.6"
                      width="15.2"
                      height="10.8"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path d="M8.5 7.7L13 10L8.5 12.3V7.7Z" fill="currentColor" />
                  </svg>
                </span>
                <div className="usage-row-text">
                  <span className="usage-row-title">{t("settings.youtubeIntegrationTitle")}</span>
                  <span className="usage-row-desc">{t("settings.youtubeIntegrationDesc")}</span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={youtubeVideoIntegration}
                aria-label={t("settings.youtubeIntegrationTitle")}
                className={`ndt-switch ${youtubeVideoIntegration ? "is-checked" : ""}`}
                onClick={() =>
                  updateStorage({ youtubeVideoIntegration: !youtubeVideoIntegration })
                }
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );

  const handleSelectTopTab = (nextTab) => {
    setTopTab(nextTab);
    if (typeof window !== "undefined" && window.history?.replaceState) {
      const nextHash = nextTab === TOP_TAB_LLM ? "" : `#${nextTab}`;
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}${nextHash}`
      );
    }
  };

  return (
    <div className="ndt-settings-page">
      <header className="ndt-topbar">
        <div className="ndt-topbar-inner">
          <div className="ndt-topbar-left">
            <span className="ndt-app-logo">
              <img src={chrome.runtime.getURL("logodark.png")} alt="" />
            </span>
            <span className="ndt-topbar-title">{t("settings.topbarTitle")}</span>
            <span className="ndt-topbar-pill">
              {t("settings.defaultPagePill", {
                name: getServiceName(pageTrsApi, customServices),
              })}
            </span>
          </div>

          <div className="ndt-topbar-right">
            <span className={`ndt-save-indicator ${savedTick ? "is-visible" : ""}`}>
              <Icon icon="tick" size={12} />
              <span>{t("settings.savedIndicator")}</span>
            </span>

            <UiLanguageSelect onChangeLocale={() => markSaved()} />
          </div>
        </div>
      </header>

      <div className="ndt-workspace-wrap">
        <div className="ndt-page-tabs-bar">
          <nav
            className="ndt-page-tabs"
            role="tablist"
            aria-label={t("settings.tabsAriaLabel")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={topTab === TOP_TAB_LLM}
              className={`ndt-page-tab ${topTab === TOP_TAB_LLM ? "is-active" : ""}`}
              onClick={() => handleSelectTopTab(TOP_TAB_LLM)}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M10 2.5l1.55 4.55L16.1 8.6l-4.55 1.55L10 14.7l-1.55-4.55L3.9 8.6l4.55-1.55L10 2.5z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.4 13.4l.75 1.9 1.9.75-1.9.75-.75 1.9-.75-1.9-1.9-.75 1.9-.75.75-1.9z"
                  fill="currentColor"
                />
              </svg>
              <span>{t("settings.tabLlm")}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={topTab === TOP_TAB_WORDBOOK}
              className={`ndt-page-tab ${topTab === TOP_TAB_WORDBOOK ? "is-active" : ""}`}
              onClick={() => handleSelectTopTab(TOP_TAB_WORDBOOK)}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M10 2.6l2.25 4.55 5.02.73-3.63 3.54.86 5-4.5-2.36-4.5 2.36.86-5-3.63-3.54 5.02-.73L10 2.6z"
                  fill={topTab === TOP_TAB_WORDBOOK ? "#f97316" : "none"}
                  stroke={topTab === TOP_TAB_WORDBOOK ? "#f97316" : "currentColor"}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{t("settings.tabWordbook")}</span>
              {wordbook.items.length > 0 && (
                <span className="ndt-page-tab-badge">{wordbook.items.length}</span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={topTab === TOP_TAB_OTHER}
              className={`ndt-page-tab ${topTab === TOP_TAB_OTHER ? "is-active" : ""}`}
              onClick={() => handleSelectTopTab(TOP_TAB_OTHER)}
            >
              <Icon icon="cog" size={13} />
              <span>{t("settings.tabOther")}</span>
            </button>
          </nav>
        </div>

        {topTab === TOP_TAB_LLM && (
          <div className="ndt-workspace-shell">
            <aside className="service-rail" aria-label={t("settings.railLabel")}>
              <div className="rail-section">
                <div className="rail-section-header">
                  <span className="rail-section-label">{t("settings.railBuiltIn")}</span>
                </div>
                <div className="rail-list">
                  <button
                    type="button"
                    className={`rail-item ${activeId === OFFICIAL_LLM_ID ? "is-selected" : ""}`}
                    onClick={() => setActiveId(OFFICIAL_LLM_ID)}
                  >
                    <span className="rail-item-icon">
                      <ServiceGlyph kind="official" />
                    </span>
                    <span className="rail-item-meta">
                      <span className="rail-item-title-row">
                        <span className="rail-item-title">{t("service.officialLlm")}</span>
                        {pageTrsApi === OFFICIAL_LLM_ID && (
                          <span className="rail-default-badge">{t("settings.railDefaultBadge")}</span>
                        )}
                      </span>
                      <span className="rail-item-sub">
                        {officialModel ||
                          (officialKey
                            ? t("settings.railClickSelectModel")
                            : t("settings.railNeedKey"))}
                      </span>
                    </span>
                    <span className={`status-dot ${officialReady ? "is-ready" : "is-warn"}`} />
                  </button>

                  <button
                    type="button"
                    className={`rail-item ${activeId === ServiceId.Microsoft ? "is-selected" : ""}`}
                    onClick={() => setActiveId(ServiceId.Microsoft)}
                  >
                    <span className="rail-item-icon">
                      <ServiceGlyph kind="microsoft" />
                    </span>
                    <span className="rail-item-meta">
                      <span className="rail-item-title-row">
                        <span className="rail-item-title">{t("service.microsoft")}</span>
                        {pageTrsApi === ServiceId.Microsoft && (
                          <span className="rail-default-badge">{t("settings.railDefaultBadge")}</span>
                        )}
                      </span>
                      <span className="rail-item-sub">{t("settings.railBuiltInNoKey")}</span>
                    </span>
                    <span className="status-dot is-ready" />
                  </button>

                  <button
                    type="button"
                    className={`rail-item ${activeId === ServiceId.Google ? "is-selected" : ""}`}
                    onClick={() => setActiveId(ServiceId.Google)}
                  >
                    <span className="rail-item-icon">
                      <ServiceGlyph kind="google" />
                    </span>
                    <span className="rail-item-meta">
                      <span className="rail-item-title-row">
                        <span className="rail-item-title">{t("service.google")}</span>
                        {pageTrsApi === ServiceId.Google && (
                          <span className="rail-default-badge">{t("settings.railDefaultBadge")}</span>
                        )}
                      </span>
                      <span className="rail-item-sub">{t("settings.railBuiltInNoKey")}</span>
                    </span>
                    <span className="status-dot is-ready" />
                  </button>
                </div>
              </div>

              <div className="rail-section">
                <div className="rail-section-header">
                  <span className="rail-section-label">{t("settings.railCustomSection")}</span>
                </div>

                <div className="rail-list">
                  {customServices.length > 0 ? (
                    customServices.map((svc) => {
                      const ready = Boolean(svc.baseUrl?.trim() && svc.model?.trim());
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          className={`rail-item ${activeId === svc.id ? "is-selected" : ""}`}
                          onClick={() => setActiveId(svc.id)}
                        >
                          <span className="rail-item-icon">
                            <ServiceGlyph kind="custom" />
                          </span>
                          <span className="rail-item-meta">
                            <span className="rail-item-title-row">
                              <span className="rail-item-title">
                                {svc.name || t("settings.railUnnamedService")}
                              </span>
                              {pageTrsApi === svc.id && (
                                <span className="rail-default-badge">
                                  {t("settings.railDefaultBadge")}
                                </span>
                              )}
                            </span>
                            <span className="rail-item-sub">
                              {svc.model || t("settings.railNoModel")}
                            </span>
                          </span>
                          <span className={`status-dot ${ready ? "is-ready" : "is-warn"}`} />
                        </button>
                      );
                    })
                  ) : (
                    <div className="rail-empty-text">{t("settings.railEmptyCustom")}</div>
                  )}
                </div>
              </div>

              <div className="rail-footer">
                <button
                  type="button"
                  className="rail-add-btn"
                  onClick={handleAddCustomService}
                >
                  <Icon icon="plus" size={13} />
                  <span>{t("settings.railAddCustom")}</span>
                </button>
              </div>
            </aside>

            <main className="service-inspector">
              {renderInspector()}
              {activeId && (
                <ServiceCacheBar
                  count={cacheCounts[activeId] ?? 0}
                  loading={cacheLoading}
                  clearing={clearingCacheId === activeId}
                  onClear={() => handleClearServiceCache(activeId)}
                />
              )}
            </main>
          </div>
        )}

        {topTab === TOP_TAB_WORDBOOK && (
          <div className="ndt-workspace-shell is-single">
            <main className="service-inspector is-standalone">{renderWordbookPanel()}</main>
          </div>
        )}

        {topTab === TOP_TAB_OTHER && (
          <div className="ndt-workspace-shell is-single">
            <main className="service-inspector is-standalone">{renderOtherSettingsPanel()}</main>
          </div>
        )}
      </div>
    </div>
  );
}

const rootEl = document.getElementById("app");
if (!rootEl) throw new Error("DOM 里没有 #app 元素。");
createRoot(rootEl).render(<SettingsApp />);
