import * as mod_4645 from "../utils/fetchError.js";
import * as mod_17368 from "./TranslateError.js";
import * as mod_1783 from "./ErrorType.js";
import * as mod_34426 from "./normalizeError.js";

function handleHttpError(err) {
  if (mod_4645.N(err)) {
    if (err.response) {
      const status = err.response.status;
      return new mod_17368.F(`远程服务器返回了错误的 HTTP 响应码：${status}。`, {
        type: mod_1783.V.API_SERVER_ERROR,
      });
    }
    return err.request
      ? new mod_17368.F("远程服务器没有响应，请检查网络连接或镜像配置。", {
          type: mod_1783.V.NETWORK_ERROR,
        })
      : new mod_17368.F(`向远程服务器发起请求时发生了一个错误：“${err.message}”`, {
          type: null,
        });
  }
  return mod_34426.H(err);
}

export { handleHttpError as $ };
