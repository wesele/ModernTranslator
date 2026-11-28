import * as React from "react";
import pick from "lodash/pick";
import * as messaging from "../shared/messaging/index.js";
import { A as useStorage } from "../shared/hooks/useStorage.js";
import { g2 as defaultOptions } from "../shared/constants/defaults.js";
import { OFFICIAL_LLM_ID, isCustomOpenAIServiceId } from "../shared/openaiUtils.js";
import { formatSubtitleTime } from "../shared/subtitleTimeline.js";
import { planSubtitleSections } from "../shared/classroomSections.js";
import { parseBilibiliVideoUrl } from "../shared/bilibiliSubtitle.js";
import { parseYouTubeVideoUrl } from "../shared/youtubeSubtitle.js";
import {
  exportWordbookToTsv,
  mapSubtitleLangToTtsSource,
  normalizeTermKey,
  pickRecommendedStudyTrack,
  useWordbook,
} from "../shared/wordbook.js";
import {
  findHighlightRanges,
  hasArabicScript,
  isRtlText,
  isolateBidiInline,
  normalizeTextForMatch,
} from "../shared/textScript.js";
import { useI18n } from "../shared/i18n/index.js";
import { WordbookBoard } from "../components/WordbookBoard.jsx";

const CLASSROOM_STORAGE_KEYS = pick(defaultOptions, [
  "pageTrsApi",
  "pageTrsDest",
  "destination",
  "officialLLMKey",
  "officialLLMModel",
  "customOpenAIServices",
]);

const RATIO_OPTIONS = [10, 20, 30];

function StarIcon({ filled = false, size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.2l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 14.39 5.22 16.9l.91-5.32-3.86-3.76 5.34-.78L10 2.2z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpeakerIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.5 7.5h3.2L11 4v12l-4.3-3.5H3.5a1 1 0 01-1-1v-3a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 7.3a4 4 0 010 5.4M16.2 5.2a7 7 0 010 9.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MaximizeIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect
        x="3.75"
        y="3.75"
        width="12.5"
        height="12.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function RestoreIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect
        x="3.5"
        y="6.25"
        width="10.25"
        height="10.25"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="1.65"
      />
      <path
        d="M6.5 6.25V5.2c0-.95.75-1.7 1.7-1.7h6.6c.95 0 1.7.75 1.7 1.7v6.6c0 .95-.75 1.7-1.7 1.7h-1.05"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchSvg({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="5.8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparklesIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2l1.6 4.7L16.3 8.3l-4.7 1.6L10 14.6l-1.6-4.7L3.7 8.3l4.7-1.6L10 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 13.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"
        fill="currentColor"
      />
    </svg>
  );
}

function RefreshSvg({ size = 13, spinning = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={spinning ? "ndt-cls-spin" : undefined}
      aria-hidden="true"
    >
      <path
        d="M16.5 10a6.5 6.5 0 11-1.9-4.6M16.5 3.5v3.2h-3.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function renderHighlightedQuote(quote, term, surfaceForm) {
  const text = String(quote || "");
  if (!text) return null;
  const ranges = findHighlightRanges(text, [surfaceForm, term]);
  if (ranges.length === 0) return text;
  const nodes = [];
  let cursor = 0;
  for (let i = 0; i < ranges.length; i += 1) {
    const { start, end } = ranges[i];
    if (start > cursor) {
      nodes.push(<React.Fragment key={`t-${i}`}>{text.slice(cursor, start)}</React.Fragment>);
    }
    nodes.push(
      <span key={`h-${i}`} className="ndt-cls-highlight">
        {text.slice(start, end)}
      </span>
    );
    cursor = end;
  }
  if (cursor < text.length) {
    nodes.push(<React.Fragment key="t-end">{text.slice(cursor)}</React.Fragment>);
  }
  return nodes;
}

function getCurrentVideoKey(href = window.location.href) {
  const yt = parseYouTubeVideoUrl(href);
  if (yt?.isVideoPage) return `yt:${yt.videoId}`;
  const bili = parseBilibiliVideoUrl(href);
  if (bili?.isVideoPage) return `bili:${bili.bvid || bili.aid}:p${bili.page}`;
  return href;
}

function findBestVideoElement() {
  const ytMain =
    document.querySelector("#movie_player video.html5-main-video") ||
    document.querySelector("ytd-watch-flexy #movie_player video") ||
    document.querySelector("#shorts-player video.html5-main-video");
  if (ytMain) return ytMain;

  const videos = Array.from(document.querySelectorAll("video"));
  if (videos.length === 0) return null;
  let best = videos[0];
  let bestScore = -1;
  for (const video of videos) {
    const rect = video.getBoundingClientRect();
    const area = Math.max(0, rect.width * rect.height);
    const score = (video.readyState > 0 ? 1e8 : 0) + (!video.paused ? 5e7 : 0) + area;
    if (score > bestScore) {
      bestScore = score;
      best = video;
    }
  }
  return best;
}

function buildSectionStateKey(trackKey, ratio, apiCode, sectionId) {
  return `${trackKey || ""}::${ratio}::${apiCode || ""}::${sectionId || "sec-1"}`;
}

export function LanguageClassroomModal({ open, onClose, hasPopupOpen = false, onDismissPopup }) {
  const { t, getLanguageName, getTrackLabel } = useI18n();
  const [cfg] = useStorage(CLASSROOM_STORAGE_KEYS);
  const wordbook = useWordbook();

  const [activeTab, setActiveTab] = React.useState("study"); // "study" | "wordbook"
  const [viewMode, setViewMode] = React.useState("focus"); // "focus" | "grid"
  const [isMaximized, setIsMaximized] = React.useState(false);
  const [difficultyRatio, setDifficultyRatio] = React.useState(20);
  const [selectedApiCode, setSelectedApiCode] = React.useState("");

  // Subtitle loading state
  const [subState, setSubState] = React.useState({
    loading: false,
    data: null,
    error: "",
    loadedKey: "",
  });
  const [selectedTrackKey, setSelectedTrackKey] = React.useState("");
  const [loadingTrackKey, setLoadingTrackKey] = React.useState("");
  const [hasStartedStudy, setHasStartedStudy] = React.useState(false);

  // Multi-section state map keyed by `${trackKey}::${ratio}::${apiCode}::${sectionId}`
  const [activeSectionIndex, setActiveSectionIndex] = React.useState(0);
  const [sectionStates, setSectionStates] = React.useState({});
  const [batchAllRunning, setBatchAllRunning] = React.useState(false);
  const [batchAllCurrentSection, setBatchAllCurrentSection] = React.useState(-1);

  // Study interaction state
  const [activeItemId, setActiveItemId] = React.useState("");
  const [quizMode, setQuizMode] = React.useState(false);
  const [revealedIds, setRevealedIds] = React.useState(() => new Set());
  const [sessionMasteredIds, setSessionMasteredIds] = React.useState(() => new Set());
  const [sessionStudiedIds, setSessionStudiedIds] = React.useState(() => new Set());

  // Wordbook tab state
  const [wbSearch, setWbSearch] = React.useState("");
  const [wbFilter, setWbFilter] = React.useState("all"); // all | learning | mastered
  const [wbViewMode, setWbViewMode] = React.useState("focus"); // "focus" | "grid"

  // Toast feedback
  const [toastMsg, setToastMsg] = React.useState("");
  const [dotRowsPerCol, setDotRowsPerCol] = React.useState(24);
  const toastTimerRef = React.useRef(null);
  const activePortsRef = React.useRef(new Map());
  const batchAllCancelRef = React.useRef(false);
  const sectionStripRef = React.useRef(null);
  const dotRailRef = React.useRef(null);
  const wbBoardRef = React.useRef(null);
  const sectionStatesRef = React.useRef(sectionStates);
  sectionStatesRef.current = sectionStates;

  const showToast = React.useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(""), 2200);
  }, []);

  const disconnectAllPorts = React.useCallback(() => {
    batchAllCancelRef.current = true;
    setBatchAllRunning(false);
    setBatchAllCurrentSection(-1);
    for (const port of activePortsRef.current.values()) {
      try {
        port.disconnect();
      } catch {
        // ignore
      }
    }
    activePortsRef.current.clear();
  }, []);

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      disconnectAllPorts();
    };
  }, [disconnectAllPorts]);

  const llmServices = React.useMemo(() => {
    const officialKey = String(cfg?.officialLLMKey || "").trim();
    const officialModel = String(cfg?.officialLLMModel || "").trim();
    const list = [
      {
        id: OFFICIAL_LLM_ID,
        name: t("service.officialLlm"),
        model: officialModel,
        ready: Boolean(officialKey && officialModel),
      },
    ];
    for (const svc of cfg?.customOpenAIServices || []) {
      if (!svc?.id) continue;
      list.push({
        id: svc.id,
        name: svc.name || t("service.customDefault"),
        model: String(svc.model || "").trim(),
        ready: Boolean(String(svc.baseUrl || "").trim() && String(svc.model || "").trim()),
      });
    }
    return list;
  }, [cfg?.officialLLMKey, cfg?.officialLLMModel, cfg?.customOpenAIServices, t]);

  // Pick default LLM service when config loads
  React.useEffect(() => {
    if (selectedApiCode && llmServices.some((s) => s.id === selectedApiCode)) {
      return;
    }
    const pageApi = cfg?.pageTrsApi;
    if (
      (pageApi === OFFICIAL_LLM_ID || isCustomOpenAIServiceId(pageApi)) &&
      llmServices.some((s) => s.id === pageApi && s.ready)
    ) {
      setSelectedApiCode(pageApi);
      return;
    }
    const firstReady = llmServices.find((s) => s.ready);
    if (firstReady) {
      setSelectedApiCode(firstReady.id);
      return;
    }
    if (llmServices[0]) {
      setSelectedApiCode(llmServices[0].id);
    }
  }, [cfg?.pageTrsApi, llmServices, selectedApiCode]);

  const targetLanguage = React.useMemo(
    () => cfg?.pageTrsDest?.[0] || cfg?.destination || "中文(简体)",
    [cfg?.pageTrsDest, cfg?.destination]
  );

  const currentPlatform = React.useMemo(() => {
    if (subState.data?.platform) return subState.data.platform;
    return parseYouTubeVideoUrl(window.location.href) ? "youtube" : "bilibili";
  }, [subState.data?.platform]);
  const platformDisplayName =
    currentPlatform === "youtube"
      ? t("classroom.platformYouTube")
      : t("classroom.platformBilibili");
  const getSectionTitle = React.useCallback(
    (sec) => t("classroom.sectionTitle", { n: sec?.number ?? 1 }),
    [t]
  );
  const resolvedVideoTitle = React.useMemo(() => {
    if (subState.data?.videoTitle && subState.data.videoTitle !== "YouTube") {
      return subState.data.videoTitle;
    }
    if (currentPlatform === "youtube") {
      const domTitle =
        document
          .querySelector(
            "ytd-watch-metadata h1 yt-formatted-string, h1.ytd-watch-metadata, #title h1"
          )
          ?.textContent?.trim() || "";
      if (domTitle) return domTitle;
    }
    const cleanDoc = String(document.title || "")
      .replace(/^\(\d+\)\s*/, "")
      .replace(/\s*-\s*YouTube$/, "")
      .trim();
    return cleanDoc && cleanDoc !== "YouTube" ? cleanDoc : subState.data?.videoTitle || "";
  }, [subState.data?.videoTitle, currentPlatform]);
  const resolvedVideoId = subState.data?.videoId || subState.data?.bvid || "";

  const loadSubtitles = React.useCallback(
    async (forceRefresh = false) => {
      const pageUrl = window.location.href;
      const videoKey = getCurrentVideoKey(pageUrl);
      const isYt = Boolean(parseYouTubeVideoUrl(pageUrl));
      disconnectAllPorts();
      setSubState({ loading: true, data: null, error: "", loadedKey: videoKey });
      setSectionStates({});
      setHasStartedStudy(false);
      setActiveSectionIndex(0);
      setSelectedTrackKey("");
      setLoadingTrackKey("");
      try {
        const res = await messaging._({
          action: "fetch video subtitles",
          pageUrl,
          targetLanguage,
          forceRefresh: Boolean(forceRefresh),
        });
        setSubState({ loading: false, data: res, error: "", loadedKey: videoKey });
        const tracks = Array.isArray(res?.tracks) ? res.tracks : [];
        const recommended = pickRecommendedStudyTrack(tracks, targetLanguage);
        if (recommended) {
          setSelectedTrackKey(recommended.key);
        }
      } catch (err) {
        setSubState({
          loading: false,
          data: null,
          error:
            err?.message ||
            t("classroom.errFetchSubs", {
              platform: isYt ? t("classroom.platformYouTube") : t("classroom.platformBilibili"),
            }),
          loadedKey: videoKey,
        });
      }
    },
    [targetLanguage, disconnectAllPorts, t]
  );

  // Load subtitles when modal opens or video changes
  React.useEffect(() => {
    if (!open) return;
    const video = findBestVideoElement();
    if (video && !video.paused) {
      try {
        video.pause();
      } catch {
        // ignore pause failure
      }
    }
    const currentKey = getCurrentVideoKey(window.location.href);
    if (!subState.data || subState.loadedKey !== currentKey) {
      loadSubtitles(false);
    }
  }, [open, subState.data, subState.loadedKey, loadSubtitles]);

  const tracks = React.useMemo(
    () => (Array.isArray(subState.data?.tracks) ? subState.data.tracks : []),
    [subState.data]
  );

  const playableTracks = React.useMemo(
    () => tracks.filter((tr) => Array.isArray(tr?.cues) && tr.cues.length > 0),
    [tracks]
  );

  const selectableTracks = React.useMemo(
    () =>
      tracks.filter(
        (tr) =>
          (Array.isArray(tr?.cues) && tr.cues.length > 0) ||
          Boolean(tr?.subtitleUrl || tr?.hasSubtitleUrl)
      ),
    [tracks]
  );

  const recommendedTrack = React.useMemo(
    () => pickRecommendedStudyTrack(selectableTracks, targetLanguage),
    [selectableTracks, targetLanguage]
  );

  const currentTrack = React.useMemo(
    () =>
      selectableTracks.find((tr) => tr.key === selectedTrackKey) ||
      playableTracks[0] ||
      selectableTracks[0] ||
      tracks[0] ||
      null,
    [selectableTracks, playableTracks, tracks, selectedTrackKey]
  );

  // Plan sections for current track + ratio
  const sectionPlan = React.useMemo(() => {
    if (!currentTrack || !Array.isArray(currentTrack.cues) || currentTrack.cues.length === 0) {
      return { totalCues: 0, totalChars: 0, totalDuration: 0, sections: [] };
    }
    return planSubtitleSections(currentTrack.cues, difficultyRatio);
  }, [currentTrack, difficultyRatio]);

  const sections = sectionPlan.sections;
  const isMultiSection = sections.length > 1;
  const clampedSectionIndex = Math.min(
    Math.max(0, activeSectionIndex),
    Math.max(0, sections.length - 1)
  );
  const activeSection = sections[clampedSectionIndex] || null;

  // Compute active section's extraction state
  const activeStateKey = activeSection
    ? buildSectionStateKey(
        currentTrack?.key,
        difficultyRatio,
        selectedApiCode,
        activeSection.id
      )
    : "";
  const activeSectionState = (activeStateKey && sectionStates[activeStateKey]) || {
    status: "idle",
    data: null,
    error: "",
    needConfig: false,
    progress: null,
  };

  // Compute overall progress across all sections of the current track
  const overallStats = React.useMemo(() => {
    const totalCues = sectionPlan.totalCues;
    let processedCues = 0;
    let completedSections = 0;
    let totalExtractedItems = 0;
    let loadingSections = 0;

    for (const sec of sections) {
      const key = buildSectionStateKey(
        currentTrack?.key,
        difficultyRatio,
        selectedApiCode,
        sec.id
      );
      const st = sectionStates[key];
      if (!st) continue;
      if (st.status === "done") {
        completedSections += 1;
        processedCues += sec.cueCount;
        totalExtractedItems += st.data?.items?.length || 0;
      } else if (st.status === "loading") {
        loadingSections += 1;
        const p = Math.min(sec.cueCount, Math.max(0, Number(st.progress?.processedCues) || 0));
        processedCues += p;
        totalExtractedItems += Number(st.progress?.extractedCount) || 0;
      }
    }

    const percent = totalCues > 0 ? Math.min(100, Math.round((processedCues / totalCues) * 100)) : 0;
    return {
      totalCues,
      processedCues,
      completedSections,
      loadingSections,
      totalExtractedItems,
      percent,
    };
  }, [sectionPlan.totalCues, sections, currentTrack?.key, difficultyRatio, selectedApiCode, sectionStates]);

  const cancelSectionExtraction = React.useCallback((stateKey) => {
    const existingPort = activePortsRef.current.get(stateKey);
    if (existingPort) {
      activePortsRef.current.delete(stateKey);
      try {
        existingPort.disconnect();
      } catch {
        // ignore
      }
    }
    setSectionStates((prev) => {
      const curr = prev[stateKey];
      if (!curr || curr.status !== "loading") return prev;
      return {
        ...prev,
        [stateKey]: {
          ...curr,
          status: "idle",
          progress: null,
        },
      };
    });
  }, []);

  const extractSection = React.useCallback(
    ({
      section,
      trackOverride,
      ratioOverride,
      apiOverride,
      forceRefresh = false,
      isMultiOverride,
    }) => {
      const track = trackOverride || currentTrack;
      const ratio = ratioOverride ?? difficultyRatio;
      const apiCode = apiOverride ?? selectedApiCode;
      if (!track || !section || !Array.isArray(section.cues) || section.cues.length === 0) {
        return Promise.resolve({ ok: false, error: t("classroom.toastEmptySection") });
      }

      const stateKey = buildSectionStateKey(track.key, ratio, apiCode, section.id);
      const existing = sectionStatesRef.current[stateKey];
      if (!forceRefresh && existing?.status === "done" && existing.data) {
        return Promise.resolve(existing.data);
      }

      // Abort any existing port for this exact section
      const prevPort = activePortsRef.current.get(stateKey);
      if (prevPort) {
        activePortsRef.current.delete(stateKey);
        try {
          prevPort.disconnect();
        } catch {
          // ignore
        }
      }

      setSectionStates((prev) => ({
        ...prev,
        [stateKey]: {
          status: "loading",
          data: null,
          error: "",
          needConfig: false,
          progress: {
            stage: "analyzing",
            processedCues: 0,
            totalCues: section.cueCount,
            batchIndex: 1,
            batchCount: section.batchCount || 1,
            extractedCount: 0,
            latestTerm: "",
          },
        },
      }));

      return new Promise((resolve) => {
        let port;
        let settled = false;
        const finish = (payload) => {
          if (settled) return;
          settled = true;
          if (port && activePortsRef.current.get(stateKey) === port) {
            activePortsRef.current.delete(stateKey);
          }
          try {
            port?.disconnect();
          } catch {
            // ignore
          }
          resolve(payload);
        };

        try {
          port = chrome.runtime.connect({ name: "ndt-classroom-stream" });
        } catch (err) {
          const msg = err?.message || t("classroom.toastPortDisconnected");
          setSectionStates((prev) => ({
            ...prev,
            [stateKey]: {
              status: "error",
              data: null,
              error: msg,
              needConfig: false,
              progress: null,
            },
          }));
          finish({ ok: false, error: msg });
          return;
        }

        activePortsRef.current.set(stateKey, port);

        port.onMessage.addListener((msg) => {
          if (!msg || settled) return;
          if (msg.type === "progress" && msg.progress) {
            setSectionStates((prev) => {
              const curr = prev[stateKey];
              if (!curr || curr.status !== "loading") return prev;
              return {
                ...prev,
                [stateKey]: {
                  ...curr,
                  progress: {
                    ...curr.progress,
                    ...msg.progress,
                  },
                },
              };
            });
            return;
          }
          if (msg.type === "done" && msg.result?.ok) {
            setSectionStates((prev) => ({
              ...prev,
              [stateKey]: {
                status: "done",
                data: msg.result,
                error: "",
                needConfig: false,
                progress: {
                  stage: "done",
                  processedCues: section.cueCount,
                  totalCues: section.cueCount,
                  batchIndex: section.batchCount || 1,
                  batchCount: section.batchCount || 1,
                  extractedCount: msg.result.items?.length || 0,
                  latestTerm: "",
                },
              },
            }));
            finish(msg.result);
            return;
          }
          if (msg.type === "error") {
            if (msg.aborted) {
              setSectionStates((prev) => ({
                ...prev,
                [stateKey]: {
                  status: "idle",
                  data: null,
                  error: "",
                  needConfig: false,
                  progress: null,
                },
              }));
              finish({ ok: false, aborted: true });
              return;
            }
            setSectionStates((prev) => ({
              ...prev,
              [stateKey]: {
                status: "error",
                data: null,
                error: msg.error || t("classroom.toastExtractFailed"),
                needConfig: Boolean(msg.needConfig),
                progress: null,
              },
            }));
            finish({ ok: false, error: msg.error, needConfig: Boolean(msg.needConfig) });
          }
        });

        port.onDisconnect.addListener(() => {
          if (settled) return;
          setSectionStates((prev) => {
            const curr = prev[stateKey];
            if (!curr || curr.status !== "loading") return prev;
            return {
              ...prev,
              [stateKey]: {
                status: "idle",
                data: null,
                error: "",
                needConfig: false,
                progress: null,
              },
            };
          });
          finish({ ok: false, aborted: true });
        });

        port.postMessage({
          action: "extract classroom vocabulary",
          data: {
            apiCode,
            track: {
              key: track.key,
              id: track.id,
              lan: track.lan,
              lanDoc: track.lanDoc,
            },
            cues: section.cues,
            videoTitle: resolvedVideoTitle,
            platform: currentPlatform,
            videoId: resolvedVideoId,
            bvid: resolvedVideoId,
            pageUrl: window.location.href,
            difficultyRatio: ratio,
            targetLanguage,
            sectionId: section.id,
            sectionIndex: section.index,
            sectionTitle: section.title,
            sectionTimeRange: section.timeRange,
            isMultiSection: isMultiOverride ?? isMultiSection,
            forceRefresh,
          },
        });
      });
    },
    [
      currentTrack,
      difficultyRatio,
      selectedApiCode,
      resolvedVideoTitle,
      currentPlatform,
      resolvedVideoId,
      targetLanguage,
      isMultiSection,
      t,
    ]
  );

  const startTrackStudy = React.useCallback(
    async (
      track,
      { ratioOverride, apiOverride, sectionIndexOverride = 0, forceRefresh = false } = {}
    ) => {
      if (!track) return;
      let resolvedTrack = track;

      // Lazy-load cues on demand for YouTube tracks that haven't been fetched yet
      if (
        (!Array.isArray(resolvedTrack.cues) || resolvedTrack.cues.length === 0) &&
        (resolvedTrack.subtitleUrl || resolvedTrack.hasSubtitleUrl)
      ) {
        setSelectedTrackKey(resolvedTrack.key);
        setLoadingTrackKey(resolvedTrack.key);
        try {
          const res = await messaging._({
            action: "fetch video subtitle track",
            pageUrl: window.location.href,
            trackKey: resolvedTrack.key,
            subtitleUrl: resolvedTrack.subtitleUrl || "",
          });
          setLoadingTrackKey("");
          if (!res?.ok || !Array.isArray(res.track?.cues) || res.track.cues.length === 0) {
            showToast(
              res?.rateLimited || res?.reason === "RATE_LIMITED"
                ? t("classroom.toastYtRateLimit")
                : t("classroom.toastTrackLoadFail")
            );
            return;
          }
          resolvedTrack = { ...resolvedTrack, ...res.track };
          setSubState((prev) => {
            if (!prev.data || !Array.isArray(prev.data.tracks)) return prev;
            const nextTracks = prev.data.tracks.map((tr) =>
              tr.key === resolvedTrack.key ? resolvedTrack : tr
            );
            return {
              ...prev,
              data: {
                ...prev.data,
                partial: false,
                rateLimited: false,
                tracks: nextTracks,
              },
            };
          });
        } catch {
          setLoadingTrackKey("");
          showToast(t("classroom.toastTrackLoadFailShort"));
          return;
        }
      }

      if (!Array.isArray(resolvedTrack.cues) || resolvedTrack.cues.length === 0) return;
      const ratio = ratioOverride ?? difficultyRatio;
      const apiCode = apiOverride ?? selectedApiCode;
      const plan = planSubtitleSections(resolvedTrack.cues, ratio);
      const targetSec = plan.sections[sectionIndexOverride] || plan.sections[0];
      if (!targetSec) return;

      batchAllCancelRef.current = true;
      setBatchAllRunning(false);
      setBatchAllCurrentSection(-1);

      setSelectedTrackKey(resolvedTrack.key);
      setHasStartedStudy(true);
      setActiveTab("study");
      setActiveSectionIndex(targetSec.index);
      setRevealedIds(new Set());

      extractSection({
        section: targetSec,
        trackOverride: resolvedTrack,
        ratioOverride: ratio,
        apiOverride: apiCode,
        forceRefresh,
        isMultiOverride: plan.sections.length > 1,
      });
    },
    [difficultyRatio, selectedApiCode, extractSection, showToast, t]
  );

  const handleSelectSection = React.useCallback(
    (sec) => {
      if (!sec || !currentTrack) return;
      setActiveSectionIndex(sec.index);
      setRevealedIds(new Set());
      const stateKey = buildSectionStateKey(
        currentTrack.key,
        difficultyRatio,
        selectedApiCode,
        sec.id
      );
      const st = sectionStatesRef.current[stateKey];
      if (!st || st.status === "idle" || st.status === "error") {
        extractSection({ section: sec });
      }
    },
    [currentTrack, difficultyRatio, selectedApiCode, extractSection]
  );

  const handleExtractAllSections = React.useCallback(async () => {
    if (!currentTrack || sections.length <= 1) return;
    if (batchAllRunning) {
      disconnectAllPorts();
      showToast(t("classroom.toastStoppedRemaining"));
      return;
    }

    batchAllCancelRef.current = false;
    setBatchAllRunning(true);
    setHasStartedStudy(true);

    // Order: start from activeSectionIndex, then remaining sections
    const ordered = [
      ...sections.slice(clampedSectionIndex),
      ...sections.slice(0, clampedSectionIndex),
    ];

    for (const sec of ordered) {
      if (batchAllCancelRef.current) break;
      const stateKey = buildSectionStateKey(
        currentTrack.key,
        difficultyRatio,
        selectedApiCode,
        sec.id
      );
      const st = sectionStatesRef.current[stateKey];
      if (st?.status === "done" || st?.status === "loading") continue;

      setBatchAllCurrentSection(sec.index);
      const res = await extractSection({
        section: sec,
        trackOverride: currentTrack,
        ratioOverride: difficultyRatio,
        apiOverride: selectedApiCode,
        isMultiOverride: true,
      });
      if (batchAllCancelRef.current) break;
      if (res && !res.ok && !res.aborted) {
        if (res.needConfig) {
          break;
        }
      }
    }

    setBatchAllRunning(false);
    setBatchAllCurrentSection(-1);
    if (!batchAllCancelRef.current) {
      showToast(t("classroom.toastAllDone"));
    }
  }, [
    currentTrack,
    sections,
    batchAllRunning,
    clampedSectionIndex,
    difficultyRatio,
    selectedApiCode,
    extractSection,
    disconnectAllPorts,
    showToast,
    t,
  ]);

  const extractedItems = React.useMemo(
    () => (Array.isArray(activeSectionState.data?.items) ? activeSectionState.data.items : []),
    [activeSectionState.data]
  );

  const studyLangKey = React.useMemo(
    () =>
      activeSectionState.data?.ttsSource ||
      activeSectionState.data?.detectedLanguage ||
      currentTrack?.lan ||
      currentTrack?.lanDoc ||
      "",
    [activeSectionState.data, currentTrack]
  );

  const studyLangLabel = React.useMemo(
    () =>
      getLanguageName(
        activeSectionState.data?.detectedLanguage ||
          currentTrack?.lan ||
          currentTrack?.lanDoc ||
          ""
      ),
    [activeSectionState.data, currentTrack, getLanguageName]
  );

  const filteredItems = extractedItems;

  const activeIndex = React.useMemo(() => {
    if (filteredItems.length === 0) return -1;
    const idx = filteredItems.findIndex((it) => it.id === activeItemId);
    return idx >= 0 ? idx : 0;
  }, [filteredItems, activeItemId]);

  const activeItem = activeIndex >= 0 ? filteredItems[activeIndex] : null;

  const wordbookByKey = React.useMemo(() => {
    const map = new Map();
    for (const entry of wordbook.items) {
      if (entry.key) map.set(entry.key, entry);
      map.set(normalizeTermKey(entry.term, entry.language), entry);
    }
    return map;
  }, [wordbook.items]);

  const getWordLearningStatus = React.useCallback(
    (item) => {
      if (!item) return "unstudied";
      const wbEntry = wordbookByKey.get(normalizeTermKey(item.term, studyLangKey));
      if (sessionMasteredIds.has(item.id) || wbEntry?.mastered) {
        return "mastered";
      }
      if (wbEntry) {
        return "new";
      }
      if (sessionStudiedIds.has(item.id)) {
        return "studied";
      }
      return "unstudied";
    },
    [wordbookByKey, studyLangKey, sessionMasteredIds, sessionStudiedIds]
  );

  React.useEffect(() => {
    if (activeItem && activeItem.id !== activeItemId) {
      setActiveItemId(activeItem.id);
    } else if (!activeItem && activeItemId) {
      setActiveItemId("");
    }
  }, [activeItem, activeItemId]);

  React.useEffect(() => {
    if (activeTab !== "study" || viewMode !== "focus" || !activeItem?.id) return;
    setSessionStudiedIds((prev) => {
      if (prev.has(activeItem.id)) return prev;
      const next = new Set(prev);
      next.add(activeItem.id);
      return next;
    });
  }, [activeTab, viewMode, activeItem?.id]);

  React.useEffect(() => {
    const el = dotRailRef.current;
    if (!el) return;
    const updateRows = () => {
      const h = el.clientHeight;
      if (h > 0) {
        setDotRowsPerCol(Math.max(8, Math.floor((h + 3) / 13)));
      }
    };
    updateRows();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateRows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeTab, viewMode, activeSectionState.status, filteredItems.length]);

  const buildWordbookPayload = React.useCallback(
    (item) => ({
      ...item,
      language: studyLangKey,
      languageLabel: studyLangLabel,
      targetLanguage: activeSectionState.data?.targetLanguage || targetLanguage,
      sourceTitle: resolvedVideoTitle,
      sourceUrl: window.location.href,
      sourceBvid: resolvedVideoId,
    }),
    [studyLangKey, studyLangLabel, activeSectionState.data, targetLanguage, resolvedVideoTitle, resolvedVideoId]
  );

  const handleToggleWordbook = React.useCallback(
    async (item) => {
      if (!item) return;
      const saved = wordbook.hasTerm(item.term, studyLangKey);
      const displayTerm = isolateBidiInline(item.term);
      if (saved) {
        await wordbook.removeItem(normalizeTermKey(item.term, studyLangKey));
        showToast(t("classroom.toastRemovedFromWordbook", { term: displayTerm }));
      } else {
        setSessionMasteredIds((prev) => {
          if (!prev.has(item.id)) return prev;
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        await wordbook.addItem(buildWordbookPayload(item));
        showToast(t("classroom.toastAddedToWordbook", { term: displayTerm }));
      }
    },
    [wordbook, studyLangKey, buildWordbookPayload, showToast, t]
  );

  const handleSpeak = React.useCallback(
    (text, langOverride = "") => {
      const clean = String(text || "").trim();
      if (!clean) return;
      const source =
        langOverride ||
        activeSectionState.data?.ttsSource ||
        mapSubtitleLangToTtsSource(currentTrack?.lan, currentTrack?.lanDoc) ||
        (hasArabicScript(clean) ? "阿拉伯语" : "");
      messaging
        ._({
          action: "audio",
          url: {
            apiId: "GoogleWeb",
            source,
            text: clean,
          },
        })
        .catch(() => {
          showToast(t("classroom.toastTtsUnsupported"));
        });
    },
    [activeSectionState.data, currentTrack, showToast, t]
  );

  const handleSeekVideo = React.useCallback(
    (seconds, closeAfter = false) => {
      const video = findBestVideoElement();
      if (!video || !Number.isFinite(Number(seconds))) return;
      const targetTime = Math.max(0, Number(seconds) - 0.5);
      video.currentTime = targetTime;
      if (closeAfter) {
        video.play?.().catch?.(() => {});
        onClose?.();
      } else {
        showToast(t("classroom.toastSeeked", { time: formatSubtitleTime(targetTime) }));
      }
    },
    [onClose, showToast, t]
  );

  const handleOpenSettings = React.useCallback(() => {
    messaging._({ action: "open options page" }).catch(() => {});
  }, []);

  const handleExportWordbook = React.useCallback(() => {
    if (wordbook.items.length === 0) {
      showToast(t("classroom.toastExportEmpty"));
      return;
    }
    const tsv = exportWordbookToTsv(wordbook.items);
    const blob = new Blob([tsv], { type: "text/tab-separated-values;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `language-classroom-wordbook-${new Date().toISOString().slice(0, 10)}.tsv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(t("classroom.toastExported", { count: wordbook.items.length }));
  }, [wordbook.items, showToast, t]);

  const toggleRevealItem = React.useCallback((id) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSessionMastered = React.useCallback((id) => {
    setSessionMasteredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Keyboard shortcuts & isolating Bilibili player hotkeys while modal is open
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      const actualTarget = path[0] || e.target;
      const tag = (actualTarget?.tagName || "").toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || tag === "select" || actualTarget?.isContentEditable;
      const inTranslatePopup = path.some((el) => el && el.id === "popper-container");

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (hasPopupOpen) {
          onDismissPopup?.();
        } else {
          onClose?.();
        }
        return;
      }

      if (inTranslatePopup) return;

      e.stopPropagation();
      e.stopImmediatePropagation();

      if (isTyping) {
        return;
      }

      if (activeTab === "wordbook") {
        wbBoardRef.current?.handleKeyDown(e);
        return;
      }

      if (activeTab !== "study" || viewMode !== "focus" || !activeItem) {
        return;
      }

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        if (activeIndex < filteredItems.length - 1) {
          setActiveItemId(filteredItems[activeIndex + 1].id);
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (activeIndex > 0) {
          setActiveItemId(filteredItems[activeIndex - 1].id);
        }
      } else if (e.key === " ") {
        if (quizMode) {
          e.preventDefault();
          toggleRevealItem(activeItem.id);
        }
      } else if (e.key === "b" || e.key === "B" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleToggleWordbook(activeItem);
      } else if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        toggleSessionMastered(activeItem.id);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [
    open,
    onClose,
    hasPopupOpen,
    onDismissPopup,
    activeTab,
    viewMode,
    activeItem,
    activeIndex,
    filteredItems,
    quizMode,
    toggleRevealItem,
    handleToggleWordbook,
    toggleSessionMastered,
  ]);

  const filteredWordbook = React.useMemo(() => {
    const q = wbSearch.trim().toLowerCase();
    const normQ = normalizeTextForMatch(wbSearch);
    return wordbook.items.filter((item) => {
      if (wbFilter === "learning" && item.mastered) return false;
      if (wbFilter === "mastered" && !item.mastered) return false;
      if (!q) return true;
      return (
        String(item.term || "").toLowerCase().includes(q) ||
        (normQ && normalizeTextForMatch(item.term || "").includes(normQ)) ||
        String(item.translation || "").toLowerCase().includes(q) ||
        String(item.sourceTitle || "").toLowerCase().includes(q) ||
        String(item.languageLabel || "").toLowerCase().includes(q)
      );
    });
  }, [wordbook.items, wbSearch, wbFilter]);

  if (!open) return null;

  const currentLlmObj = llmServices.find((s) => s.id === selectedApiCode) || llmServices[0];

  const isMeaningHidden =
    Boolean(activeItem) && quizMode && !revealedIds.has(activeItem.id);

  const activeProgress = activeSectionState.progress || {
    processedCues: 0,
    totalCues: activeSection?.cueCount || 0,
    batchIndex: 1,
    batchCount: activeSection?.batchCount || 1,
    extractedCount: 0,
    latestTerm: "",
  };
  const activeProgressPct =
    activeProgress.totalCues > 0
      ? Math.min(100, Math.round((activeProgress.processedCues / activeProgress.totalCues) * 100))
      : 0;

  const bgRunningSection =
    batchAllCurrentSection >= 0 ? sections[batchAllCurrentSection] : null;
  const bgRunningState = bgRunningSection
    ? sectionStates[
        buildSectionStateKey(
          currentTrack?.key,
          difficultyRatio,
          selectedApiCode,
          bgRunningSection.id
        )
      ]
    : null;

  const nextSection =
    isMultiSection && clampedSectionIndex < sections.length - 1
      ? sections[clampedSectionIndex + 1]
      : null;

  return (
    <div
      id="ndt-classroom-backdrop"
      className={isMaximized ? "is-maximized" : undefined}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      onKeyUp={(e) => e.stopPropagation()}
      onKeyPress={(e) => e.stopPropagation()}
    >
      <div
        id="ndt-classroom-modal"
        className={isMaximized ? "is-maximized" : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={t("classroom.title")}
      >
        {/* Header */}
        <header className="ndt-cls-header">
          <div className="ndt-cls-brand">
            <span className="ndt-cls-brand-icon">
              <img src={chrome.runtime.getURL("icons/icon48.png")} alt="" />
            </span>
            <div className="ndt-cls-brand-text">
              <div className="ndt-cls-title-row">
                <h2 className="ndt-cls-title">{t("classroom.title")}</h2>
                <span className="ndt-cls-beta-pill">{t("classroom.betaPill")}</span>
              </div>
              <div
                className="ndt-cls-video-name"
                title={resolvedVideoTitle}
              >
                {resolvedVideoTitle}
              </div>
            </div>
          </div>

          <div className="ndt-cls-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "study"}
              className={`ndt-cls-tab-btn ${activeTab === "study" ? "is-active" : ""}`}
              onClick={() => setActiveTab("study")}
            >
              <SparklesIcon size={14} />
              <span>{t("classroom.tabStudy")}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "wordbook"}
              className={`ndt-cls-tab-btn ${activeTab === "wordbook" ? "is-active" : ""}`}
              onClick={() => setActiveTab("wordbook")}
            >
              <StarIcon filled={wordbook.items.length > 0} size={14} />
              <span>{t("classroom.tabWordbook")}</span>
              <span className="ndt-cls-tab-count">{wordbook.items.length}</span>
            </button>
          </div>

          <div className="ndt-cls-header-right">
            <button
              type="button"
              className="ndt-cls-icon-btn"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? t("classroom.restoreWindow") : t("classroom.maximizeWindow")}
              aria-label={
                isMaximized ? t("classroom.restoreWindowShort") : t("classroom.maximizeWindow")
              }
            >
              {isMaximized ? <RestoreIcon size={14} /> : <MaximizeIcon size={14} />}
            </button>
            <button
              type="button"
              className="ndt-cls-icon-btn"
              onClick={onClose}
              title={t("classroom.closeTitle")}
              aria-label={t("classroom.closeAria")}
            >
              <CloseIcon size={15} />
            </button>
          </div>
        </header>

        {/* Tab 1: Pre-watch Study */}
        {activeTab === "study" && (
          <>
            {/* Top Controls */}
            <div className="ndt-cls-toolbar">
              <div className="ndt-cls-toolbar-group">
                <span className="ndt-cls-field-label">{t("classroom.subtitleTrack")}</span>
                {subState.loading ? (
                  <span className="ndt-cls-field-label">{t("classroom.detectingSubtitles")}</span>
                ) : selectableTracks.length > 5 ? (
                  <select
                    className="ndt-cls-select"
                    aria-label={t("classroom.selectTrackAria")}
                    disabled={Boolean(loadingTrackKey)}
                    value={currentTrack?.key || ""}
                    onChange={(e) => {
                      const chosen = selectableTracks.find((tr) => tr.key === e.target.value);
                      if (chosen) startTrackStudy(chosen);
                    }}
                  >
                    {selectableTracks.map((tr) => (
                      <option key={tr.key} value={tr.key}>
                        {getTrackLabel(tr) || t("subtitle.defaultTrackName")}
                        {tr.isActiveInPlayer
                          ? t("classroom.trackCurrentSuffix")
                          : tr.isOriginalLang
                            ? t("classroom.trackOriginalSuffix")
                            : ""}
                      </option>
                    ))}
                  </select>
                ) : selectableTracks.length > 0 ? (
                  <div className="ndt-cls-track-pills">
                    {selectableTracks.map((tr) => {
                      const isSel = currentTrack?.key === tr.key;
                      const isBusy = loadingTrackKey === tr.key;
                      const label = getTrackLabel(tr) || t("subtitle.defaultTrackName");
                      return (
                        <button
                          key={tr.key}
                          type="button"
                          disabled={Boolean(loadingTrackKey)}
                          className={`ndt-cls-track-pill ${isSel ? "is-selected" : ""}`}
                          onClick={() => {
                            startTrackStudy(tr);
                          }}
                          title={`${label}${tr.author ? ` · ${tr.author}` : ""}`}
                        >
                          <span>
                            {isBusy ? (
                              t("classroom.loading")
                            ) : (
                              <bdi dir="auto">{label}</bdi>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="ndt-cls-field-label">{t("classroom.noTracksDetected")}</span>
                )}
              </div>

              <div className="ndt-cls-toolbar-group">
                <div className="ndt-cls-ratio-group" title={t("classroom.ratioGroupTitle")}>
                  {RATIO_OPTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`ndt-cls-ratio-btn ${difficultyRatio === r ? "is-active" : ""}`}
                      onClick={() => {
                        setDifficultyRatio(r);
                        if (hasStartedStudy && currentTrack) {
                          startTrackStudy(currentTrack, {
                            ratioOverride: r,
                            sectionIndexOverride: 0,
                          });
                        }
                      }}
                    >
                      {t("classroom.ratioHardest", { ratio: r })}
                    </button>
                  ))}
                </div>

                <select
                  className="ndt-cls-select"
                  aria-label={t("classroom.selectModelAria")}
                  value={selectedApiCode}
                  onChange={(e) => {
                    const nextApi = e.target.value;
                    setSelectedApiCode(nextApi);
                    if (hasStartedStudy && currentTrack) {
                      startTrackStudy(currentTrack, {
                        apiOverride: nextApi,
                        sectionIndexOverride: clampedSectionIndex,
                      });
                    }
                  }}
                >
                  {llmServices.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.name}
                      {svc.model ? ` · ${svc.model}` : t("classroom.noModelParen")}
                    </option>
                  ))}
                </select>

                {activeSectionState.status === "done" && (
                  <div className="ndt-cls-ratio-group">
                    <button
                      type="button"
                      className={`ndt-cls-ratio-btn ${viewMode === "focus" ? "is-active" : ""}`}
                      onClick={() => setViewMode("focus")}
                    >
                      {t("classroom.viewFocus")}
                    </button>
                    <button
                      type="button"
                      className={`ndt-cls-ratio-btn ${viewMode === "grid" ? "is-active" : ""}`}
                      onClick={() => setViewMode("grid")}
                    >
                      {t("classroom.viewGrid")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`ndt-cls-body ${
                !subState.loading && hasStartedStudy ? "is-blackboard" : ""
              }`}
            >
              {/* Multi-Section Navigation Strip (integrated into the blackboard) */}
              {!subState.loading && hasStartedStudy && isMultiSection && (
                <div className="ndt-cls-section-bar">
                  <div
                    ref={sectionStripRef}
                    className="ndt-cls-section-pills"
                    onWheel={(e) => {
                      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && sectionStripRef.current) {
                        sectionStripRef.current.scrollLeft += e.deltaY;
                      }
                    }}
                  >
                    {sections.map((sec) => {
                      const stKey = buildSectionStateKey(
                        currentTrack?.key,
                        difficultyRatio,
                        selectedApiCode,
                        sec.id
                      );
                      const st = sectionStates[stKey];
                      const isSelected = sec.index === clampedSectionIndex;
                      const isDone = st?.status === "done";
                      const isLoading = st?.status === "loading";
                      const isError = st?.status === "error";
                      const secTitle = getSectionTitle(sec);
                      const secPct =
                        isLoading && sec.cueCount > 0
                          ? Math.min(
                              100,
                              Math.round(((st.progress?.processedCues || 0) / sec.cueCount) * 100)
                            )
                          : 0;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          className={`ndt-cls-section-pill ${isSelected ? "is-active" : ""} ${
                            isDone ? "is-done" : isLoading ? "is-loading" : isError ? "is-err" : ""
                          }`}
                          onClick={() => handleSelectSection(sec)}
                          title={t("classroom.sectionTooltip", {
                            title: secTitle,
                            range: sec.timeRange,
                            count: sec.cueCount,
                          })}
                        >
                          <span className="ndt-cls-section-pill-top">
                            <span className="ndt-cls-section-dot">
                              {isDone ? (
                                <CheckIcon size={11} />
                              ) : isLoading ? (
                                <RefreshSvg size={11} spinning />
                              ) : (
                                sec.number
                              )}
                            </span>
                            <span className="ndt-cls-section-pill-title">{secTitle}</span>
                            {isDone && (
                              <span className="ndt-cls-section-count">
                                {t("classroom.sectionWordCount", {
                                  count: st.data?.items?.length || 0,
                                })}
                              </span>
                            )}
                            {isLoading && (
                              <span className="ndt-cls-section-count">{secPct}%</span>
                            )}
                          </span>
                          <span className="ndt-cls-section-pill-sub">
                            {isLoading
                              ? t("classroom.sectionCheckedCues", {
                                  done: st.progress?.processedCues || 0,
                                  total: sec.cueCount,
                                })
                              : t("classroom.sectionRangeCues", {
                                  range: sec.timeRange,
                                  count: sec.cueCount,
                                })}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="ndt-cls-section-bar-actions">
                    {batchAllRunning && bgRunningSection && bgRunningSection.index !== clampedSectionIndex && (
                      <span className="ndt-cls-bg-badge">
                        <RefreshSvg size={11} spinning />
                        <span>
                          {t("classroom.bgGenerating", {
                            n: bgRunningSection.number,
                            done: bgRunningState?.progress?.processedCues || 0,
                            total: bgRunningSection.cueCount,
                          })}
                        </span>
                      </span>
                    )}
                    {overallStats.completedSections < sections.length ? (
                      <button
                        type="button"
                        className={`ndt-cls-btn is-sm ${batchAllRunning ? "is-danger-ghost" : ""}`}
                        onClick={handleExtractAllSections}
                        title={t("classroom.extractAllTitle")}
                      >
                        {batchAllRunning ? (
                          <span>{t("classroom.stopGenerating")}</span>
                        ) : (
                          <>
                            <SparklesIcon size={12} />
                            <span>{t("classroom.generateAll")}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="ndt-cls-all-done-pill">
                        <CheckIcon size={12} />
                        <span>{t("classroom.allSectionsReady", { count: sections.length })}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
              {/* Subtitles Loading */}
              {subState.loading && (
                <div className="ndt-cls-center-stage">
                  <div className="ndt-cls-loading-ring" />
                  <h3 className="ndt-cls-hero-title">
                    {t("classroom.loadingVideoSubs", { platform: platformDisplayName })}
                  </h3>
                  <p className="ndt-cls-hero-desc">{t("classroom.loadingVideoSubsDesc")}</p>
                </div>
              )}

              {/* Subtitles Error or Missing */}
              {!subState.loading &&
                (subState.error ||
                  (subState.data &&
                    (!subState.data.ok ||
                      (currentPlatform === "youtube"
                        ? selectableTracks.length === 0 || Boolean(subState.data.rateLimited && playableTracks.length === 0)
                        : playableTracks.length === 0)))) && (
                  <div className="ndt-cls-center-stage">
                    <div className="ndt-cls-error-box">
                      {subState.error
                        ? subState.error
                        : currentPlatform === "youtube"
                          ? subState.data?.rateLimited || subState.data?.reason === "RATE_LIMITED"
                            ? t("classroom.errYtRateLimit")
                            : subState.data?.partial
                              ? t("classroom.errYtPartial", { count: tracks.length })
                              : t("classroom.errYtNoSub")
                          : subState.data?.reason === "NEED_LOGIN" ||
                              (subState.data?.partial && subState.data?.needLoginSubtitle)
                            ? t("classroom.errBiliNeedLogin")
                            : subState.data?.reason === "NO_SUBTITLE" ||
                                playableTracks.length === 0
                              ? t("classroom.errBiliNoSub")
                              : t("classroom.errUnknownSub")}
                    </div>
                    <div className="ndt-cls-action-row">
                      <button
                        type="button"
                        className="ndt-cls-btn is-primary"
                        onClick={() => loadSubtitles(true)}
                      >
                        <RefreshSvg size={13} />
                        <span>{t("classroom.redetectSubtitles")}</span>
                      </button>
                    </div>
                  </div>
                )}

              {/* Step 1: Track Picker Landing View */}
              {!subState.loading &&
                !hasStartedStudy &&
                selectableTracks.length > 0 &&
                !(currentPlatform === "youtube" && subState.data?.rateLimited && playableTracks.length === 0) && (
                  <div className="ndt-cls-center-stage">
                    <div className="ndt-cls-hero-badge">
                      <SparklesIcon size={13} />
                      <span>{t("classroom.heroBadge", { ratio: difficultyRatio })}</span>
                    </div>
                    <h3 className="ndt-cls-hero-title">{t("classroom.pickTrackTitle")}</h3>
                    <p className="ndt-cls-hero-desc">
                      {t("classroom.pickTrackDesc", { ratio: difficultyRatio })}
                    </p>

                    <div className="ndt-cls-track-cards">
                      {selectableTracks.slice(0, 6).map((tr) => {
                        const isRec = recommendedTrack?.key === tr.key;
                        const isLoaded = Array.isArray(tr.cues) && tr.cues.length > 0;
                        const isBusy = loadingTrackKey === tr.key;
                        const previewPlan = isLoaded
                          ? planSubtitleSections(tr.cues, difficultyRatio)
                          : null;
                        const secCount = previewPlan ? previewPlan.sections.length : 0;
                        const avgPerSec =
                          previewPlan && secCount > 0
                            ? Math.round(previewPlan.totalCues / secCount)
                            : 0;
                        return (
                          <button
                            key={tr.key}
                            type="button"
                            disabled={Boolean(loadingTrackKey)}
                            className={`ndt-cls-track-card ${isRec ? "is-recommended" : ""}`}
                            onClick={() => startTrackStudy(tr)}
                          >
                            <div className="ndt-cls-track-card-top">
                              <span
                                className={`ndt-cls-track-card-name${
                                  isRtlText(getTrackLabel(tr)) ? " is-rtl" : ""
                                }`}
                                dir="auto"
                              >
                                {getTrackLabel(tr) || t("classroom.subtitleTrack")}
                              </span>
                              {isRec && (
                                <span className="ndt-cls-track-card-rec">
                                  {t("classroom.recommended")}
                                </span>
                              )}
                            </div>
                            <div className="ndt-cls-track-card-meta">
                              {isLoaded && previewPlan ? (
                                <>
                                  <span>
                                    {t("classroom.totalCuesMeta", {
                                      count: previewPlan.totalCues,
                                    })}
                                  </span>
                                  <span>
                                    {secCount > 1
                                      ? t("classroom.multiSectionMeta", {
                                          sections: secCount,
                                          avg: avgPerSec,
                                        })
                                      : t("classroom.singleSectionMeta")}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span>
                                    {tr.isAutoGenerated
                                      ? t("classroom.ytAutoSub")
                                      : t("classroom.ytSub")}
                                  </span>
                                  <span>{t("classroom.loadOnDemand")}</span>
                                </>
                              )}
                            </div>
                            <div className="ndt-cls-track-card-cta">
                              {isBusy
                                ? t("classroom.ctaLoadingTrack")
                                : isLoaded
                                  ? secCount > 1
                                    ? t("classroom.ctaMultiSection", { ratio: difficultyRatio })
                                    : t("classroom.ctaSingleSection", { ratio: difficultyRatio })
                                  : t("classroom.ctaLoadAndExtract", { ratio: difficultyRatio })}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectableTracks.length > 6 && (
                      <div className="ndt-cls-action-row" style={{ marginBottom: 14 }}>
                        <span className="ndt-cls-field-label">
                          {t("classroom.moreLanguagesLabel", {
                            count: selectableTracks.length - 6,
                          })}
                        </span>
                        <select
                          className="ndt-cls-select"
                          aria-label={t("classroom.selectOtherLangAria")}
                          disabled={Boolean(loadingTrackKey)}
                          defaultValue=""
                          onChange={(e) => {
                            const chosen = selectableTracks.find((tr) => tr.key === e.target.value);
                            if (chosen) startTrackStudy(chosen);
                          }}
                        >
                          <option value="" disabled>
                            {t("classroom.expandMoreTracks")}
                          </option>
                          {selectableTracks.slice(6).map((tr) => (
                            <option key={tr.key} value={tr.key}>
                              {getTrackLabel(tr)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!currentLlmObj?.ready && (
                      <div className="ndt-cls-action-row">
                        <span className="ndt-cls-field-label">
                          {t("classroom.llmNotConfigured")}
                        </span>
                        <button
                          type="button"
                          className="ndt-cls-btn is-sm"
                          onClick={handleOpenSettings}
                        >
                          {t("classroom.openSettingsBtn")}
                        </button>
                      </div>
                    )}
                  </div>
                )}

              {/* Extracting Active Section with Live Sentence Progress */}
              {!subState.loading &&
                hasStartedStudy &&
                activeSectionState.status === "loading" && (
                  <div className="ndt-cls-center-stage">
                    <div className="ndt-cls-loading-ring" />
                    <div className="ndt-cls-hero-badge">
                      <SparklesIcon size={13} />
                      <span>
                        {currentLlmObj?.name || t("classroom.defaultLlmLabel")}
                        {currentLlmObj?.model ? ` · ${currentLlmObj.model}` : ""}
                      </span>
                      {isMultiSection && activeSection && (
                        <span>
                          · {getSectionTitle(activeSection)}/{sections.length} (
                          {activeSection.timeRange})
                        </span>
                      )}
                    </div>
                    <h3 className="ndt-cls-hero-title">
                      {(() => {
                        const trackLabel =
                          getTrackLabel(currentTrack) || t("subtitle.defaultTrackName");
                        const sectionPart =
                          isMultiSection && activeSection
                            ? ` ${getSectionTitle(activeSection)}`
                            : "";
                        const tpl = t("classroom.analyzingTitle", {
                          track: "__TRACK_PLACEHOLDER__",
                          section: sectionPart,
                        });
                        const parts = tpl.split("__TRACK_PLACEHOLDER__");
                        if (parts.length !== 2) return tpl.replace("__TRACK_PLACEHOLDER__", trackLabel);
                        return (
                          <>
                            {parts[0]}
                            <bdi dir="auto">{trackLabel}</bdi>
                            {parts[1]}
                          </>
                        );
                      })()}
                    </h3>

                    {/* Detailed Sentence Progress Card */}
                    <div className="ndt-cls-progress-card">
                      <div className="ndt-cls-progress-card-top">
                        <span className="ndt-cls-progress-card-label">
                          {isMultiSection
                            ? t("classroom.sectionProgressLabel")
                            : t("classroom.subtitleProgressLabel")}
                        </span>
                        <span className="ndt-cls-progress-card-nums">
                          {t("classroom.checkedCuesStatus", {
                            done: activeProgress.processedCues,
                            total: activeProgress.totalCues,
                            pct: activeProgressPct,
                          })}
                        </span>
                      </div>

                      <div className="ndt-cls-progress-track">
                        <div
                          className="ndt-cls-progress-bar-fill"
                          style={{ width: `${Math.max(4, activeProgressPct)}%` }}
                        />
                      </div>

                      <div className="ndt-cls-progress-details">
                        {activeProgress.batchCount > 1 && (
                          <span className="ndt-cls-progress-chip">
                            {t("classroom.batchProgressChip", {
                              current: activeProgress.batchIndex,
                              total: activeProgress.batchCount,
                            })}
                          </span>
                        )}
                        <span className="ndt-cls-progress-chip">
                          {t("classroom.foundVocabChip", {
                            count: activeProgress.extractedCount,
                          })}
                        </span>
                        {activeProgress.latestTerm && (
                          <span className="ndt-cls-progress-chip is-accent">
                            {t("classroom.latestTermPrefix")}
                            <bdi
                              dir="auto"
                              className={isRtlText(activeProgress.latestTerm) ? "is-rtl" : undefined}
                            >
                              {activeProgress.latestTerm}
                            </bdi>
                          </span>
                        )}
                      </div>

                      {isMultiSection && (
                        <div className="ndt-cls-progress-overall">
                          {t("classroom.overallProgress", {
                            done: overallStats.processedCues,
                            total: overallStats.totalCues,
                            pct: overallStats.percent,
                            completed: overallStats.completedSections,
                            sections: sections.length,
                          })}
                        </div>
                      )}
                    </div>

                    <div className="ndt-cls-action-row" style={{ marginTop: 18 }}>
                      <button
                        type="button"
                        className="ndt-cls-btn"
                        onClick={() => {
                          if (activeStateKey) {
                            cancelSectionExtraction(activeStateKey);
                          }
                          if (!isMultiSection) {
                            setHasStartedStudy(false);
                          }
                        }}
                      >
                        {t("classroom.cancelAnalysis")}
                      </button>
                    </div>
                  </div>
                )}

              {/* Extraction Error */}
              {!subState.loading &&
                hasStartedStudy &&
                activeSectionState.status === "error" && (
                  <div className="ndt-cls-center-stage">
                    <div className="ndt-cls-error-box">{activeSectionState.error}</div>
                    <div className="ndt-cls-action-row">
                      {activeSectionState.needConfig && (
                        <button
                          type="button"
                          className="ndt-cls-btn is-primary"
                          onClick={handleOpenSettings}
                        >
                          {t("classroom.goConfigLlm")}
                        </button>
                      )}
                      <button
                        type="button"
                        className={`ndt-cls-btn ${activeSectionState.needConfig ? "" : "is-primary"}`}
                        onClick={() =>
                          activeSection &&
                          extractSection({ section: activeSection, forceRefresh: true })
                        }
                      >
                        <RefreshSvg size={13} />
                        <span>
                          {isMultiSection
                            ? t("classroom.reExtractSection")
                            : t("classroom.reExtract")}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

              {/* Idle Section Prompt (e.g. after cancelling a section) */}
              {!subState.loading &&
                hasStartedStudy &&
                activeSectionState.status === "idle" &&
                activeSection && (
                  <div className="ndt-cls-center-stage">
                    <div className="ndt-cls-hero-badge">
                      <SparklesIcon size={13} />
                      <span>
                        {t("classroom.idleBadge", {
                          title: getSectionTitle(activeSection),
                          range: activeSection.timeRange,
                          count: activeSection.cueCount,
                        })}
                      </span>
                    </div>
                    <h3 className="ndt-cls-hero-title">{t("classroom.idleTitle")}</h3>
                    <p className="ndt-cls-hero-desc">
                      {t("classroom.idleDesc", {
                        count: activeSection.cueCount,
                        min: activeSection.targetVocab.minCount,
                        max: activeSection.targetVocab.maxCount,
                      })}
                    </p>
                    <button
                      type="button"
                      className="ndt-cls-btn is-primary"
                      onClick={() => extractSection({ section: activeSection })}
                    >
                      <SparklesIcon size={14} />
                      <span>
                        {isMultiSection
                          ? t("classroom.startExtractSection", {
                              title: getSectionTitle(activeSection),
                            })
                          : t("classroom.startExtractVocab")}
                      </span>
                    </button>
                  </div>
                )}

              {/* Step 2: Study Interface */}
              {!subState.loading &&
                hasStartedStudy &&
                activeSectionState.status === "done" &&
                activeSectionState.data && (
                  <>
                    {filteredItems.length === 0 ? (
                      <div className="ndt-cls-center-stage">
                        <p className="ndt-cls-hero-desc">{t("classroom.emptySectionResult")}</p>
                      </div>
                    ) : viewMode === "focus" ? (
                      <div className="ndt-cls-study-split">
                        {/* Far-left 4x4px Status Squares (vertical single-column first, no divider) */}
                        <aside
                          ref={dotRailRef}
                          className="ndt-cls-dot-rail"
                          aria-label={t("classroom.statusRailAria")}
                        >
                          {(() => {
                            const rows = Math.min(filteredItems.length, dotRowsPerCol);
                            const cols = Math.max(1, Math.ceil(filteredItems.length / dotRowsPerCol));
                            return (
                              <div
                                className="ndt-cls-dot-grid"
                                style={{
                                  gridTemplateRows: `repeat(${rows}, 10px)`,
                                  gridTemplateColumns: `repeat(${cols}, 10px)`,
                                }}
                              >
                                {filteredItems.map((item, idx) => {
                                  const isActive = activeItem?.id === item.id;
                                  const status = getWordLearningStatus(item);
                                  const statusLabel =
                                    status === "mastered"
                                      ? t("classroom.statusMastered")
                                      : status === "new"
                                        ? t("classroom.statusNew")
                                        : status === "studied"
                                          ? t("classroom.statusStudied")
                                          : t("classroom.statusUnstudied");
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      className={`ndt-cls-dot-cell is-${status} ${
                                        isActive ? "is-active" : ""
                                      }`}
                                      onClick={() => setActiveItemId(item.id)}
                                      title={`${idx + 1}. ${item.term} · ${statusLabel}`}
                                      aria-label={`${idx + 1}. ${item.term}, ${statusLabel}`}
                                      aria-current={isActive ? "true" : undefined}
                                    >
                                      <span className="ndt-cls-dot-sq" />
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </aside>

                        {/* Centered Learning Card */}
                        {activeItem && (
                          <section className="ndt-cls-detail-pane">
                            <div className="ndt-cls-detail-scroll">
                              <div className="ndt-cls-card-inner">
                                {/* Term Hero */}
                                <div className="ndt-cls-word-header">
                                  <div className="ndt-cls-word-title-row">
                                    <h3
                                      className={`ndt-cls-word-term${
                                        isRtlText(activeItem.term) ? " is-rtl" : ""
                                      }`}
                                      dir="auto"
                                    >
                                      {activeItem.term}
                                    </h3>
                                    <button
                                      type="button"
                                      className="ndt-cls-speak-btn is-icon-only"
                                      onClick={() => handleSpeak(activeItem.term)}
                                      title={t("wordbook.speakTerm")}
                                      aria-label={t("wordbook.speakTerm")}
                                    >
                                      <SpeakerIcon size={16} />
                                    </button>
                                  </div>
                                  <div className="ndt-cls-word-meta">
                                    {activeItem.phonetic && (
                                      <span className="ndt-cls-phonetic">
                                        {activeItem.phonetic}
                                      </span>
                                    )}
                                    {activeItem.pos && (
                                      <span className="ndt-cls-pos-chip">{activeItem.pos}</span>
                                    )}
                                    <span className="ndt-cls-type-chip">
                                      {activeItem.type === "phrase"
                                        ? t("wordbook.typePhrase")
                                        : t("wordbook.typeWord")}
                                    </span>
                                    {activeItem.level && (
                                      <span className="ndt-cls-level-chip">
                                        {activeItem.level}
                                      </span>
                                    )}
                                    <span
                                      className="ndt-cls-diff-dots"
                                      title={t("wordbook.difficultyTitle", {
                                        level: activeItem.difficulty || 4,
                                      })}
                                    >
                                      {[1, 2, 3, 4, 5].map((lvl) => (
                                        <span
                                          key={lvl}
                                          className={`ndt-cls-diff-dot ${
                                            lvl <= (activeItem.difficulty || 4) ? "is-filled" : ""
                                          }`}
                                        />
                                      ))}
                                    </span>
                                    {activeItem.surfaceForm &&
                                      activeItem.surfaceForm.toLowerCase() !==
                                        activeItem.term.toLowerCase() && (
                                        <span className="ndt-cls-surface-chip">
                                          {t("wordbook.surfaceFormPrefix")}
                                          <bdi
                                            dir="auto"
                                            className={
                                              isRtlText(activeItem.surfaceForm)
                                                ? "is-rtl"
                                                : undefined
                                            }
                                          >
                                            {activeItem.surfaceForm}
                                          </bdi>
                                        </span>
                                      )}
                                  </div>
                                </div>

                                {/* Translation & Usage */}
                                <div className="ndt-cls-section">
                                  {quizMode && !isMeaningHidden && (
                                    <div className="ndt-cls-section-head">
                                      <button
                                        type="button"
                                        className="ndt-cls-filter-pill"
                                        onClick={() => toggleRevealItem(activeItem.id)}
                                      >
                                        {t("wordbook.hideAgain")}
                                      </button>
                                    </div>
                                  )}
                                  {isMeaningHidden ? (
                                    <div
                                      className="ndt-cls-reveal-mask"
                                      onClick={() => toggleRevealItem(activeItem.id)}
                                    >
                                      {t("wordbook.quizRevealMask")}
                                    </div>
                                  ) : (
                                    <>
                                      <p className="ndt-cls-meaning-text">
                                        {activeItem.translation || t("wordbook.noMeaning")}
                                      </p>
                                      {activeItem.explanation && (
                                        <p className="ndt-cls-explanation">
                                          {activeItem.explanation}
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>

                                {/* Subtitle Context */}
                                {activeItem.videoQuote && (
                                  <div className="ndt-cls-section">
                                    <div className="ndt-cls-section-head">
                                      <span className="ndt-cls-section-label">
                                        {t("wordbook.videoQuoteLabel")}
                                      </span>
                                      <div className="ndt-cls-study-actions">
                                        <button
                                          type="button"
                                          className="ndt-cls-speak-btn is-mini"
                                          onClick={() => handleSpeak(activeItem.videoQuote)}
                                          title={t("wordbook.speakQuote")}
                                        >
                                          <SpeakerIcon size={13} />
                                        </button>
                                        {activeItem.videoTime != null && (
                                          <button
                                            type="button"
                                            className="ndt-cls-time-btn"
                                            onClick={() => handleSeekVideo(activeItem.videoTime, true)}
                                            title={t("wordbook.seekVideoTitle")}
                                          >
                                            {t("wordbook.seekVideoBtn", {
                                              time: formatSubtitleTime(activeItem.videoTime),
                                            })}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <div
                                      className={`ndt-cls-quote-box${
                                        isRtlText(activeItem.videoQuote) ? " is-rtl" : ""
                                      }`}
                                      dir="auto"
                                    >
                                      {renderHighlightedQuote(
                                        activeItem.videoQuote,
                                        activeItem.term,
                                        activeItem.surfaceForm
                                      )}
                                    </div>
                                    {activeItem.videoQuoteTranslation && (
                                      <div
                                        className={`ndt-cls-quote-zh ${
                                          isMeaningHidden ? "is-hidden" : ""
                                        }`}
                                        onClick={() => {
                                          if (isMeaningHidden) {
                                            toggleRevealItem(activeItem.id);
                                          }
                                        }}
                                      >
                                        {activeItem.videoQuoteTranslation}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Examples */}
                                {Array.isArray(activeItem.examples) &&
                                  activeItem.examples.length > 0 && (
                                    <div className="ndt-cls-section">
                                      <div className="ndt-cls-section-head">
                                        <span className="ndt-cls-section-label">
                                          {t("wordbook.examplesLabel", {
                                            count: activeItem.examples.length,
                                          })}
                                        </span>
                                      </div>
                                      <div className="ndt-cls-example-list">
                                        {activeItem.examples.map((ex, idx) => (
                                          <div key={idx} className="ndt-cls-example-item">
                                            <div className="ndt-cls-example-top">
                                              <div
                                                className={`ndt-cls-example-src${
                                                  isRtlText(ex.sentence) ? " is-rtl" : ""
                                                }`}
                                                dir="auto"
                                              >
                                                {renderHighlightedQuote(
                                                  ex.sentence,
                                                  activeItem.term,
                                                  activeItem.surfaceForm
                                                )}
                                              </div>
                                              <button
                                                type="button"
                                                className="ndt-cls-speak-btn is-mini"
                                                onClick={() => handleSpeak(ex.sentence)}
                                                title={t("wordbook.speakExample")}
                                              >
                                                <SpeakerIcon size={13} />
                                              </button>
                                            </div>
                                            {ex.translation && (
                                              <div
                                                className={`ndt-cls-example-zh ${
                                                  isMeaningHidden ? "is-hidden" : ""
                                                }`}
                                                onClick={() => {
                                                  if (isMeaningHidden) {
                                                    toggleRevealItem(activeItem.id);
                                                  }
                                                }}
                                              >
                                                {ex.translation}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>

                            {/* Footer Nav & Actions */}
                            <div className="ndt-cls-detail-footer">
                              <div className="ndt-cls-footer-left">
                                <label
                                  className={`ndt-cls-quiz-toggle ${quizMode ? "is-checked" : ""}`}
                                  title={t("wordbook.quizModeTitle")}
                                >
                                  <input
                                    type="checkbox"
                                    checked={quizMode}
                                    onChange={(e) => {
                                      setQuizMode(e.target.checked);
                                      setRevealedIds(new Set());
                                    }}
                                  />
                                  <span className="ndt-cls-switch-track" aria-hidden="true">
                                    <span className="ndt-cls-switch-thumb" />
                                  </span>
                                  <span>{t("wordbook.quizModeLabel")}</span>
                                </label>
                              </div>

                              <div className="ndt-cls-nav-btns">
                                <button
                                  type="button"
                                  className="ndt-cls-btn"
                                  disabled={activeIndex <= 0}
                                  onClick={() =>
                                    setActiveItemId(filteredItems[activeIndex - 1].id)
                                  }
                                >
                                  {t("wordbook.prevItem")}
                                </button>
                                {activeIndex < filteredItems.length - 1 ? (
                                  <button
                                    type="button"
                                    className="ndt-cls-btn"
                                    onClick={() =>
                                      setActiveItemId(filteredItems[activeIndex + 1].id)
                                    }
                                  >
                                    {t("wordbook.nextItem")}
                                  </button>
                                ) : nextSection ? (
                                  <button
                                    type="button"
                                    className="ndt-cls-btn is-primary"
                                    onClick={() => handleSelectSection(nextSection)}
                                  >
                                    {t("classroom.enterNextSection", {
                                      title: getSectionTitle(nextSection),
                                    })}
                                  </button>
                                ) : (
                                  <button type="button" className="ndt-cls-btn" disabled>
                                    {t("wordbook.lastItem")}
                                  </button>
                                )}
                              </div>

                              <div className="ndt-cls-study-actions">
                                <button
                                  type="button"
                                  className={`ndt-cls-btn ${
                                    sessionMasteredIds.has(activeItem.id) ? "is-saved" : ""
                                  }`}
                                  onClick={() => toggleSessionMastered(activeItem.id)}
                                  title={t("wordbook.masteredHotkey")}
                                >
                                  <CheckIcon size={14} />
                                  <span>
                                    {sessionMasteredIds.has(activeItem.id)
                                      ? t("classroom.sessionMastered")
                                      : t("classroom.markMastered")}
                                  </span>
                                </button>

                                {(() => {
                                  const isSaved = wordbook.hasTerm(
                                    activeItem.term,
                                    studyLangKey
                                  );
                                  return (
                                    <button
                                      type="button"
                                      className={`ndt-cls-btn ${
                                        isSaved ? "is-saved" : "is-primary"
                                      }`}
                                      onClick={() => handleToggleWordbook(activeItem)}
                                      title={t("classroom.wordbookHotkey")}
                                    >
                                      <StarIcon filled={isSaved} size={14} />
                                      <span>
                                        {isSaved
                                          ? t("classroom.inWordbook")
                                          : t("classroom.addToWordbook")}
                                      </span>
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          </section>
                        )}
                      </div>
                    ) : (
                      /* Grid Overview Mode */
                      <div className="ndt-cls-grid-wrap">
                        <div className="ndt-cls-grid">
                          {filteredItems.map((item) => {
                            const isSaved = wordbook.hasTerm(item.term, studyLangKey);
                            const previewSentence =
                              item.examples?.[0]?.sentence || item.videoQuote || "";
                            return (
                              <div key={item.id} className="ndt-cls-grid-card">
                                <div className="ndt-cls-grid-card-head">
                                  <div>
                                    <button
                                      type="button"
                                      className={`ndt-cls-grid-term${
                                        isRtlText(item.term) ? " is-rtl" : ""
                                      }`}
                                      dir="auto"
                                      onClick={() => {
                                        setActiveItemId(item.id);
                                        setViewMode("focus");
                                      }}
                                    >
                                      {item.term}
                                    </button>
                                    <div className="ndt-cls-word-meta" style={{ marginTop: 4 }}>
                                      {item.phonetic && (
                                        <span className="ndt-cls-phonetic">{item.phonetic}</span>
                                      )}
                                      {item.pos && (
                                        <span className="ndt-cls-pos-chip">{item.pos}</span>
                                      )}
                                      {item.level && (
                                        <span className="ndt-cls-level-chip">{item.level}</span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="ndt-cls-speak-btn is-mini"
                                    onClick={() => handleSpeak(item.term)}
                                    title={t("wordbook.speakShort")}
                                  >
                                    <SpeakerIcon size={13} />
                                  </button>
                                </div>

                                <div className="ndt-cls-grid-trans">{item.translation}</div>

                                {previewSentence && (
                                  <div
                                    className={`ndt-cls-grid-ex${
                                      isRtlText(previewSentence) ? " is-rtl" : ""
                                    }`}
                                    dir="auto"
                                  >
                                    {renderHighlightedQuote(
                                      previewSentence,
                                      item.term,
                                      item.surfaceForm
                                    )}
                                  </div>
                                )}

                                <div className="ndt-cls-grid-foot">
                                  <button
                                    type="button"
                                    className="ndt-cls-filter-pill"
                                    onClick={() => {
                                      setActiveItemId(item.id);
                                      setViewMode("focus");
                                    }}
                                  >
                                    {t("wordbook.detailStudyBtn")}
                                  </button>
                                  <button
                                    type="button"
                                    className={`ndt-cls-btn is-sm ${
                                      isSaved ? "is-saved" : "is-primary"
                                    }`}
                                    onClick={() => handleToggleWordbook(item)}
                                  >
                                    <StarIcon filled={isSaved} size={12} />
                                    <span>
                                      {isSaved
                                        ? t("classroom.inWordbookShort")
                                        : t("classroom.addToWordbook")}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
            </div>
          </>
        )}

        {/* Tab 2: Vocabulary Book */}
        {activeTab === "wordbook" && (
          <div className="ndt-cls-wb-wrap">
            <div className="ndt-cls-wb-toolbar">
              <div className="ndt-cls-search-box">
                <span className="ndt-cls-search-icon">
                  <SearchSvg size={14} />
                </span>
                <input
                  type="text"
                  className="ndt-cls-search-input"
                  placeholder={t("classroom.searchPlaceholder")}
                  value={wbSearch}
                  onChange={(e) => setWbSearch(e.target.value)}
                />
              </div>

              <div className="ndt-cls-toolbar-group">
                <div className="ndt-cls-ratio-group">
                  <button
                    type="button"
                    className={`ndt-cls-ratio-btn ${wbFilter === "all" ? "is-active" : ""}`}
                    onClick={() => setWbFilter("all")}
                  >
                    {t("wordbook.filterAll", { count: wordbook.items.length })}
                  </button>
                  <button
                    type="button"
                    className={`ndt-cls-ratio-btn ${wbFilter === "learning" ? "is-active" : ""}`}
                    onClick={() => setWbFilter("learning")}
                  >
                    {t("wordbook.filterLearning", {
                      count: wordbook.items.filter((i) => !i.mastered).length,
                    })}
                  </button>
                  <button
                    type="button"
                    className={`ndt-cls-ratio-btn ${wbFilter === "mastered" ? "is-active" : ""}`}
                    onClick={() => setWbFilter("mastered")}
                  >
                    {t("wordbook.filterMastered", {
                      count: wordbook.items.filter((i) => i.mastered).length,
                    })}
                  </button>
                </div>

                {wordbook.items.length > 0 && (
                  <div className="ndt-cls-ratio-group">
                    <button
                      type="button"
                      className={`ndt-cls-ratio-btn ${wbViewMode === "focus" ? "is-active" : ""}`}
                      onClick={() => setWbViewMode("focus")}
                    >
                      {t("classroom.viewFocus")}
                    </button>
                    <button
                      type="button"
                      className={`ndt-cls-ratio-btn ${wbViewMode === "grid" ? "is-active" : ""}`}
                      onClick={() => setWbViewMode("grid")}
                    >
                      {t("classroom.viewGrid")}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="ndt-cls-btn is-sm"
                  disabled={wordbook.items.length === 0}
                  onClick={handleExportWordbook}
                >
                  {t("wordbook.exportTsvBtn")}
                </button>
              </div>
            </div>

            <WordbookBoard
              ref={wbBoardRef}
              items={filteredWordbook}
              totalCount={wordbook.items.length}
              viewMode={wbViewMode}
              onViewModeChange={setWbViewMode}
              onSpeak={(text, item) =>
                handleSpeak(
                  text,
                  mapSubtitleLangToTtsSource(item?.language, item?.languageLabel)
                )
              }
              onToggleMastered={(item) => {
                wordbook.toggleMastered(item.id);
              }}
              onRemove={(item) => {
                wordbook.removeItem(item.id);
                showToast(
                  t("classroom.toastRemovedShort", { term: isolateBidiInline(item.term) })
                );
              }}
              onSeekVideo={handleSeekVideo}
              currentVideoId={resolvedVideoId}
              onGoStudy={() => setActiveTab("study")}
              enableKeyboardShortcuts={false}
            />
          </div>
        )}
      </div>

      {toastMsg && <div className="ndt-cls-toast">{toastMsg}</div>}
    </div>
  );
}
