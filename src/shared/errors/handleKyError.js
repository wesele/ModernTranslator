import * as mod_17368 from "./TranslateError.js";
import * as mod_1783 from "./ErrorType.js";
import * as mod_34426 from "./normalizeError.js";
import * as mod_34843 from "../utils/index.js";

function handleKyError(err) {
  if (mod_34843.NF(err)) {
    if (err.response) {
      const status = err.response.status;
      return new mod_17368.F(`远程服务器返回了错误的 HTTP 响应码：${status}。`, {
        type: mod_1783.V.API_SERVER_ERROR,
      });
    }
    return new mod_17368.F("远程服务器没有响应，请检查网络连接。", {
      type: mod_1783.V.NETWORK_ERROR,
    });
  }
  return mod_34426.H(err);
}

export { handleKyError as x };
