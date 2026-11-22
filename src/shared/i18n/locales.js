export const UI_LANGUAGES = [
  { code: "zh", label: "中文", shortLabel: "中文", bcp47: "zh-CN" },
  { code: "en", label: "English", shortLabel: "EN", bcp47: "en" },
  { code: "es", label: "Español", shortLabel: "ES", bcp47: "es" },
  { code: "fr", label: "Français", shortLabel: "FR", bcp47: "fr" },
  { code: "de", label: "Deutsch", shortLabel: "DE", bcp47: "de" },
  { code: "ja", label: "日本語", shortLabel: "日本語", bcp47: "ja" },
  { code: "ko", label: "한국어", shortLabel: "한국어", bcp47: "ko" },
];

export const SUPPORTED_UI_LOCALE_CODES = UI_LANGUAGES.map((item) => item.code);

export const UI_LOCALE_TO_BCP47 = Object.fromEntries(
  UI_LANGUAGES.map((item) => [item.code, item.bcp47])
);

export function normalizeUiLocale(raw) {
  if (!raw || typeof raw !== "string") return null;
  const lower = raw.trim().toLowerCase().replace(/_/g, "-");
  if (!lower) return null;
  if (lower === "zh" || lower.startsWith("zh-")) return "zh";
  if (lower === "en" || lower.startsWith("en-")) return "en";
  if (lower === "es" || lower.startsWith("es-")) return "es";
  if (lower === "fr" || lower.startsWith("fr-")) return "fr";
  if (lower === "de" || lower.startsWith("de-")) return "de";
  if (lower === "ja" || lower.startsWith("ja-")) return "ja";
  if (lower === "ko" || lower.startsWith("ko-")) return "ko";
  return null;
}

export function detectDefaultUiLocale() {
  try {
    const uiLang =
      (typeof chrome !== "undefined" && chrome?.i18n?.getUILanguage?.()) ||
      (typeof navigator !== "undefined" && navigator?.language) ||
      "";
    return normalizeUiLocale(uiLang) || "en";
  } catch {
    return "en";
  }
}
