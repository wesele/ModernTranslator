import _A_27429, * as mod_27429 from "eventemitter3";
import isEqual from "lodash/isEqual";
function s() {
  if (window.self === window.top) return "top";
  const e = [];
  let u = window.self;
  try {
    do {
      const t = u.parent;
      if (!t || t === u) return "isolation";
      const n = Array.prototype.indexOf.call(t.frames, u);
      if (n < 0) return "isolation";
      (e.unshift(n), (u = t));
    } while (u !== window.top);
  } catch {
    return "isolation";
  }
  return e;
}
let r;
class F extends _A_27429 {
  constructor() {
    if (r) return r;
    (super(),
      (r = this),
      chrome?.runtime?.onMessage?.addListener((e) => {
        "forward between frames" === e?.action &&
          (function (e) {
            const u = e.target,
              t = s();
            return "all" === u
              ? !isEqual(e.senderFramePosition, t)
              : "top" === u
                ? "top" === t
                : Array.isArray(t) &&
                  Array.isArray(u) &&
                  t.length === u.length &&
                  t.every((e, idx) => e === u[idx]);
          })(e) &&
          this.emit("message", e.data, e.senderFramePosition, e.target);
      }));
  }
  tell(e, u) {
    const t = s();
    if ("parent" === u) {
      if ("top" === t || "isolation" === t) return Promise.resolve();
      (u = t.slice(0, -1)).length || (u = "top");
    }
    const n = {
      action: "forward between frames",
      target: u,
      data: e,
      senderFramePosition: t,
    };
    try {
      const extApi = typeof browser !== "undefined" ? browser : chrome;
      if (!extApi?.runtime?.sendMessage) return Promise.resolve();
      return Promise.resolve(extApi.runtime.sendMessage(n)).catch(() => {});
    } catch {
      return Promise.resolve();
    }
  }
}
export { F as B };
