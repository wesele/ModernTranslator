import * as mod_4645 from "../utils/fetchError.js";
import * as mod_17368 from "./TranslateError.js";
import * as mod_1783 from "./ErrorType.js";
import * as mod_34426 from "./normalizeError.js";
import { t } from "../i18n/index.js";

function handleHttpError(err) {
  if (mod_4645.N(err)) {
    if (err.response) {
      const status = err.response.status;
      return new mod_17368.F(t("error.httpStatus", { status }), {
        type: mod_1783.V.API_SERVER_ERROR,
      });
    }
    return err.request
      ? new mod_17368.F(t("error.network"), {
          type: mod_1783.V.NETWORK_ERROR,
        })
      : new mod_17368.F(t("error.requestErr", { msg: err.message }), {
          type: null,
        });
  }
  return mod_34426.H(err);
}

export { handleHttpError as $ };
