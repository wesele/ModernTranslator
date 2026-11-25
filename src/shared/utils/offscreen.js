const hasOffscreenApi = typeof chrome !== "undefined" && Boolean(chrome.offscreen?.createDocument);
const o = "offscreen.html",
  r = typeof chrome !== "undefined" && chrome.runtime?.getURL ? chrome.runtime.getURL(o) : o,
  s = !hasOffscreenApi
    ? async () => false
    : "getContexts" in chrome.runtime
      ? async () =>
          !!(
            await chrome.runtime.getContexts({
              contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
              documentUrls: [r],
            })
          ).length
      : async () =>
          typeof clients !== "undefined"
            ? (await clients.matchAll()).some((e) => e.url.startsWith(r))
            : false;
let a = null;
async function i() {
  if (!hasOffscreenApi) return;
  (await s()) ||
    (a
      ? await a
      : ((a = chrome.offscreen.createDocument({
          url: o,
          reasons: [chrome.offscreen.Reason.CLIPBOARD],
          justification:
            "用于语音朗读、获取 / 复制翻译结果、截图翻译所需的图片转文字能力、深色模式等功能。",
        })),
        await a,
        (a = null)));
}
export { i as g };
