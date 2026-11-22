import "../shared/utils/setupIcons.js";
import * as React from "react";
import { createRoot } from "react-dom/client";
import pick from "lodash/pick";
import { Classes, Icon } from "@blueprintjs/core";
import { y as InteractionModeEngine } from "../shared/utils/InteractionModeEngine.js";
import * as messaging from "../shared/messaging/index.js";
import { g2 as defaultOptions, Ne as secondaryOptions } from "../shared/constants/defaults.js";
import { A as useStorage } from "../shared/hooks/useStorage.js";
import { A as useDarkMode } from "../shared/hooks/useDarkMode.js";
import { B as translatorsWithoutDict, v as allTranslators } from "../services/translators/index.js";
import { A as LanguageSelect } from "../components/LanguageSelect.jsx";
import { a as ShowType } from "../content/ParagraphTranslator.js";
import { isLlmService } from "../shared/llmBatchProtocol.js";
import { VI as ServiceId } from "../shared/constants/services.js";
import { OFFICIAL_LLM_ID, OFFICIAL_LLM_NAME } from "../shared/openaiUtils.js";

if (typeof document !== "undefined") {
  new InteractionModeEngine(document.documentElement, Classes.FOCUS_DISABLED).start();
}

const POPUP_STORAGE_DEFAULTS = {
  ...pick(defaultOptions, [
    "pageTrsApi",
    "pageTrsSource",
    "pageTrsDest",
    "pageTrsApiOptions",
    "customAPINames",
    "customOpenAIServices",
    "officialLLMModel",
    "officialLLMBatchEnabled",
    "officialLLMStreamEnabled",
  ]),
  ...pick(secondaryOptions, ["pageTrsType"]),
};

const DISPLAY_MODE_OPTIONS = [
  { label: "双语", value: ShowType.both },
  { label: "译文", value: ShowType.result },
];

async function getActiveTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    highlighted: true,
    windowId: chrome.windows.WINDOW_ID_CURRENT,
  });
  return tabs[0] || (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
}

function PopupApp() {
  useDarkMode();

  const [settings, setSettings] = useStorage(POPUP_STORAGE_DEFAULTS);
  const [tabId, setTabId] = React.useState(null);
  const [tabSupported, setTabSupported] = React.useState(true);
  const [pageActive, setPageActive] = React.useState(false);
  const [pageTranslating, setPageTranslating] = React.useState(false);
  const [actionPending, setActionPending] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  const source = settings?.pageTrsSource ?? POPUP_STORAGE_DEFAULTS.pageTrsSource;
  const target = settings?.pageTrsDest?.[0] || POPUP_STORAGE_DEFAULTS.pageTrsDest[0];
  const apiCode = settings?.pageTrsApi || POPUP_STORAGE_DEFAULTS.pageTrsApi;
  const storedShowType = settings?.pageTrsType || ShowType.both;
  const displayType = storedShowType === ShowType.result ? ShowType.result : ShowType.both;

  const serviceOptions = React.useMemo(() => {
    const officialModel = String(settings?.officialLLMModel || "").trim();
    const primaryBuiltIn = [
      { id: ServiceId.Microsoft, name: "微软翻译", isLlm: false, model: "" },
      { id: ServiceId.Google, name: "谷歌翻译", isLlm: false, model: "" },
      { id: OFFICIAL_LLM_ID, name: OFFICIAL_LLM_NAME, isLlm: true, model: officialModel },
    ];
    const customOpenAI = (settings?.customOpenAIServices || []).map((svc) => ({
      id: svc.id,
      name: svc.name || "自定义大模型",
      isLlm: true,
      model: String(svc.model || "").trim(),
    }));
    const list = [...primaryBuiltIn, ...customOpenAI];
    if (apiCode && !list.some((item) => item.id === apiCode)) {
      const found = allTranslators.find((svc) => svc.id === apiCode);
      list.push({
        id: apiCode,
        name: found?.name || apiCode,
        isLlm: isLlmService(apiCode),
        model: "",
      });
    }
    return list;
  }, [settings?.officialLLMModel, settings?.customOpenAIServices, apiCode]);

  const isCurrentLlm = isLlmService(apiCode);

  const isSuperStreaming = React.useMemo(() => {
    if (!isCurrentLlm) return false;
    if (apiCode === OFFICIAL_LLM_ID) {
      return (
        settings?.officialLLMBatchEnabled !== false &&
        settings?.officialLLMStreamEnabled !== false
      );
    }
    const customSvc = (settings?.customOpenAIServices || []).find((svc) => svc.id === apiCode);
    if (customSvc) {
      return customSvc.batchEnabled !== false && customSvc.streamEnabled !== false;
    }
    return true;
  }, [
    isCurrentLlm,
    apiCode,
    settings?.officialLLMBatchEnabled,
    settings?.officialLLMStreamEnabled,
    settings?.customOpenAIServices,
  ]);

  const syncTabStatus = React.useCallback(async (id) => {
    if (!id) return;
    try {
      const status = await messaging._("get page translate status", id);
      if (status) {
        setTabSupported(true);
        setPageActive(Boolean(status.active));
        setPageTranslating(Boolean(status.translating));
      }
    } catch {
      setTabSupported(false);
      setPageActive(false);
      setPageTranslating(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let timerId = null;

    getActiveTab().then((tab) => {
      if (cancelled) return;
      const id = tab?.id ?? null;
      setTabId(id);
      if (!id) {
        setTabSupported(false);
        return;
      }
      syncTabStatus(id);
      timerId = setInterval(() => {
        syncTabStatus(id);
      }, 250);
    });

    return () => {
      cancelled = true;
      if (timerId) clearInterval(timerId);
    };
  }, [syncTabStatus]);

  const sendTabCommand = React.useCallback(
    async (message) => {
      const id = tabId ?? (await getActiveTab())?.id;
      if (!id) {
        throw new Error("未找到当前标签页。");
      }
      return messaging._(message, id);
    },
    [tabId]
  );

  const updateAndMaybeRestart = (patch) => {
    setErrorMsg("");
    setSettings(patch);
    if (pageActive) {
      chrome.storage.local
        .set(patch)
        .then(() => sendTabCommand("restart page translate"))
        .catch(() => {});
    }
  };

  const handleSourceChange = (nextSource) => {
    updateAndMaybeRestart({ pageTrsSource: nextSource });
  };

  const handleTargetChange = (nextTarget) => {
    updateAndMaybeRestart({ pageTrsDest: [nextTarget] });
  };

  const handleSwapLanguages = () => {
    if (!source || source === target) return;
    updateAndMaybeRestart({
      pageTrsSource: target,
      pageTrsDest: [source],
    });
  };

  const handleServiceChange = (e) => {
    const nextApi = e.currentTarget.value;
    updateAndMaybeRestart({ pageTrsApi: nextApi });
  };

  const handleDisplayTypeChange = (nextType) => {
    setErrorMsg("");
    setSettings({ pageTrsType: nextType });
    if (pageActive) {
      sendTabCommand({
        action: "set page translate showType",
        showType: nextType,
      }).catch(() => {});
    }
  };

  const handleToggleTranslate = async () => {
    if (actionPending) return;
    setErrorMsg("");
    setActionPending(true);
    try {
      if (pageActive) {
        await sendTabCommand("stop page translate");
        setPageActive(false);
        setPageTranslating(false);
      } else {
        await chrome.storage.local.set({
          pageTrsSource: source,
          pageTrsDest: [target],
          pageTrsApi: apiCode,
          pageTrsType: displayType,
        });
        await sendTabCommand("start page translate");
        setPageActive(true);
        const activeId = tabId ?? (await getActiveTab())?.id;
        if (activeId) {
          setTimeout(() => syncTabStatus(activeId), 60);
        }
      }
    } catch {
      setTabSupported(false);
      setErrorMsg("当前页面不支持网页全文翻译（如浏览器内置页面或商店页）。");
    } finally {
      setActionPending(false);
    }
  };

  const handleOpenSettings = () => {
    messaging
      ._({ action: "open options page" })
      .then(() => window.close())
      .catch(() => {
        chrome.runtime.openOptionsPage();
        window.close();
      });
  };

  return (
    <div className="ndt-popup">
      <header className="popup-header">
        <div className="popup-brand">
          <span className="popup-brand-icon" aria-hidden="true">
            <Icon icon="translate" size={12} />
          </span>
          <span className="popup-title">网页全文翻译</span>
        </div>
        {pageActive ? (
          <span className={`status-badge ${pageTranslating ? "is-streaming" : "is-active"}`}>
            <span className="status-dot" />
            {pageTranslating ? "翻译中" : "已翻译"}
          </span>
        ) : (
          isSuperStreaming && <span className="status-badge">超级流式</span>
        )}
      </header>

      <main className="popup-body">
        <section className="field-group">
          <div className="field-label-row">
            <span className="field-label">源语言与目标语言</span>
            <span className="field-tag">{source ? "指定源语" : "自动检测"}</span>
          </div>
          <div className="lang-row">
            <div className="lang-slot">
              <LanguageSelect lang={source} setLang={handleSourceChange} addAuto />
            </div>
            <button
              type="button"
              className="lang-swap-btn"
              onClick={handleSwapLanguages}
              disabled={!source || source === target}
              title={source ? "互换源语言和目标语言" : "源语言为自动检测时不可互换"}
              aria-label="互换源语言和目标语言"
            >
              <Icon icon={source ? "exchange" : "arrow-right"} size={12} />
            </button>
            <div className="lang-slot">
              <LanguageSelect lang={target} setLang={handleTargetChange} />
            </div>
          </div>
        </section>

        <section className="field-group">
          <div className="field-label-row">
            <label className="field-label" htmlFor="ndt-service-select">
              翻译服务
            </label>
            {isSuperStreaming && <span className="field-tag">超级流式</span>}
          </div>
          <div className="select-wrap">
            <select
              id="ndt-service-select"
              className="ndt-select"
              value={apiCode}
              onChange={handleServiceChange}
            >
              {serviceOptions.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name}
                  {svc.isLlm ? `（${svc.model || "未选择模型"}）` : ""}
                </option>
              ))}
            </select>
            <span className="select-caret" aria-hidden="true">
              <Icon icon="caret-down" size={12} />
            </span>
          </div>
        </section>

        <section className="field-group">
          <div className="field-label-row">
            <span className="field-label">全文显示模式</span>
          </div>
          <div className="segmented-control" role="radiogroup" aria-label="全文翻译显示模式">
            {DISPLAY_MODE_OPTIONS.map((opt) => {
              const selected = displayType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`segmented-btn ${selected ? "is-selected" : ""}`}
                  onClick={() => handleDisplayTypeChange(opt.value)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {(!tabSupported || errorMsg) && (
          <div className="popup-notice">
            {errorMsg || "当前标签页暂不支持网页全文翻译，请在普通网页中使用。"}
          </div>
        )}

        <div className="primary-action-wrap">
          <button
            type="button"
            className={`primary-cta ${pageActive ? "is-cancel" : ""}`}
            disabled={!tabSupported || actionPending}
            onClick={handleToggleTranslate}
          >
            <Icon icon={pageActive ? "stop" : "translate"} size={14} />
            <span>{pageActive ? "取消翻译" : "翻译"}</span>
          </button>
        </div>
      </main>

      <footer className="popup-footer">
        <span className="footer-hint">整页段落实时翻译</span>
        <button
          type="button"
          className="settings-btn"
          onClick={handleOpenSettings}
          title="打开配置界面"
        >
          <Icon icon="cog" size={12} />
          <span>配置</span>
        </button>
      </footer>
    </div>
  );
}

const appRoot = document.getElementById("app");
if (!appRoot) throw new Error("DOM 里没有 #app 元素。");
createRoot(appRoot).render(<PopupApp />);
