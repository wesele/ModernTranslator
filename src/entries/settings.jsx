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
  OFFICIAL_LLM_ID,
  OFFICIAL_LLM_NAME,
  OFFICIAL_LLM_BASE_URL,
  OFFICIAL_LLM_PORTAL_URL,
  fetchOfficialQuotaRmb,
  fetchOpenAIModels,
  formatQuotaRmb,
  normalizeOpenAIBaseUrl,
  readApiErrorDetail,
  resolveChatCompletionsUrl,
  resolveOfficialQuotaOrigin,
} from "../shared/openaiUtils.js";

if (typeof document !== "undefined") {
  new InteractionModeEngine(document.documentElement, Classes.FOCUS_DISABLED).start();
}

const SETTINGS_STORAGE_DEFAULTS = pick(defaultOptions, [
  "darkMode",
  "selectedAPIs",
  "pageTrsApi",
  "googleType",
  "googleMirror",
  "googleHidePhonetic",
  "officialLLMBaseUrl",
  "officialLLMKey",
  "officialLLMModel",
  "officialLLMPrompt",
  "officialLLMBatchEnabled",
  "officialLLMBatchMaxBytes",
  "officialLLMStreamEnabled",
  "customOpenAIServices",
]);

const THEME_OPTIONS = [
  { value: "system", label: "系统" },
  { value: "close", label: "浅色" },
  { value: "open", label: "深色" },
];

const GOOGLE_MODE_OPTIONS = [
  { value: "fast", label: "快速批量接口 (推荐)" },
  { value: "accuracy", label: "高准确率网页窗口" },
];

function getServiceDisplayName(serviceId, customServices) {
  if (serviceId === OFFICIAL_LLM_ID) return OFFICIAL_LLM_NAME;
  if (serviceId === ServiceId.Microsoft) return "微软翻译";
  if (serviceId === ServiceId.Google) return "谷歌翻译";
  const match = (customServices || []).find((item) => item.id === serviceId);
  return match?.name || serviceId || "未选择";
}

function ServiceGlyph({ kind }) {
  if (kind === "official") {
    return <img src={chrome.runtime.getURL("official-llm.svg")} alt="" />;
  }
  if (kind === "microsoft") {
    return <img src={chrome.runtime.getURL("microsoft.png")} alt="" />;
  }
  if (kind === "google") {
    return <img src={chrome.runtime.getURL("google.ico")} alt="" />;
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 10L11 12L8.5 14M12.5 14H15.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsageToggleCard({ checked, onToggle, isPageDefault, onTogglePageDefault }) {
  return (
    <div className="usage-merged-row">
      <div className="usage-merged-cell">
        <span className="usage-row-title">用于划词翻译</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          className={`ndt-switch ${checked ? "is-checked" : ""}`}
          onClick={onToggle}
        />
      </div>

      <div className="usage-merged-cell">
        <span className="usage-row-title">用于全文翻译</span>
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
  onBatchChange,
  onBatchMaxBytesChange,
  onStreamChange,
}) {
  const [limitText, setLimitText] = React.useState(String(batchMaxBytes ?? 10000));

  React.useEffect(() => {
    setLimitText(String(batchMaxBytes ?? 10000));
  }, [batchMaxBytes]);

  return (
    <div className="delivery-row">
      <div className="delivery-group">
        <div className="delivery-toggle">
          <span className="delivery-label">批量发送</span>
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
            <span className="delivery-limit-label">单次上限</span>
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
              <span className="delivery-limit-unit">字节</span>
            </div>
          </div>
        )}
      </div>

      <div className="delivery-toggle">
        <span className="delivery-label">流式调用</span>
        <button
          type="button"
          role="switch"
          aria-checked={streamEnabled}
          className={`ndt-switch ${streamEnabled ? "is-checked" : ""}`}
          onClick={() => onStreamChange(!streamEnabled)}
        />
      </div>
    </div>
  );
}

function SecretKeyInput({ value, onChange, placeholder }) {
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
            title="清空密钥"
            onClick={() => onChange("")}
          >
            <Icon icon="cross" size={12} />
          </button>
        )}
        <button
          type="button"
          className="ndt-icon-btn"
          title={visible ? "隐藏密钥" : "显示密钥"}
          onClick={() => setVisible((v) => !v)}
        >
          <Icon icon={visible ? "eye-off" : "eye-open"} size={13} />
        </button>
      </div>
    </div>
  );
}

function ModelSelectorDropdown({ baseUrl, apiKey, model, onSelectModel }) {
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
        setFetchError("接口返回了空的模型列表，可在下方手动输入模型名");
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      setFetchError(err?.message || "获取模型列表失败");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [baseUrl, apiKey]);

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
          {model || "点击下拉获取模型列表..."}
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
              placeholder="筛选模型 ID..."
              autoFocus
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              className="ndt-icon-btn"
              title="重新获取模型列表"
              onClick={loadModels}
            >
              <Icon icon="refresh" size={12} className={loading ? "ndt-spin" : ""} />
            </button>
          </div>

          {loading && (
            <div className="model-popover-status is-loading">
              <span>正在从 /models 获取可用模型...</span>
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
                重试
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
              !fetchError && <div className="model-empty-hint">没有匹配的模型</div>
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
              placeholder="或手动输入模型 ID（如 gpt-4o-mini）"
              onChange={(e) => setManualModel(e.target.value)}
            />
            <button
              type="submit"
              className="ndt-btn is-compact"
              disabled={!manualModel.trim()}
            >
              确定
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

async function runOpenAIConnectionTest({ baseUrl, apiKey, model, requireKey }) {
  const cleanedBase = normalizeOpenAIBaseUrl(baseUrl);
  if (!cleanedBase) {
    throw new Error("请先填写接口地址 (Base URL)");
  }
  if (requireKey && !String(apiKey || "").trim()) {
    throw new Error("请先填写 API Key");
  }
  const trimmedModel = String(model || "").trim();
  if (!trimmedModel) {
    throw new Error("请先选择或填写模型");
  }

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
      messages: [{ role: "user", content: "Translate to Simplified Chinese only: Hello, world!" }],
    }),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorDetail(res));
  }
  const json = await res.json();
  const output = json?.choices?.[0]?.message?.content?.trim();
  if (!output) {
    throw new Error("接口返回成功，但未包含译文内容");
  }
  const ms = Math.round(performance.now() - startedAt);
  return { ms, output };
}

function ServiceCacheBar({ count, loading, clearing, onClear }) {
  return (
    <div className="service-cache-bar">
      <div className="service-cache-info">
        <div className="service-cache-title-row">
          <span className="service-cache-title">全局翻译缓存</span>
          <span className="service-cache-count">
            {loading ? "读取中..." : `已缓存 ${count} 个`}
          </span>
        </div>
        <span className="service-cache-desc">
          单个翻译单位小于 5 个词时自动缓存（按翻译服务隔离）
        </span>
      </div>
      <button
        type="button"
        className="ndt-btn is-compact"
        disabled={loading || clearing || count === 0}
        onClick={onClear}
      >
        <Icon icon={clearing ? "refresh" : "trash"} size={12} className={clearing ? "ndt-spin" : ""} />
        <span>{clearing ? "清空中..." : "清空缓存"}</span>
      </button>
    </div>
  );
}

function SettingsApp() {
  useDarkMode();

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
      name: count === 1 ? "OpenAI 兼容服务" : `OpenAI 兼容服务 ${count}`,
      baseUrl: "",
      apiKey: "",
      model: "",
      prompt: "",
      batchEnabled: true,
      batchMaxBytes: 10000,
      streamEnabled: true,
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
        });
        setTestState({
          serviceId: id,
          loading: false,
          ok: true,
          message: `连接正常 · ${res.ms}ms · "${res.output}"`,
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
        });
        setTestState({
          serviceId: id,
          loading: false,
          ok: true,
          message: `连接正常 · ${res.ms}ms · "${res.output}"`,
        });
        return;
      }

      const startedAt = performance.now();
      const result = await messaging._({
        action: "translate",
        data: {
          apiCode: id,
          text: "Hello, world!",
          destinations: ["中文(简体)"],
          source: "",
          skipCache: true,
        },
      });
      if (result?.error) {
        throw new Error(result.error.message || "翻译返回错误");
      }
      const text = result?.result?.join(" ") || "";
      if (!text) {
        throw new Error("未收到有效译文");
      }
      const ms = Math.round(performance.now() - startedAt);
      setTestState({
        serviceId: id,
        loading: false,
        ok: true,
        message: `连接正常 · ${ms}ms · "${text}"`,
      });
    } catch (err) {
      setTestState({
        serviceId: id,
        loading: false,
        ok: false,
        message: err?.message || "连接测试失败",
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
                  <h1 className="inspector-heading">{OFFICIAL_LLM_NAME}</h1>
                  <span className={`inspector-badge ${officialReady ? "is-ready" : "is-warn"}`}>
                    {officialReady ? "已就绪" : "待配置"}
                  </span>
                </div>
                <p className="inspector-subtitle">
                  本扩展完全免费且为公益性质；由友情赞助商提供的大模型接口，支持网页全文与划词翻译
                </p>
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
                      ? "该 API Key 本身不限额（实际消费受所属用户账户余额限制）· 点击刷新"
                      : `剩余内部额度 ${officialQuota.data.totalAvailable.toLocaleString()} · 汇率 1 USD = ¥${officialQuota.data.usdExchangeRate} · 点击刷新`
                  }
                >
                  <span className="official-quota-label">剩余额度</span>
                  <span className="official-quota-value">
                    {officialQuota.data.unlimitedQuota
                      ? "不限额"
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
                <span>免费获取</span>
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
                  <label className="field-title">接口地址 (URL)</label>
                  {officialBaseUrl !== OFFICIAL_LLM_BASE_URL && (
                    <button
                      type="button"
                      className="field-action-link"
                      onClick={() => updateStorage({ officialLLMBaseUrl: OFFICIAL_LLM_BASE_URL })}
                    >
                      恢复默认地址
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
                <label className="field-title">模型 (Model)</label>
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
                    <span>{testState.loading ? "测试中..." : "测试连通性"}</span>
                  </button>
                </div>
                {renderTestStatus(OFFICIAL_LLM_ID)}
              </div>

              <div className="field-block">
                <div className="field-head">
                  <span className="field-title">高级提示词（选填）</span>
                  <button
                    type="button"
                    className="field-action-link"
                    onClick={() => setShowPromptEditor((v) => !v)}
                  >
                    {showPromptEditor ? "收起" : officialPrompt ? "已自定义 · 编辑" : "展开设置"}
                  </button>
                </div>
                {showPromptEditor && (
                  <textarea
                    className="ndt-textarea"
                    placeholder="留空使用内置专业翻译指令；如需自定义，划词单条翻译请包含 {{text}} 与 {{target}}。"
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
              onBatchChange={(val) => updateStorage({ officialLLMBatchEnabled: val })}
              onBatchMaxBytesChange={(val) => updateStorage({ officialLLMBatchMaxBytes: val })}
              onStreamChange={(val) => updateStorage({ officialLLMStreamEnabled: val })}
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
                  <h1 className="inspector-heading">微软翻译</h1>
                  <span className="inspector-badge is-ready">内置免密</span>
                  <span className="inspector-badge">批量原生</span>
                </div>
                <p className="inspector-subtitle">
                  Microsoft Edge 翻译通道，无需填写密钥即可直接用于划词与整页翻译
                </p>
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
                <span className="field-title">服务端点</span>
                <div className="ndt-input is-mono" style={{ display: "flex", alignItems: "center", opacity: 0.85 }}>
                  https://edge.microsoft.com/translate/translatetext
                </div>
                <span className="field-help">
                  内置高可用批量接口，单批最多支持多段落对齐返回，自动识别源语言。
                </span>
              </div>
            </div>
          </div>

          <div className="inspector-footer">
            {renderTestStatus(ServiceId.Microsoft) || (
              <span className="field-help">无需额外凭据，可随时点击右侧按钮测试服务响应</span>
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
              <span>{testState.loading ? "正在测试..." : "测试连通性"}</span>
            </button>
          </div>
        </>
      );
    }

    if (activeId === ServiceId.Google) {
      const googleType = settings?.googleType || SETTINGS_STORAGE_DEFAULTS.googleType;
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
                  <h1 className="inspector-heading">谷歌翻译</h1>
                  <span className="inspector-badge is-ready">内置免密</span>
                  <span className="inspector-badge">批量原生</span>
                </div>
                <p className="inspector-subtitle">
                  支持多语种自动检测、词典释义与自定义反代镜像地址
                </p>
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
                <span className="field-title">接口模式</span>
                <div className="segmented-control">
                  {GOOGLE_MODE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`segmented-btn ${googleType === opt.value ? "is-selected" : ""}`}
                      onClick={() => updateStorage({ googleType: opt.value })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <span className="field-help">
                  快速批量接口支持免弹窗整页并发翻译；高准确率模式在划词时可弹窗加载完整网页版谷歌翻译。
                </span>
              </div>

              <div className="field-block">
                <div className="field-head">
                  <label className="field-title">镜像地址（选填）</label>
                  {googleMirror && (
                    <button
                      type="button"
                      className="field-action-link"
                      onClick={() => updateStorage({ googleMirror: "" })}
                    >
                      清空恢复官方默认
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
                <span className="field-help">
                  当前地区节点已固定为国际版 (.com)；若所在网络无法直连，可填入自建或第三方谷歌翻译镜像 URL。
                </span>
              </div>
            </div>

            <div className="usage-row">
              <div className="usage-row-text">
                <span className="usage-row-title">划词结果隐藏音标</span>
                <span className="usage-row-desc">仅保留释义和译文，使划词卡片更紧凑</span>
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
              <span className="field-help">支持自动 POST 长文本与 Chrome 扩展批量端点回退</span>
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
              <span>{testState.loading ? "正在测试..." : "测试连通性"}</span>
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

      return (
        <>
          <div className="inspector-header">
            <div className="inspector-title-wrap">
              <div className="inspector-icon">
                <ServiceGlyph kind="custom" />
              </div>
              <div>
                <div className="inspector-heading-row">
                  <h1 className="inspector-heading">{svc.name || "自定义大模型"}</h1>
                  <span className={`inspector-badge ${isReady ? "is-ready" : "is-warn"}`}>
                    {isReady ? "已就绪" : "待选模型"}
                  </span>
                  <span className="inspector-badge">OpenAI 兼容</span>
                </div>
                <p className="inspector-subtitle">
                  自定义 OpenAI Chat Completions 兼容端点，支持模型自动拉取与网页翻译
                </p>
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
                    确认删除
                  </button>
                  <button
                    type="button"
                    className="ndt-btn is-compact"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    取消
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="ndt-btn is-compact"
                  onClick={() => setConfirmDeleteId(svc.id)}
                >
                  <Icon icon="trash" size={12} />
                  <span>删除</span>
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
                <label className="field-title">服务名称</label>
                <input
                  type="text"
                  className="ndt-input"
                  value={svc.name || ""}
                  placeholder="显示在弹窗与划词卡片中的名称"
                  onChange={(e) => updateCustomService(svc.id, { name: e.target.value })}
                />
              </div>

              <div className="field-block">
                <label className="field-title">接口地址 (Base URL)</label>
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
                  placeholder="sk-...（本地无鉴权服务可留空）"
                  onChange={(val) => updateCustomService(svc.id, { apiKey: val.trim() })}
                />
              </div>

              <div className="field-block">
                <label className="field-title">模型 (Model)</label>
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
                    <span>{testState.loading ? "测试中..." : "测试连通性"}</span>
                  </button>
                </div>
                {renderTestStatus(svc.id)}
              </div>

              <div className="field-block">
                <div className="field-head">
                  <span className="field-title">高级提示词（选填）</span>
                  <button
                    type="button"
                    className="field-action-link"
                    onClick={() => setShowPromptEditor((v) => !v)}
                  >
                    {showPromptEditor ? "收起" : svc.prompt ? "已自定义 · 编辑" : "展开设置"}
                  </button>
                </div>
                {showPromptEditor && (
                  <textarea
                    className="ndt-textarea"
                    placeholder="留空使用内置专业翻译指令；划词单条翻译如自定义请包含 {{text}} 与 {{target}}。"
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
              onBatchChange={(val) => updateCustomService(svc.id, { batchEnabled: val })}
              onBatchMaxBytesChange={(val) => updateCustomService(svc.id, { batchMaxBytes: val })}
              onStreamChange={(val) => updateCustomService(svc.id, { streamEnabled: val })}
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
            <span className="ndt-topbar-title">翻译服务配置</span>
            <span className="ndt-topbar-pill">
              默认全文：{getServiceDisplayName(pageTrsApi, customServices)}
            </span>
          </div>

          <div className="ndt-topbar-right">
            <span className={`ndt-save-indicator ${savedTick ? "is-visible" : ""}`}>
              <Icon icon="tick" size={12} />
              <span>已自动保存</span>
            </span>

            <div className="theme-segmented" role="group" aria-label="界面主题">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`theme-segmented-btn ${darkMode === opt.value ? "is-active" : ""}`}
                  onClick={() => updateStorage({ darkMode: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="ndt-workspace-wrap">
        <div className="ndt-workspace-shell">
          <aside className="service-rail" aria-label="翻译服务列表">
            <div className="rail-section">
              <div className="rail-section-header">
                <span className="rail-section-label">内置服务</span>
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
                      <span className="rail-item-title">{OFFICIAL_LLM_NAME}</span>
                      {pageTrsApi === OFFICIAL_LLM_ID && (
                        <span className="rail-default-badge">默认</span>
                      )}
                    </span>
                    <span className="rail-item-sub">
                      {officialModel || (officialKey ? "点击选择模型" : "待填写 Key")}
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
                      <span className="rail-item-title">微软翻译</span>
                      {pageTrsApi === ServiceId.Microsoft && (
                        <span className="rail-default-badge">默认</span>
                      )}
                    </span>
                    <span className="rail-item-sub">内置 · 免密钥</span>
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
                      <span className="rail-item-title">谷歌翻译</span>
                      {pageTrsApi === ServiceId.Google && (
                        <span className="rail-default-badge">默认</span>
                      )}
                    </span>
                    <span className="rail-item-sub">内置 · 免密钥</span>
                  </span>
                  <span className="status-dot is-ready" />
                </button>
              </div>
            </div>

            <div className="rail-section">
              <div className="rail-section-header">
                <span className="rail-section-label">自定义 OpenAI 兼容</span>
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
                            <span className="rail-item-title">{svc.name || "未命名服务"}</span>
                            {pageTrsApi === svc.id && (
                              <span className="rail-default-badge">默认</span>
                            )}
                          </span>
                          <span className="rail-item-sub">{svc.model || "未选择模型"}</span>
                        </span>
                        <span className={`status-dot ${ready ? "is-ready" : "is-warn"}`} />
                      </button>
                    );
                  })
                ) : (
                  <div className="rail-empty-text">暂无自定义服务</div>
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
                <span>新增 OpenAI 兼容服务</span>
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
