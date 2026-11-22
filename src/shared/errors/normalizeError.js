import * as mod_17368 from "./TranslateError.js";
import get from "lodash/get";
import { t } from "../i18n/index.js";

function a(e) {
  if (e instanceof mod_17368.F) return e;
  if (e instanceof Error)
    return new mod_17368.F(e.message, {
      type: null,
    });
  const tMsg = get(e, "message");
  return "string" == typeof tMsg
    ? new mod_17368.F(tMsg, {
        type: null,
      })
    : new mod_17368.F(t("error.unexpected"), {
        type: null,
      });
}
export { a as H };
