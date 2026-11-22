import { UI_LOCALE_TO_BCP47, normalizeUiLocale } from "./locales.js";

const ZH_NAME_TO_BCP47 = {
  "中文(简体)": "zh-Hans",
  "中文(繁体)": "zh-Hant",
  "中文(粤语)": "yue",
  "中文(文言文)": "lzh",
  英语: "en",
  "英语(美国)": "en-US",
  "英语(英国)": "en-GB",
  "英语(加拿大)": "en-CA",
  "英语(澳大利亚)": "en-AU",
  "英语(印度)": "en-IN",
  "英语(爱尔兰)": "en-IE",
  "英语(南非)": "en-ZA",
  日语: "ja",
  韩语: "ko",
  法语: "fr",
  "法语(加拿大)": "fr-CA",
  加拿大法语: "fr-CA",
  西班牙语: "es",
  "西班牙语(墨西哥)": "es-MX",
  "西班牙语(美国)": "es-US",
  "西班牙语(阿根廷)": "es-AR",
  德语: "de",
  俄语: "ru",
  意大利语: "it",
  葡萄牙语: "pt",
  巴西葡萄牙语: "pt-BR",
  "葡萄牙语(巴西)": "pt-BR",
  荷兰语: "nl",
  "荷兰语(比利时)": "nl-BE",
  阿拉伯语: "ar",
  印地语: "hi",
  印尼语: "id",
  越南语: "vi",
  马来语: "ms",
  土耳其语: "tr",
  泰语: "th",
  芬兰语: "fi",
  丹麦语: "da",
  希伯来语: "he",
  希腊语: "el",
  现代希腊语: "el",
  匈牙利语: "hu",
  威尔士语: "cy",
  乌尔都语: "ur",
  萨摩亚语: "sm",
  斯瓦希里语: "sw",
  斯洛文尼亚语: "sl",
  瑞典语: "sv",
  南非荷兰语: "af",
  挪威语: "no",
  新挪威语: "nn",
  书面挪威语: "nb",
  马尔加什语: "mg",
  马耳他语: "mt",
  孟加拉语: "bn",
  拉脱维亚语: "lv",
  立陶宛语: "lt",
  罗马尼亚语: "ro",
  克罗地亚语: "hr",
  捷克语: "cs",
  海地克里奥尔语: "ht",
  菲律宾语: "fil",
  波斯尼亚语: "bs",
  波斯语: "fa",
  保加利亚语: "bg",
  波兰语: "pl",
  爱沙尼亚语: "et",
  爪哇语: "jv",
  祖鲁语: "zu",
  意第绪语: "yi",
  伊博语: "ig",
  约鲁巴语: "yo",
  亚美尼亚语: "hy",
  夏威夷语: "haw",
  修纳语: "sn",
  信德语: "sd",
  宿务语: "ceb",
  乌兹别克语: "uz",
  乌克兰语: "uk",
  泰卢固语: "te",
  塔吉克语: "tg",
  泰米尔语: "ta",
  世界语: "eo",
  索马里语: "so",
  僧伽罗语: "si",
  斯洛伐克语: "sk",
  齐切瓦语: "ny",
  旁遮普语: "pa",
  普什图语: "ps",
  尼泊尔语: "ne",
  毛利语: "mi",
  马拉雅拉姆语: "ml",
  马拉地语: "mr",
  马其顿语: "mk",
  缅甸语: "my",
  卢森堡语: "lb",
  拉丁语: "la",
  老挝语: "lo",
  克林贡语: "tlh",
  库尔德语: "ku",
  科西嘉语: "co",
  卡纳达语: "kn",
  吉尔吉斯语: "ky",
  加利西亚语: "gl",
  加泰罗尼亚语: "ca",
  加泰隆语: "ca",
  豪萨语: "ha",
  哈萨克语: "kk",
  古吉拉特语: "gu",
  格鲁吉亚语: "ka",
  高棉语: "km",
  冰岛语: "is",
  巴斯克语: "eu",
  白俄罗斯语: "be",
  阿姆哈拉语: "am",
  爱尔兰语: "ga",
  阿尔巴尼亚语: "sq",
  阿塞拜疆语: "az",
  土库曼语: "tk",
  卢旺达语: "rw",
  鞑靼语: "tt",
  奥里亚语: "or",
  弗里西语: "fy",
  西弗里斯语: "fy",
  蒙古语: "mn",
  印尼巽他语: "su",
  斐济语: "fj",
  汤加语: "to",
  塔希提语: "ty",
  扎扎其语: "zza",
  印古什语: "inh",
  因特语: "ia",
  伊努克提图特语: "iu",
  伊多语: "io",
  亚齐语: "ace",
  希利盖农语: "hil",
  西里西亚语: "szl",
  叙利亚语: "syr",
  瓦隆语: "wa",
  文达语: "ve",
  沃洛夫语: "wo",
  提格利尼亚语: "ti",
  他加禄语: "tl",
  掸语: "shn",
  苏格兰语: "sco",
  塞尔维亚语: "sr",
  "塞尔维亚语(拉丁文)": "sr-Latn",
  "塞尔维亚语(西里尔文)": "sr-Cyrl",
  "塞尔维亚-克罗地亚语": "sh",
  切罗基语: "chr",
  契维语: "tw",
  帕皮阿门托语: "pap",
  毛里求斯克里奥尔语: "mfe",
  马绍尔语: "mh",
  迈蒂利语: "mai",
  逻辑语: "jbo",
  罗姆语: "rom",
  卢森尼亚语: "rue",
  卢干达语: "lg",
  林堡语: "li",
  拉特加莱语: "ltg",
  罗曼什语: "rm",
  林加拉语: "ln",
  克丘亚语: "qu",
  克里米亚鞑靼语: "crh",
  克里克语: "mus",
  卡舒比语: "csb",
  卡努里语: "kr",
  卡拜尔语: "kab",
  克什米尔语: "ks",
  科萨语: "xh",
  南非科萨语: "xh",
  胡帕语: "hup",
  黑山语: "cnr",
  格陵兰语: "kl",
  瓜拉尼语: "gn",
  刚果语: "kg",
  弗留利语: "fur",
  梵语: "sa",
  法罗语: "fo",
  低地德语: "nds",
  德顿语: "tet",
  楚瓦什语: "cv",
  聪加语: "ts",
  布列塔尼语: "br",
  博杰普尔语: "bho",
  俾路支语: "bal",
  比林语: "byn",
  本巴语: "bem",
  柏柏尔语: "ber",
  巴什基尔语: "ba",
  比斯拉马语: "bi",
  奥塞梯语: "os",
  奥罗莫语: "om",
  奥克语: "oc",
  奥杰布瓦语: "oj",
  艾马拉语: "ay",
  阿斯图里亚斯语: "ast",
  阿拉贡语: "an",
  阿肯语: "ak",
  阿萨姆语: "as",
  苗语: "hmn",
  白苗语: "mww",
  塞索托语: "st",
  南索托语: "st",
  北索托语: "nso",
  苏格兰盖尔语: "gd",
  盖尔语: "gd",
  克雷塔罗奥托米语: "otq",
  尤卡坦玛雅语: "yua",
  中古法语: "frm",
  下索布语: "dsb",
  高地索布语: "hsb",
  上索布语: "hsb",
  西非书面语: "nqo",
  突尼斯阿拉伯语: "aeb",
  桑海语: "son",
  萨丁尼亚语: "sc",
  那不勒斯语: "nap",
  南恩德贝莱语: "nr",
  曼克斯语: "gv",
  马恩语: "gv",
  康瓦尔语: "kw",
  康沃尔语: "kw",
  孔卡尼语: "kok",
  哈卡钦语: "cnh",
  古英语: "ang",
  古希腊语: "grc",
  富拉尼语: "ff",
  迪维希语: "dv",
  迪维西语: "dv",
  北方萨米语: "se",
  北萨米语: "se",
  邦板牙语: "pam",
  阿尔及利亚阿拉伯语: "arq",
  维吾尔语: "ug",
  "克林贡语(piqaD)": "tlh-Piqd",
  阿布哈兹语: "ab",
  阿兹特克语: "nah",
  埃维语: "ee",
  巴布亚皮钦语: "tpi",
  班巴拉语: "bm",
  邦阿西楠语: "pag",
  查莫罗语: "ch",
  查瓦卡诺语: "cbk",
  侗语: "doc",
  杜順語: "dtp",
  富尔语: "fvr",
  格雷罗纳瓦特尔语: "ngu",
  格罗宁根方言: "gos",
  基里巴斯语: "gil",
  基隆迪语: "rn",
  基切语: "quc",
  卡西语: "kha",
  "马里语（俄罗斯）": "chm",
  玛雅语: "myn",
  姆班杜语: "umb",
  纳瓦霍语: "nv",
  纽埃语: "niu",
  帕姆语: "pmf",
  桑戈语: "sg",
  "汤加语(赞比亚)": "toi",
  图瓦卢语: "tvl",
  图瓦语: "tyv",
  "瓦瑞语(菲律宾)": "war",
  沃拉普克语: "vo",
  乌德穆尔特语: "udm",
  西方国际语: "ie",
  新共同语言: "lfn",
  伊班语: "iba",
  伊洛卡诺语: "ilo",
};

// Explicit localized labels for languages/variants where Intl.DisplayNames
// either returns an unhelpful code or varies in clarity.
const EXPLICIT_NAMES = {
  "中文(文言文)": {
    en: "Classical Chinese",
    es: "Chino clásico",
    fr: "Chinois classique",
    de: "Klassisches Chinesisch",
    ja: "漢文",
    ko: "한문",
  },
  "塞尔维亚-克罗地亚语": {
    en: "Serbo-Croatian",
    es: "Serbocroata",
    fr: "Serbo-croate",
    de: "Serbokroatisch",
    ja: "セルボ・クロアチア語",
    ko: "세르보크로아트어",
  },
  "克林贡语(piqaD)": {
    en: "Klingon (pIqaD)",
    es: "Klingon (pIqaD)",
    fr: "Klingon (pIqaD)",
    de: "Klingonisch (pIqaD)",
    ja: "クリンゴン語 (pIqaD)",
    ko: "클링온어 (pIqaD)",
  },
  白苗语: {
    en: "Hmong Daw",
    es: "Hmong Daw",
    fr: "Hmong daw",
    de: "Hmong Daw",
    ja: "白ミャオ語",
    ko: "백묘어 (흐몽 다우)",
  },
  克雷塔罗奥托米语: {
    en: "Querétaro Otomi",
    es: "Otomí de Querétaro",
    fr: "Otomi de Querétaro",
    de: "Querétaro-Otomí",
    ja: "ケレタロ・オトミ語",
    ko: "케레타로 오토미어",
  },
  尤卡坦玛雅语: {
    en: "Yucatec Maya",
    es: "Maya yucateco",
    fr: "Maya yucatèque",
    de: "Yukatekisches Maya",
    ja: "ユカテク・マヤ語",
    ko: "유카텍 마야어",
  },
  哈卡钦语: {
    en: "Hakha Chin",
    es: "Hakha Chin",
    fr: "Hakha Chin",
    de: "Hakha Chin",
    ja: "ハカ・チン語",
    ko: "하카친어",
  },
  阿兹特克语: {
    en: "Nahuatl",
    es: "Náhuatl",
    fr: "Nahuatl",
    de: "Nahuatl",
    ja: "ナワトル語",
    ko: "나와틀어",
  },
  柏柏尔语: {
    en: "Berber",
    es: "Bereber",
    fr: "Berbère",
    de: "Berbersprachen",
    ja: "ベルベル語",
    ko: "베르베르어",
  },
  桑海语: {
    en: "Songhai",
    es: "Songhay",
    fr: "Songhaï",
    de: "Songhai",
    ja: "ソンガイ語",
    ko: "송가이어",
  },
  侗语: {
    en: "Dong (Kam)",
    es: "Dong (Kam)",
    fr: "Dong (Kam)",
    de: "Dong (Kam)",
    ja: "トン語",
    ko: "둥어",
  },
  杜順語: {
    en: "Central Dusun",
    es: "Dusun central",
    fr: "Dusun central",
    de: "Zentral-Dusun",
    ja: "ドゥスン語",
    ko: "두순어",
  },
  富尔语: {
    en: "Fur",
    es: "Fur",
    fr: "Four",
    de: "Fur",
    ja: "フール語",
    ko: "푸르어",
  },
  格雷罗纳瓦特尔语: {
    en: "Guerrero Nahuatl",
    es: "Náhuatl de Guerrero",
    fr: "Nahuatl du Guerrero",
    de: "Guerrero-Nahuatl",
    ja: "ゲレロ・ナワトル語",
    ko: "게레로 나와틀어",
  },
  格罗宁根方言: {
    en: "Gronings",
    es: "Groningués",
    fr: "Groningois",
    de: "Gronings",
    ja: "フローニンゲン方言",
    ko: "흐로닝언 방언",
  },
  查瓦卡诺语: {
    en: "Chavacano",
    es: "Chabacano",
    fr: "Chavacano",
    de: "Chavacano",
    ja: "チャバカノ語",
    ko: "차바카노어",
  },
  玛雅语: {
    en: "Mayan",
    es: "Maya",
    fr: "Maya",
    de: "Maya-Sprachen",
    ja: "マヤ語",
    ko: "마야어",
  },
  帕姆语: {
    en: "Pamona",
    es: "Pamona",
    fr: "Pamona",
    de: "Pamona",
    ja: "パモナ語",
    ko: "파모나어",
  },
  "汤加语(赞比亚)": {
    en: "Tonga (Zambia)",
    es: "Tonga (Zambia)",
    fr: "Tonga (Zambie)",
    de: "Tonga (Sambia)",
    ja: "トンガ語 (ザンビア)",
    ko: "통가어 (잠비아)",
  },
  新共同语言: {
    en: "Lingua Franca Nova",
    es: "Lingua Franca Nova",
    fr: "Lingua Franca Nova",
    de: "Lingua Franca Nova",
    ja: "リングア・フランカ・ノバ",
    ko: "링구아 프랑카 노바",
  },
  卢森尼亚语: {
    en: "Rusyn",
    es: "Rusino",
    fr: "Rusyn",
    de: "Russinisch",
    ja: "ルシン語",
    ko: "루신어",
  },
  拉特加莱语: {
    en: "Latgalian",
    es: "Latgaliano",
    fr: "Latgalien",
    de: "Lettgallisch",
    ja: "ラトガリア語",
    ko: "라트갈레어",
  },
  黑山语: {
    en: "Montenegrin",
    es: "Montenegrino",
    fr: "Monténégrin",
    de: "Montenegrinisch",
    ja: "モンテネグロ語",
    ko: "몬테네그로어",
  },
  俾路支语: {
    en: "Baluchi",
    es: "Baluchi",
    fr: "Baloutchi",
    de: "Belutschisch",
    ja: "バローチー語",
    ko: "발루치어",
  },
};

const displayNamesCache = new Map();

function getDisplayNames(uiLocale) {
  const bcp47 = UI_LOCALE_TO_BCP47[uiLocale] || "en";
  if (!displayNamesCache.has(bcp47)) {
    try {
      displayNamesCache.set(bcp47, new Intl.DisplayNames([bcp47], { type: "language" }));
    } catch {
      displayNamesCache.set(bcp47, null);
    }
  }
  return displayNamesCache.get(bcp47);
}

function capitalizeFirst(str, uiLocale) {
  if (!str) return str;
  if (uiLocale === "zh" || uiLocale === "ja" || uiLocale === "ko") return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const resolvedNameCache = new Map();

export function getLocalizedLanguageName(zhName, rawLocale = "zh", autoLabel = "") {
  if (!zhName || zhName === "自动检测") {
    return autoLabel || zhName || "";
  }

  const uiLocale = normalizeUiLocale(rawLocale) || "en";
  if (uiLocale === "zh") {
    return zhName;
  }

  const cacheKey = `${uiLocale}::${zhName}`;
  if (resolvedNameCache.has(cacheKey)) {
    return resolvedNameCache.get(cacheKey);
  }

  const explicit = EXPLICIT_NAMES[zhName];
  if (explicit?.[uiLocale]) {
    resolvedNameCache.set(cacheKey, explicit[uiLocale]);
    return explicit[uiLocale];
  }

  const tag = ZH_NAME_TO_BCP47[zhName];
  if (tag) {
    const dn = getDisplayNames(uiLocale);
    if (dn) {
      try {
        const result = dn.of(tag);
        if (result && result.toLowerCase() !== tag.toLowerCase()) {
          const formatted = capitalizeFirst(result, uiLocale);
          resolvedNameCache.set(cacheKey, formatted);
          return formatted;
        }
      } catch {
        // fall through to English / zhName fallback
      }
    }
  }

  if (explicit?.en) {
    resolvedNameCache.set(cacheKey, explicit.en);
    return explicit.en;
  }

  if (tag && uiLocale !== "en") {
    const enDn = getDisplayNames("en");
    if (enDn) {
      try {
        const enRes = enDn.of(tag);
        if (enRes && enRes.toLowerCase() !== tag.toLowerCase()) {
          const formatted = capitalizeFirst(enRes, "en");
          resolvedNameCache.set(cacheKey, formatted);
          return formatted;
        }
      } catch {
        // ignore
      }
    }
  }

  resolvedNameCache.set(cacheKey, zhName);
  return zhName;
}

export function getLanguageBcp47(zhName) {
  return ZH_NAME_TO_BCP47[zhName] || "";
}
