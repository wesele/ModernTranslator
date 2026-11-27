// Shared script detection, Arabic normalization, RTL detection, and diacritic-tolerant highlighting helpers.

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const RTL_SCRIPT_RE = /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
const ARABIC_DIACRITICS_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const ARABIC_TATWEEL_RE = /\u0640/g;
const BIDI_CONTROL_RE = /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g;
const ARABIC_WORD_CHAR_RE =
  /[\u0621-\u064A\u064B-\u065F\u066E-\u06D3\u06D6-\u06ED\u06FA-\u06FC\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const COMBINING_MARK_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0300-\u036F]/;

export function hasArabicScript(text) {
  return ARABIC_SCRIPT_RE.test(String(text || ""));
}

export function isRtlText(text) {
  return RTL_SCRIPT_RE.test(String(text || ""));
}

export function stripBidiControls(text) {
  return String(text || "").replace(BIDI_CONTROL_RE, "");
}

export function stripArabicDiacritics(text) {
  return String(text || "")
    .replace(ARABIC_DIACRITICS_RE, "")
    .replace(ARABIC_TATWEEL_RE, "");
}

function normalizeSingleArabicChar(ch) {
  switch (ch) {
    case "أ":
    case "إ":
    case "آ":
    case "ٱ":
      return "ا";
    case "ى":
      return "ي";
    case "ة":
      return "ه";
    default:
      return ch;
  }
}

export function normalizeArabicText(text) {
  return stripBidiControls(text)
    .replace(ARABIC_DIACRITICS_RE, "")
    .replace(ARABIC_TATWEEL_RE, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

export function normalizeTextForMatch(text) {
  return normalizeArabicText(text)
    .toLowerCase()
    .replace(/[،؛؟«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isolateBidiInline(text) {
  const s = String(text || "");
  if (!s || !isRtlText(s)) return s;
  return `\u2068${s}\u2069`;
}

function escapeRegExp(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isSkippableArabicChar(ch) {
  const code = ch.charCodeAt(0);
  if (
    (code >= 0x064b && code <= 0x065f) ||
    code === 0x0670 ||
    (code >= 0x06d6 && code <= 0x06ed) ||
    code === 0x0640
  ) {
    return true;
  }
  return (
    code === 0x200e ||
    code === 0x200f ||
    code === 0x061c ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069)
  );
}

function buildArabicIndexMap(text) {
  const chars = [];
  const indices = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (isSkippableArabicChar(ch)) continue;
    chars.push(normalizeSingleArabicChar(ch).toLowerCase());
    indices.push(i);
  }
  return { normStr: chars.join(""), indices };
}

function mergeRanges(ranges) {
  if (ranges.length <= 1) return ranges;
  const sorted = [...ranges].sort((a, b) => a.start - b.start || b.end - a.end);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr.start <= prev.end) {
      if (curr.end > prev.end) prev.end = curr.end;
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

/**
 * Finds non-overlapping highlight ranges for target terms inside a quote/sentence.
 * For Arabic text:
 * - Tolerates harakat/tashkeel, tatweel, and Alif/Ya/Ta-Marbuta differences
 * - Expands mid-word matches to full Arabic word boundaries so inline spans never break cursive joining
 */
export function findHighlightRanges(text, rawTargets = []) {
  const str = String(text || "");
  if (!str) return [];

  const targets = rawTargets
    .map((s) => String(s || "").trim())
    .filter((s) => s.length >= 2)
    .sort((a, b) => b.length - a.length);
  if (targets.length === 0) return [];

  if (!hasArabicScript(str)) {
    try {
      const pattern = new RegExp(targets.map(escapeRegExp).join("|"), "gi");
      const ranges = [];
      let m;
      while ((m = pattern.exec(str)) !== null) {
        if (m[0].length === 0) {
          pattern.lastIndex += 1;
          continue;
        }
        ranges.push({ start: m.index, end: m.index + m[0].length });
      }
      return mergeRanges(ranges);
    } catch {
      return [];
    }
  }

  const { normStr, indices } = buildArabicIndexMap(str);
  if (!normStr) return [];

  const ranges = [];
  for (const rawTarget of targets) {
    const normTarget = buildArabicIndexMap(rawTarget).normStr.trim();
    if (normTarget.length < 2) continue;

    let searchFrom = 0;
    while (searchFrom < normStr.length) {
      const foundIdx = normStr.indexOf(normTarget, searchFrom);
      if (foundIdx < 0) break;
      const foundEnd = foundIdx + normTarget.length;
      searchFrom = foundEnd;

      let rawStart = indices[foundIdx];
      let rawEnd = indices[foundEnd - 1] + 1;

      // Include any trailing combining marks attached to the final matched character
      while (rawEnd < str.length && COMBINING_MARK_RE.test(str[rawEnd])) {
        rawEnd += 1;
      }

      // If matching Arabic letters, expand to full Arabic word boundaries so cursive joining never breaks
      if (hasArabicScript(rawTarget)) {
        while (rawStart > 0 && ARABIC_WORD_CHAR_RE.test(str[rawStart - 1])) {
          rawStart -= 1;
        }
        while (rawEnd < str.length && ARABIC_WORD_CHAR_RE.test(str[rawEnd])) {
          rawEnd += 1;
        }
      }

      ranges.push({ start: rawStart, end: rawEnd });
    }
  }

  return mergeRanges(ranges);
}
