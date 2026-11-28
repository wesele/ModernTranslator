import { pickRecommendedStudyTrack } from "./wordbook.js";
import { t } from "./i18n/index.js";

const YOUTUBE_CACHE_LIMIT = 20;
const YOUTUBE_CACHE_TTL_MS = 15 * 60 * 1000;
const youtubeVideoCache = new Map();
const inFlightVideoFetches = new Map();

function getCachedVideo(videoId) {
  if (!videoId || !youtubeVideoCache.has(videoId)) return null;
  const entry = youtubeVideoCache.get(videoId);
  if (!entry || Date.now() - entry.fetchedAt > YOUTUBE_CACHE_TTL_MS) {
    youtubeVideoCache.delete(videoId);
    return null;
  }
  // Refresh LRU order
  youtubeVideoCache.delete(videoId);
  youtubeVideoCache.set(videoId, entry);
  return entry;
}

function setCachedVideo(videoId, entry) {
  if (!videoId || !entry) return;
  if (youtubeVideoCache.has(videoId)) {
    youtubeVideoCache.delete(videoId);
  }
  youtubeVideoCache.set(videoId, { ...entry, fetchedAt: Date.now() });
  while (youtubeVideoCache.size > YOUTUBE_CACHE_LIMIT) {
    const oldestKey = youtubeVideoCache.keys().next().value;
    youtubeVideoCache.delete(oldestKey);
  }
}

export function parseYouTubeVideoUrl(rawUrl) {
  if (!rawUrl) return null;
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  const isYt =
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtu.be";
  if (!isYt) return null;

  let videoId = "";
  if (host === "youtu.be") {
    videoId = (parsed.pathname.split("/").filter(Boolean)[0] || "").trim();
  } else if (parsed.pathname === "/watch" || parsed.pathname.startsWith("/watch/")) {
    videoId = (parsed.searchParams.get("v") || "").trim();
  } else {
    const liveMatch = parsed.pathname.match(/^\/(?:live|shorts|embed)\/([A-Za-z0-9_-]{6,})/);
    if (liveMatch) {
      videoId = liveMatch[1];
    }
  }

  if (!videoId) {
    return { isYouTube: true, isVideoPage: false, videoId: "" };
  }
  return { isYouTube: true, isVideoPage: true, videoId };
}

function decodeHtmlEntities(input) {
  if (!input) return "";
  return String(input)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    });
}

function cleanCueText(raw) {
  return decodeHtmlEntities(String(raw || ""))
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u200b\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function finalizeCues(rawCues) {
  const sorted = rawCues
    .filter((c) => c && c.content && Number.isFinite(c.from))
    .sort((a, b) => a.from - b.from);

  const deduped = [];
  for (const cue of sorted) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.content === cue.content && Math.abs(cue.from - prev.from) < 1.5) {
      if (cue.to > prev.to) prev.to = cue.to;
      continue;
    }
    deduped.push({
      from: Math.max(0, cue.from),
      to: Math.max(cue.from, Number.isFinite(cue.to) ? cue.to : cue.from + 2),
      content: cue.content,
    });
  }
  return deduped;
}

function parseJson3Subtitles(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  const events = Array.isArray(json?.events) ? json.events : [];
  const cues = [];
  for (const ev of events) {
    if (!Array.isArray(ev?.segs) || ev.segs.length === 0) continue;
    const content = cleanCueText(ev.segs.map((s) => s?.utf8 || "").join(""));
    if (!content) continue;
    const from = Number(ev.tStartMs ?? 0) / 1000;
    const dur = Number(ev.dDurationMs ?? 2000) / 1000;
    cues.push({
      from,
      to: from + Math.max(0.2, dur),
      content,
    });
  }
  return finalizeCues(cues);
}

function parseXmlSubtitles(text) {
  const cues = [];
  // Format 1: <text start="1.23" dur="4.56">...</text>
  const textTagRe = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
  let match;
  while ((match = textTagRe.exec(text)) !== null) {
    const attrs = match[1] || "";
    const startMatch = attrs.match(/\bstart="([^"]+)"/i);
    const durMatch = attrs.match(/\bdur="([^"]+)"/i);
    const from = Number.parseFloat(startMatch?.[1] || "0");
    const dur = Number.parseFloat(durMatch?.[1] || "2");
    const content = cleanCueText(match[2]);
    if (content && Number.isFinite(from)) {
      cues.push({
        from,
        to: from + (Number.isFinite(dur) && dur > 0 ? dur : 2),
        content,
      });
    }
  }
  if (cues.length > 0) return finalizeCues(cues);

  // Format 2: <p t="1230" d="4560"><s>...</s></p>
  const pTagRe = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  while ((match = pTagRe.exec(text)) !== null) {
    const attrs = match[1] || "";
    const tMatch = attrs.match(/\bt="([^"]+)"/i);
    const dMatch = attrs.match(/\bd="([^"]+)"/i);
    const from = Number.parseFloat(tMatch?.[1] || "0") / 1000;
    const dur = Number.parseFloat(dMatch?.[1] || "2000") / 1000;
    const content = cleanCueText(match[2]);
    if (content && Number.isFinite(from)) {
      cues.push({
        from,
        to: from + (Number.isFinite(dur) && dur > 0 ? dur : 2),
        content,
      });
    }
  }
  return finalizeCues(cues);
}

function parseVttTimestamp(ts) {
  const parts = String(ts || "")
    .trim()
    .replace(",", ".")
    .split(":")
    .map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function parseVttSubtitles(text) {
  const lines = String(text || "").split(/\r?\n/);
  const cues = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const timeMatch = line.match(
      /^(\d{1,2}:)?\d{2}:\d{2}[.,]\d{3}\s*-->\s*(\d{1,2}:)?\d{2}:\d{2}[.,]\d{3}/
    );
    if (!timeMatch) {
      i += 1;
      continue;
    }
    const [startStr, endStr] = line.split("-->").map((s) => s.trim().split(/\s+/)[0]);
    const from = parseVttTimestamp(startStr);
    const to = parseVttTimestamp(endStr);
    i += 1;
    const buf = [];
    while (i < lines.length && lines[i].trim() !== "") {
      buf.push(lines[i]);
      i += 1;
    }
    const content = cleanCueText(buf.join(" "));
    if (content && Number.isFinite(from)) {
      cues.push({
        from,
        to: Number.isFinite(to) ? to : from + 2,
        content,
      });
    }
  }
  return finalizeCues(cues);
}

export function parseYouTubeTimedtext(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return [];
  if (text.startsWith("{")) {
    const jsonCues = parseJson3Subtitles(text);
    if (jsonCues.length > 0) return jsonCues;
  }
  if (text.startsWith("WEBVTT") || text.includes("-->")) {
    const vttCues = parseVttSubtitles(text);
    if (vttCues.length > 0) return vttCues;
  }
  if (text.includes("<text") || text.includes("<p ")) {
    const xmlCues = parseXmlSubtitles(text);
    if (xmlCues.length > 0) return xmlCues;
  }
  return [];
}

function buildTimedtextUrl(baseUrl, fmt = "", pot = "") {
  if (!baseUrl) return "";
  try {
    const u = new URL(baseUrl);
    if (fmt) {
      u.searchParams.set("fmt", fmt);
    } else {
      u.searchParams.delete("fmt");
    }
    if (pot && !u.searchParams.has("pot")) {
      u.searchParams.set("pot", pot);
    }
    return u.toString();
  } catch {
    return baseUrl;
  }
}

function baseLangCode(lan) {
  return String(lan || "")
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];
}

function getTrackDisplayName(rawTrack, index) {
  const simple = rawTrack?.name?.simpleText;
  const runs = Array.isArray(rawTrack?.name?.runs)
    ? rawTrack.name.runs.map((r) => r?.text || "").join("")
    : "";
  const fallbackName = rawTrack?.displayName || rawTrack?.languageName;
  const base = String(
    simple ||
      runs ||
      fallbackName ||
      rawTrack?.languageCode ||
      t("subtitle.trackNumber", { n: index + 1 })
  ).trim();
  const isAsr = rawTrack?.kind === "asr";
  if (isAsr && !/auto|自动|自動|자동/i.test(base)) {
    return `${base} (${t("subtitle.autoGeneratedSuffix")})`;
  }
  return base;
}

function inferOriginalLang(rawTracks = [], meta = {}) {
  const audioTracks = Array.isArray(meta.audioTracks) ? meta.audioTracks : [];
  const defaultAudioIdx = Number.isInteger(meta.defaultAudioTrackIndex)
    ? meta.defaultAudioTrackIndex
    : 0;
  const primaryAudio = audioTracks[defaultAudioIdx] || audioTracks[0];
  const defaultCaptionIdx = primaryAudio?.defaultCaptionTrackIndex;
  if (Number.isInteger(defaultCaptionIdx) && rawTracks[defaultCaptionIdx]?.languageCode) {
    return baseLangCode(rawTracks[defaultCaptionIdx].languageCode);
  }
  // YouTube ASR track is almost always in the video's spoken/original language
  const asrTrack = rawTracks.find((tr) => tr?.kind === "asr" && tr?.languageCode);
  if (asrTrack) {
    return baseLangCode(asrTrack.languageCode);
  }
  if (meta.defaultAudioLanguage) {
    return baseLangCode(meta.defaultAudioLanguage);
  }
  return "";
}

function trackMatchesActive(rawTrack, activeTrack) {
  if (!rawTrack || !activeTrack) return false;
  if (activeTrack.vssId && rawTrack.vssId && activeTrack.vssId === rawTrack.vssId) {
    return true;
  }
  if (
    activeTrack.languageCode &&
    rawTrack.languageCode &&
    String(activeTrack.languageCode).toLowerCase() === String(rawTrack.languageCode).toLowerCase()
  ) {
    const activeIsAsr = activeTrack.kind === "asr";
    const rawIsAsr = rawTrack.kind === "asr";
    return activeIsAsr === rawIsAsr;
  }
  return false;
}

export function normalizeYouTubeTracks(rawTracks = [], meta = {}) {
  const seen = new Set();
  const list = [];
  const originalLang = inferOriginalLang(rawTracks, meta);
  const audioTracks = Array.isArray(meta.audioTracks) ? meta.audioTracks : [];
  const defaultAudioIdx = Number.isInteger(meta.defaultAudioTrackIndex)
    ? meta.defaultAudioTrackIndex
    : 0;
  const defaultCaptionIdx = (audioTracks[defaultAudioIdx] || audioTracks[0])
    ?.defaultCaptionTrackIndex;

  for (let i = 0; i < rawTracks.length; i += 1) {
    const raw = rawTracks[i];
    if (!raw || (!raw.baseUrl && !(raw.languageCode && (raw.vssId || meta.hasPlayer)))) continue;
    const lan = String(raw.languageCode || "").trim();
    const isAuto = raw.kind === "asr";
    const vssId = String(raw.vssId || (lan ? `${isAuto ? "a." : "."}${lan}` : ""));
    const id = String(raw.vssId || `${lan}${isAuto ? ".asr" : ""}-${i}`);
    if (seen.has(id)) continue;
    seen.add(id);

    const isDefaultCaption = Number.isInteger(defaultCaptionIdx) && i === defaultCaptionIdx;
    const isOriginalLang = Boolean(originalLang && baseLangCode(lan) === originalLang);
    const isActiveInPlayer = trackMatchesActive(raw, meta.activeTrack);

    list.push({
      key: id,
      id,
      vssId,
      lan,
      lanDoc: getTrackDisplayName(raw, i),
      author: isAuto ? "YouTube ASR" : "",
      isAutoGenerated: isAuto,
      isOriginalLang,
      isDefaultCaption,
      isActiveInPlayer,
      hasSubtitleUrl: Boolean(raw.baseUrl || vssId || lan),
      cuesLoaded: false,
      subtitleUrl: raw.baseUrl || "",
      cues: [],
      totalCues: 0,
    });
  }

  // Rank in smart study order:
  // 1. Active CC track in player
  // 2. Default / original-language manual caption
  // 3. Original-language ASR caption
  // 4. Other manual captions (English before alphabetical tail when many tracks exist)
  // 5. Other ASR captions
  const getRank = (tr) => {
    if (tr.isActiveInPlayer) return 0;
    if (tr.isDefaultCaption && !tr.isAutoGenerated) return 1;
    if (tr.isOriginalLang && !tr.isAutoGenerated) return 2;
    if (tr.isOriginalLang && tr.isAutoGenerated) return 3;
    if (!tr.isAutoGenerated && baseLangCode(tr.lan) === "en") return 4;
    if (!tr.isAutoGenerated) return 5;
    if (baseLangCode(tr.lan) === "en") return 6;
    return 7;
  };

  list.sort((a, b) => getRank(a) - getRank(b));
  return list;
}

export function selectInitialYouTubeTrack(tracks = [], { trackKey = "", targetLanguage = "" } = {}) {
  if (!Array.isArray(tracks) || tracks.length === 0) return null;
  if (trackKey) {
    const exact = tracks.find((t) => t.key === trackKey || t.id === trackKey);
    if (exact) return exact;
  }
  return pickRecommendedStudyTrack(tracks, targetLanguage) || tracks[0];
}

function extractBalancedJson(html, marker) {
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const start = html.indexOf("{", idx + marker.length);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function findCapturedTimedtextForTrack(capturedList = [], track = null) {
  if (!Array.isArray(capturedList) || capturedList.length === 0 || !track) return [];
  const targetLang = String(track.lan || "").trim().toLowerCase();
  const targetBase = baseLangCode(targetLang);
  const targetVss = String(track.vssId || "").trim().toLowerCase();
  const targetAuto = Boolean(track.isAutoGenerated);

  const nonTranslated = capturedList.filter((e) => e && e.bodyText && !e.tlang);
  const candidates = [];

  for (const entry of nonTranslated) {
    const entryVss = String(entry.vssId || "").trim().toLowerCase();
    const entryLang = String(entry.lang || "").trim().toLowerCase();
    const entryAuto = entry.kind === "asr";

    if (targetVss && entryVss && targetVss === entryVss) {
      candidates.push({ entry, score: 0 });
    } else if (targetLang && entryLang === targetLang && entryAuto === targetAuto) {
      candidates.push({ entry, score: 1 });
    } else if (targetLang && entryLang === targetLang) {
      candidates.push({ entry, score: 2 });
    } else if (targetBase && baseLangCode(entryLang) === targetBase && entryAuto === targetAuto) {
      candidates.push({ entry, score: 3 });
    }
  }

  candidates.sort((a, b) => a.score - b.score || (b.entry.capturedAt || 0) - (a.entry.capturedAt || 0));
  for (const { entry } of candidates) {
    const cues = parseYouTubeTimedtext(entry.bodyText);
    if (cues.length > 0) return cues;
  }
  return [];
}

function getExtApi() {
  return typeof browser !== "undefined"
    ? browser
    : typeof chrome !== "undefined"
      ? chrome
      : null;
}

async function extractMetaFromTabMainWorld(tabId, expectedVideoId) {
  const extApi = getExtApi();
  if (!tabId || !extApi?.scripting?.executeScript) return null;
  try {
    const results = await extApi.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [expectedVideoId],
      func: (vid) => {
        try {
          const parseClock = (str) => {
            const parts = String(str || "")
              .trim()
              .split(":")
              .map(Number);
            if (parts.length === 0 || parts.some((n) => !Number.isFinite(n))) return NaN;
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            if (parts.length === 2) return parts[0] * 60 + parts[1];
            return parts[0];
          };

          const store = window.__NDT_YT_STORE__ || null;
          const player =
            document.getElementById("movie_player") ||
            document.getElementById("shorts-player");
          let pr = null;
          if (player && typeof player.getPlayerResponse === "function") {
            const candidate = player.getPlayerResponse();
            if (candidate?.videoDetails?.videoId === vid) {
              pr = candidate;
            }
          }
          if (!pr && store?.playerResponseByVideo?.[vid]?.videoDetails?.videoId === vid) {
            pr = store.playerResponseByVideo[vid];
          }
          if (!pr && window.ytInitialPlayerResponse?.videoDetails?.videoId === vid) {
            pr = window.ytInitialPlayerResponse;
          }

          let activeTrack = null;
          let playerTrackList = [];
          try {
            if (player && typeof player.getOption === "function") {
              const curr = player.getOption("captions", "track");
              if (curr && (curr.languageCode || curr.vssId)) {
                activeTrack = {
                  languageCode: curr.languageCode || "",
                  vssId: curr.vssId || "",
                  kind: curr.kind || "",
                };
              }
              const list = player.getOption("captions", "tracklist");
              if (Array.isArray(list)) {
                playerTrackList = list;
              }
            }
          } catch {
            // ignore caption module query errors
          }

          let pot = store?.potByVideo?.[vid] || "";
          let activeTimedtextUrl = "";
          try {
            const entries = performance.getEntriesByType("resource") || [];
            for (let i = entries.length - 1; i >= 0; i -= 1) {
              const name = entries[i]?.name || "";
              if (name.includes("/api/timedtext") && name.includes(vid)) {
                if (!activeTimedtextUrl) activeTimedtextUrl = name;
                const u = new URL(name);
                const foundPot = u.searchParams.get("pot");
                if (foundPot && !pot) {
                  pot = foundPot;
                  break;
                }
              }
            }
          } catch {
            // ignore performance API errors
          }

          const capturedTimedtext = [];
          if (store?.timedtextByKey) {
            for (const entry of Object.values(store.timedtextByKey)) {
              if (entry && entry.videoId === vid && entry.bodyText) {
                capturedTimedtext.push({
                  lang: entry.lang || "",
                  kind: entry.kind || "",
                  tlang: entry.tlang || "",
                  vssId: entry.vssId || "",
                  pot: entry.pot || "",
                  bodyText: entry.bodyText,
                  capturedAt: entry.capturedAt || 0,
                });
                if (!pot && entry.pot) pot = entry.pot;
              }
            }
          }

          const capturedTranscript = store?.transcriptByKey?.[vid]?.json || null;

          // Read already-rendered YouTube transcript panel in DOM if open (0 network cost)
          const domTranscriptCues = [];
          try {
            const domSegs = document.querySelectorAll(
              "ytd-transcript-segment-renderer, transcript-segment-view-model"
            );
            for (const el of domSegs) {
              const tsEl = el.querySelector(
                ".segment-timestamp, .ytwTranscriptSegmentViewModelTimestamp"
              );
              const txtEl = el.querySelector(
                ".segment-text, yt-formatted-string.segment-text, .ytwTranscriptSegmentViewModelText, yt-core-attributed-string"
              );
              const from = parseClock(tsEl?.textContent || "");
              const content = String(txtEl?.textContent || "")
                .replace(/\s+/g, " ")
                .trim();
              if (Number.isFinite(from) && content) {
                domTranscriptCues.push({ from: Math.max(0, from), to: NaN, content });
              }
            }
          } catch {
            // ignore DOM transcript scrape errors
          }

          const renderer = pr?.captions?.playerCaptionsTracklistRenderer || null;
          let rawTracks = Array.isArray(renderer?.captionTracks) ? renderer.captionTracks : [];
          if (rawTracks.length === 0 && playerTrackList.length > 0) {
            rawTracks = playerTrackList
              .filter((tr) => tr && tr.languageCode)
              .map((tr) => ({
                languageCode: tr.languageCode,
                vssId: tr.vssId || "",
                kind: tr.kind || "",
                displayName: tr.displayName || tr.languageName || tr.languageCode,
              }));
          }
          const audioTracks = Array.isArray(renderer?.audioTracks) ? renderer.audioTracks : [];
          const defaultAudioTrackIndex = renderer?.defaultAudioTrackIndex;
          const defaultAudioLanguage =
            pr?.microformat?.playerMicroformatRenderer?.defaultAudioLanguage ||
            pr?.videoDetails?.defaultAudioLanguage ||
            "";
          const domTitle =
            document
              .querySelector(
                "ytd-watch-metadata h1 yt-formatted-string, h1.ytd-watch-metadata, #title h1"
              )
              ?.textContent?.trim() || "";
          const docTitle = String(document.title || "")
            .replace(/^\(\d+\)\s*/, "")
            .replace(/\s*-\s*YouTube$/, "")
            .trim();
          const cleanDocTitle = docTitle && docTitle !== "YouTube" ? docTitle : "";
          const videoTitle = pr?.videoDetails?.title || domTitle || cleanDocTitle;

          return {
            videoTitle,
            pot,
            activeTimedtextUrl,
            activeTrack,
            hasPlayer: Boolean(player),
            hasPlayerResponse: Boolean(pr),
            rawTracks,
            audioTracks,
            defaultAudioTrackIndex,
            defaultAudioLanguage,
            capturedTimedtext,
            capturedTranscript,
            domTranscriptCues,
          };
        } catch {
          return null;
        }
      },
    });
    return results?.[0]?.result || null;
  } catch {
    return null;
  }
}

/**
 * Trigger YouTube's own player caption module in MAIN world so YouTube's
 * BotGuard/Player JS computes a valid PO Token and fetches /api/timedtext,
 * which our MAIN-world hook captures transparently.
 */
async function triggerPlayerCaptionLoadInMainWorld(tabId, videoId, track) {
  const extApi = getExtApi();
  if (!tabId || !videoId || !track?.lan || !extApi?.scripting?.executeScript) {
    return { cues: [], pot: "", capturedEntries: [] };
  }
  try {
    const results = await extApi.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [
        videoId,
        {
          lan: track.lan || "",
          vssId: track.vssId || "",
          isAutoGenerated: Boolean(track.isAutoGenerated),
        },
      ],
      func: async (vid, targetTrack) => {
        const store = window.__NDT_YT_STORE__ || null;
        const collectEntries = () => {
          const out = [];
          if (store?.timedtextByKey) {
            for (const entry of Object.values(store.timedtextByKey)) {
              if (entry && entry.videoId === vid && entry.bodyText) {
                out.push({
                  lang: entry.lang || "",
                  kind: entry.kind || "",
                  tlang: entry.tlang || "",
                  vssId: entry.vssId || "",
                  pot: entry.pot || "",
                  bodyText: entry.bodyText,
                  capturedAt: entry.capturedAt || 0,
                });
              }
            }
          }
          return out;
        };

        const matchesTarget = (entry) => {
          if (!entry || !entry.bodyText || entry.tlang) return false;
          const eVss = String(entry.vssId || "").toLowerCase();
          const tVss = String(targetTrack.vssId || "").toLowerCase();
          if (tVss && eVss && tVss === eVss) return true;
          const eLang = String(entry.lang || "").toLowerCase();
          const tLang = String(targetTrack.lan || "").toLowerCase();
          return Boolean(tLang && eLang === tLang);
        };

        const existingEntries = collectEntries();
        if (existingEntries.some(matchesTarget)) {
          return {
            pot: store?.potByVideo?.[vid] || "",
            capturedEntries: existingEntries,
          };
        }

        const player =
          document.getElementById("movie_player") ||
          document.getElementById("shorts-player");
        if (!player) {
          return { pot: store?.potByVideo?.[vid] || "", capturedEntries: existingEntries };
        }
        if (
          player.classList.contains("ad-showing") ||
          player.classList.contains("ad-interrupting")
        ) {
          return { pot: store?.potByVideo?.[vid] || "", capturedEntries: existingEntries };
        }

        const pr =
          typeof player.getPlayerResponse === "function" ? player.getPlayerResponse() : null;
        if (pr?.videoDetails?.videoId && pr.videoDetails.videoId !== vid) {
          return { pot: store?.potByVideo?.[vid] || "", capturedEntries: existingEntries };
        }

        let prevTrack = null;
        try {
          if (typeof player.getOption === "function") {
            prevTrack = player.getOption("captions", "track");
          }
        } catch {
          prevTrack = null;
        }
        const ccBtn = player.querySelector(".ytp-subtitles-button");
        const wasCcActive = Boolean(
          (prevTrack && (prevTrack.languageCode || prevTrack.vssId)) ||
            ccBtn?.getAttribute("aria-pressed") === "true"
        );

        let probeStyle = null;
        if (!wasCcActive) {
          probeStyle = document.getElementById("ndt-yt-silent-caption-probe");
          if (!probeStyle) {
            probeStyle = document.createElement("style");
            probeStyle.id = "ndt-yt-silent-caption-probe";
            probeStyle.textContent =
              ".ytp-caption-window-container { visibility: hidden !important; }";
            (document.head || document.documentElement).appendChild(probeStyle);
          }
        }

        try {
          await new Promise((resolve) => {
            let settled = false;
            let timer = null;
            let settleGrace = null;

            const finish = () => {
              if (settled) return;
              settled = true;
              window.removeEventListener("ndt-yt-timedtext-captured", onCapture);
              if (timer) window.clearTimeout(timer);
              if (settleGrace) window.clearTimeout(settleGrace);
              resolve();
            };

            const onCapture = (ev) => {
              const detail = ev?.detail;
              if (!detail || detail.videoId !== vid) return;
              const nowEntries = collectEntries();
              if (nowEntries.some(matchesTarget)) {
                finish();
                return;
              }
              if (detail.pot && !settleGrace) {
                settleGrace = window.setTimeout(finish, 400);
              }
            };

            window.addEventListener("ndt-yt-timedtext-captured", onCapture);
            timer = window.setTimeout(finish, 3200);

            try {
              if (typeof player.loadModule === "function") {
                player.loadModule("captions");
              }
            } catch {
              // ignore loadModule error
            }

            const applyTrackOption = () => {
              if (settled) return;
              try {
                let desiredTrack = {
                  languageCode: targetTrack.lan,
                  ...(targetTrack.vssId ? { vssId: targetTrack.vssId } : {}),
                };
                if (typeof player.getOption === "function") {
                  const list = player.getOption("captions", "tracklist");
                  if (Array.isArray(list) && list.length > 0) {
                    const matched =
                      list.find(
                        (tr) =>
                          targetTrack.vssId &&
                          tr?.vssId &&
                          tr.vssId.toLowerCase() === targetTrack.vssId.toLowerCase()
                      ) ||
                      list.find(
                        (tr) =>
                          tr?.languageCode &&
                          tr.languageCode.toLowerCase() === targetTrack.lan.toLowerCase() &&
                          (tr.kind === "asr") === Boolean(targetTrack.isAutoGenerated)
                      ) ||
                      list.find(
                        (tr) =>
                          tr?.languageCode &&
                          tr.languageCode.toLowerCase() === targetTrack.lan.toLowerCase()
                      );
                    if (matched) {
                      desiredTrack = matched;
                    }
                  }
                }
                if (typeof player.setOption === "function") {
                  player.setOption("captions", "track", desiredTrack);
                }
              } catch {
                // ignore setOption error
              }
            };

            window.setTimeout(applyTrackOption, 60);
            window.setTimeout(applyTrackOption, 300);
            window.setTimeout(applyTrackOption, 750);
          });
        } finally {
          if (!wasCcActive) {
            try {
              if (typeof player.setOption === "function") {
                player.setOption("captions", "track", {});
              }
            } catch {
              // ignore restore error
            }
            if (probeStyle && probeStyle.parentNode) {
              probeStyle.remove();
            }
          }
        }

        return {
          pot: store?.potByVideo?.[vid] || "",
          capturedEntries: collectEntries(),
        };
      },
    });
    const res = results?.[0]?.result;
    const capturedEntries = Array.isArray(res?.capturedEntries) ? res.capturedEntries : [];
    const cues = findCapturedTimedtextForTrack(capturedEntries, track);
    return {
      cues,
      pot: res?.pot || "",
      capturedEntries,
    };
  } catch {
    return { cues: [], pot: "", capturedEntries: [] };
  }
}

async function fetchSingleTrackInMainWorld(tabId, baseUrl, pot = "") {
  const extApi = getExtApi();
  if (!tabId || !baseUrl || !extApi?.scripting?.executeScript) {
    return { cues: [], rateLimited: false };
  }
  try {
    const results = await extApi.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [baseUrl, pot],
      func: async (rawBaseUrl, potToken) => {
        for (const fmt of ["json3", ""]) {
          try {
            const u = new URL(rawBaseUrl);
            if (fmt) u.searchParams.set("fmt", fmt);
            else u.searchParams.delete("fmt");
            if (potToken && !u.searchParams.has("pot")) {
              u.searchParams.set("pot", potToken);
            }
            const resp = await fetch(u.toString(), { credentials: "include" });
            if (resp.status === 429) {
              return { bodyText: "", rateLimited: true };
            }
            if (resp.ok) {
              const txt = await resp.text();
              if (txt && txt.trim().length > 0) {
                return { bodyText: txt, rateLimited: false };
              }
              // Empty 200 without POT usually means Web timedtext requires POT; bail quickly
              if (!potToken) {
                return { bodyText: "", rateLimited: false };
              }
            }
          } catch {
            // try next format
          }
        }
        return { bodyText: "", rateLimited: false };
      },
    });
    const res = results?.[0]?.result;
    if (res?.rateLimited) {
      return { cues: [], rateLimited: true };
    }
    const cues = res?.bodyText ? parseYouTubeTimedtext(res.bodyText) : [];
    return { cues, rateLimited: false };
  } catch {
    return { cues: [], rateLimited: false };
  }
}

async function fetchTimedtextBody(baseUrl, pot = "", credentials = "include") {
  for (const fmt of ["json3", ""]) {
    const url = buildTimedtextUrl(baseUrl, fmt, pot);
    try {
      const res = await fetch(url, { credentials });
      if (res.status === 429) {
        return { cues: [], rateLimited: true };
      }
      if (!res.ok) continue;
      const text = await res.text();
      if (text && text.trim().length > 0) {
        const cues = parseYouTubeTimedtext(text);
        if (cues.length > 0) return { cues, rateLimited: false };
      }
    } catch {
      // try next format
    }
  }
  return { cues: [], rateLimited: false };
}

async function fetchViaWatchHtml(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      credentials: "include",
    });
    if (res.status === 429) {
      return { rateLimited: true, videoTitle: "", rawTracks: [] };
    }
    if (!res.ok) return null;
    const html = await res.text();
    const pr =
      extractBalancedJson(html, "var ytInitialPlayerResponse =") ||
      extractBalancedJson(html, "ytInitialPlayerResponse =");
    if (!pr) return null;
    const renderer = pr?.captions?.playerCaptionsTracklistRenderer || null;
    return {
      rateLimited: false,
      videoTitle: pr?.videoDetails?.title || "",
      rawTracks: Array.isArray(renderer?.captionTracks) ? renderer.captionTracks : [],
      audioTracks: Array.isArray(renderer?.audioTracks) ? renderer.audioTracks : [],
      defaultAudioTrackIndex: renderer?.defaultAudioTrackIndex,
      defaultAudioLanguage:
        pr?.microformat?.playerMicroformatRenderer?.defaultAudioLanguage ||
        pr?.videoDetails?.defaultAudioLanguage ||
        "",
    };
  } catch {
    return null;
  }
}

function encodeProtoVarint(n) {
  const out = [];
  let v = n >>> 0;
  while (v > 0x7f) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v & 0x7f);
  return out;
}

function encodeProtoBytesField(fieldNum, bytes) {
  return [
    ...encodeProtoVarint((fieldNum << 3) | 2),
    ...encodeProtoVarint(bytes.length),
    ...bytes,
  ];
}

function encodeProtoVarintField(fieldNum, val) {
  return [...encodeProtoVarint((fieldNum << 3) | 0), ...encodeProtoVarint(val)];
}

export function buildGetPanelParams(videoId, vssId = "") {
  const te = new TextEncoder();
  const inner = [
    ...encodeProtoBytesField(1, te.encode(String(videoId || ""))),
    ...encodeProtoVarintField(3, 1),
    ...(vssId ? encodeProtoBytesField(6, te.encode(String(vssId))) : []),
  ];
  const outer = encodeProtoBytesField(149, inner);
  let bin = "";
  for (let i = 0; i < outer.length; i += 1) {
    bin += String.fromCharCode(outer[i]);
  }
  return btoa(bin);
}

function parseClockToSeconds(str) {
  const parts = String(str || "")
    .trim()
    .split(":")
    .map(Number);
  if (parts.length === 0 || parts.some((n) => !Number.isFinite(n))) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

export function parseGetPanelTranscriptCues(json) {
  if (!json || typeof json !== "object") return [];

  const timingByKey = new Map();
  const mutations = json?.frameworkUpdates?.entityBatchUpdate?.mutations || [];
  for (const mut of mutations) {
    const sections = mut?.payload?.timedMarkersListSyncEntity?.timedListData?.sections || [];
    for (const sec of sections) {
      for (const entry of sec?.timedSyncDataList || []) {
        const m = String(entry?.syncItemId || "").match(/(\d+)_(\d+)$/);
        if (m) {
          const key = `${m[1]}_${m[2]}`;
          const startMs = Number(entry.videoTimeMs);
          const endMs = Number(entry.endTimeMs);
          if (Number.isFinite(startMs)) {
            timingByKey.set(key, {
              from: startMs / 1000,
              to: Number.isFinite(endMs) && endMs > startMs ? endMs / 1000 : NaN,
            });
          }
        }
      }
    }
  }

  const cues = [];
  const pushMacroItem = (vm, secIdx = -1) => {
    if (!vm) return;
    const tItem = vm.item?.timelineItemViewModel;
    const contentItems = Array.isArray(tItem?.contentItems) ? tItem.contentItems : [];
    const texts = [];
    let segTimestamp = tItem?.timestamp || "";
    for (const ci of contentItems) {
      const seg = ci?.transcriptSegmentViewModel;
      if (seg?.simpleText) {
        texts.push(seg.simpleText);
        if (!segTimestamp && seg.timestamp) segTimestamp = seg.timestamp;
      }
    }
    const content = cleanCueText(texts.join(" "));
    if (!content) return;

    const tapSec = Number(vm.onTap?.innertubeCommand?.watchEndpoint?.startTimeSeconds);
    const clockSec = parseClockToSeconds(segTimestamp);
    const fallbackFrom = Number.isFinite(tapSec) ? tapSec : clockSec;
    const synced =
      secIdx >= 0 && Number.isInteger(vm.index)
        ? timingByKey.get(`${secIdx}_${vm.index}`)
        : null;
    const useSynced =
      synced &&
      Number.isFinite(synced.from) &&
      (!Number.isFinite(fallbackFrom) || Math.abs(synced.from - fallbackFrom) <= 2);

    const from = useSynced ? synced.from : fallbackFrom;
    if (Number.isFinite(from)) {
      const to = useSynced && Number.isFinite(synced.to) ? synced.to : NaN;
      cues.push({ from: Math.max(0, from), to, content });
    }
  };

  const slr = json?.content?.engagementPanelSectionListRenderer?.content?.sectionListRenderer;
  const sections = Array.isArray(slr?.contents) ? slr.contents : [];
  for (let secIdx = 0; secIdx < sections.length; secIdx += 1) {
    const items = sections[secIdx]?.itemSectionRenderer?.contents || [];
    for (const item of items) {
      if (item?.macroMarkersPanelItemViewModel) {
        pushMacroItem(item.macroMarkersPanelItemViewModel, secIdx);
      }
    }
  }

  // Fallback recursive walk in case YouTube uses get_transcript or changes wrapper nesting
  if (cues.length === 0) {
    const walk = (obj) => {
      if (!obj || typeof obj !== "object") return;
      if (obj.macroMarkersPanelItemViewModel) {
        pushMacroItem(obj.macroMarkersPanelItemViewModel, -1);
        return;
      }
      if (obj.transcriptSegmentRenderer) {
        const seg = obj.transcriptSegmentRenderer;
        const startMs = Number(seg.startMs);
        const endMs = Number(seg.endMs);
        const text = cleanCueText(
          Array.isArray(seg.snippet?.runs)
            ? seg.snippet.runs.map((r) => r?.text || "").join("")
            : seg.snippet?.simpleText || ""
        );
        if (text && Number.isFinite(startMs)) {
          cues.push({
            from: Math.max(0, startMs / 1000),
            to: Number.isFinite(endMs) && endMs > startMs ? endMs / 1000 : NaN,
            content: text,
          });
        }
        return;
      }
      if (obj.cueGroupRenderer) {
        const list = Array.isArray(obj.cueGroupRenderer.cues) ? obj.cueGroupRenderer.cues : [];
        for (const item of list) {
          const cr = item?.cueRenderer;
          if (!cr) continue;
          const startMs = Number(cr.startOffsetMs);
          const durMs = Number(cr.durationMs);
          const text = cleanCueText(
            cr.cue?.simpleText ||
              (Array.isArray(cr.cue?.runs) ? cr.cue.runs.map((r) => r?.text || "").join("") : "")
          );
          if (text && Number.isFinite(startMs)) {
            cues.push({
              from: Math.max(0, startMs / 1000),
              to: Number.isFinite(durMs) && durMs > 0 ? (startMs + durMs) / 1000 : NaN,
              content: text,
            });
          }
        }
        return;
      }
      if (Array.isArray(obj)) obj.forEach(walk);
      else Object.values(obj).forEach(walk);
    };
    walk(json);
  }

  cues.sort((a, b) => a.from - b.from);
  for (let i = 0; i < cues.length; i += 1) {
    if (!Number.isFinite(cues[i].to) || cues[i].to <= cues[i].from) {
      const nextFrom = cues[i + 1]?.from;
      cues[i].to =
        Number.isFinite(nextFrom) && nextFrom > cues[i].from ? nextFrom : cues[i].from + 2;
    }
  }
  return finalizeCues(cues);
}

/**
 * Call YouTube's transcript endpoints (get_panel / get_transcript) directly from
 * the active YouTube tab's MAIN world using real ytcfg context, visitorData,
 * SAPISIDHASH authorization, and engagementPanel params.
 */
async function fetchTranscriptInMainWorld(tabId, videoId, vssId = "", preferDefaultTrack = true) {
  const extApi = getExtApi();
  if (!tabId || !videoId || !extApi?.scripting?.executeScript) {
    return { cues: [], rateLimited: false };
  }
  const fallbackPanelParams = buildGetPanelParams(videoId, vssId);
  try {
    const results = await extApi.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [videoId, fallbackPanelParams, Boolean(preferDefaultTrack)],
      func: async (vid, panelParamsFallback, useDefaultFirst) => {
        const readCookie = (name) => {
          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
          return m ? decodeURIComponent(m[1]) : "";
        };

        const computeSapisidAuth = async () => {
          const origin = "https://www.youtube.com";
          const pairs = [
            ["SAPISIDHASH", readCookie("SAPISID") || readCookie("__Secure-3PAPISID")],
            ["SAPISID1PHASH", readCookie("__Secure-1PAPISID")],
            ["SAPISID3PHASH", readCookie("__Secure-3PAPISID")],
          ].filter(([, val]) => Boolean(val));
          if (pairs.length === 0 || !window.crypto?.subtle) return "";
          const ts = Math.floor(Date.now() / 1000);
          const out = [];
          for (const [scheme, sapisid] of pairs) {
            try {
              const data = new TextEncoder().encode(`${ts} ${sapisid} ${origin}`);
              const hashBuf = await crypto.subtle.digest("SHA-1", data);
              const hex = Array.from(new Uint8Array(hashBuf))
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
              out.push(`${scheme} ${ts}_${hex}`);
            } catch {
              // ignore hash failure
            }
          }
          return out.join(" ");
        };

        const cfgData = window.ytcfg?.data_ || {};
        const ytcfgGet = (k) => (typeof window.ytcfg?.get === "function" ? window.ytcfg.get(k) : cfgData[k]);

        const apiKey = ytcfgGet("INNERTUBE_API_KEY") || "";
        const clientNameNum = String(ytcfgGet("INNERTUBE_CONTEXT_CLIENT_NAME") || "1");
        const clientVersion =
          ytcfgGet("INNERTUBE_CONTEXT_CLIENT_VERSION") ||
          ytcfgGet("INNERTUBE_CLIENT_VERSION") ||
          "2.20261125.00.00";
        const visitorData = ytcfgGet("VISITOR_DATA") || "";
        const sessionIndex = String(ytcfgGet("SESSION_INDEX") ?? "0");
        const baseContext = ytcfgGet("INNERTUBE_CONTEXT") || {
          client: {
            clientName: "WEB",
            clientVersion,
            hl: ytcfgGet("HL") || "en",
            ...(visitorData ? { visitorData } : {}),
          },
        };

        const headers = {
          "Content-Type": "application/json",
          "X-Origin": "https://www.youtube.com",
          "X-YouTube-Client-Name": clientNameNum,
          "X-YouTube-Client-Version": clientVersion,
          ...(visitorData ? { "X-Goog-Visitor-Id": visitorData } : {}),
        };
        const auth = await computeSapisidAuth();
        if (auth) {
          headers.Authorization = auth;
          headers["X-Goog-AuthUser"] = sessionIndex;
        }

        const extractTranscriptEndpoints = (root) => {
          let getTranscriptParams = "";
          let getPanelParams = "";
          const visited = new Set();
          const walk = (node, depth = 0) => {
            if (!node || typeof node !== "object" || depth > 14) return;
            if (visited.has(node)) return;
            visited.add(node);
            if (node.getTranscriptEndpoint?.params && !getTranscriptParams) {
              getTranscriptParams = node.getTranscriptEndpoint.params;
            }
            if (
              node.getPanelEndpoint?.panelIdentifier === "PAmodern_transcript_view" &&
              node.getPanelEndpoint?.params &&
              !getPanelParams
            ) {
              getPanelParams = node.getPanelEndpoint.params;
            }
            if (Array.isArray(node)) {
              for (const item of node) walk(item, depth + 1);
            } else {
              for (const val of Object.values(node)) {
                if (val && typeof val === "object") walk(val, depth + 1);
              }
            }
          };
          if (Array.isArray(root?.engagementPanels)) {
            walk(root.engagementPanels, 0);
          } else {
            walk(root, 0);
          }
          return { getTranscriptParams, getPanelParams };
        };

        const postInnertube = async (endpoint, payload) => {
          const qs = apiKey ? `key=${encodeURIComponent(apiKey)}&prettyPrint=false` : "prettyPrint=false";
          const res = await fetch(`https://www.youtube.com/youtubei/v1/${endpoint}?${qs}`, {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify({
              context: baseContext,
              ...payload,
            }),
          });
          if (res.status === 429) return { rateLimited: true, json: null };
          if (!res.ok) return { rateLimited: false, json: null };
          return { rateLimited: false, json: await res.json() };
        };

        const store = window.__NDT_YT_STORE__ || null;
        let nextData = store?.nextDataByVideo?.[vid] || null;
        if (
          !nextData &&
          window.ytInitialData?.currentVideoEndpoint?.watchEndpoint?.videoId === vid
        ) {
          nextData = window.ytInitialData;
        }
        let { getTranscriptParams, getPanelParams } = extractTranscriptEndpoints(nextData);

        if (!getTranscriptParams && !getPanelParams) {
          const nextRes = await postInnertube("next", { videoId: vid });
          if (nextRes.rateLimited) return { json: null, rateLimited: true };
          if (nextRes.json) {
            ({ getTranscriptParams, getPanelParams } = extractTranscriptEndpoints(nextRes.json));
          }
        }

        const attempts = [];
        if (!useDefaultFirst) {
          // Non-default specific track requested: try parameterized get_panel first
          attempts.push([
            "get_panel",
            { panelId: "PAmodern_transcript_view", params: panelParamsFallback },
          ]);
        }
        if (getPanelParams) {
          attempts.push([
            "get_panel",
            { panelId: "PAmodern_transcript_view", params: getPanelParams },
          ]);
        }
        if (getTranscriptParams) {
          attempts.push(["get_transcript", { params: getTranscriptParams }]);
        }
        if (useDefaultFirst) {
          attempts.push([
            "get_panel",
            { panelId: "PAmodern_transcript_view", params: panelParamsFallback },
          ]);
        }

        for (const [ep, payload] of attempts) {
          try {
            const res = await postInnertube(ep, payload);
            if (res.rateLimited) return { json: null, rateLimited: true };
            if (res.json) {
              const txt = JSON.stringify(res.json);
              if (
                txt.includes("macroMarkersPanelItemViewModel") ||
                txt.includes("transcriptSegmentRenderer") ||
                txt.includes("cueGroupRenderer")
              ) {
                return { json: res.json, rateLimited: false };
              }
            }
          } catch {
            // try next endpoint
          }
        }
        return { json: null, rateLimited: false };
      },
    });
    const res = results?.[0]?.result;
    if (res?.rateLimited) {
      return { cues: [], rateLimited: true };
    }
    const cues = res?.json ? parseGetPanelTranscriptCues(res.json) : [];
    return { cues, rateLimited: false };
  } catch {
    return { cues: [], rateLimited: false };
  }
}

async function fetchViaGetPanelBackground(videoId, vssId = "") {
  try {
    const params = buildGetPanelParams(videoId, vssId);
    const res = await fetch("https://www.youtube.com/youtubei/v1/get_panel?prettyPrint=false", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20261125.00.00",
            hl: "en",
          },
        },
        panelId: "PAmodern_transcript_view",
        params,
      }),
    });
    if (res.status === 429) {
      return { cues: [], rateLimited: true };
    }
    if (!res.ok) return { cues: [], rateLimited: false };
    const json = await res.json();
    return { cues: parseGetPanelTranscriptCues(json), rateLimited: false };
  } catch {
    return { cues: [], rateLimited: false };
  }
}

async function resolveCuesForOneTrack({
  videoId,
  tabId,
  track,
  pot = "",
  sourceTier = "main",
  capturedTimedtext = [],
  capturedTranscript = null,
  domTranscriptCues = [],
}) {
  if (!track) {
    return { cues: [], rateLimited: false, updatedTracks: null };
  }

  let latestPot = pot;
  const isDefaultOrOriginal = Boolean(
    track.isActiveInPlayer || track.isDefaultCaption || track.isOriginalLang
  );

  // Tier 0a: Zero-network check of MAIN-world captured /api/timedtext responses
  const capturedCues = findCapturedTimedtextForTrack(capturedTimedtext, track);
  if (capturedCues.length > 0) {
    return { cues: capturedCues, rateLimited: false, updatedTracks: null, pot: latestPot };
  }

  // Tier 0b: Zero-network check of captured get_transcript/get_panel or open DOM transcript
  if (isDefaultOrOriginal) {
    if (capturedTranscript) {
      const trCues = parseGetPanelTranscriptCues(capturedTranscript);
      if (trCues.length > 0) {
        return { cues: trCues, rateLimited: false, updatedTracks: null, pot: latestPot };
      }
    }
    if (Array.isArray(domTranscriptCues) && domTranscriptCues.length > 0) {
      const finalized = finalizeCues(
        domTranscriptCues.map((c, idx, arr) => ({
          ...c,
          to:
            Number.isFinite(arr[idx + 1]?.from) && arr[idx + 1].from > c.from
              ? arr[idx + 1].from
              : c.from + 2,
        }))
      );
      if (finalized.length > 0) {
        return { cues: finalized, rateLimited: false, updatedTracks: null, pot: latestPot };
      }
    }
  }

  // Tier 1 (Most reliable & legitimate): Trigger YouTube's own player caption module
  // in MAIN world so BotGuard computes a genuine PO Token and our hook captures /api/timedtext.
  if (tabId && videoId) {
    const playerRes = await triggerPlayerCaptionLoadInMainWorld(tabId, videoId, track);
    if (playerRes.pot) latestPot = playerRes.pot;
    if (playerRes.cues.length > 0) {
      return { cues: playerRes.cues, rateLimited: false, updatedTracks: null, pot: latestPot };
    }
  }

  // Tier 2: Direct /api/timedtext in MAIN world if we now have a valid PO Token
  if (tabId && track.subtitleUrl && latestPot) {
    const mainRes = await fetchSingleTrackInMainWorld(tabId, track.subtitleUrl, latestPot);
    if (mainRes.rateLimited) {
      return { cues: [], rateLimited: true, updatedTracks: null, pot: latestPot };
    }
    if (mainRes.cues.length > 0) {
      return { cues: mainRes.cues, rateLimited: false, updatedTracks: null, pot: latestPot };
    }
  }

  // Tier 3: Same-origin MAIN-world Innertube transcript API (get_panel / get_transcript)
  // using real ytcfg context, visitorData, SAPISIDHASH, and engagementPanel params.
  const vssId =
    track.vssId ||
    (track.id && (track.id.startsWith(".") || track.id.startsWith("a.")) ? track.id : "");
  if (tabId && videoId) {
    const transcriptRes = await fetchTranscriptInMainWorld(
      tabId,
      videoId,
      vssId,
      isDefaultOrOriginal || !vssId
    );
    if (transcriptRes.rateLimited) {
      return { cues: [], rateLimited: true, updatedTracks: null, pot: latestPot };
    }
    if (transcriptRes.cues.length > 0) {
      return {
        cues: transcriptRes.cues,
        rateLimited: false,
        updatedTracks: null,
        pot: latestPot,
      };
    }
  }

  // Tier 4: Fallback when tabId is unavailable (or player had no pot)
  if (!tabId && videoId) {
    const bgPanelRes = await fetchViaGetPanelBackground(videoId, vssId);
    if (bgPanelRes.rateLimited) {
      return { cues: [], rateLimited: true, updatedTracks: null, pot: latestPot };
    }
    if (bgPanelRes.cues.length > 0) {
      return { cues: bgPanelRes.cues, rateLimited: false, updatedTracks: null, pot: latestPot };
    }
  }

  if (track.subtitleUrl) {
    if (sourceTier === "main" && tabId && !latestPot) {
      const mainRes = await fetchSingleTrackInMainWorld(tabId, track.subtitleUrl, "");
      if (mainRes.rateLimited) {
        return { cues: [], rateLimited: true, updatedTracks: null, pot: latestPot };
      }
      if (mainRes.cues.length > 0) {
        return { cues: mainRes.cues, rateLimited: false, updatedTracks: null, pot: latestPot };
      }
    } else if (!tabId) {
      const directRes = await fetchTimedtextBody(track.subtitleUrl, latestPot, "include");
      if (directRes.rateLimited) {
        return { cues: [], rateLimited: true, updatedTracks: null, pot: latestPot };
      }
      if (directRes.cues.length > 0) {
        return { cues: directRes.cues, rateLimited: false, updatedTracks: null, pot: latestPot };
      }
    }
  }

  return { cues: [], rateLimited: false, updatedTracks: null, pot: latestPot };
}

function buildSuccessPayload(videoId, videoTitle, tracks, { rateLimited = false } = {}) {
  const primaryTrack = tracks.find((t) => t.cues.length > 0) || tracks[0] || null;
  const anyHasCues = tracks.some((t) => t.cues.length > 0);
  return {
    ok: true,
    platform: "youtube",
    partial: !anyHasCues,
    rateLimited,
    reason: rateLimited && !anyHasCues ? "RATE_LIMITED" : undefined,
    videoId,
    bvid: videoId,
    videoTitle,
    trackCount: tracks.length,
    tracks,
    track: primaryTrack
      ? {
          id: primaryTrack.id,
          lan: primaryTrack.lan,
          lanDoc: primaryTrack.lanDoc,
          author: primaryTrack.author,
          subtitleUrl: primaryTrack.subtitleUrl,
        }
      : null,
    firstSubtitle: primaryTrack?.cues?.[0] || null,
    totalCues: primaryTrack?.totalCues || 0,
  };
}

function mergeFreshTrackUrls(existingTracks, freshTracks) {
  if (!Array.isArray(freshTracks) || freshTracks.length === 0) return existingTracks;
  const freshByKey = new Map(freshTracks.map((t) => [t.key, t]));
  return existingTracks.map((tr) => {
    const fresh = freshByKey.get(tr.key);
    if (!fresh) return tr;
    return {
      ...tr,
      subtitleUrl: fresh.subtitleUrl || tr.subtitleUrl,
    };
  });
}

async function fetchYouTubeSubtitlesInternal({
  videoId,
  tabId,
  targetLanguage = "",
  trackKey = "",
  forceRefresh = false,
}) {
  // Check in-memory cache first to avoid duplicate network requests
  if (!forceRefresh) {
    const cached = getCachedVideo(videoId);
    if (cached && Array.isArray(cached.tracks) && cached.tracks.length > 0) {
      const targetTrack = selectInitialYouTubeTrack(cached.tracks, { trackKey, targetLanguage });
      if (targetTrack && targetTrack.cuesLoaded && targetTrack.cues.length > 0) {
        return buildSuccessPayload(videoId, cached.videoTitle, cached.tracks);
      }
      if (targetTrack && !targetTrack.cuesLoaded) {
        const freshMeta = await extractMetaFromTabMainWorld(tabId, videoId);
        const res = await resolveCuesForOneTrack({
          videoId,
          tabId,
          track: targetTrack,
          pot: freshMeta?.pot || cached.pot,
          sourceTier: cached.sourceTier,
          capturedTimedtext: freshMeta?.capturedTimedtext || [],
          capturedTranscript: freshMeta?.capturedTranscript || null,
          domTranscriptCues: freshMeta?.domTranscriptCues || [],
        });
        let updated = mergeFreshTrackUrls(cached.tracks, res.updatedTracks);
        if (res.cues.length > 0) {
          const hitKey = res.matchedKey || targetTrack.key;
          updated = updated.map((tr) =>
            tr.key === hitKey || tr.key === targetTrack.key
              ? { ...tr, cues: res.cues, totalCues: res.cues.length, cuesLoaded: true }
              : tr
          );
          setCachedVideo(videoId, {
            ...cached,
            pot: res.pot || freshMeta?.pot || cached.pot,
            tracks: updated,
          });
          return buildSuccessPayload(videoId, cached.videoTitle, updated);
        }
        if (res.rateLimited) {
          return buildSuccessPayload(videoId, cached.videoTitle, updated, { rateLimited: true });
        }
      }
    }
  }

  let videoTitle = "";
  let tracks = [];
  let pot = "";
  let sourceTier = "main";
  let rateLimited = false;

  // Extract track metadata + any already-captured subtitles from active YouTube tab MAIN world
  const mainWorldMeta = await extractMetaFromTabMainWorld(tabId, videoId);
  if (mainWorldMeta) {
    videoTitle = mainWorldMeta.videoTitle || videoTitle;
    pot = mainWorldMeta.pot || "";
    if (Array.isArray(mainWorldMeta.rawTracks) && mainWorldMeta.rawTracks.length > 0) {
      tracks = normalizeYouTubeTracks(mainWorldMeta.rawTracks, {
        audioTracks: mainWorldMeta.audioTracks,
        defaultAudioTrackIndex: mainWorldMeta.defaultAudioTrackIndex,
        defaultAudioLanguage: mainWorldMeta.defaultAudioLanguage,
        activeTrack: mainWorldMeta.activeTrack,
        hasPlayer: mainWorldMeta.hasPlayer,
      });
      sourceTier = "main";
    }
  }

  // Fallback to Watch HTML metadata only when MAIN world didn't yield tracks (e.g. no tabId)
  if (tracks.length === 0 && !tabId) {
    const htmlData = await fetchViaWatchHtml(videoId);
    if (htmlData) {
      if (htmlData.rateLimited) {
        rateLimited = true;
      } else {
        if (htmlData.videoTitle && !videoTitle) videoTitle = htmlData.videoTitle;
        if (Array.isArray(htmlData.rawTracks) && htmlData.rawTracks.length > 0) {
          tracks = normalizeYouTubeTracks(htmlData.rawTracks, {
            audioTracks: htmlData.audioTracks,
            defaultAudioTrackIndex: htmlData.defaultAudioTrackIndex,
            defaultAudioLanguage: htmlData.defaultAudioLanguage,
            activeTrack: mainWorldMeta?.activeTrack || null,
          });
          sourceTier = "html";
        }
      }
    }
  }

  if (tracks.length === 0) {
    return {
      ok: false,
      platform: "youtube",
      rateLimited,
      reason: rateLimited ? "RATE_LIMITED" : "NO_SUBTITLE",
      videoId,
      bvid: videoId,
      videoTitle,
      trackCount: 0,
      tracks: [],
    };
  }

  // Fetch cues for ONLY the single best track initially
  const chosenTrack = selectInitialYouTubeTrack(tracks, { trackKey, targetLanguage });
  if (chosenTrack) {
    const cueRes = await resolveCuesForOneTrack({
      videoId,
      tabId,
      track: chosenTrack,
      pot,
      sourceTier,
      capturedTimedtext: mainWorldMeta?.capturedTimedtext || [],
      capturedTranscript: mainWorldMeta?.capturedTranscript || null,
      domTranscriptCues: mainWorldMeta?.domTranscriptCues || [],
    });
    if (cueRes.pot) pot = cueRes.pot;
    if (cueRes.rateLimited) {
      rateLimited = true;
    }
    tracks = mergeFreshTrackUrls(tracks, cueRes.updatedTracks);
    if (cueRes.cues.length > 0) {
      const hitKey = cueRes.matchedKey || chosenTrack.key;
      tracks = tracks.map((tr) =>
        tr.key === hitKey || tr.key === chosenTrack.key
          ? { ...tr, cues: cueRes.cues, totalCues: cueRes.cues.length, cuesLoaded: true }
          : tr
      );
    }
  }

  setCachedVideo(videoId, {
    videoTitle,
    tracks,
    pot,
    sourceTier,
  });

  return buildSuccessPayload(videoId, videoTitle, tracks, { rateLimited });
}

export async function fetchYouTubeSubtitles({
  pageUrl,
  tabId,
  targetLanguage = "",
  trackKey = "",
  forceRefresh = false,
} = {}) {
  const parsed = parseYouTubeVideoUrl(pageUrl);
  if (!parsed) {
    return { ok: false, platform: "youtube", reason: "NOT_YOUTUBE" };
  }
  if (!parsed.isVideoPage) {
    return { ok: false, platform: "youtube", reason: "NOT_YOUTUBE_VIDEO" };
  }

  const { videoId } = parsed;
  const dedupeKey = `${videoId}|${trackKey || ""}`;
  if (!forceRefresh && inFlightVideoFetches.has(dedupeKey)) {
    return inFlightVideoFetches.get(dedupeKey);
  }

  const promise = fetchYouTubeSubtitlesInternal({
    videoId,
    tabId,
    targetLanguage,
    trackKey,
    forceRefresh,
  }).finally(() => {
    if (inFlightVideoFetches.get(dedupeKey) === promise) {
      inFlightVideoFetches.delete(dedupeKey);
    }
  });

  if (!forceRefresh) {
    inFlightVideoFetches.set(dedupeKey, promise);
  }
  return promise;
}

export async function fetchYouTubeSingleTrack({
  pageUrl,
  tabId,
  trackKey = "",
  subtitleUrl = "",
} = {}) {
  const parsed = parseYouTubeVideoUrl(pageUrl);
  if (!parsed || !parsed.isVideoPage) {
    return { ok: false, platform: "youtube", reason: "NOT_YOUTUBE_VIDEO" };
  }

  const { videoId } = parsed;
  const cached = getCachedVideo(videoId);
  const existingTrack = cached?.tracks?.find((t) => t.key === trackKey || t.id === trackKey);
  if (existingTrack && existingTrack.cuesLoaded && existingTrack.cues.length > 0) {
    return { ok: true, platform: "youtube", track: existingTrack };
  }

  const targetTrack = existingTrack || {
    key: trackKey,
    id: trackKey,
    lan: "",
    subtitleUrl,
  };

  if (!targetTrack.subtitleUrl && !targetTrack.vssId && !targetTrack.lan) {
    return { ok: false, platform: "youtube", reason: "NO_SUBTITLE_URL" };
  }

  const freshMeta = await extractMetaFromTabMainWorld(tabId, videoId);
  const res = await resolveCuesForOneTrack({
    videoId,
    tabId,
    track: targetTrack,
    pot: freshMeta?.pot || cached?.pot || "",
    sourceTier: cached?.sourceTier || "main",
    capturedTimedtext: freshMeta?.capturedTimedtext || [],
    capturedTranscript: freshMeta?.capturedTranscript || null,
    domTranscriptCues: freshMeta?.domTranscriptCues || [],
  });

  if (res.rateLimited) {
    return { ok: false, platform: "youtube", rateLimited: true, reason: "RATE_LIMITED" };
  }

  if (res.cues.length === 0) {
    return { ok: false, platform: "youtube", reason: "EMPTY_TRACK" };
  }

  const updatedTrack = {
    ...targetTrack,
    cues: res.cues,
    totalCues: res.cues.length,
    cuesLoaded: true,
  };

  if (cached && Array.isArray(cached.tracks)) {
    const mergedTracks = mergeFreshTrackUrls(cached.tracks, res.updatedTracks).map((tr) =>
      tr.key === targetTrack.key ? updatedTrack : tr
    );
    setCachedVideo(videoId, {
      ...cached,
      pot: res.pot || freshMeta?.pot || cached.pot,
      tracks: mergedTracks,
      sourceTier: cached.sourceTier,
    });
  }

  return { ok: true, platform: "youtube", track: updatedTrack };
}
