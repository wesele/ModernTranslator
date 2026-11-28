(function installNdtYouTubeMainHook() {
  if (typeof window === "undefined") return;
  if (window.__NDT_YT_HOOK_INSTALLED__) return;
  window.__NDT_YT_HOOK_INSTALLED__ = true;

  const MAX_TIMEDTEXT_ENTRIES = 30;
  const MAX_VIDEO_ENTRIES = 12;

  function setBounded(mapObj, key, value, maxSize) {
    if (!key) return;
    if (key in mapObj) {
      delete mapObj[key];
    }
    mapObj[key] = value;
    const keys = Object.keys(mapObj);
    while (keys.length > maxSize) {
      const oldest = keys.shift();
      if (oldest) delete mapObj[oldest];
    }
  }

  const store = window.__NDT_YT_STORE__ || {
    potByVideo: Object.create(null),
    timedtextByKey: Object.create(null),
    playerResponseByVideo: Object.create(null),
    nextDataByVideo: Object.create(null),
    transcriptByKey: Object.create(null),
  };
  window.__NDT_YT_STORE__ = store;

  function toAbsUrl(rawUrl) {
    if (!rawUrl) return "";
    try {
      return new URL(String(rawUrl), window.location.href).toString();
    } catch {
      return "";
    }
  }

  function recordTimedtextMeta(absUrl) {
    if (!absUrl || !absUrl.includes("/api/timedtext")) return null;
    try {
      const u = new URL(absUrl);
      const videoId = (u.searchParams.get("v") || "").trim();
      const lang = (u.searchParams.get("lang") || "").trim();
      const kind = (u.searchParams.get("kind") || "").trim();
      const tlang = (u.searchParams.get("tlang") || "").trim();
      const pot = (u.searchParams.get("pot") || "").trim();
      if (videoId && pot) {
        setBounded(store.potByVideo, videoId, pot, MAX_VIDEO_ENTRIES);
      }
      return { videoId, lang, kind, tlang, pot, url: absUrl };
    } catch {
      return null;
    }
  }

  function recordTimedtextPayload(meta, bodyText) {
    if (!meta || !meta.videoId) return;
    const trimmed = typeof bodyText === "string" ? bodyText.trim() : "";
    if (!trimmed) return;
    const vssId = meta.lang ? `${meta.kind === "asr" ? "a." : "."}${meta.lang}` : "";
    const key = `${meta.videoId}|${meta.lang}|${meta.kind}|${meta.tlang}`;
    setBounded(
      store.timedtextByKey,
      key,
      {
        videoId: meta.videoId,
        lang: meta.lang,
        kind: meta.kind,
        tlang: meta.tlang,
        vssId,
        pot: meta.pot,
        url: meta.url,
        bodyText,
        capturedAt: Date.now(),
      },
      MAX_TIMEDTEXT_ENTRIES
    );
    try {
      window.dispatchEvent(
        new CustomEvent("ndt-yt-timedtext-captured", {
          detail: {
            videoId: meta.videoId,
            lang: meta.lang,
            kind: meta.kind,
            tlang: meta.tlang,
            vssId,
            pot: meta.pot,
          },
        })
      );
    } catch {
      // ignore event dispatch errors
    }
  }

  function extractVideoIdFromNextJson(json) {
    return (
      json?.currentVideoEndpoint?.watchEndpoint?.videoId ||
      json?.playerOverlays?.playerOverlayRenderer?.endScreen?.watchNextEndScreenRenderer
        ?.results?.[0]?.endScreenVideoRenderer?.videoId ||
      ""
    );
  }

  function handleJsonApiPayload(absUrl, json, requestBodyText = "") {
    if (!json || typeof json !== "object") return;
    if (absUrl.includes("/youtubei/v1/player")) {
      const vid = json?.videoDetails?.videoId || "";
      if (vid) {
        setBounded(store.playerResponseByVideo, vid, json, MAX_VIDEO_ENTRIES);
      }
      return;
    }
    if (absUrl.includes("/youtubei/v1/next")) {
      let vid = "";
      if (requestBodyText) {
        try {
          vid = JSON.parse(requestBodyText)?.videoId || "";
        } catch {
          // ignore
        }
      }
      if (!vid) {
        vid = extractVideoIdFromNextJson(json);
      }
      if (!vid) {
        try {
          vid = new URL(window.location.href).searchParams.get("v") || "";
        } catch {
          // ignore
        }
      }
      if (vid) {
        setBounded(store.nextDataByVideo, vid, json, MAX_VIDEO_ENTRIES);
      }
      return;
    }
    if (absUrl.includes("/youtubei/v1/get_transcript") || absUrl.includes("/youtubei/v1/get_panel")) {
      let vid = "";
      try {
        vid = new URL(window.location.href).searchParams.get("v") || "";
      } catch {
        // ignore
      }
      if (vid) {
        setBounded(
          store.transcriptByKey,
          vid,
          { videoId: vid, json, capturedAt: Date.now() },
          MAX_VIDEO_ENTRIES
        );
      }
    }
  }

  function classifyInterestingUrl(absUrl) {
    if (!absUrl) return "";
    if (absUrl.includes("/api/timedtext")) return "timedtext";
    if (
      absUrl.includes("/youtubei/v1/player") ||
      absUrl.includes("/youtubei/v1/next") ||
      absUrl.includes("/youtubei/v1/get_transcript") ||
      absUrl.includes("/youtubei/v1/get_panel")
    ) {
      return "innertube";
    }
    return "";
  }

  // Hook window.fetch
  const origFetch = window.fetch;
  if (typeof origFetch === "function") {
    window.fetch = function ndtPatchedFetch(input, init) {
      let absUrl = "";
      let reqBody = "";
      try {
        const rawUrl = typeof input === "string" ? input : input && input.url ? input.url : "";
        absUrl = toAbsUrl(rawUrl);
        if (init && typeof init.body === "string") {
          reqBody = init.body;
        }
      } catch {
        // ignore URL inspection errors
      }

      const kind = classifyInterestingUrl(absUrl);
      const timedtextMeta = kind === "timedtext" ? recordTimedtextMeta(absUrl) : null;
      const promise = origFetch.apply(this, arguments);

      if (kind && promise && typeof promise.then === "function") {
        promise.then(
          (res) => {
            try {
              if (!res || !res.ok || typeof res.clone !== "function") return;
              const cloned = res.clone();
              if (kind === "timedtext") {
                cloned.text().then((txt) => recordTimedtextPayload(timedtextMeta, txt)).catch(() => {});
              } else if (kind === "innertube") {
                cloned.json().then((json) => handleJsonApiPayload(absUrl, json, reqBody)).catch(() => {});
              }
            } catch {
              // never disrupt caller
            }
          },
          () => {}
        );
      }

      return promise;
    };
  }

  // Hook XMLHttpRequest
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  if (typeof origOpen === "function" && typeof origSend === "function") {
    XMLHttpRequest.prototype.open = function ndtPatchedXhrOpen(method, url) {
      try {
        this.__ndtUrl = toAbsUrl(url);
      } catch {
        this.__ndtUrl = "";
      }
      return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function ndtPatchedXhrSend(body) {
      const absUrl = this.__ndtUrl || "";
      const kind = classifyInterestingUrl(absUrl);
      if (kind) {
        const reqBody = typeof body === "string" ? body : "";
        const timedtextMeta = kind === "timedtext" ? recordTimedtextMeta(absUrl) : null;
        this.addEventListener(
          "load",
          () => {
            try {
              if (this.status < 200 || this.status >= 300) return;
              if (kind === "timedtext") {
                let text = "";
                if (this.responseType === "" || this.responseType === "text") {
                  text = this.responseText || "";
                } else if (this.responseType === "json" && this.response) {
                  text = JSON.stringify(this.response);
                } else if (this.responseType === "arraybuffer" && this.response) {
                  text = new TextDecoder().decode(this.response);
                }
                recordTimedtextPayload(timedtextMeta, text);
              } else if (kind === "innertube") {
                let json = null;
                if (this.responseType === "json" && this.response) {
                  json = this.response;
                } else if (
                  (this.responseType === "" || this.responseType === "text") &&
                  this.responseText
                ) {
                  json = JSON.parse(this.responseText);
                }
                if (json) handleJsonApiPayload(absUrl, json, reqBody);
              }
            } catch {
              // ignore XHR capture errors
            }
          },
          { once: true }
        );
      }
      return origSend.apply(this, arguments);
    };
  }
})();
