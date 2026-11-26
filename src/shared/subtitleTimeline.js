export const SUBTITLE_LEAD_PAD_COUNT = 4;

export function formatSubtitleTime(seconds, showMs = false) {
  const num = Number(seconds);
  if (!Number.isFinite(num) || num < 0) return showMs ? "00:00.00" : "00:00";
  const mins = Math.floor(num / 60);
  const wholeSecs = Math.floor(num % 60);
  if (!showMs) {
    return `${String(mins).padStart(2, "0")}:${String(wholeSecs).padStart(2, "0")}`;
  }
  const secs = (num % 60).toFixed(2).padStart(5, "0");
  return `${String(mins).padStart(2, "0")}:${secs}`;
}

export function pickDefaultSelectedTrackKeys(tracks) {
  if (!Array.isArray(tracks) || tracks.length === 0) return [];
  const playable = tracks.filter((t) => Array.isArray(t?.cues) && t.cues.length > 0);
  const pool = playable.length > 0 ? playable : tracks;
  if (pool.length <= 2) {
    return pool.map((t) => t.key);
  }
  const selected = [];
  const seenBases = new Set();
  for (const track of pool) {
    const base = String(track.lan || track.lanDoc || track.key)
      .toLowerCase()
      .split(/[-_]/)[0];
    if (!seenBases.has(base)) {
      seenBases.add(base);
      selected.push(track.key);
      if (selected.length >= 2) break;
    }
  }
  if (selected.length === 0 && pool[0]) {
    selected.push(pool[0].key);
  }
  return selected;
}

export function mergeSubtitleTimelineRows(tracks, selectedKeys) {
  if (!Array.isArray(tracks) || !Array.isArray(selectedKeys) || selectedKeys.length === 0) {
    return [];
  }
  const selectedSet = new Set(selectedKeys);
  const activeTracks = tracks.filter(
    (t) => t && selectedSet.has(t.key) && Array.isArray(t.cues) && t.cues.length > 0
  );
  if (activeTracks.length === 0) return [];

  if (activeTracks.length === 1) {
    const only = activeTracks[0];
    return only.cues.map((cue, idx) => ({
      key: `${only.key}-${idx}-${cue.from}`,
      from: cue.from,
      to: cue.to,
      items: [
        {
          trackKey: only.key,
          lan: only.lan || "",
          lanDoc: only.lanDoc || only.lan || "",
          content: cue.content,
        },
      ],
    }));
  }

  const allEvents = [];
  for (let tIdx = 0; tIdx < activeTracks.length; tIdx += 1) {
    const cues = activeTracks[tIdx].cues;
    for (let cIdx = 0; cIdx < cues.length; cIdx += 1) {
      allEvents.push({
        tIdx,
        from: Number(cues[cIdx].from ?? 0),
        to: Number(cues[cIdx].to ?? 0),
      });
    }
  }
  allEvents.sort((a, b) => a.from - b.from || a.tIdx - b.tIdx);

  const ANCHOR_EPSILON = 0.28;
  const anchors = [];
  for (const ev of allEvents) {
    const prev = anchors[anchors.length - 1];
    if (!prev || ev.from - prev.from > ANCHOR_EPSILON) {
      anchors.push({ from: ev.from });
    }
  }

  const ptrs = new Array(activeTracks.length).fill(0);
  const rows = [];

  for (let aIdx = 0; aIdx < anchors.length; aIdx += 1) {
    const rowFrom = anchors[aIdx].from;
    const nextFrom = anchors[aIdx + 1]?.from;
    const probeTime =
      nextFrom != null
        ? rowFrom + Math.min(0.25, Math.max(0.02, (nextFrom - rowFrom) * 0.35))
        : rowFrom + 0.1;

    const items = [];
    let rowTo = rowFrom;

    for (let tIdx = 0; tIdx < activeTracks.length; tIdx += 1) {
      const track = activeTracks[tIdx];
      const cues = track.cues;
      while (ptrs[tIdx] < cues.length) {
        const cand = cues[ptrs[tIdx]];
        const startsAtAnchor = Math.abs(cand.from - rowFrom) <= ANCHOR_EPSILON;
        if (!startsAtAnchor && cand.to <= Math.max(rowFrom + 0.05, probeTime)) {
          ptrs[tIdx] += 1;
        } else {
          break;
        }
      }
      const cue = cues[ptrs[tIdx]];
      if (!cue) continue;
      const matchesCluster = Math.abs(cue.from - rowFrom) <= ANCHOR_EPSILON;
      const coversProbe = cue.from <= probeTime && cue.to > probeTime;
      if (matchesCluster || coversProbe) {
        items.push({
          trackKey: track.key,
          lan: track.lan || "",
          lanDoc: track.lanDoc || track.lan || "",
          content: cue.content,
        });
        if (cue.to > rowTo) rowTo = cue.to;
      }
    }

    if (items.length > 0) {
      rows.push({
        key: `row-${aIdx}-${rowFrom.toFixed(2)}`,
        from: rowFrom,
        to: rowTo,
        items,
      });
    }
  }

  return rows;
}

export function findActiveSubtitleIndex(rows, currentTime) {
  if (!Array.isArray(rows) || rows.length === 0) return -1;
  const t = Number(currentTime);
  if (!Number.isFinite(t) || t <= rows[0].from) return 0;

  let lo = 0;
  let hi = rows.length - 1;
  let lastStarted = 0;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid].from <= t) {
      lastStarted = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (t <= rows[lastStarted].to) {
    return lastStarted;
  }

  for (let i = lastStarted - 1; i >= 0 && rows[lastStarted].from - rows[i].from <= 15; i -= 1) {
    if (rows[i].from <= t && t <= rows[i].to) {
      return i;
    }
  }

  return lastStarted;
}

export function normalizeSubtitleNavCues(rawCues) {
  if (!Array.isArray(rawCues) || rawCues.length === 0) return [];
  const valid = [];
  for (const raw of rawCues) {
    if (!raw) continue;
    const from = Number(raw.from);
    if (!Number.isFinite(from) || from < 0) continue;
    const content = String(raw.content ?? "").trim();
    if (!content) continue;
    const rawTo = Number(raw.to);
    const to = Number.isFinite(rawTo) && rawTo >= from ? rawTo : from;
    valid.push({ from, to, content });
  }
  valid.sort((a, b) => a.from - b.from || a.to - b.to);

  const merged = [];
  for (const cue of valid) {
    const prev = merged[merged.length - 1];
    if (prev && cue.from - prev.from < 0.08) {
      if (cue.to > prev.to) prev.to = cue.to;
      if (cue.content && !prev.content.includes(cue.content)) {
        prev.content = `${prev.content} ${cue.content}`;
      }
      continue;
    }
    merged.push({ ...cue });
  }
  return merged;
}

export function findNavSubtitleIndex(cues, currentTime) {
  if (!Array.isArray(cues) || cues.length === 0) return -1;
  const t = Number(currentTime);
  if (!Number.isFinite(t)) return -1;

  const TOLERANCE = 0.05;
  if (t + TOLERANCE < cues[0].from) {
    return -1;
  }

  let lo = 0;
  let hi = cues.length - 1;
  let lastStarted = 0;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].from <= t + TOLERANCE) {
      lastStarted = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return lastStarted;
}

export const PREV_REPLAY_THRESHOLD_SECONDS = 3;

export function computeTargetNavIndex(
  cues,
  currentIndex,
  direction,
  currentTime = null,
  replayThresholdSeconds = PREV_REPLAY_THRESHOLD_SECONDS
) {
  if (!Array.isArray(cues) || cues.length === 0) return -1;
  if (direction === "prev") {
    if (currentIndex <= 0) return 0;
    const t = Number(currentTime);
    const cueFrom = cues[currentIndex]?.from;
    if (
      currentTime != null &&
      Number.isFinite(t) &&
      Number.isFinite(cueFrom) &&
      t - cueFrom > replayThresholdSeconds
    ) {
      return currentIndex;
    }
    return currentIndex - 1;
  }
  if (direction === "next") {
    if (currentIndex < 0) return 0;
    return Math.min(cues.length - 1, currentIndex + 1);
  }
  if (direction === "current") {
    if (currentIndex < 0) return 0;
    return Math.min(cues.length - 1, currentIndex);
  }
  return currentIndex;
}

export function computeCueSeekTime(cue) {
  if (!cue || !Number.isFinite(Number(cue.from))) return 0;
  const from = Math.max(0, Number(cue.from));
  const to = Number(cue.to);
  if (Number.isFinite(to) && to > from && to - from < 0.04) {
    return from + (to - from) * 0.25;
  }
  return from + 0.01;
}
