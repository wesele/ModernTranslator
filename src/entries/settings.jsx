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
import { UiLanguageSelect } from "../components/UiLanguageSelect.jsx";
import { UI_LOCALE_TO_BCP47, useI18n } from "../shared/i18n/index.js";

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

function ModelSelectorDropdown({ baseUrl, apiKey, model, onSelectModel }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [models, setModels] = React.useState([]);
  const [fetchError, setFetchError] = React.useState("");
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
    try {
      const list = await fetchOpenAIModels(baseUrl, apiKey, controller.signal);
      if (controller.signal.aborted) return;
      setModels(list);
      if (!list.length) {
        setFetchError(t("settings.modelEmptyListError"));
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      setFetchError(err?.message || t("settings.modelFetchFail"));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [baseUrl, apiKey, t]);

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
        <div className="model-popover" role="listbox">
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

          <div className="model-popover-list">
            {filteredModels.length > 0 ? (
              filteredModels.map((id) => {
                const selected = id === model;
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

    if (activeId !== OFFICIAL_LLM_ID) {
      return undefined;
    }

    const timer = setTimeout(() => {
      refreshOfficialQuota();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [activeId, officialBaseUrl, officialKey, refreshOfficialQuota]);

  React.useEffect(() => {
    const onFocusOrVisible = () => {
      if (
        document.visibilityState === "visible" &&
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
  }, [activeId, officialKey, refreshOfficialQuota]);

  const activeCustomService = customServices.find((item) => item.id === activeId) || null;

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
      </div>
    </div>
  );
}

const rootEl = document.getElementById("app");
if (!rootEl) throw new Error("DOM 里没有 #app 元素。");
createRoot(rootEl).render(<SettingsApp />);
