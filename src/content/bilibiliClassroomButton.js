import { parseBilibiliVideoUrl } from "../shared/bilibiliSubtitle.js";
import { parseYouTubeVideoUrl } from "../shared/youtubeSubtitle.js";
import {
  normalizeSubtitleNavCues,
  findNavSubtitleIndex,
  computeTargetNavIndex,
  computeCueSeekTime,
} from "../shared/subtitleTimeline.js";
import { pickRecommendedStudyTrack } from "../shared/wordbook.js";
import { isolateBidiInline } from "../shared/textScript.js";
import { g2 as defaultOptions } from "../shared/constants/defaults.js";
import * as messaging from "../shared/messaging/index.js";

const WRAP_ID = "ndt-video-controls-wrap";
const BTN_ID = "ndt-video-classroom-btn";
const PREV_BTN_ID = "ndt-video-sub-prev";
const NEXT_BTN_ID = "ndt-video-sub-next";
const COUNTER_ID = "ndt-video-sub-counter";
const STYLE_ID = "ndt-video-classroom-btn-style";
const SUBTITLE_CACHE_LIMIT = 20;

const subtitleNavCache = new Map();

function setSubtitleCache(key, value) {
  if (!key) return;
  if (subtitleNavCache.has(key)) {
    subtitleNavCache.delete(key);
  }
  subtitleNavCache.set(key, value);
  while (subtitleNavCache.size > SUBTITLE_CACHE_LIMIT) {
    const oldestKey = subtitleNavCache.keys().next().value;
    subtitleNavCache.delete(oldestKey);
  }
}

function isYouTubeAdPlaying() {
  const player = document.getElementById("movie_player");
  if (!player) return false;
  return (
    player.classList.contains("ad-showing") ||
    player.classList.contains("ad-interrupting")
  );
}

function findBestVideoElement(platform = "") {
  if (platform === "youtube") {
    const ytMain =
      document.querySelector("#movie_player video.html5-main-video") ||
      document.querySelector("ytd-watch-flexy #movie_player video") ||
      document.querySelector("#shorts-player video.html5-main-video") ||
      document.querySelector(".html5-video-player:not(.ytp-miniplayer-ui) video.html5-main-video");
    if (ytMain) return ytMain;
  }
  const videos = Array.from(document.querySelectorAll("video"));
  if (videos.length === 0) return null;
  let best = videos[0];
  let bestScore = -1;
  for (const video of videos) {
    const rect = video.getBoundingClientRect();
    const area = Math.max(0, rect.width * rect.height);
    const score =
      (video.readyState > 0 ? 1e8 : 0) +
      (!video.paused ? 5e7 : 0) +
      area;
    if (score > bestScore) {
      bestScore = score;
      best = video;
    }
  }
  return best;
}

function isEditableEventTarget(event) {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
  for (const node of path) {
    if (!node || node.nodeType !== 1) continue;
    const tag = (node.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (node.isContentEditable) return true;
    const role = node.getAttribute?.("role");
    if (role === "textbox" || role === "searchbox" || role === "combobox") return true;
  }
  return false;
}

function getSubtitleHotkeyDirection(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return "";
  if (event.key === "<" || event.key === "《" || event.key === "," || event.key === "，") {
    return "prev";
  }
  if (event.key === ">" || event.key === "》" || event.key === "." || event.key === "。") {
    return "next";
  }
  if (event.key === "Process") {
    if (event.code === "Comma") return "prev";
    if (event.code === "Period") return "next";
  }
  return "";
}

function getVideoIdentity(isBiliHost, isYtHost, href) {
  if (isBiliHost) {
    const parsed = parseBilibiliVideoUrl(href);
    if (parsed?.isVideoPage) {
      return {
        platform: "bilibili",
        videoKey: `bili:${parsed.bvid || parsed.aid}:p${parsed.page}`,
      };
    }
  }
  if (isYtHost) {
    const parsed = parseYouTubeVideoUrl(href);
    if (parsed?.isVideoPage) {
      return {
        platform: "youtube",
        videoKey: `yt:${parsed.videoId}`,
      };
    }
  }
  return { platform: "", videoKey: "" };
}

function createArrowSvg(direction) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "19");
  svg.setAttribute("height", "19");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(ns, "path");
  path.setAttribute(
    "d",
    direction === "prev"
      ? "M16 10H4M4 10L9 5M4 10L9 15"
      : "M4 10H16M16 10L11 5M16 10L11 15"
  );
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2.1");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  return svg;
}

function ensureButtonStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
#${WRAP_ID} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  vertical-align: middle;
  user-select: none;
  overflow: visible !important;
  gap: 8px;
}

#${WRAP_ID}.ndt-bili-controls-wrap {
  height: 26px;
  margin-right: 10px;
}

#${WRAP_ID}.ndt-yt-controls-wrap {
  height: 100%;
  vertical-align: top;
  margin-right: 8px;
  gap: 6px;
  line-height: normal;
  font-family: "YouTube Noto", Roboto, Arial, Helvetica, sans-serif;
}

#${WRAP_ID}.ndt-yt-controls-wrap.ndt-yt-delhi-pill {
  height: 40px;
  align-self: center;
  margin: 0 8px 0 0;
  padding: 0 8px;
  gap: 4px;
  border-radius: 999px;
  background: rgba(28, 28, 28, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
}

#movie_player.ytp-big-mode #${WRAP_ID}.ndt-yt-controls-wrap.ndt-yt-delhi-pill {
  height: 48px;
  padding: 0 10px;
  gap: 6px;
}

#${WRAP_ID} .ndt-video-ctrl-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  vertical-align: middle;
  flex-shrink: 0;
  user-select: none;
  outline: none;
  overflow: visible !important;
  box-sizing: border-box;
}

#${COUNTER_ID} {
  height: 26px;
  min-width: 40px;
  padding: 0 6px;
  border-radius: 5px;
  color: rgba(255, 255, 255, 0.92);
  font-size: 13px;
  font-weight: 500;
  line-height: 26px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  transition: background-color 120ms ease, color 120ms ease, opacity 120ms ease;
}

#${WRAP_ID}.ndt-yt-controls-wrap #${COUNTER_ID} {
  height: 30px;
  line-height: 30px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 12.5px;
  text-shadow: none;
}

#movie_player.ytp-big-mode #${WRAP_ID}.ndt-yt-controls-wrap #${COUNTER_ID} {
  height: 34px;
  line-height: 34px;
  font-size: 14px;
  padding: 0 9px;
}

#${COUNTER_ID}:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

#${COUNTER_ID}.is-unavailable {
  color: rgba(255, 255, 255, 0.48);
}

#${PREV_BTN_ID},
#${NEXT_BTN_ID} {
  width: 28px;
  height: 26px;
  border-radius: 5px;
  color: rgba(255, 255, 255, 0.94);
  transition: background-color 120ms ease, color 120ms ease, transform 120ms ease, opacity 120ms ease;
}

#${WRAP_ID}.ndt-yt-controls-wrap #${PREV_BTN_ID},
#${WRAP_ID}.ndt-yt-controls-wrap #${NEXT_BTN_ID} {
  width: 30px;
  height: 30px;
  border-radius: 999px;
}

#movie_player.ytp-big-mode #${WRAP_ID}.ndt-yt-controls-wrap #${PREV_BTN_ID},
#movie_player.ytp-big-mode #${WRAP_ID}.ndt-yt-controls-wrap #${NEXT_BTN_ID} {
  width: 34px;
  height: 34px;
}

#${PREV_BTN_ID}:hover,
#${NEXT_BTN_ID}:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

#${PREV_BTN_ID}:active,
#${NEXT_BTN_ID}:active,
#${PREV_BTN_ID}.is-hotkey-active,
#${NEXT_BTN_ID}.is-hotkey-active {
  background: rgba(249, 115, 22, 0.42);
  color: #ffffff;
  transform: scale(0.92);
}

#${PREV_BTN_ID}.is-unavailable,
#${NEXT_BTN_ID}.is-unavailable {
  opacity: 0.42;
}

#${PREV_BTN_ID} svg,
#${NEXT_BTN_ID} svg {
  display: block;
  pointer-events: none;
}

#${BTN_ID}.ndt-bili-classroom-btn {
  width: 28px;
  height: 26px;
  margin-left: 2px;
}

#${BTN_ID}.ndt-yt-classroom-btn {
  width: 30px;
  height: 30px;
  margin-left: 2px;
  border-radius: 999px;
  vertical-align: middle;
}

#movie_player.ytp-big-mode #${BTN_ID}.ndt-yt-classroom-btn {
  width: 34px;
  height: 34px;
}

#${BTN_ID} .ndt-video-btn-inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 5px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
  transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease;
}

#${BTN_ID}.ndt-yt-classroom-btn .ndt-video-btn-inner {
  width: 26px;
  height: 26px;
  border-radius: 6px;
}

#${BTN_ID}:hover .ndt-video-btn-inner {
  transform: scale(1.1);
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.72), 0 2px 8px rgba(0, 0, 0, 0.55);
  filter: brightness(1.06);
}

#${BTN_ID}:active .ndt-video-btn-inner {
  transform: scale(0.96);
}

#${BTN_ID} img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  pointer-events: none;
}

#${WRAP_ID} .ndt-video-btn-tip {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  padding: 5px 10px;
  border-radius: 6px;
  background: rgba(18, 18, 22, 0.94);
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: opacity 140ms ease, transform 140ms ease;
  z-index: 99999;
}

#${WRAP_ID}.ndt-yt-controls-wrap .ndt-video-btn-tip {
  bottom: calc(100% + 12px);
  text-shadow: none;
}

#${WRAP_ID}.ndt-yt-controls-wrap #${BTN_ID} .ndt-video-btn-tip {
  bottom: calc(100% + 12px);
}

#${WRAP_ID} .ndt-video-ctrl-item:hover .ndt-video-btn-tip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
`;
  (document.head || document.documentElement).appendChild(style);
}

function findBilibiliControlTarget() {
  const controlRight =
    document.querySelector(".bpx-player-control-bottom-right") ||
    document.querySelector(".bilibili-player-video-control-bottom-right");
  if (!controlRight) return null;
  const anchor =
    controlRight.querySelector(":scope > .bpx-player-ctrl-quality") ||
    controlRight.querySelector(".bpx-player-ctrl-quality") ||
    controlRight.firstChild;
  return { container: controlRight, anchor };
}

function findYouTubeControlTarget() {
  const player =
    document.querySelector("#movie_player") ||
    document.querySelector("ytd-watch-flexy .html5-video-player") ||
    document.querySelector(".html5-video-player:not(.ytp-miniplayer-ui)");
  if (!player) return null;

  const chromeControls = player.querySelector(".ytp-chrome-controls");
  const controlRight = chromeControls?.querySelector(".ytp-right-controls") || player.querySelector(".ytp-right-controls");
  if (!controlRight) return null;

  // Modern YouTube ("ytp-delhi-modern") uses flex pill groups inside .ytp-chrome-controls
  // and nests .ytp-right-controls-left / .ytp-right-controls-right inside .ytp-right-controls.
  const isDelhiModern =
    player.classList.contains("ytp-delhi-modern") ||
    Boolean(controlRight.querySelector(".ytp-right-controls-left"));

  if (isDelhiModern && chromeControls && controlRight.parentElement === chromeControls) {
    return { container: chromeControls, anchor: controlRight, variant: "yt-delhi" };
  }

  // Classic / embedded YouTube: place right before CC or Settings inside .ytp-right-controls
  const anchor =
    controlRight.querySelector(":scope > .ytp-subtitles-button") ||
    controlRight.querySelector(":scope > .ytp-settings-button") ||
    controlRight.firstChild;

  return { container: controlRight, anchor, variant: "yt-classic" };
}

function removeInjectedControls() {
  const existingWrap = document.getElementById(WRAP_ID);
  if (existingWrap) existingWrap.remove();
  const legacyBtn = document.getElementById(BTN_ID);
  if (legacyBtn) legacyBtn.remove();
}

function createControlsGroup(platform, handlers) {
  const isYouTube = platform === "youtube";
  const wrap = document.createElement("div");
  wrap.id = WRAP_ID;
  wrap.dataset.platform = platform;
  wrap.className = isYouTube ? "ndt-yt-controls-wrap" : "ndt-bili-controls-wrap";
  wrap.setAttribute("data-hcfy-ignore", "1");

  // 1. Sentence counter (current / total) to the left of left-arrow button
  const counterEl = document.createElement(isYouTube ? "button" : "div");
  counterEl.id = COUNTER_ID;
  counterEl.className = "ndt-video-ctrl-item is-unavailable";
  if (isYouTube) {
    counterEl.type = "button";
  } else {
    counterEl.setAttribute("role", "button");
    counterEl.setAttribute("tabindex", "0");
  }
  counterEl.setAttribute("aria-label", "当前字幕句数");
  counterEl.setAttribute("data-hcfy-ignore", "1");

  const counterText = document.createElement("span");
  counterText.className = "ndt-video-sub-counter-text";
  counterText.textContent = "--/--";

  const counterTip = document.createElement("span");
  counterTip.className = "ndt-video-btn-tip";
  counterTip.textContent = "正在加载字幕...";

  counterEl.appendChild(counterText);
  counterEl.appendChild(counterTip);

  const onCounterActivate = (event) => {
    event.preventDefault();
    event.stopPropagation();
    counterEl.blur?.();
    handlers.onCounterClick?.();
  };
  counterEl.addEventListener("click", onCounterActivate);
  if (!isYouTube) {
    counterEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        onCounterActivate(event);
      }
    });
  }

  // 2. Left / Right arrow buttons
  const makeNavButton = (direction) => {
    const isPrev = direction === "prev";
    const btn = document.createElement(isYouTube ? "button" : "div");
    btn.id = isPrev ? PREV_BTN_ID : NEXT_BTN_ID;
    btn.className = "ndt-video-ctrl-item is-unavailable";
    if (isYouTube) {
      btn.type = "button";
    } else {
      btn.setAttribute("role", "button");
      btn.setAttribute("tabindex", "0");
    }
    btn.setAttribute("aria-label", isPrev ? "上一句 (快捷键 <)" : "下一句 (快捷键 >)");
    btn.setAttribute("data-hcfy-ignore", "1");

    btn.appendChild(createArrowSvg(direction));

    const tip = document.createElement("span");
    tip.className = "ndt-video-btn-tip";
    tip.textContent = isPrev ? "上一句 (快捷键 <)" : "下一句 (快捷键 >)";
    btn.appendChild(tip);

    const onNavActivate = (event) => {
      event.preventDefault();
      event.stopPropagation();
      btn.blur?.();
      handlers.onStep?.(direction);
    };
    btn.addEventListener("click", onNavActivate);
    if (!isYouTube) {
      btn.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          onNavActivate(event);
        }
      });
    }

    return { btn, tip };
  };

  const prevNav = makeNavButton("prev");
  const nextNav = makeNavButton("next");

  // 3. Existing Language Classroom button (rightmost in our group)
  const classroomBtn = document.createElement(isYouTube ? "button" : "div");
  classroomBtn.id = BTN_ID;
  classroomBtn.dataset.platform = platform;
  if (isYouTube) {
    classroomBtn.type = "button";
    classroomBtn.className = "ndt-video-ctrl-item ndt-yt-classroom-btn";
  } else {
    classroomBtn.className = "bpx-player-ctrl-btn ndt-video-ctrl-item ndt-bili-classroom-btn";
    classroomBtn.setAttribute("role", "button");
    classroomBtn.setAttribute("tabindex", "0");
  }
  classroomBtn.setAttribute("aria-label", "语言课堂");
  classroomBtn.setAttribute("data-hcfy-ignore", "1");

  const inner = document.createElement("span");
  inner.className = "ndt-video-btn-inner";

  const img = document.createElement("img");
  img.src = chrome.runtime.getURL("icons/icon48.png");
  img.alt = "语言课堂";
  inner.appendChild(img);

  const classroomTip = document.createElement("span");
  classroomTip.className = "ndt-video-btn-tip";
  classroomTip.textContent = "语言课堂 · 课前难词预习";

  classroomBtn.appendChild(inner);
  classroomBtn.appendChild(classroomTip);

  const triggerClassroom = (event) => {
    event.preventDefault();
    event.stopPropagation();
    classroomBtn.blur?.();
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    handlers.onOpenClassroom?.();
  };

  classroomBtn.addEventListener("click", triggerClassroom);
  if (!isYouTube) {
    classroomBtn.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        triggerClassroom(event);
      }
    });
  }

  wrap.appendChild(counterEl);
  wrap.appendChild(prevNav.btn);
  wrap.appendChild(nextNav.btn);
  wrap.appendChild(classroomBtn);

  return {
    wrap,
    counterEl,
    counterText,
    counterTip,
    prevBtn: prevNav.btn,
    prevTip: prevNav.tip,
    nextBtn: nextNav.btn,
    nextTip: nextNav.tip,
    classroomBtn,
  };
}

async function resolveTargetLanguage() {
  try {
    const res = await chrome.storage.local.get({
      pageTrsDest: defaultOptions.pageTrsDest,
      destination: defaultOptions.destination,
    });
    return res?.pageTrsDest?.[0] || res?.destination || "中文(简体)";
  } catch {
    return "中文(简体)";
  }
}

export function mountVideoClassroomButton(onOpenClassroom, options = {}) {
  const host = window.location.hostname.toLowerCase();
  const bilibiliEnabled = options?.bilibiliEnabled !== false;
  const youtubeEnabled = options?.youtubeEnabled !== false;
  const isBiliHost =
    bilibiliEnabled && (host === "bilibili.com" || host.endsWith(".bilibili.com"));
  const isYtHost =
    youtubeEnabled && (host === "youtube.com" || host.endsWith(".youtube.com"));
  if (!isBiliHost && !isYtHost) {
    removeInjectedControls();
    return () => {};
  }

  const isModalOpen = typeof options?.isModalOpen === "function" ? options.isModalOpen : () => false;

  let destroyed = false;
  let activePlatform = "";
  let activeVideoKey = "";
  let uiRefs = null;
  let boundVideo = null;
  let fetchSeq = 0;
  let retryTimer = null;
  let hotkeyFlashTimers = { prev: null, next: null };

  let subState = {
    status: "idle", // "idle" | "loading" | "ready" | "empty"
    reason: "",
    trackLabel: "",
    cues: [],
  };

  // Tracks rapid consecutive clicks/hotkeys while <video> is still seeking/buffering
  let pendingSeek = null; // { index, targetTime, expiresAt }
  let lastRenderedKey = "";

  const clearRetryTimer = () => {
    if (retryTimer) {
      window.clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const flashButton = (direction) => {
    if (!uiRefs) return;
    const btn = direction === "prev" ? uiRefs.prevBtn : uiRefs.nextBtn;
    if (!btn) return;
    btn.classList.add("is-hotkey-active");
    if (hotkeyFlashTimers[direction]) {
      window.clearTimeout(hotkeyFlashTimers[direction]);
    }
    hotkeyFlashTimers[direction] = window.setTimeout(() => {
      btn.classList.remove("is-hotkey-active");
      hotkeyFlashTimers[direction] = null;
    }, 180);
  };

  const getCurrentNavState = () => {
    const { cues } = subState;
    if (!Array.isArray(cues) || cues.length === 0) {
      return { index: -1, currentTime: 0 };
    }
    if (activePlatform === "youtube" && isYouTubeAdPlaying()) {
      return { index: -1, currentTime: 0 };
    }
    const now = Date.now();
    const video = boundVideo || findBestVideoElement(activePlatform);
    if (pendingSeek) {
      if (now <= pendingSeek.expiresAt) {
        return { index: pendingSeek.index, currentTime: pendingSeek.targetTime };
      }
      pendingSeek = null;
    }
    const currentTime = video && Number.isFinite(video.currentTime) ? video.currentTime : 0;
    return {
      index: findNavSubtitleIndex(cues, currentTime),
      currentTime,
    };
  };

  const renderNavUi = () => {
    if (!uiRefs) return;
    const { cues, status, reason, trackLabel } = subState;
    const total = cues.length;
    const idx = total > 0 ? getCurrentNavState().index : -1;
    const displayCurrent = idx >= 0 ? idx + 1 : 0;

    const renderKey = `${status}|${reason}|${trackLabel}|${displayCurrent}|${total}`;
    if (renderKey === lastRenderedKey) return;
    lastRenderedKey = renderKey;

    if (total > 0) {
      uiRefs.counterText.textContent = `${displayCurrent}/${total}`;
      uiRefs.counterEl.classList.remove("is-unavailable");
      uiRefs.prevBtn.classList.remove("is-unavailable");
      uiRefs.nextBtn.classList.remove("is-unavailable");

      const trackPrefix = trackLabel ? `${isolateBidiInline(trackLabel)} · ` : "";
      uiRefs.counterTip.textContent =
        displayCurrent > 0
          ? `${trackPrefix}第 ${displayCurrent}/${total} 句 · 点击重听本句`
          : `${trackPrefix}共 ${total} 句 · 按 > 跳到第 1 句`;
      uiRefs.prevTip.textContent = "上一句 (快捷键 <)";
      uiRefs.nextTip.textContent = "下一句 (快捷键 >)";
      return;
    }

    uiRefs.counterEl.classList.add("is-unavailable");
    uiRefs.prevBtn.classList.add("is-unavailable");
    uiRefs.nextBtn.classList.add("is-unavailable");

    if (status === "loading") {
      uiRefs.counterText.textContent = "...";
      uiRefs.counterTip.textContent = "正在加载字幕...";
      uiRefs.prevTip.textContent = "上一句 (快捷键 <) · 字幕加载中";
      uiRefs.nextTip.textContent = "下一句 (快捷键 >) · 字幕加载中";
    } else if (reason === "NEED_LOGIN") {
      uiRefs.counterText.textContent = "0/0";
      uiRefs.counterTip.textContent = "登录 B 站后可加载字幕 · 点击重试";
      uiRefs.prevTip.textContent = "上一句 (快捷键 <) · 需登录加载字幕";
      uiRefs.nextTip.textContent = "下一句 (快捷键 >) · 需登录加载字幕";
    } else if (reason === "RATE_LIMITED") {
      uiRefs.counterText.textContent = "0/0";
      uiRefs.counterTip.textContent = "YouTube 字幕请求受限，请稍后点击重试";
      uiRefs.prevTip.textContent = "上一句 (快捷键 <) · 请求受限，请稍后重试";
      uiRefs.nextTip.textContent = "下一句 (快捷键 >) · 请求受限，请稍后重试";
    } else {
      uiRefs.counterText.textContent = "0/0";
      uiRefs.counterTip.textContent = "当前视频暂无可用字幕 · 点击重试";
      uiRefs.prevTip.textContent = "上一句 (快捷键 <) · 暂无可用字幕";
      uiRefs.nextTip.textContent = "下一句 (快捷键 >) · 暂无可用字幕";
    }
  };

  const loadSubtitlesForVideo = async (videoKey, { attempt = 0, force = false } = {}) => {
    if (destroyed || !videoKey || videoKey !== activeVideoKey) return;
    clearRetryTimer();

    if (!force && subtitleNavCache.has(videoKey)) {
      const cached = subtitleNavCache.get(videoKey);
      subState = { ...cached };
      lastRenderedKey = "";
      renderNavUi();
      return;
    }

    const seq = ++fetchSeq;
    const pageUrl = window.location.href;
    if (attempt === 0 || force) {
      subState = {
        status: "loading",
        reason: "",
        trackLabel: "",
        cues: [],
      };
      lastRenderedKey = "";
      renderNavUi();
    }

    try {
      const targetLanguage = await resolveTargetLanguage();
      const res = await messaging._({
        action: "fetch video subtitles",
        pageUrl,
        targetLanguage,
        forceRefresh: Boolean(force),
      });
      if (destroyed || seq !== fetchSeq || videoKey !== activeVideoKey) return;

      const tracks = Array.isArray(res?.tracks) ? res.tracks : [];
      const chosenTrack = pickRecommendedStudyTrack(tracks, targetLanguage);
      const cues = normalizeSubtitleNavCues(chosenTrack?.cues || []);

      if (cues.length > 0) {
        const readyState = {
          status: "ready",
          reason: "",
          trackLabel: chosenTrack?.lanDoc || chosenTrack?.lan || "",
          cues,
        };
        setSubtitleCache(videoKey, readyState);
        subState = readyState;
        lastRenderedKey = "";
        renderNavUi();
        return;
      }

      const reason =
        res?.rateLimited || res?.reason === "RATE_LIMITED"
          ? "RATE_LIMITED"
          : res?.needLoginSubtitle || res?.reason === "NEED_LOGIN"
            ? "NEED_LOGIN"
            : res?.reason || "NO_SUBTITLE";

      // Retry briefly on fresh page load / SPA transition, but never hammer when rate-limited or login-gated
      if (attempt < 2 && reason !== "NEED_LOGIN" && reason !== "RATE_LIMITED") {
        const delay = attempt === 0 ? 1500 : 3000;
        retryTimer = window.setTimeout(() => {
          loadSubtitlesForVideo(videoKey, { attempt: attempt + 1, force: true });
        }, delay);
      }

      const emptyState = {
        status: "empty",
        reason,
        trackLabel: "",
        cues: [],
      };
      if (attempt >= 2 || reason === "NEED_LOGIN" || reason === "RATE_LIMITED") {
        setSubtitleCache(videoKey, emptyState);
      }
      subState = emptyState;
      lastRenderedKey = "";
      renderNavUi();
    } catch {
      if (destroyed || seq !== fetchSeq || videoKey !== activeVideoKey) return;
      if (attempt < 2) {
        const delay = attempt === 0 ? 1500 : 3000;
        retryTimer = window.setTimeout(() => {
          loadSubtitlesForVideo(videoKey, { attempt: attempt + 1, force: true });
        }, delay);
      }
      subState = {
        status: "empty",
        reason: "ERROR",
        trackLabel: "",
        cues: [],
      };
      lastRenderedKey = "";
      renderNavUi();
    }
  };

  const stepSentence = (direction, { fromHotkey = false } = {}) => {
    const { cues } = subState;
    if (!Array.isArray(cues) || cues.length === 0) {
      if (!fromHotkey && activeVideoKey && subState.status !== "loading") {
        loadSubtitlesForVideo(activeVideoKey, { attempt: 0, force: true });
      }
      return false;
    }

    if (activePlatform === "youtube" && isYouTubeAdPlaying()) {
      return false;
    }

    const video = boundVideo || findBestVideoElement(activePlatform);
    if (!video) return false;

    const { index: currentIdx, currentTime } = getCurrentNavState();
    const targetIdx = computeTargetNavIndex(cues, currentIdx, direction, currentTime);
    if (targetIdx < 0 || targetIdx >= cues.length) return false;

    const targetCue = cues[targetIdx];
    const targetTime = computeCueSeekTime(targetCue);

    pendingSeek = {
      index: targetIdx,
      targetTime,
      expiresAt: Date.now() + 900,
    };

    try {
      video.currentTime = targetTime;
    } catch {
      return false;
    }

    if (fromHotkey && (direction === "prev" || direction === "next")) {
      flashButton(direction);
    }

    lastRenderedKey = "";
    renderNavUi();
    return true;
  };

  const handleCounterClick = () => {
    if (subState.cues.length === 0) {
      if (activeVideoKey && subState.status !== "loading") {
        loadSubtitlesForVideo(activeVideoKey, { attempt: 0, force: true });
      }
      return;
    }
    stepSentence("current");
  };

  const onVideoTimeUpdate = () => {
    if (destroyed) return;
    if (pendingSeek && boundVideo && Number.isFinite(boundVideo.currentTime)) {
      if (
        Date.now() > pendingSeek.expiresAt ||
        Math.abs(boundVideo.currentTime - pendingSeek.targetTime) <= 0.25
      ) {
        pendingSeek = null;
      }
    }
    renderNavUi();
  };

  const onVideoSeeked = () => {
    if (destroyed) return;
    if (pendingSeek && boundVideo && Number.isFinite(boundVideo.currentTime)) {
      if (Math.abs(boundVideo.currentTime - pendingSeek.targetTime) <= 0.6) {
        pendingSeek = null;
      }
    }
    renderNavUi();
  };

  const detachVideoListeners = () => {
    if (!boundVideo) return;
    boundVideo.removeEventListener("timeupdate", onVideoTimeUpdate);
    boundVideo.removeEventListener("seeked", onVideoSeeked);
    boundVideo.removeEventListener("playing", onVideoTimeUpdate);
    boundVideo.removeEventListener("loadedmetadata", onVideoTimeUpdate);
    boundVideo = null;
  };

  const syncBoundVideo = () => {
    const candidate = findBestVideoElement(activePlatform);
    if (candidate === boundVideo) return;
    detachVideoListeners();
    boundVideo = candidate;
    if (boundVideo) {
      boundVideo.addEventListener("timeupdate", onVideoTimeUpdate);
      boundVideo.addEventListener("seeked", onVideoSeeked);
      boundVideo.addEventListener("playing", onVideoTimeUpdate);
      boundVideo.addEventListener("loadedmetadata", onVideoTimeUpdate);
    }
  };

  const onKeyDown = (event) => {
    if (destroyed || !activePlatform) return;
    if (isModalOpen()) return;
    const direction = getSubtitleHotkeyDirection(event);
    if (!direction) return;
    if (isEditableEventTarget(event)) return;
    if (subState.cues.length === 0) return;

    const handled = stepSentence(direction, { fromHotkey: true });
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  };

  const syncButton = () => {
    if (destroyed) return;

    const { platform, videoKey } = getVideoIdentity(isBiliHost, isYtHost, window.location.href);

    if (!platform || !videoKey) {
      activePlatform = "";
      if (activeVideoKey) {
        activeVideoKey = "";
        clearRetryTimer();
        pendingSeek = null;
        subState = { status: "idle", reason: "", trackLabel: "", cues: [] };
        lastRenderedKey = "";
      }
      detachVideoListeners();
      removeInjectedControls();
      uiRefs = null;
      return;
    }

    activePlatform = platform;

    if (videoKey !== activeVideoKey) {
      activeVideoKey = videoKey;
      pendingSeek = null;
      lastRenderedKey = "";
      loadSubtitlesForVideo(videoKey, { attempt: 0, force: false });
    }

    syncBoundVideo();

    const target =
      platform === "youtube" ? findYouTubeControlTarget() : findBilibiliControlTarget();
    if (!target || !target.container) return;

    ensureButtonStyle();

    let wrap = document.getElementById(WRAP_ID);
    if (wrap && (wrap.dataset.platform !== platform || !uiRefs || uiRefs.wrap !== wrap)) {
      wrap.remove();
      wrap = null;
      uiRefs = null;
    }
    if (!wrap) {
      uiRefs = createControlsGroup(platform, {
        onOpenClassroom,
        onStep: (direction) => stepSentence(direction, { fromHotkey: false }),
        onCounterClick: handleCounterClick,
      });
      wrap = uiRefs.wrap;
      lastRenderedKey = "";
    }

    const { container, anchor, variant } = target;
    if (platform === "youtube") {
      wrap.classList.toggle("ndt-yt-delhi-pill", variant === "yt-delhi");
      wrap.classList.toggle("ndt-yt-classic-wrap", variant !== "yt-delhi");
    }
    const validAnchor = anchor && anchor.parentElement === container ? anchor : null;

    if (wrap.parentElement !== container) {
      if (validAnchor) {
        container.insertBefore(wrap, validAnchor);
      } else {
        container.insertBefore(wrap, container.firstChild);
      }
    } else if (validAnchor && wrap.nextElementSibling !== validAnchor) {
      container.insertBefore(wrap, validAnchor);
    }

    renderNavUi();
  };

  syncButton();

  let rafPending = false;
  const scheduleSync = () => {
    if (destroyed || rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      syncButton();
    });
  };

  const observer = new MutationObserver(scheduleSync);
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        if (!destroyed && document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
          syncButton();
        }
      },
      { once: true }
    );
  }

  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("popstate", scheduleSync);
  window.addEventListener("hashchange", scheduleSync);
  window.addEventListener("yt-navigate-finish", scheduleSync);
  window.addEventListener("yt-page-data-updated", scheduleSync);
  const pollTimer = window.setInterval(syncButton, 1000);

  return () => {
    destroyed = true;
    clearRetryTimer();
    if (hotkeyFlashTimers.prev) window.clearTimeout(hotkeyFlashTimers.prev);
    if (hotkeyFlashTimers.next) window.clearTimeout(hotkeyFlashTimers.next);
    observer.disconnect();
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("popstate", scheduleSync);
    window.removeEventListener("hashchange", scheduleSync);
    window.removeEventListener("yt-navigate-finish", scheduleSync);
    window.removeEventListener("yt-page-data-updated", scheduleSync);
    window.clearInterval(pollTimer);
    detachVideoListeners();
    removeInjectedControls();
    uiRefs = null;
  };
}

export { mountVideoClassroomButton as mountBilibiliClassroomButton };
