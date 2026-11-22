import * as mod_17368 from "./TranslateError.js";
import get from "lodash/get";
function a(e) {
  if (e instanceof mod_17368.F) return e;
  if (e instanceof Error)
    return new mod_17368.F(e.message, {
      type: null,
    });
  const t = get(e, "message");
  return "string" == typeof t
    ? new mod_17368.F(t, {
        type: null,
      })
    : new mod_17368.F("无登翻译内部出现了一个预期之外的错误，如果你看到了这条消息，请反馈给我。", {
        type: null,
      });
}
export { a as H };
