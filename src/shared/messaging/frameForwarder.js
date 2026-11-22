import _A_27429, * as mod_27429 from "eventemitter3";
import isEqual from "lodash/isEqual";
function s() {
  if (window.self === window.top) return "top";
  const e = [];
  let u = window.self;
  do {
    const t = u.parent;
    if (!t) return "isolation";
    const n = Array.prototype.indexOf.call(t.frames, u);
    if (n < 0) return "isolation";
    (e.unshift(n), (u = t));
  } while (u !== window.top);
  return e;
}
let r;
class F extends _A_27429 {
  constructor() {
    if (r) return r;
    (super(),
      (r = this),
      chrome.runtime.onMessage.addListener((e) => {
        "forward between frames" === e?.action &&
          (function (e) {
            const u = e.target,
              t = s();
            return "all" === u
              ? !isEqual(e.senderFramePosition, t)
              : "top" === u
                ? "top" === t
                : "string" != typeof t && t.length === u.length && t.every((e, t) => e === u[t]);
          })(e) &&
          this.emit("message", e.data, e.senderFramePosition, e.target);
      }));
  }
  tell(e, u) {
    const t = s();
    if ("parent" === u) {
      if ("top" === t || "isolation" === t)
        return Promise.reject(new Error(t + " 窗口不能发送消息给 parent。"));
      (u = t.slice(0, -1)).length || (u = "top");
    }
    const n = {
      action: "forward between frames",
      target: u,
      data: e,
      senderFramePosition: t,
    };
    return chrome.runtime.sendMessage(n);
  }
}
export { F as B };
