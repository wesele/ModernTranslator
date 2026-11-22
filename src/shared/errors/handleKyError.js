import * as mod_17368 from "./TranslateError.js";
import * as mod_1783 from "./ErrorType.js";
import * as mod_34426 from "./normalizeError.js";
import * as mod_34843 from "../utils/index.js";
import { t } from "../i18n/index.js";

function handleKyError(err) {
  if (mod_34843.NF(err)) {
    if (err.response) {
      const status = err.response.status;
      return new mod_17368.F(t("error.httpStatus", { status }), {
        type: mod_1783.V.API_SERVER_ERROR,
      });
    }
    return new mod_17368.F(t("error.network"), {
      type: mod_1783.V.NETWORK_ERROR,
    });
  }
  return mod_34426.H(err);
}

export { handleKyError as x };
