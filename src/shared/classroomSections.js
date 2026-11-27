import { formatSubtitleTime } from "./subtitleTimeline.js";
import { normalizeArabicText, stripBidiControls } from "./textScript.js";
import { t } from "./i18n/index.js";

const SECTION_TARGET_DURATION_SEC = 5 * 60; // 5 minutes per section
const MAX_SECTION_COUNT = 5; // At most 5 sections
const MAX_FIXED_DURATION_SEC = SECTION_TARGET_DURATION_SEC * MAX_SECTION_COUNT; // 25 minutes
const SUB_BATCH_MAX_CUES = 150;
const SUB_BATCH_MAX_CHARS = 6500;

const CHAR_BASED_SCRIPT_RE =
  /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0e00-\u0e7f\u0e80-\u0eff\u1780-\u17ff\u1000-\u109f]/g;

export function cleanSubtitleCues(cues = []) {
  if (!Array.isArray(cues)) return [];
  const cleaned = [];
  let prevText = "";
  for (const cue of cues) {
    const text = stripBidiControls(cue?.content || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text || text === prevText) continue;
    prevText = text;
    cleaned.push({
      from: Number.isFinite(Number(cue?.from)) ? Number(cue.from) : 0,
      to: Number.isFinite(Number(cue?.to)) ? Number(cue.to) : 0,
      content: text,
    });
  }
  return cleaned;
}

export function estimateUniqueLexicalUnits(cues = []) {
  const joined = cues.map((c) => c.content).join(" ");
  if (!joined.trim()) return 0;
  const charBased = joined.match(CHAR_BASED_SCRIPT_RE) || [];
  const nonCharBased = normalizeArabicText(joined.replace(CHAR_BASED_SCRIPT_RE, " "));
  const words = nonCharBased.match(/[\p{L}\p{M}'’-]{2,}/gu) || [];
  if (words.length >= charBased.length / 2) {
    return new Set(words.map((w) => w.toLowerCase())).size;
  }
  return Math.round(charBased.length / 2.2);
}

export function computeSectionVocabTarget(estimatedWords, ratioPercent = 20, isMultiSection = false) {
  const ratio = Math.min(50, Math.max(5, Number(ratioPercent) || 20));
  const scale = ratio / 20;
  if (isMultiSection) {
    // Keep each mini-lesson cognitively comfortable (~10-18 items)
    const raw = Math.round(Math.max(8, Math.min(20, estimatedWords * (ratio / 100) * 0.35)));
    const scaled = Math.round(Math.max(8, Math.min(22, raw * (scale > 1 ? 1 + (scale - 1) * 0.5 : scale))));
    const minCount = Math.max(6, scaled - 2);
    const maxCount = Math.min(24, Math.max(minCount + 4, scaled + 3));
    return { ratio, minCount, maxCount };
  }
  const base = Math.round(Math.max(10, Math.min(28, estimatedWords * (ratio / 100) * 0.42)));
  const scaled = Math.round(Math.max(8, Math.min(32, base * (scale > 1 ? 1 + (scale - 1) * 0.6 : scale))));
  const minCount = Math.max(6, Math.min(scaled - 2, 22));
  const maxCount = Math.min(34, Math.max(minCount + 4, scaled + 4));
  return { ratio, minCount, maxCount };
}

function findTimeCutIndex(cues, targetTime, minIdx) {
  let idx = minIdx;
  while (idx < cues.length) {
    const c = cues[idx];
    const start = Number(c?.from) || 0;
    if (start >= targetTime) return idx;
    idx += 1;
  }
  return cues.length;
}

/**
 * Splits a video's subtitle cues into duration-based learning sections:
 * - Every 5 minutes forms one section (up to 25 minutes -> 1..5 sections)
 * - If total duration > 25 minutes, divides duration equally into 5 sections (max 5 sections)
 */
export function planSubtitleSections(rawCues = [], difficultyRatio = 20) {
  const cues = cleanSubtitleCues(rawCues);
  const totalCues = cues.length;
  if (totalCues === 0) {
    return { totalCues: 0, totalChars: 0, totalDuration: 0, sections: [] };
  }

  let totalChars = 0;
  for (const c of cues) totalChars += c.content.length;
  const firstStart = Math.max(0, cues[0]?.from || 0);
  const lastEnd = Math.max(0, cues[totalCues - 1]?.to || 0, cues[totalCues - 1]?.from || 0);
  const totalDuration = Math.max(0, lastEnd - firstStart);

  const ratio = Math.min(50, Math.max(5, Number(difficultyRatio) || 20));

  // Measure timeline from 0 for standard videos, or from firstStart if cues start >= 5 min in
  const origin = firstStart < SECTION_TARGET_DURATION_SEC ? 0 : firstStart;
  const effectiveDuration = Math.max(0, lastEnd - origin);

  let sectionCount = 1;
  let sectionDuration = SECTION_TARGET_DURATION_SEC;

  if (effectiveDuration > MAX_FIXED_DURATION_SEC) {
    sectionCount = MAX_SECTION_COUNT;
    sectionDuration = effectiveDuration / MAX_SECTION_COUNT;
  } else if (effectiveDuration > SECTION_TARGET_DURATION_SEC) {
    sectionCount = Math.min(
      MAX_SECTION_COUNT,
      Math.ceil(effectiveDuration / SECTION_TARGET_DURATION_SEC)
    );
    sectionDuration = SECTION_TARGET_DURATION_SEC;
  }

  const cutPoints = [0];
  if (sectionCount > 1) {
    for (let k = 1; k < sectionCount; k += 1) {
      const targetTime = origin + k * sectionDuration;
      const prevCut = cutPoints[cutPoints.length - 1];
      const cut = findTimeCutIndex(cues, targetTime, prevCut);
      if (cut > prevCut && cut < totalCues) {
        cutPoints.push(cut);
      }
    }
  }
  cutPoints.push(totalCues);

  const isMulti = cutPoints.length - 1 > 1;
  const sections = [];
  for (let i = 0; i < cutPoints.length - 1; i += 1) {
    const startCueIndex = cutPoints[i];
    const endCueIndex = cutPoints[i + 1];
    const slice = cues.slice(startCueIndex, endCueIndex);
    if (slice.length === 0) continue;

    let charCount = 0;
    for (const c of slice) charCount += c.content.length;
    const startTime = slice[0].from;
    const endTime = Math.max(startTime, slice[slice.length - 1].to || slice[slice.length - 1].from);
    const estimatedWords = estimateUniqueLexicalUnits(slice);
    const targetVocab = computeSectionVocabTarget(estimatedWords, ratio, isMulti);
    const batchCount = splitSectionIntoBatches(slice).length;

    sections.push({
      index: sections.length,
      number: sections.length + 1,
      id: `sec-${sections.length + 1}`,
      title: t("classroom.sectionTitle", { n: sections.length + 1 }),
      startCueIndex,
      endCueIndex,
      cueCount: slice.length,
      charCount,
      startTime,
      endTime,
      timeRange: `${formatSubtitleTime(startTime)} - ${formatSubtitleTime(endTime)}`,
      estimatedWords,
      targetVocab,
      batchCount,
      cues: slice,
    });
  }

  return {
    totalCues,
    totalChars,
    totalDuration,
    sections,
  };
}

/**
 * Splits a single section into fast, reliable LLM sub-batches so that:
 * - Every cue is actually inspected (no silent skipping)
 * - Streaming progress updates smoothly sentence-by-sentence & batch-by-batch
 * - JSON output never overflows model max_tokens
 */
export function splitSectionIntoBatches(sectionCues = []) {
  if (!Array.isArray(sectionCues) || sectionCues.length === 0) return [];
  let totalChars = 0;
  for (const c of sectionCues) totalChars += (c?.content?.length || 0) + 10;

  const byCues = Math.ceil(sectionCues.length / SUB_BATCH_MAX_CUES);
  const byChars = Math.ceil(totalChars / SUB_BATCH_MAX_CHARS);
  const batchCount = Math.max(1, byCues, byChars);

  if (batchCount === 1) {
    return [
      {
        batchIndex: 0,
        startOffset: 0,
        endOffset: sectionCues.length,
        cues: sectionCues,
      },
    ];
  }

  const batches = [];
  const step = sectionCues.length / batchCount;
  for (let b = 0; b < batchCount; b += 1) {
    const start = Math.round(b * step);
    const end = b === batchCount - 1 ? sectionCues.length : Math.round((b + 1) * step);
    const slice = sectionCues.slice(start, end);
    if (slice.length > 0) {
      batches.push({
        batchIndex: batches.length,
        startOffset: start,
        endOffset: end,
        cues: slice,
      });
    }
  }
  return batches;
}
