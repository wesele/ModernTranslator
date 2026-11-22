import * as mod_22025 from "./protocol.js";
import createDebug from "debug";
const r = createDebug("@hcfyapp/messaging:sendMessage");
function s(e, t, n) {
  let s;
  return (
    r("准备发送消息：%o", e),
    (s =
      "number" == typeof t
        ? chrome.tabs.sendMessage(t, e, n)
        : null == t
          ? chrome.runtime.sendMessage(e, n)
          : chrome.runtime.sendMessage(t, e, n)),
    s.then(
      (e) => {
        if ((r("收到的 raw response： %o", e), undefined !== e)) {
          if (!mod_22025.v(e))
            throw new Error("必须使用 @hcfyapp/messaging 的 onMessage 方法来处理消息。", {
              cause: e,
            });
          if ("__messaging_reject" in e) throw e.__messaging_reject;
          return e.__messaging_resolve;
        }
      },
      (e) => {
        throw (r("发送消息失败", e), e);
      }
    )
  );
}
export { s as _ };
