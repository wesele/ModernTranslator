import * as React from "react";
import { Icon } from "@blueprintjs/core";
import { UI_LANGUAGES, useI18n } from "../shared/i18n/index.js";
import { LanguageFlag } from "./LanguageFlag.jsx";

export function UiLanguageSelect({ compact = false, onChangeLocale }) {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIdx, setHighlightedIdx] = React.useState(() =>
    Math.max(0, UI_LANGUAGES.findIndex((item) => item.code === locale))
  );
  const rootRef = React.useRef(null);
  const triggerRef = React.useRef(null);

  const current = React.useMemo(
    () => UI_LANGUAGES.find((item) => item.code === locale) || UI_LANGUAGES[0],
    [locale]
  );

  React.useEffect(() => {
    if (!isOpen) return;
    const idx = UI_LANGUAGES.findIndex((item) => item.code === locale);
    setHighlightedIdx(idx >= 0 ? idx : 0);

    const handleOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIdx((prev) => (prev + 1) % UI_LANGUAGES.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIdx((prev) => (prev - 1 + UI_LANGUAGES.length) % UI_LANGUAGES.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const picked = UI_LANGUAGES[highlightedIdx];
        if (picked) {
          setLocale(picked.code);
          onChangeLocale?.(picked.code);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, locale, highlightedIdx, setLocale, onChangeLocale]);

  const handleSelect = (code) => {
    setLocale(code);
    onChangeLocale?.(code);
    setIsOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`ndt-ui-lang ${compact ? "is-compact" : ""} ${isOpen ? "is-open" : ""}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`ndt-ui-lang-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t("common.uiLanguage")}
        title={t("common.uiLanguage")}
      >
        <LanguageFlag localeCode={current.code} size={compact ? 14 : 15} />
        <span className="ndt-ui-lang-label">{current.label}</span>
        <span className="ndt-ui-lang-caret" aria-hidden="true">
          <Icon icon={isOpen ? "chevron-up" : "chevron-down"} size={11} />
        </span>
      </button>

      {isOpen && (
        <div
          className="ndt-ui-lang-popover"
          role="listbox"
          aria-label={t("common.uiLanguage")}
        >
          <div className="ndt-ui-lang-popover-header">{t("common.uiLanguage")}</div>
          <div className="ndt-ui-lang-list">
            {UI_LANGUAGES.map((item, idx) => {
              const selected = item.code === locale;
              const active = idx === highlightedIdx;
              return (
                <button
                  key={item.code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`ndt-ui-lang-option ${selected ? "is-selected" : ""} ${active ? "is-active" : ""}`}
                  onMouseEnter={() => setHighlightedIdx(idx)}
                  onClick={() => handleSelect(item.code)}
                >
                  <span className="ndt-ui-lang-option-main">
                    <LanguageFlag localeCode={item.code} size={16} />
                    <span className="ndt-ui-lang-option-label">{item.label}</span>
                  </span>
                  {selected && (
                    <Icon icon="tick" size={12} className="ndt-ui-lang-option-check" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
