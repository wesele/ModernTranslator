import { pickRecommendedStudyTrack } from "./wordbook.js";
import { t } from "./i18n/index.js";

const YOUTUBE_CACHE_LIMIT = 20;
const YOUTUBE_CACHE_TTL_MS = 15 * 60 * 1000;
const youtubeVideoCache = new Map();

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
  const base = String(
    simple || runs || rawTrack?.languageCode || t("subtitle.trackNumber", { n: index + 1 })
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
    if (!raw || !raw.baseUrl) continue;
    const lan = String(raw.languageCode || "").trim();
    const isAuto = raw.kind === "asr";
    const id = String(raw.vssId || `${lan}${isAuto ? ".asr" : ""}-${i}`);
    if (seen.has(id)) continue;
    seen.add(id);

    const isDefaultCaption = Number.isInteger(defaultCaptionIdx) && i === defaultCaptionIdx;
    const isOriginalLang = Boolean(originalLang && baseLangCode(lan) === originalLang);
    const isActiveInPlayer = trackMatchesActive(raw, meta.activeTrack);

    list.push({
      key: id,
      id,
      vssId: String(raw.vssId || ""),
      lan,
      lanDoc: getTrackDisplayName(raw, i),
      author: isAuto ? "YouTube ASR" : "",
      isAutoGenerated: isAuto,
      isOriginalLang,
      isDefaultCaption,
      isActiveInPlayer,
      hasSubtitleUrl: true,
      cuesLoaded: false,
      subtitleUrl: raw.baseUrl,
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

async function extractMetaFromTabMainWorld(tabId, expectedVideoId) {
  const extApi = typeof browser !== "undefined" ? browser : typeof chrome !== "undefined" ? chrome : null;
  if (!tabId || !extApi?.scripting?.executeScript) return null;
  try {
    const results = await extApi.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [expectedVideoId],
      func: (vid) => {
        try {
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
          if (!pr && window.ytInitialPlayerResponse?.videoDetails?.videoId === vid) {
            pr = window.ytInitialPlayerResponse;
          }

          let activeTrack = null;
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
            }
          } catch {
            // ignore caption module query errors
          }

          let pot = "";
          let activeTimedtextUrl = "";
          try {
            const entries = performance.getEntriesByType("resource") || [];
            for (let i = entries.length - 1; i >= 0; i -= 1) {
              const name = entries[i]?.name || "";
              if (name.includes("/api/timedtext") && name.includes(vid)) {
                if (!activeTimedtextUrl) activeTimedtextUrl = name;
                const u = new URL(name);
                const foundPot = u.searchParams.get("pot");
                if (foundPot) {
                  pot = foundPot;
                  break;
                }
              }
            }
          } catch {
            // ignore performance API errors
          }

          const renderer = pr?.captions?.playerCaptionsTracklistRenderer || null;
          const rawTracks = Array.isArray(renderer?.captionTracks) ? renderer.captionTracks : [];
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
            hasPlayerResponse: Boolean(pr),
            rawTracks,
            audioTracks,
            defaultAudioTrackIndex,
            defaultAudioLanguage,
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

async function fetchSingleTrackInMainWorld(tabId, baseUrl, pot = "") {
  const extApi = typeof browser !== "undefined" ? browser : typeof chrome !== "undefined" ? chrome : null;
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

const INNERTUBE_CLIENTS = [
  {
    clientName: "ANDROID",
    clientVersion: "20.10.38",
    androidSdkVersion: 34,
    hl: "en",
  },
  {
    clientName: "IOS",
    clientVersion: "20.10.4",
    deviceMake: "Apple",
    deviceModel: "iPhone16,2",
    hl: "en",
  },
];

async function fetchViaInnertube(videoId, clientConfig) {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context: {
          client: clientConfig,
        },
        videoId,
      }),
    });
    if (res.status === 429) {
      return { rateLimited: true, videoTitle: "", rawTracks: [] };
    }
    if (!res.ok) return null;
    const json = await res.json();
    const renderer = json?.captions?.playerCaptionsTracklistRenderer || null;
    const rawTracks = Array.isArray(renderer?.captionTracks) ? renderer.captionTracks : [];
    const videoTitle = json?.videoDetails?.title || "";
    return {
      rateLimited: false,
      videoTitle,
      rawTracks,
      audioTracks: Array.isArray(renderer?.audioTracks) ? renderer.audioTracks : [],
      defaultAudioTrackIndex: renderer?.defaultAudioTrackIndex,
      defaultAudioLanguage:
        json?.microformat?.playerMicroformatRenderer?.defaultAudioLanguage ||
        json?.videoDetails?.defaultAudioLanguage ||
        "",
    };
  } catch {
    return null;
  }
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

  // Fallback recursive walk in case YouTube changes the section wrapper nesting
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
          (Array.isArray(seg.snippet?.runs) ? seg.snippet.runs.map((r) => r?.text || "").join("") : "")
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

async function fetchViaGetPanel(videoId, vssId = "") {
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
}) {
  if (!track) {
    return { cues: [], rateLimited: false, updatedTracks: null };
  }

  // Primary: YouTube's modern transcript panel API (/youtubei/v1/get_panel)
  // Does not hit /api/timedtext, requires no PO token, and avoids timedtext 429 rate-limits.
  const vssId = track.vssId || (track.id && (track.id.startsWith(".") || track.id.startsWith("a.")) ? track.id : "");
  if (videoId) {
    const panelRes = await fetchViaGetPanel(videoId, vssId);
    if (panelRes.cues.length > 0) {
      return { cues: panelRes.cues, rateLimited: false, updatedTracks: null };
    }
    if (vssId && (track.isOriginalLang || track.isDefaultCaption)) {
      const defaultPanelRes = await fetchViaGetPanel(videoId, "");
      if (defaultPanelRes.cues.length > 0) {
        return { cues: defaultPanelRes.cues, rateLimited: false, updatedTracks: null };
      }
    }
  }

  if (!track.subtitleUrl) {
    return { cues: [], rateLimited: false, updatedTracks: null };
  }

  // Fallback 1: If this track URL came from MAIN world, try MAIN world fetch (1 request)
  if (sourceTier === "main" && tabId) {
    const mainRes = await fetchSingleTrackInMainWorld(tabId, track.subtitleUrl, pot);
    if (mainRes.rateLimited) {
      return { cues: [], rateLimited: true, updatedTracks: null };
    }
    if (mainRes.cues.length > 0) {
      return { cues: mainRes.cues, rateLimited: false, updatedTracks: null };
    }
  } else {
    const directRes = await fetchTimedtextBody(
      track.subtitleUrl,
      pot,
      sourceTier === "innertube" ? "omit" : "include"
    );
    if (directRes.rateLimited) {
      return { cues: [], rateLimited: true, updatedTracks: null };
    }
    if (directRes.cues.length > 0) {
      return { cues: directRes.cues, rateLimited: false, updatedTracks: null };
    }
  }

  // Fallback 2: fetch fresh non-POT track URL via ANDROID / IOS Innertube (only for this 1 track!)
  for (const clientCfg of INNERTUBE_CLIENTS) {
    const itData = await fetchViaInnertube(videoId, clientCfg);
    if (!itData) continue;
    if (itData.rateLimited) {
      return { cues: [], rateLimited: true, updatedTracks: null };
    }
    if (Array.isArray(itData.rawTracks) && itData.rawTracks.length > 0) {
      const freshTracks = normalizeYouTubeTracks(itData.rawTracks, itData);
      const matched =
        freshTracks.find((t) => t.key === track.key || t.id === track.id) ||
        freshTracks.find(
          (t) => t.lan === track.lan && Boolean(t.isAutoGenerated) === Boolean(track.isAutoGenerated)
        ) ||
        freshTracks.find((t) => t.lan === track.lan) ||
        freshTracks[0];

      if (matched?.subtitleUrl) {
        const bodyRes = await fetchTimedtextBody(matched.subtitleUrl, "", "omit");
        if (bodyRes.rateLimited) {
          return { cues: [], rateLimited: true, updatedTracks: freshTracks };
        }
        if (bodyRes.cues.length > 0) {
          return {
            cues: bodyRes.cues,
            rateLimited: false,
            updatedTracks: freshTracks,
            matchedKey: matched.key,
          };
        }
      }
    }
  }

  return { cues: [], rateLimited: false, updatedTracks: null };
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

  // Check in-memory cache first to avoid duplicate network requests between nav bar, classroom, and subtitle panel
  if (!forceRefresh) {
    const cached = getCachedVideo(videoId);
    if (cached && Array.isArray(cached.tracks) && cached.tracks.length > 0) {
      const targetTrack = selectInitialYouTubeTrack(cached.tracks, { trackKey, targetLanguage });
      if (targetTrack && targetTrack.cuesLoaded && targetTrack.cues.length > 0) {
        return buildSuccessPayload(videoId, cached.videoTitle, cached.tracks);
      }
      if (targetTrack && !targetTrack.cuesLoaded) {
        const res = await resolveCuesForOneTrack({
          videoId,
          tabId,
          track: targetTrack,
          pot: cached.pot,
          sourceTier: cached.sourceTier,
        });
        let updated = mergeFreshTrackUrls(cached.tracks, res.updatedTracks);
        if (res.cues.length > 0) {
          const hitKey = res.matchedKey || targetTrack.key;
          updated = updated.map((tr) =>
            tr.key === hitKey || tr.key === targetTrack.key
              ? { ...tr, cues: res.cues, totalCues: res.cues.length, cuesLoaded: true }
              : tr
          );
          setCachedVideo(videoId, { ...cached, tracks: updated });
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

  // Tier 1: Extract track metadata (0 timedtext requests) from active YouTube tab MAIN world
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
      });
      sourceTier = "main";
    }
  }

  // Tier 2: If MAIN world didn't yield tracks, query Innertube player metadata
  if (tracks.length === 0) {
    for (const clientCfg of INNERTUBE_CLIENTS) {
      const itData = await fetchViaInnertube(videoId, clientCfg);
      if (!itData) continue;
      if (itData.rateLimited) {
        rateLimited = true;
        break;
      }
      if (itData.videoTitle && !videoTitle) videoTitle = itData.videoTitle;
      if (Array.isArray(itData.rawTracks) && itData.rawTracks.length > 0) {
        tracks = normalizeYouTubeTracks(itData.rawTracks, {
          audioTracks: itData.audioTracks,
          defaultAudioTrackIndex: itData.defaultAudioTrackIndex,
          defaultAudioLanguage: itData.defaultAudioLanguage,
          activeTrack: mainWorldMeta?.activeTrack || null,
        });
        sourceTier = "innertube";
        break;
      }
    }
  }

  // Tier 3: Fallback to Watch HTML metadata (only if not rate-limited)
  if (tracks.length === 0 && !rateLimited) {
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

  // Fetch cues for ONLY the single best track initially (1 request, never 40+ parallel requests!)
  const chosenTrack = selectInitialYouTubeTrack(tracks, { trackKey, targetLanguage });
  if (chosenTrack) {
    const cueRes = await resolveCuesForOneTrack({
      videoId,
      tabId,
      track: chosenTrack,
      pot,
      sourceTier,
    });
    if (cueRes.rateLimited) {
      rateLimited = true;
    }
    tracks = mergeFreshTrackUrls(tracks, cueRes.updatedTracks);
    if (cueRes.updatedTracks) {
      sourceTier = "innertube";
    }
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

  if (!targetTrack.subtitleUrl) {
    return { ok: false, platform: "youtube", reason: "NO_SUBTITLE_URL" };
  }

  const res = await resolveCuesForOneTrack({
    videoId,
    tabId,
    track: targetTrack,
    pot: cached?.pot || "",
    sourceTier: cached?.sourceTier || "main",
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
      tracks: mergedTracks,
      sourceTier: res.updatedTracks ? "innertube" : cached.sourceTier,
    });
  }

  return { ok: true, platform: "youtube", track: updatedTrack };
}
