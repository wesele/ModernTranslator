import { L as retryAsync } from "../../shared/utils/retryAsync.js";
import { Fw as TranslateError } from "../../shared/errors/index.js";

class ServiceBase {
  constructor(service, retry = false) {
    this.service = service;
    this.retry =
      typeof retry === "boolean"
        ? { free: retry }
        : { free: Boolean(retry?.free ?? retry?.secretKey) };
  }

  retryInner(fn, shouldRetry) {
    return retryAsync(fn, {
      count: shouldRetry ? 2 : 0,
      beforeRetry: (err) => !!(err instanceof TranslateError && err.noRetry),
    });
  }

  callByFree() {
    throw new Error(`无登翻译内部错误：没有为${this.service.name}提供具体实现。`);
  }

  call(req) {
    return this.retryInner(() => this.callByFree(req), this.retry.free);
  }
}

export { ServiceBase as c };
