import * as mod_1783 from "./ErrorType.js";
import * as mod_23298 from "./handleKyError.js";
class s extends Error {
  constructor(e, t) {
    (super(e),
      null !== t?.type && (this.type = t?.type || mod_1783.V.OTHER),
      (this.link = t?.link),
      (this.context = t?.context),
      (this.errors = t?.errors),
      (this.noRetry = t?.noRetry));
  }
  toJSON() {
    return {
      type: this.type,
      message: this.message,
      link: this.link,
      errors: this.errors?.map((e) => mod_23298.x(e).toJSON()),
    };
  }
  clone() {
    return new s(this.message, {
      context: this.context,
      type: this.type,
      link: this.link,
      errors: this.errors,
      noRetry: this.noRetry,
    });
  }
}
export { s as F };
