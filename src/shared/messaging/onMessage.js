import * as mod_34843 from "../utils/index.js";
import createDebug from "debug";
import * as mod_97933 from "./serializeError.js";

const i = createDebug("@hcfyapp/messaging:onMessage");
const hasNativeBrowserApi = typeof browser !== "undefined";
const extApi = hasNativeBrowserApi ? browser : chrome;

function a(e) {
  const t = (msg, sender, sendResponse) => {
    const resolve = (val) => {
      i("resolve", val);
      sendResponse({
        __messaging: true,
        __messaging_resolve: val,
      });
    };
    const reject = (err) => {
      i("reject", err);
      sendResponse({
        __messaging: true,
        __messaging_reject: mod_97933.U(err),
      });
    };
    const result = e(msg, {
      sender,
      resolve,
      reject,
    });
    if (mod_34843.$X(result)) {
      if (hasNativeBrowserApi) {
        return result.then(
          (val) => {
            i("resolve", val);
            return {
              __messaging: true,
              __messaging_resolve: val,
            };
          },
          (err) => {
            i("reject", err);
            return {
              __messaging: true,
              __messaging_reject: mod_97933.U(err),
            };
          }
        );
      }
      result.then(resolve, reject);
      return true;
    }
    return result;
  };
  extApi.runtime.onMessage.addListener(t);
  return () => {
    extApi.runtime.onMessage.removeListener(t);
  };
}

export { a as x };
