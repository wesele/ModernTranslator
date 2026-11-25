import { VI as ServiceId } from "./constants/services.js";
import { isCustomOpenAIServiceId } from "./openaiUtils.js";

export const MAX_LLM_BATCH_BYTES = 10000;

export const LLM_SERVICE_IDS = new Set([
  ServiceId.OfficialLLM,
  ServiceId.ChatGPT,
  ServiceId.Claude,
  ServiceId.Gemini,
  ServiceId.Grok,
  ServiceId.Ollama,
  ServiceId.SiliConflow,
  ServiceId.TongYi,
  ServiceId.LingYi,
  ServiceId.Moonshot,
  ServiceId.DeepSeek,
  ServiceId.ZhiPu,
  ServiceId.MiniMax,
  ServiceId.BaiChuan,
  ServiceId.DouBao,
  ServiceId.WenXin,
  ServiceId.WenXinNew,
  ServiceId.HunYuan,
]);

export function isLlmService(apiCode) {
  return LLM_SERVICE_IDS.has(apiCode) || isCustomOpenAIServiceId(apiCode);
}

const textEncoder = new TextEncoder();

export function utf8ByteLength(str) {
  if (!str) return 0;
  return textEncoder.encode(str).length;
}

const CLOSE_TAG_ESCAPE_RE = /<\/ndt-seg>/gi;
const ESCAPED_CLOSE_TAG_RE = /&lt;\/ndt-seg&gt;/gi;

export function sanitizeSegInput(text) {
  return String(text || "").replace(CLOSE_TAG_ESCAPE_RE, "&lt;/ndt-seg&gt;");
}

export function restoreSegOutput(text) {
  return String(text || "").replace(ESCAPED_CLOSE_TAG_RE, "</ndt-seg>");
}

function buildPromptHeader(source, destination, customPrompt) {
  const targetLang = destination || "中文(简体)";
  const sourceRule = source
    ? `Source language is ${source}. Translate accurately into ${targetLang}.`
    : `Detect the source language automatically and translate accurately into ${targetLang}.`;

  let customHint = "";
  if (customPrompt && typeof customPrompt === "string") {
    const cleaned = customPrompt
      .replaceAll("{{target}}", targetLang)
      .replaceAll("{{text}}", "")
      .trim();
    if (cleaned) {
      customHint = `\nAdditional style/translation instruction: ${cleaned}`;
    }
  }

  return [
    `You are a professional webpage translator. ${sourceRule}`,
    "Output format requirements (MUST follow strictly):",
    "1. Translate each <ndt-seg id=\"N\">...</ndt-seg> segment independently in ascending id order.",
    "2. Return ONLY the translated <ndt-seg id=\"N\">...</ndt-seg> tags with exact matching id attributes.",
    "3. Do NOT omit, merge, split, or reorder segments. Preserve internal line breaks when appropriate.",
    "4. Do NOT output explanations, notes, or markdown code fences (such as ```xml). Output the tags directly.",
    "5. Preserve any inline math/node placeholders like {{0}}, {{1}} verbatim in the natural grammatical position.",
    customHint,
    "",
  ]
    .filter((line, idx, arr) => !(line === "" && idx > 0 && arr[idx - 1] === ""))
    .join("\n");
}

export function formatBatchSegment(id, text) {
  return `<ndt-seg id="${id}">${sanitizeSegInput(text)}</ndt-seg>`;
}

/**
 * Compute prompt + formatted segment payload while measuring UTF-8 bytes accurately.
 */
export function buildBatchPrompt({ texts, source, destination, customPrompt }) {
  const header = buildPromptHeader(source, destination, customPrompt);
  const segments = texts.map((text, idx) => formatBatchSegment(idx, text)).join("\n");
  const prompt = `${header}\n${segments}`;
  return {
    prompt,
    segments,
    headerBytes: utf8ByteLength(header) + 1,
    totalBytes: utf8ByteLength(prompt),
  };
}

/**
 * Estimate byte budget used by one item inside a formatted batch.
 */
export function estimateSegmentBytes(id, text) {
  return utf8ByteLength(formatBatchSegment(id, text)) + 1;
}

export const PROMPT_HEADER_BYTE_RESERVE = 768;

/**
 * Trim single leading/trailing newline introduced by pretty-printed XML tags while
 * preserving meaningful internal newlines.
 */
function cleanSegmentText(raw, isFinal) {
  let out = restoreSegOutput(raw);
  if (out.startsWith("\r\n")) out = out.slice(2);
  else if (out.startsWith("\n")) out = out.slice(1);

  if (isFinal) {
    if (out.endsWith("\r\n")) out = out.slice(0, -2);
    else if (out.endsWith("\n")) out = out.slice(0, -1);
    return out.trim();
  }
  return out.replace(/^\s+/, "");
}

function isPotentialTagPrefix(tail) {
  if (!tail || tail[0] !== "<") return false;
  const lower = tail.toLowerCase();
  if ("<ndt-seg".startsWith(lower) || "</ndt-seg>".startsWith(lower)) {
    return true;
  }
  return /^<\/?ndt-seg(?:\s[^>]*)?$/i.test(tail);
}

const OPEN_TAG_RE = /^<ndt-seg\b[^>]*\bid\s*=\s*["']?(\d+)["']?[^>]*>/i;
const NEXT_ANY_TAG_RE = /<(\/?)ndt-seg\b([^>]*)>/i;

/**
 * Incremental parser for streaming `<ndt-seg id="N">...</ndt-seg>` responses.
 * Safely handles tags split across chunks, `<` inside prose (e.g. `a < b`),
 * and unexpected markdown code fences outside tags.
 */
export function createBatchStreamParser({ onDelta, onDone } = {}) {
  let buffer = "";
  let rawFullText = "";
  let state = "SEEK_OPEN";
  let currentId = null;
  let currentContent = "";
  let parsedCount = 0;
  const completedResults = new Map();

  function finalizeCurrent() {
    if (currentId == null) return;
    const finalText = cleanSegmentText(currentContent, true);
    completedResults.set(currentId, finalText);
    parsedCount += 1;
    onDone?.(currentId, finalText);
    currentId = null;
    currentContent = "";
    state = "SEEK_OPEN";
  }

  function push(chunk) {
    if (!chunk) return;
    rawFullText += chunk;
    buffer += chunk;

    let progress = true;
    while (progress && buffer.length > 0) {
      progress = false;

      if (state === "SEEK_OPEN") {
        const ltIdx = buffer.indexOf("<");
        if (ltIdx === -1) {
          buffer = "";
          break;
        }
        if (ltIdx > 0) {
          buffer = buffer.slice(ltIdx);
          progress = true;
        }

        const openMatch = OPEN_TAG_RE.exec(buffer);
        if (openMatch) {
          currentId = Number(openMatch[1]);
          currentContent = "";
          state = "IN_SEG";
          buffer = buffer.slice(openMatch[0].length);
          progress = true;
          continue;
        }

        const gtIdx = buffer.indexOf(">");
        if (gtIdx === -1) {
          // Wait for more characters if it could still be `<ndt-seg ...>`
          if (!isPotentialTagPrefix(buffer)) {
            buffer = buffer.slice(1);
            progress = true;
          }
          break;
        }

        // Ignore unrelated `<...>` tag (such as partial text or HTML outside segments)
        buffer = buffer.slice(1);
        progress = true;
      } else {
        const tagMatch = NEXT_ANY_TAG_RE.exec(buffer);
        if (tagMatch) {
          const idx = tagMatch.index;
          if (idx > 0) {
            currentContent += buffer.slice(0, idx);
          }

          if (tagMatch[1] === "/") {
            buffer = buffer.slice(idx + tagMatch[0].length);
            finalizeCurrent();
            progress = true;
            continue;
          }

          // Model opened the next `<ndt-seg id="...">` without closing the previous one.
          const openCheck = OPEN_TAG_RE.exec(buffer.slice(idx));
          if (openCheck) {
            finalizeCurrent();
            currentId = Number(openCheck[1]);
            currentContent = "";
            state = "IN_SEG";
            buffer = buffer.slice(idx + openCheck[0].length);
            progress = true;
            continue;
          }

          // Treat unrecognized `<ndt-seg...>` fragment inside content literally.
          currentContent += buffer.slice(0, idx + tagMatch[0].length);
          buffer = buffer.slice(idx + tagMatch[0].length);
          onDelta?.(currentId, cleanSegmentText(currentContent, false));
          progress = true;
          continue;
        }

        // No complete `<ndt-seg>` / `</ndt-seg>` found; hold back only a potential tag prefix at tail.
        const lastLt = buffer.lastIndexOf("<");
        let safeEnd = buffer.length;
        if (lastLt >= 0 && isPotentialTagPrefix(buffer.slice(lastLt))) {
          safeEnd = lastLt;
        }

        if (safeEnd > 0) {
          currentContent += buffer.slice(0, safeEnd);
          buffer = buffer.slice(safeEnd);
          const partial = cleanSegmentText(currentContent, false);
          if (partial) {
            onDelta?.(currentId, partial);
          }
        }
      }
    }
  }

  function finish(expectedCount = 0) {
    if (state === "IN_SEG" && currentId != null) {
      if (buffer) {
        currentContent += buffer;
        buffer = "";
      }
      finalizeCurrent();
    }

    // Fallback if model ignored tags completely on a single-segment request.
    if (parsedCount === 0 && expectedCount === 1) {
      const stripped = rawFullText
        .replace(/^```[\w-]*\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      if (stripped) {
        completedResults.set(0, stripped);
        onDone?.(0, stripped);
      }
    }

    return {
      completedResults,
      rawFullText,
      parsedCount,
    };
  }

  return {
    push,
    finish,
    getCompletedResults: () => completedResults,
  };
}
