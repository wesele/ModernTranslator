import * as mod_22025 from "./protocol.js";
import createDebug from "debug";

const r = createDebug("@hcfyapp/messaging:sendMessage");
const extApi = typeof browser !== "undefined" ? browser : chrome;

function s(e, t, n) {
  r("准备发送消息：%o", e);
  let promise;
  if (typeof t === "number") {
    promise = n !== undefined ? extApi.tabs.sendMessage(t, e, n) : extApi.tabs.sendMessage(t, e);
  } else if (t == null) {
    promise = n !== undefined ? extApi.runtime.sendMessage(e, n) : extApi.runtime.sendMessage(e);
  } else {
    promise =
      n !== undefined ? extApi.runtime.sendMessage(t, e, n) : extApi.runtime.sendMessage(t, e);
  }
  return promise.then(
    (res) => {
      r("收到的 raw response： %o", res);
      if (res !== undefined) {
        if (!mod_22025.v(res)) {
          throw new Error("必须使用 @hcfyapp/messaging 的 onMessage 方法来处理消息。", {
            cause: res,
          });
        }
        if ("__messaging_reject" in res) throw res.__messaging_reject;
        return res.__messaging_resolve;
      }
    },
    (err) => {
      r("发送消息失败", err);
      throw err;
    }
  );
}

export { s as _ };
