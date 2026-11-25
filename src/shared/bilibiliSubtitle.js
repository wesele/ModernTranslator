const WBI_MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

function md5(input) {
  function rotateLeft(value, shift) {
    return (value << shift) | (value >>> (32 - shift));
  }
  function addUnsigned(x, y) {
    const x4 = x & 0x40000000;
    const y4 = y & 0x40000000;
    const x8 = x & 0x80000000;
    const y8 = y & 0x80000000;
    const res = (x & 0x3fffffff) + (y & 0x3fffffff);
    if (x4 & y4) return res ^ 0x80000000 ^ x8 ^ y8;
    if (x4 | y4) {
      if (res & 0x40000000) return res ^ 0xc0000000 ^ x8 ^ y8;
      return res ^ 0x40000000 ^ x8 ^ y8;
    }
    return res ^ x8 ^ y8;
  }
  function f(x, y, z) {
    return (x & y) | (~x & z);
  }
  function g(x, y, z) {
    return (x & z) | (y & ~z);
  }
  function h(x, y, z) {
    return x ^ y ^ z;
  }
  function i(x, y, z) {
    return y ^ (x | ~z);
  }
  function step(fn, a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(fn(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function toWordArray(str) {
    const utf8 = unescape(encodeURIComponent(str));
    const len = utf8.length;
    const wordCount = (((len + 8) - ((len + 8) % 64)) / 64 + 1) * 16;
    const words = new Array(wordCount - 1).fill(0);
    let bytePos = 0;
    let byteCount = 0;
    while (byteCount < len) {
      const wordIdx = (byteCount - (byteCount % 4)) / 4;
      bytePos = (byteCount % 4) * 8;
      words[wordIdx] |= utf8.charCodeAt(byteCount) << bytePos;
      byteCount += 1;
    }
    const wordIdx = (byteCount - (byteCount % 4)) / 4;
    bytePos = (byteCount % 4) * 8;
    words[wordIdx] |= 0x80 << bytePos;
    words[wordCount - 2] = len << 3;
    words[wordCount - 1] = len >>> 29;
    return words;
  }
  function wordToHex(value) {
    let hex = "";
    for (let count = 0; count <= 3; count += 1) {
      const byte = (value >>> (count * 8)) & 255;
      const temp = "0" + byte.toString(16);
      hex += temp.slice(-2);
    }
    return hex;
  }

  const x = toWordArray(input);
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let k = 0; k < x.length; k += 16) {
    const aa = a;
    const bb = b;
    const cc = c;
    const dd = d;

    a = step(f, a, b, c, d, x[k + 0], 7, 0xd76aa478);
    d = step(f, d, a, b, c, x[k + 1], 12, 0xe8c7b756);
    c = step(f, c, d, a, b, x[k + 2], 17, 0x242070db);
    b = step(f, b, c, d, a, x[k + 3], 22, 0xc1bdceee);
    a = step(f, a, b, c, d, x[k + 4], 7, 0xf57c0faf);
    d = step(f, d, a, b, c, x[k + 5], 12, 0x4787c62a);
    c = step(f, c, d, a, b, x[k + 6], 17, 0xa8304613);
    b = step(f, b, c, d, a, x[k + 7], 22, 0xfd469501);
    a = step(f, a, b, c, d, x[k + 8], 7, 0x698098d8);
    d = step(f, d, a, b, c, x[k + 9], 12, 0x8b44f7af);
    c = step(f, c, d, a, b, x[k + 10], 17, 0xffff5bb1);
    b = step(f, b, c, d, a, x[k + 11], 22, 0x895cd7be);
    a = step(f, a, b, c, d, x[k + 12], 7, 0x6b901122);
    d = step(f, d, a, b, c, x[k + 13], 12, 0xfd987193);
    c = step(f, c, d, a, b, x[k + 14], 17, 0xa679438e);
    b = step(f, b, c, d, a, x[k + 15], 22, 0x49b40821);

    a = step(g, a, b, c, d, x[k + 1], 5, 0xf61e2562);
    d = step(g, d, a, b, c, x[k + 6], 9, 0xc040b340);
    c = step(g, c, d, a, b, x[k + 11], 14, 0x265e5a51);
    b = step(g, b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
    a = step(g, a, b, c, d, x[k + 5], 5, 0xd62f105d);
    d = step(g, d, a, b, c, x[k + 10], 9, 0x02441453);
    c = step(g, c, d, a, b, x[k + 15], 14, 0xd8a1e681);
    b = step(g, b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
    a = step(g, a, b, c, d, x[k + 9], 5, 0x21e1cde6);
    d = step(g, d, a, b, c, x[k + 14], 9, 0xc33707d6);
    c = step(g, c, d, a, b, x[k + 3], 14, 0xf4d50d87);
    b = step(g, b, c, d, a, x[k + 8], 20, 0x455a14ed);
    a = step(g, a, b, c, d, x[k + 13], 5, 0xa9e3e905);
    d = step(g, d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
    c = step(g, c, d, a, b, x[k + 7], 14, 0x676f02d9);
    b = step(g, b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);

    a = step(h, a, b, c, d, x[k + 5], 4, 0xfffa3942);
    d = step(h, d, a, b, c, x[k + 8], 11, 0x8771f681);
    c = step(h, c, d, a, b, x[k + 11], 16, 0x6d9d6122);
    b = step(h, b, c, d, a, x[k + 14], 23, 0xfde5380c);
    a = step(h, a, b, c, d, x[k + 1], 4, 0xa4beea44);
    d = step(h, d, a, b, c, x[k + 4], 11, 0x4bdecfa9);
    c = step(h, c, d, a, b, x[k + 7], 16, 0xf6bb4b60);
    b = step(h, b, c, d, a, x[k + 10], 23, 0xbebfbc70);
    a = step(h, a, b, c, d, x[k + 13], 4, 0x289b7ec6);
    d = step(h, d, a, b, c, x[k + 0], 11, 0xeaa127fa);
    c = step(h, c, d, a, b, x[k + 3], 16, 0xd4ef3085);
    b = step(h, b, c, d, a, x[k + 6], 23, 0x04881d05);
    a = step(h, a, b, c, d, x[k + 9], 4, 0xd9d4d039);
    d = step(h, d, a, b, c, x[k + 12], 11, 0xe6db99e5);
    c = step(h, c, d, a, b, x[k + 15], 16, 0x1fa27cf8);
    b = step(h, b, c, d, a, x[k + 2], 23, 0xc4ac5665);

    a = step(i, a, b, c, d, x[k + 0], 6, 0xf4292244);
    d = step(i, d, a, b, c, x[k + 7], 10, 0x432aff97);
    c = step(i, c, d, a, b, x[k + 14], 15, 0xab9423a7);
    b = step(i, b, c, d, a, x[k + 5], 21, 0xfc93a039);
    a = step(i, a, b, c, d, x[k + 12], 6, 0x655b59c3);
    d = step(i, d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
    c = step(i, c, d, a, b, x[k + 10], 15, 0xffeff47d);
    b = step(i, b, c, d, a, x[k + 1], 21, 0x85845dd1);
    a = step(i, a, b, c, d, x[k + 8], 6, 0x6fa87e4f);
    d = step(i, d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
    c = step(i, c, d, a, b, x[k + 6], 15, 0xa3014314);
    b = step(i, b, c, d, a, x[k + 13], 21, 0x4e0811a1);
    a = step(i, a, b, c, d, x[k + 4], 6, 0xf7537e82);
    d = step(i, d, a, b, c, x[k + 11], 10, 0xbd3af235);
    c = step(i, c, d, a, b, x[k + 2], 15, 0x2ad7d2bb);
    b = step(i, b, c, d, a, x[k + 9], 21, 0xeb86d391);

    a = addUnsigned(a, aa);
    b = addUnsigned(b, bb);
    c = addUnsigned(c, cc);
    d = addUnsigned(d, dd);
  }

  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

function getMixinKey(orig) {
  return WBI_MIXIN_KEY_ENC_TAB.map((n) => orig[n])
    .join("")
    .slice(0, 32);
}

function extractKeyFromWbiUrl(url) {
  if (!url) return "";
  const lastSegment = String(url).split("/").pop() || "";
  return lastSegment.split(".")[0] || "";
}

function signWbiParams(params, imgKey, subKey) {
  const mixinKey = getMixinKey(imgKey + subKey);
  const wts = Math.round(Date.now() / 1000);
  const query = { ...params, wts };
  const serialized = Object.keys(query)
    .sort()
    .map((key) => {
      const value = String(query[key]).replace(/[!'()*]/g, "");
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join("&");
  const wRid = md5(serialized + mixinKey);
  return `${serialized}&w_rid=${wRid}`;
}

export function parseBilibiliVideoUrl(rawUrl) {
  if (!rawUrl) return null;
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== "bilibili.com" && !host.endsWith(".bilibili.com")) {
    return null;
  }

  const bvMatch = parsed.pathname.match(/\/video\/(BV[0-9A-Za-z]+)/i);
  const avMatch = parsed.pathname.match(/\/video\/av(\d+)/i);
  const bvid = bvMatch?.[1] || parsed.searchParams.get("bvid") || "";
  const aid = avMatch?.[1] || parsed.searchParams.get("aid") || "";
  const page = Math.max(1, Number.parseInt(parsed.searchParams.get("p") || "1", 10) || 1);

  if (!bvid && !aid) {
    return { isBilibili: true, isVideoPage: false, page };
  }
  return { isBilibili: true, isVideoPage: true, bvid, aid, page };
}

function normalizeSubtitleUrl(rawUrl) {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("//")) return `https:${rawUrl}`;
  return rawUrl;
}

async function fetchJson(url, credentials = "include") {
  const res = await fetch(url, { credentials });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

function normalizeTrackMeta(rawTrack, index = 0) {
  if (!rawTrack) return null;
  const id = rawTrack.id_str || (rawTrack.id != null ? String(rawTrack.id) : "");
  const lan = rawTrack.lan || "";
  const lanDoc = rawTrack.lan_doc || lan || `轨道 ${index + 1}`;
  return {
    key: id || `${lan || "track"}-${index}`,
    id,
    lan,
    lanDoc,
    author: rawTrack.author?.name || "",
    subtitleUrl: normalizeSubtitleUrl(rawTrack.subtitle_url || ""),
  };
}

function mergeRawTracks(playerSubtitles, viewSubtitles) {
  const merged = [];
  const seen = new Set();
  for (const raw of [...playerSubtitles, ...viewSubtitles]) {
    if (!raw) continue;
    const id = raw.id_str || (raw.id != null ? String(raw.id) : "");
    const dedupKey = id || `${raw.lan || ""}::${raw.lan_doc || ""}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    merged.push(raw);
  }
  return merged;
}

function normalizeSubtitleBody(body) {
  if (!Array.isArray(body)) return [];
  return body
    .map((item) => ({
      from: Number(item?.from ?? 0),
      to: Number(item?.to ?? 0),
      content: String(item?.content ?? "").trim(),
    }))
    .filter((item) => item.content.length > 0)
    .sort((a, b) => a.from - b.from);
}

export async function fetchBilibiliSubtitles({ pageUrl }) {
  const parsed = parseBilibiliVideoUrl(pageUrl);
  if (!parsed) {
    return { ok: false, reason: "NOT_BILIBILI" };
  }
  if (!parsed.isVideoPage) {
    return { ok: false, reason: "NOT_BILIBILI_VIDEO" };
  }

  const viewParam = parsed.bvid
    ? `bvid=${encodeURIComponent(parsed.bvid)}`
    : `aid=${encodeURIComponent(parsed.aid)}`;
  const viewJson = await fetchJson(`https://api.bilibili.com/x/web-interface/view?${viewParam}`);
  if (viewJson?.code !== 0 || !viewJson?.data) {
    throw new Error(viewJson?.message || "获取 B 站视频信息失败");
  }

  const viewData = viewJson.data;
  const pages = Array.isArray(viewData.pages) ? viewData.pages : [];
  const targetPage = pages[parsed.page - 1] || pages[0];
  const cid = targetPage?.cid || viewData.cid;
  const aid = viewData.aid;
  const bvid = viewData.bvid || parsed.bvid;
  const videoTitle = viewData.title || "";
  const viewSubtitles = Array.isArray(viewData.subtitle?.list) ? viewData.subtitle.list : [];

  let isLogin = false;
  let imgKey = "";
  let subKey = "";
  try {
    const navJson = await fetchJson("https://api.bilibili.com/x/web-interface/nav");
    isLogin = Boolean(navJson?.data?.isLogin);
    imgKey = extractKeyFromWbiUrl(navJson?.data?.wbi_img?.img_url);
    subKey = extractKeyFromWbiUrl(navJson?.data?.wbi_img?.sub_url);
  } catch {
    // Ignore nav failure and continue with fallback player endpoint
  }

  let playerData = null;
  if (imgKey && subKey && aid && cid) {
    try {
      const signedQuery = signWbiParams({ aid, cid }, imgKey, subKey);
      const wbiJson = await fetchJson(`https://api.bilibili.com/x/player/wbi/v2?${signedQuery}`);
      if (wbiJson?.code === 0 && wbiJson?.data) {
        playerData = wbiJson.data;
      }
    } catch {
      // Fallback to non-wbi endpoint below
    }
  }

  if (!playerData || !(playerData.subtitle?.subtitles?.length)) {
    try {
      const playerQuery = bvid
        ? `bvid=${encodeURIComponent(bvid)}&cid=${encodeURIComponent(cid)}`
        : `aid=${encodeURIComponent(aid)}&cid=${encodeURIComponent(cid)}`;
      const v2Json = await fetchJson(`https://api.bilibili.com/x/player/v2?${playerQuery}`);
      if (v2Json?.code === 0 && v2Json?.data) {
        playerData = v2Json.data;
      }
    } catch {
      // Ignore fallback error
    }
  }

  const playerSubtitles = Array.isArray(playerData?.subtitle?.subtitles)
    ? playerData.subtitle.subtitles
    : [];
  const needLoginSubtitle = Boolean(playerData?.need_login_subtitle);

  const rawMerged = mergeRawTracks(playerSubtitles, viewSubtitles);
  const baseTracks = rawMerged
    .map((item, idx) => normalizeTrackMeta(item, idx))
    .filter(Boolean);

  if (baseTracks.length === 0) {
    return {
      ok: false,
      reason: needLoginSubtitle ? "NEED_LOGIN" : "NO_SUBTITLE",
      bvid,
      aid,
      cid,
      page: parsed.page,
      videoTitle,
      isLogin,
      needLoginSubtitle,
      trackCount: 0,
      tracks: [],
    };
  }

  const tracks = await Promise.all(
    baseTracks.map(async (track) => {
      if (!track.subtitleUrl) {
        return { ...track, cues: [], totalCues: 0 };
      }
      try {
        const subtitleJson = await fetchJson(track.subtitleUrl, "omit");
        const cues = normalizeSubtitleBody(subtitleJson?.body);
        return { ...track, cues, totalCues: cues.length };
      } catch {
        return { ...track, cues: [], totalCues: 0 };
      }
    })
  );

  const primaryTrack = tracks.find((t) => t.cues.length > 0) || tracks[0] || null;
  const anyHasUrl = tracks.some((t) => Boolean(t.subtitleUrl));

  return {
    ok: true,
    partial: !anyHasUrl,
    bvid,
    aid,
    cid,
    page: parsed.page,
    videoTitle,
    isLogin,
    needLoginSubtitle: anyHasUrl ? needLoginSubtitle : true,
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

export async function fetchBilibiliFirstSubtitle({ pageUrl }) {
  return fetchBilibiliSubtitles({ pageUrl });
}
