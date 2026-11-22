import { c as ServiceBase } from "./ServiceBase.js";
import identity from "lodash/identity";
import invert from "lodash/invert";
import { o as detectLanguage } from "../translators/standardLanguages.js";
import * as errors from "../../shared/errors/index.js";
import { t, getLocalizedLanguageName, getServiceDisplayName } from "../../shared/i18n/index.js";

function normalizeText(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(identity)
    .join("\n");
}

class TranslatorBase extends ServiceBase {
  constructor(service, options) {
    super(service, options?.retry);
    this.service = service;
    this.standardMap = options?.standardMap;
    this.customMap = this.standardMap && invert(this.standardMap);
  }

  convertToStandard(code) {
    return this.customMap ? this.customMap[code] : code;
  }

  convertToCustom(lang) {
    return this.standardMap ? this.standardMap[lang] : lang;
  }

  isSameLang() {
    return false;
  }

  async convertLanguages(req, ctx) {
    const { text, destinations, source } = req;
    const serviceLabel = getServiceDisplayName(this.service.id) || this.service.name;
    let customSource;
    if (source) {
      customSource = this.convertToCustom(source);
      if (!customSource) {
        throw new errors.Fw(
          t("error.unsupportedSource", {
            name: serviceLabel,
            lang: getLocalizedLanguageName(source),
          }),
          {
            type: errors.VC.UNSUPPORTED_LANGUAGE,
            context: ctx,
          }
        );
      }
    }
    ctx.source = customSource;
    const mappedDestinations = [];
    destinations.some((lang) => {
      const code = this.convertToCustom(lang);
      if (code) {
        return mappedDestinations.push(code) === 2;
      }
      return false;
    });
    if (!mappedDestinations.length) {
      throw new errors.Fw(
        t("error.unsupportedDest", {
          name: serviceLabel,
          langs: destinations.map((d) => getLocalizedLanguageName(d)).join(", "),
        }),
        {
          type: errors.VC.UNSUPPORTED_LANGUAGE,
          context: ctx,
        }
      );
    }
    ctx.destinations = mappedDestinations;
    let destIndex = 0;
    let detected = customSource;
    if (!detected) {
      detected = await detectLanguage(text);
      if (detected) detected = this.convertToCustom(detected);
    }
    if (detected === mappedDestinations[0] && mappedDestinations.length > 1) {
      destIndex = 1;
    }
    ctx.destIndex = destIndex;
  }

  async translateInner(ctx, isRetry = false) {
    const idx = ctx.destIndex;
    const raw = await this.call({
      text: ctx.normalizedText,
      destination: ctx.destinations[idx],
      source: ctx.source,
    });
    if (!isRetry && ctx.destinations.length > 1 && this.isSameLang(raw, ctx)) {
      ctx.destIndex = idx === 0 ? 1 : 0;
      return this.translateInner(ctx, true);
    }
    return raw;
  }

  async translate(req) {
    const normalizedText = normalizeText(req.text);
    const ctx = {
      text: req.text,
      normalizedText,
      hcfySource: req.source,
      hcfyDestinations: req.destinations,
      destinations: [],
      destIndex: 0,
    };
    let raw;
    try {
      await this.convertLanguages(req, ctx);
      raw = await this.translateInner(ctx, false);
    } catch (err) {
      const out = this.transform(ctx);
      out.error = errors.xh(err).toJSON();
      return out;
    }
    return this.transform(ctx, raw);
  }

  getTTS() {
    const serviceLabel = getServiceDisplayName(this.service.id) || this.service.name;
    throw new errors.Fw(t("error.ttsNotSupported", { name: serviceLabel }));
  }
}

export { TranslatorBase as c };
export { normalizeText as f };
