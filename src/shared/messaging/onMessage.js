import * as mod_34843 from "../utils/index.js";
import createDebug from "debug";
import * as mod_97933 from "./serializeError.js";
const i = createDebug("@hcfyapp/messaging:onMessage");
function a(e) {
  const t = (t, n, r) => {
    const a = (e) => {
        (i("resolve", e),
          r({
            __messaging: true,
            __messaging_resolve: e,
          }));
      },
      l = (e) => {
        (i("reject", e),
          r({
            __messaging: true,
            __messaging_reject: mod_97933.U(e),
          }));
      },
      c = e(t, {
        sender: n,
        resolve: a,
        reject: l,
      });
    return mod_34843.$X(c) ? (c.then(a, l), true) : c;
  };
  return (
    chrome.runtime.onMessage.addListener(t),
    () => {
      chrome.runtime.onMessage.removeListener(t);
    }
  );
}
export { a as x };
