import * as mod_34047 from "../../base/TranslatorBase.js";
import * as mod_72431 from "../../../shared/constants/services.js";
import * as mod_86795 from "./microsoftClient.js";
import * as mod_51964 from "../../../shared/errors/handleHttpError.js";
import * as mod_29828 from "../microsoftLangMap.js";
import createDebug from "debug";
const msLog = createDebug("translator:microsoft");
const c = {
  id: mod_72431.VI.Microsoft,
  name: "微软翻译",
  free: true,
};
class l extends mod_34047.c {
  constructor() {
    super(c, {
      standardMap: mod_29828._,
      retry: true,
    });
  }
  async callByFree(e) {
    try {
      return await mod_86795.T(e.text, e.destination, {
        from: e.source || undefined,
      });
    } catch (e) {
      throw mod_51964.$(e);
    }
  }
  transform(e, t) {
    const n = e.text;
    let o, r;
    if (t && t.length > 0) {
      const e = t[0],
        n = e.translations[0];
      ((o = e.detectedLanguage?.language
        ? this.convertToStandard(e.detectedLanguage.language)
        : undefined),
        (r = this.convertToStandard(n.to)));
    }
    const s = {
      text: n,
      from: o,
      to: r,
    };
    if (t && t.length > 0)
      try {
        s.result = t[0].translations[0].text.split("\n");
      } catch (e) {
        msLog("解析微软翻译结果时出错：%o", e);
      }
    return s;
  }
}
const microsoftTranslator = new l();
export { c as W };
export { microsoftTranslator };
