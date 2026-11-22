import { L as retryAsync } from "../../shared/utils/retryAsync.js";
import { Fw as TranslateError } from "../../shared/errors/index.js";
import { t, getServiceDisplayName } from "../../shared/i18n/index.js";

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
    const name = getServiceDisplayName(this.service.id) || this.service.name;
    throw new Error(t("error.notImplemented", { name }));
  }

  call(req) {
    return this.retryInner(() => this.callByFree(req), this.retry.free);
  }
}

export { ServiceBase as c };
