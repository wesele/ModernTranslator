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
import { OFFICIAL_LLM_ID } from "../shared/openaiUtils.js";
import { UiLanguageSelect } from "../components/UiLanguageSelect.jsx";
import { UI_LOCALE_TO_BCP47, useI18n } from "../shared/i18n/index.js";

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

const extApi = typeof browser !== "undefined" ? browser : chrome;

async function getActiveTab() {
  const tabs = await extApi.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tabs[0] || (await extApi.tabs.query({ active: true, lastFocusedWindow: true }))[0];
}

async function hasAllUrlsPermission() {
  if (!extApi.permissions?.contains) return true;
  try {
    return await extApi.permissions.contains({ origins: ["<all_urls>"] });
  } catch {
    return true;
  }
}

async function injectContentScripts(tabId) {
  if (!tabId || !extApi.scripting?.executeScript) return false;
  try {
    await extApi.scripting.executeScript({
      target: { tabId },
      files: ["c.js"],
    });
    extApi.scripting
      .executeScript({
        target: { tabId, allFrames: true },
        files: ["ca.js"],
      })
      .catch(() => {});
    return true;
  } catch {
    return false;
  }
}

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function PopupApp() {
  useDarkMode();
  const { locale, t } = useI18n();

  React.useEffect(() => {
    document.title = t("popup.pageTitle");
    document.documentElement.lang = UI_LOCALE_TO_BCP47[locale] || "en";
  }, [locale, t]);

  const displayModeOptions = React.useMemo(
    () => [
      { label: t("popup.modeBilingual"), value: ShowType.both },
      { label: t("popup.modeTranslated"), value: ShowType.result },
    ],
    [t]
  );

  const [settings, setSettings] = useStorage(POPUP_STORAGE_DEFAULTS);
  const [tabId, setTabId] = React.useState(null);
  const [tabSupported, setTabSupported] = React.useState(true);
  const [needsHostPermission, setNeedsHostPermission] = React.useState(false);
  const [grantingPermission, setGrantingPermission] = React.useState(false);
  const [pageActive, setPageActive] = React.useState(false);
  const [pageTranslating, setPageTranslating] = React.useState(false);
  const [actionPending, setActionPending] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");
  const injectedTabRef = React.useRef(null);

  const source = settings?.pageTrsSource ?? POPUP_STORAGE_DEFAULTS.pageTrsSource;
  const target = settings?.pageTrsDest?.[0] || POPUP_STORAGE_DEFAULTS.pageTrsDest[0];
  const apiCode = settings?.pageTrsApi || POPUP_STORAGE_DEFAULTS.pageTrsApi;
  const storedShowType = settings?.pageTrsType || ShowType.both;
  const displayType = storedShowType === ShowType.result ? ShowType.result : ShowType.both;

  const serviceOptions = React.useMemo(() => {
    const officialModel = String(settings?.officialLLMModel || "").trim();
    const primaryBuiltIn = [
      { id: ServiceId.Microsoft, name: t("service.microsoft"), isLlm: false, model: "" },
      { id: ServiceId.Google, name: t("service.google"), isLlm: false, model: "" },
      { id: OFFICIAL_LLM_ID, name: t("service.officialLlm"), isLlm: true, model: officialModel },
    ];
    const customOpenAI = (settings?.customOpenAIServices || []).map((svc) => ({
      id: svc.id,
      name: svc.name || t("service.customDefault"),
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
  }, [settings?.officialLLMModel, settings?.customOpenAIServices, apiCode, t]);

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

  const syncTabStatus = React.useCallback(async (id, allowInject = false) => {
    if (!id) return false;
    try {
      const status = await messaging._("get page translate status", id, { frameId: 0 });
      if (status) {
        setNeedsHostPermission(false);
        setTabSupported(true);
        setPageActive(Boolean(status.active));
        setPageTranslating(Boolean(status.translating));
        return true;
      }
    } catch {
      const granted = await hasAllUrlsPermission();
      if (!granted) {
        setNeedsHostPermission(true);
        setTabSupported(false);
        setPageActive(false);
        setPageTranslating(false);
        return false;
      }
      setNeedsHostPermission(false);
      if (allowInject && injectedTabRef.current !== id) {
        injectedTabRef.current = id;
        const injected = await injectContentScripts(id);
        if (injected) {
          for (let attempt = 0; attempt < 5; attempt += 1) {
            await waitMs(80);
            try {
              const status = await messaging._("get page translate status", id, { frameId: 0 });
              if (status) {
                setTabSupported(true);
                setPageActive(Boolean(status.active));
                setPageTranslating(Boolean(status.translating));
                return true;
              }
            } catch {
              // wait for content script mount
            }
          }
        }
      }
      setTabSupported(false);
      setPageActive(false);
      setPageTranslating(false);
      return false;
    }
    return false;
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
      syncTabStatus(id, true);
      timerId = setInterval(() => {
        syncTabStatus(id, false);
      }, 300);
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
        throw new Error(t("popup.tabNotFound"));
      }
      return messaging._(message, id, { frameId: 0 });
    },
    [tabId, t]
  );

  const handleGrantHostPermission = async () => {
    if (grantingPermission || !extApi.permissions?.request) return;
    setErrorMsg("");
    setGrantingPermission(true);
    try {
      const granted = await extApi.permissions.request({ origins: ["<all_urls>"] });
      if (granted) {
        setNeedsHostPermission(false);
        injectedTabRef.current = null;
        const activeId = tabId ?? (await getActiveTab())?.id;
        if (activeId) {
          await syncTabStatus(activeId, true);
        }
      }
    } catch {
      // user cancelled or browser blocked prompt
    } finally {
      setGrantingPermission(false);
    }
  };

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
      setErrorMsg(t("popup.unsupportedPage"));
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
            <img src={chrome.runtime.getURL("logodark.png")} alt="" />
          </span>
          <span className="popup-title">{t("popup.headerTitle")}</span>
        </div>
        <div className="popup-header-right">
          {pageActive && (
            <span className={`status-badge ${pageTranslating ? "is-streaming" : "is-active"}`}>
              <span className="status-dot" />
              {pageTranslating ? t("popup.statusTranslating") : t("popup.statusTranslated")}
            </span>
          )}
          <UiLanguageSelect compact />
        </div>
      </header>

      <main className="popup-body">
        <section className="field-group">
          <div className="field-label-row">
            <span className="field-label">{t("popup.langSectionLabel")}</span>
            <span className="field-tag">
              {source ? t("popup.sourceFixed") : t("lang.autoDetect")}
            </span>
          </div>
          <div className="lang-row">
            <div className="lang-slot">
              <LanguageSelect lang={source} setLang={handleSourceChange} addAuto maxHeight={200} />
            </div>
            <button
              type="button"
              className="lang-swap-btn"
              onClick={handleSwapLanguages}
              disabled={!source || source === target}
              title={source ? t("popup.swapTitle") : t("popup.swapDisabledTitle")}
              aria-label={t("popup.swapTitle")}
            >
              <Icon icon={source ? "exchange" : "arrow-right"} size={12} />
            </button>
            <div className="lang-slot">
              <LanguageSelect lang={target} setLang={handleTargetChange} maxHeight={200} />
            </div>
          </div>
        </section>

        <section className="field-group">
          <div className="field-label-row">
            <label className="field-label" htmlFor="ndt-service-select">
              {t("popup.serviceLabel")}
            </label>
            {isSuperStreaming && <span className="field-tag">{t("popup.superStream")}</span>}
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
                  {svc.isLlm ? ` (${svc.model || t("popup.noModelSelected")})` : ""}
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
            <span className="field-label">{t("popup.displayModeLabel")}</span>
          </div>
          <div
            className="segmented-control"
            role="radiogroup"
            aria-label={t("popup.displayModeAria")}
          >
            {displayModeOptions.map((opt) => {
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

        {(needsHostPermission || !tabSupported || errorMsg) && (
          <div className={`popup-notice ${needsHostPermission ? "is-permission" : ""}`}>
            {needsHostPermission
              ? t("popup.needPermissionHint")
              : errorMsg || t("popup.unsupportedTabHint")}
          </div>
        )}

        <div className="primary-action-wrap">
          {needsHostPermission ? (
            <button
              type="button"
              className="primary-cta"
              disabled={grantingPermission}
              onClick={handleGrantHostPermission}
            >
              <Icon icon="key" size={14} />
              <span>{t("popup.grantPermissionBtn")}</span>
            </button>
          ) : (
            <button
              type="button"
              className={`primary-cta ${pageActive ? "is-cancel" : ""}`}
              disabled={!tabSupported || actionPending}
              onClick={handleToggleTranslate}
            >
              <Icon icon={pageActive ? "stop" : "translate"} size={14} />
              <span>{pageActive ? t("popup.cancelTranslateBtn") : t("popup.translateBtn")}</span>
            </button>
          )}
        </div>
      </main>

      <footer className="popup-footer">
        <span className="footer-hint">{t("popup.footerHint")}</span>
        <div className="footer-actions">
          <button
            type="button"
            className="settings-btn"
            onClick={handleOpenSettings}
            title={t("popup.openSettingsTitle")}
          >
            <Icon icon="cog" size={12} />
            <span>{t("popup.settingsBtn")}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

const appRoot = document.getElementById("app");
if (!appRoot) throw new Error("DOM 里没有 #app 元素。");
createRoot(appRoot).render(<PopupApp />);
