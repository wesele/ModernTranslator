import * as mod_34047 from "../../base/TranslatorBase.js";
import * as mod_29842 from "../../../shared/errors/index.js";
import * as mod_72431 from "../../../shared/constants/services.js";
import * as mod_34843 from "../../../shared/utils/index.js";
import * as mod_4645 from "../../../shared/utils/fetchError.js";
import createDebug from "debug";
import * as mod_51964 from "../../../shared/errors/handleHttpError.js";
const r = JSON.parse(
  '{"中文(简体)":"zh-CN","英语":"en","日语":"ja","泰语":"th","西班牙语":"es","阿拉伯语":"ar","法语":"fr","韩语":"ko","俄语":"ru","德语":"de","葡萄牙语":"pt","意大利语":"it","希腊语":"el","荷兰语":"nl","波兰语":"pl","芬兰语":"fi","捷克语":"cs","保加利亚语":"bg","丹麦语":"da","爱沙尼亚语":"et","匈牙利语":"hu","罗马尼亚语":"ro","斯洛文尼亚语":"sl","瑞典语":"sv","越南语":"vi","中文(繁体)":"zh-TW","南非荷兰语":"af","阿尔巴尼亚语":"sq","阿姆哈拉语":"am","亚美尼亚语":"hy","阿塞拜疆语":"az","巴斯克语":"eu","白俄罗斯语":"be","孟加拉语":"bn","波斯尼亚语":"bs","缅甸语":"my","加泰罗尼亚语":"ca","宿务语":"ceb","克罗地亚语":"hr","世界语":"eo","菲律宾语":"tl","加利西亚语":"gl","格鲁吉亚语":"ka","古吉拉特语":"gu","豪萨语":"ha","希伯来语":"iw","印地语":"hi","冰岛语":"is","伊博语":"ig","印尼语":"id","爱尔兰语":"ga","卡纳达语":"kn","哈萨克语":"kk","库尔德语":"ku","老挝语":"lo","拉丁语":"la","拉脱维亚语":"lv","立陶宛语":"lt","卢森堡语":"lb","马其顿语":"mk","马尔加什语":"mg","马来语":"ms","马拉雅拉姆语":"ml","马耳他语":"mt","马拉地语":"mr","尼泊尔语":"ne","波斯语":"fa","塞尔维亚语":"sr","僧伽罗语":"si","斯洛伐克语":"sk","索马里语":"so","斯瓦希里语":"sw","塔吉克语":"tg","泰米尔语":"ta","鞑靼语":"tt","泰卢固语":"te","土耳其语":"tr","土库曼语":"tk","乌克兰语":"uk","乌尔都语":"ur","乌兹别克语":"uz","吉尔吉斯语":"ky","普什图语":"ps","高棉语":"km","海地克里奥尔语":"ht","旁遮普语":"pa","齐切瓦语":"ny","科西嘉语":"co","夏威夷语":"haw","爪哇语":"jw","卢旺达语":"rw","毛利语":"mi","挪威语":"no","奥里亚语":"or","萨摩亚语":"sm","修纳语":"sn","信德语":"sd","威尔士语":"cy","意第绪语":"yi","约鲁巴语":"yo","祖鲁语":"zu","弗里西语":"fy","蒙古语":"mn","苗语":"hmn","南非科萨语":"xh","塞索托语":"st","苏格兰盖尔语":"gd","维吾尔语":"ug","印尼巽他语":"su"}'
);
var i = function (e, t) {
    for (var n = 0; n < t.length - 2; n += 3) {
      var o = t[n + 2];
      ((o = "a" <= o ? o.charCodeAt(0) - 87 : Number(o)),
        (o = "+" == t[n + 1] ? e >>> o : e << o),
        (e = "+" == t[n] ? (e + o) & 4294967295 : e ^ o));
    }
    return e;
  },
  c = function (e) {
    for (var t = [], n = 0, o = 0; n < e.length; ++n) {
      var r = e.charCodeAt(n);
      128 > r
        ? (t[o++] = r)
        : (2048 > r
            ? (t[o++] = (r >> 6) | 192)
            : ((t[o++] = (r >> 12) | 224), (t[o++] = ((r >> 6) & 63) | 128)),
          (t[o++] = (63 & r) | 128));
    }
    var s = 0;
    for (o = 0; o < t.length; o++) ((s += t[o]), (s = i(s, "+-a^+6")));
    return (
      0 > (s = i(s, "+-3^+b+-f")) && (s = 2147483648 + (2147483647 & s)),
      (s %= 1e6).toString() + "." + (0 ^ s).toString()
    );
  };
const l = {
  名词: "n.",
  动词: "v.",
  形容词: "adj.",
  副词: "adv.",
  介词: "prep.",
  缩写: "缩写",
  连词: "conj.",
  代词: "pron.",
  感叹词: "int.",
  冠词: "art.",
  数词: "num.",
  助动词: "v. aux.",
};
function d(e) {
  const t = {
    raw: e,
    from: e.src,
    result: e.sentences.map((e) => ("trans" in e ? e.trans : "")).join(""),
  };
  let n;
  return (
    e.dict &&
      (t.dict = e.dict.map((e) => ({
        pos: e.pos && (l[e.pos] || e.pos),
        terms: e.terms || e.entry?.map((e) => e.word) || [],
      }))),
    e.sentences.some((e) => {
      if ("src_translit" in e) return ((n = e.src_translit), true);
    }),
    n &&
      (t.phonetic = [
        {
          value: n,
        },
      ]),
    t
  );
}
function p(e) {
  return e ? ((t = e).endsWith("/") ? t.slice(0, -1) : t) : "https://translate.googleapis.com";
  var t;
}
function h(e, t, n = "auto", o, r) {
  return (async function (e, t, n = "auto", o, r) {
    const query = {
        client: "gtx",
        sl: n,
        tl: t,
        dj: "1",
        dt: ["t", "bd", "qc", "rm", "ex", "at", "ss", "rw", "ld"],
        tk: c(e),
      },
      usePost = encodeURIComponent(e).length > 1200,
      s = `${p(r)}/translate_a/single?` + mod_34843.qs(usePost ? query : { ...query, q: e }),
      reqOpts = usePost
        ? {
            ...o,
            method: "POST",
            headers: {
              ...(o?.headers || {}),
              "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            },
            body: new URLSearchParams({ q: e }).toString(),
          }
        : o;
    return fetch(s, reqOpts).then(
      (e) => {
        if (!e.ok)
          throw new mod_4645.A(e, {
            ...reqOpts,
            url: s,
          });
        return e.json();
      },
      (e) => {
        throw new mod_4645.A(e, {
          ...reqOpts,
          url: s,
        });
      }
    );
  })(e, t, n, o, r).then(d);
}
function g(e, t) {
  let n,
    o = "",
    r = function (e, t) {
      for (let n, o = 0; o < t.length - 2; o += 3)
        ((n = "a" <= (n = t.charAt(o + 2)) ? n.charCodeAt(0) - 87 : Number(n)),
          (n = "+" === t.charAt(o + 1) ? e >>> n : e << n),
          (e = "+" === t.charAt(o) ? (e + n) & 4294967295 : e ^ n));
      return e;
    },
    s = (n = "" !== o ? o : (o = t || "") || "").split(".");
  n = Number(s[0]) || 0;
  let a = [],
    i = 0,
    c = 0;
  for (; c < e.length; c++) {
    let t = e.charCodeAt(c);
    128 > t
      ? (a[i++] = t)
      : (2048 > t
          ? (a[i++] = (t >> 6) | 192)
          : (55296 == (64512 & t) && c + 1 < e.length && 56320 == (64512 & e.charCodeAt(c + 1))
              ? ((t = 65536 + ((1023 & t) << 10) + (1023 & e.charCodeAt(++c))),
                (a[i++] = (t >> 18) | 240),
                (a[i++] = ((t >> 12) & 63) | 128))
              : (a[i++] = (t >> 12) | 224),
            (a[i++] = ((t >> 6) & 63) | 128)),
        (a[i++] = (63 & t) | 128));
  }
  for (e = n, i = 0; i < a.length; i++) e = r((e += a[i]), "+-a^+6");
  return (
    (e = r(e, "+-3^+b+-f")),
    0 > (e ^= Number(s[1]) || 0) && (e = 2147483648 + (2147483647 & e)),
    (e %= 1e6).toString() + "." + (e ^ n)
  );
}
const y = /^\d+\.\d+$/,
  f = /^\d{5,}\.\d{6,}$/;
async function w(e, t) {
  const n = `${p(t)}/translate_a/element.js`,
    o = await fetch(n, e).then(
      (t) => {
        if (!t.ok)
          throw new mod_4645.A(t, {
            ...e,
            url: n,
          });
        return t.text();
      },
      (t) => {
        throw new mod_4645.A(t, {
          ...e,
          url: n,
        });
      }
    ),
    r = o.match(/_ctkk='(\d+\.\d+)'/);
  if (r) return r[1];
  const s = (function (e) {
    const t = [];
    for (const [, n] of e.matchAll(/JSON\.parse\('(.*?)'\)/g)) {
      let e;
      try {
        e = JSON.parse(
          n.replace(/\\x([0-9a-fA-F]{2})/g, (e, t) => String.fromCharCode(parseInt(t, 16)))
        );
      } catch {
        continue;
      }
      if (Array.isArray(e))
        for (const n of e)
          if ("string" == typeof n && y.test(n)) {
            if (f.test(n)) return n;
            t.push(n);
          }
    }
    if (t.length) throw new Error(`Token format changed? Candidates: ${t.join(", ")}`);
  })(o);
  if (s) return s;
  throw new Error("Can not found token.");
}
let k = null;
function x(e, t, n = "auto", o, r) {
  return (async function (e, t, n = "auto", o, r) {
    const s = k || (k = await w(o, r)),
      a = `${p(r)}/translate_a/single?${mod_34843.qs({
        client: "webapp",
        sl: n,
        tl: t,
        dj: "1",
        ie: "UTF-8",
        oe: "UTF-8",
        source: "icon",
        dt: ["t", "bd", "qc", "rm", "ex", "at", "ss", "rw", "ld"],
        q: e,
        tk: g(e, s),
      })}`;
    return fetch(a, o)
      .then(
        (e) => {
          if (!e.ok)
            throw new mod_4645.A(e, {
              ...o,
              url: a,
            });
          return e.json();
        },
        (e) => {
          throw new mod_4645.A(e, {
            ...o,
            url: a,
          });
        }
      )
      .catch((e) => ((k = null), Promise.reject(e)));
  })(e, t, n, o, r).then(d);
}
async function translateGoogleChromeExt(e, t, n = "auto", o, r) {
  const isBatch = Array.isArray(e),
    items = isBatch ? e : [e],
    sl = n || "auto",
    qs = new URLSearchParams({
      client: "dict-chrome-ex",
      sl,
      tl: t,
    }).toString(),
    bodyParams = new URLSearchParams();
  items.forEach((item) => bodyParams.append("q", item));
  const body = bodyParams.toString(),
    bases = r ? [p(r)] : [p(""), "https://clients5.google.com"];
  let lastErr;
  for (const base of bases) {
    const url = `${base}/translate_a/t?${qs}`,
      reqOpts = {
        ...o,
        method: "POST",
        headers: {
          ...(o?.headers || {}),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body,
      };
    try {
      const res = await fetch(url, reqOpts);
      if (!res.ok) throw new mod_4645.A(res, { ...reqOpts, url });
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Google 翻译返回格式异常");
      if (isBatch) {
        return data.map((entry) =>
          Array.isArray(entry) ? String(entry[0] ?? "") : String(entry ?? "")
        );
      }
      const first = data[0];
      return {
        raw: data,
        from: Array.isArray(first) ? first[1] : undefined,
        result: Array.isArray(first) ? String(first[0] ?? "") : String(first ?? ""),
      };
    } catch (err) {
      lastErr = err instanceof mod_4645.A ? err : new mod_4645.A(err, { ...reqOpts, url });
    }
  }
  throw lastErr;
}
const P = createDebug("@hcfyapp/google-unofficial:GoogleSiteIntercept"),
  v = {
    1: "名词",
    2: "动词",
    3: "形容词",
    4: "副词",
    5: "介词",
    6: "缩写",
    7: "连词",
    8: "代词",
    9: "感叹词",
    13: "冠词",
    15: "数词",
  };
function S(e, t, n = "com") {
  let o, r;
  const s = new Promise((e, t) => {
      ((o = e), (r = t));
    }),
    a = {
      urls: [`https://translate.google.${n}/_/TranslateWebserverUi/data/batchexecute?*`],
      tabId: e,
    };
  let i;
  const c = t.replaceAll("\\", "\\\\\\\\").replaceAll("\n", "\\\\n").replaceAll('"', '\\\\\\"'),
    l = (e) => {
      const t = (function (e) {
          if (e) {
            if (e.formData) return e.formData;
            if (e.raw?.[0]?.bytes) {
              const t = new TextDecoder("utf-8").decode(e.raw[0].bytes),
                n = new URLSearchParams(t),
                o = {};
              return (
                n.forEach((e, t) => {
                  Array.isArray(o[t]) ? o[t].push(e) : (o[t] = [e]);
                }),
                o
              );
            }
          }
        })(e.requestBody),
        n = t?.["f.req"][0];
      "string" == typeof n &&
        n.includes(c) &&
        (P("已监听到翻译请求。"),
        P("此次请求的详情：%O", e),
        P("此次请求的 formData：%O", t),
        P("开始监听此次请求的 Request Headers……"),
        (i = t),
        chrome.webRequest.onBeforeRequest.removeListener(l));
    },
    d = (e) => {
      if (!i) return;
      P("已监听到翻译请求的 Request Headers。");
      const t = {
        url: e.url,
        requestBody: i,
        googleHeader: e.requestHeaders?.find(
          (e) => "x-goog-batchexecute-bgr" === e.name.toLowerCase()
        ),
      };
      (P("此次请求的详情：%O", e),
        P("最终获取到的信息：%O", t),
        o(t),
        chrome.webRequest.onBeforeSendHeaders.removeListener(d));
    };
  return (
    P("开始监听翻译请求……"),
    chrome.webRequest.onBeforeRequest.addListener(l, a, ["requestBody"]),
    chrome.webRequest.onBeforeSendHeaders.addListener(d, a, ["requestHeaders"]),
    {
      promise: s,
      cancel() {
        (chrome.webRequest.onBeforeRequest.removeListener(l),
          chrome.webRequest.onBeforeSendHeaders.removeListener(d),
          r(new Error("谷歌翻译的此次查询已被取消。")));
      },
    }
  );
}
let T = 1;
function b(e) {
  return mod_34843.fm(
    async () => {
      try {
        return await new Promise((t, n) => {
          chrome.windows.create(
            {
              url: e,
              focused: false,
              type: "popup",
              width: T,
              height: T,
            },
            (e) => {
              chrome.runtime.lastError
                ? n(chrome.runtime.lastError)
                : e
                  ? t(e)
                  : n(new Error("没有成功创建 window"));
            }
          );
        });
      } catch (e) {
        throw ((T += 50), e);
      }
    },
    {
      interval: 0,
      timeout: 0,
      count: 6,
    }
  );
}
function C(e) {
  return new Promise((t, n) => {
    let o, r, s;
    const a = () => {
        o && (o.id && chrome.windows.remove(o.id), (o = undefined));
      },
      i = (e = false) => {
        (e || clearTimeout(c), s?.(), r?.(), a());
      },
      c = setTimeout(() => {
        (i(true), n(new Error("响应超时：谷歌翻译 10 秒内没有返回翻译结果。")));
      }, 1e4);
    b(
      `https://translate.google.${e.region}/?sl=${e.source || "auto"}&tl=${e.to}&text=${encodeURIComponent(e.text)}&op=translate`
    )
      .then((t) => {
        const n = t.tabs?.[0]?.id;
        if (null == n) return Promise.reject(new Error("创建的浏览器窗口没有 tabId"));
        o = t;
        const { promise: r, cancel: a } = S(n, e.text, e.region);
        return ((s = a), r);
      })
      .then((e) => {
        a();
        const { promise: t, cancel: n } = (function (e) {
          const t = new AbortController(),
            { url: n, requestBody: o, googleHeader: r } = e;
          return {
            promise: fetch(n, {
              method: "POST",
              signal: t.signal,
              body: o ? mod_34843.qs(o) : null,
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                ...(r && r.value
                  ? {
                      [r.name]: r.value,
                    }
                  : undefined),
              },
            }).then((e) => e.text()),
            cancel() {
              t.abort();
            },
          };
        })(e);
        return ((r = n), t);
      })
      .then((e) =>
        (function (e) {
          (P("获取到的谷歌翻译结果，开始转换为标准的 Web 版格式。"),
            P("纯字符串形式的结果为：\n%s", e));
          try {
            const t = e.split(/\n+/).find((e) => e.startsWith("[[")),
              n = JSON.parse(JSON.parse(t)[0][2]),
              o = {
                src: n[2],
                sentences: [
                  {
                    src_translit: n[0][0],
                  },
                  {
                    trans: n[1][0][0][5]
                      .map((e) => {
                        const t = e[0];
                        return (e[2] ? " " : "") + t;
                      })
                      .join(""),
                  },
                ],
              },
              r = n[3]?.[5]?.[0];
            if (r) {
              const e = [];
              (r.forEach((t) => {
                const n = v[t[4]];
                e.push({
                  pos: n && (l[n] || n),
                  terms: t[1].map((e) => e[0]),
                });
              }),
                (o.dict = e));
            }
            return (P("解析完毕的标准 Web 版格式为：%O", o), o);
          } catch (e) {
            throw new Error("解析谷歌翻译结果时出现错误：" + e.message);
          }
        })(e)
      )
      .then(
        (e) => {
          (i(), t(d(e)));
        },
        (e) => {
          (i(), n(e));
        }
      );
  });
}
const A = {
  id: mod_72431.VI.Google,
  name: "谷歌翻译",
  free: true,
};
class R extends mod_34047.c {
  constructor() {
    (super(A, {
      standardMap: r,
      retry: {
        secretKey: true,
      },
    }),
      (this.region = "com"),
      (this.type = "fast"),
      (this.mirror = ""));
  }
  isSameLang(e, t) {
    return e.from === t.destinations[t.destIndex];
  }
  async callByFree(e) {
    const { text: t, destination: n, source: o = "auto" } = e;
    let r;
    if ("fast" !== this.type)
      r = await C({
        text: t,
        to: n,
        source: o,
        region: "cn" === this.region ? "com" : this.region,
      });
    else
      try {
        r = await h(
          t,
          n,
          o,
          {
            signal: mod_34843._(8e3),
          },
          this.mirror
        );
      } catch (e) {
        console.error("从 Google 翻译接口获取结果失败：", e);
        try {
          r = await x(
            t,
            n,
            o,
            {
              signal: mod_34843._(8e3),
            },
            this.mirror
          );
        } catch (err2) {
          console.error("从 Google webapp 接口获取结果失败，尝试备用接口：", err2);
          try {
            r = await translateGoogleChromeExt(
              t,
              n,
              o,
              {
                signal: mod_34843._(8e3),
              },
              this.mirror
            );
          } catch (err3) {
            throw mod_51964.$(err3);
          }
        }
      }
    return r;
  }
  transform(e, t) {
    const { text: n } = e,
      o = e.destinations[e.destIndex],
      r = t?.from,
      s = {
        text: n,
        from: r && this.convertToStandard(r),
        to: o && this.convertToStandard(o),
        link: `https://translate.google.${this.region}/?sl=${r || "auto"}&tl=${o}&text=${encodeURIComponent(n)}&op=translate`,
      };
    if (t) {
      ((s.result = t.result.split("\n")),
        t.dict && (s.dict = t.dict),
        t.phonetic &&
          (s.phonetic = t.phonetic.map((e) => ({
            name: e.name,
            value: e.value,
            ttsURI: s.from && this.getTTS(n, s.from),
          }))));
      try {
        !s.phonetic && s.from && (s.ttsURI = this.getTTS(n, s.from));
      } catch (e) {
        console.error("解析 Google 翻译接口结果时出错：", e);
      }
    }
    return s;
  }
  getTTS(e, t) {
    const n = this.convertToCustom(t);
    if (!n)
      throw new mod_29842.Fw(`${this.service.name}不支持朗读${t}。`, {
        type: mod_29842.VC.UNSUPPORTED_LANGUAGE,
      });
    return `https://translate.googleapis.com/translate_tts?client=gtx&tl=${n}&ie=UTF-8&q=${encodeURIComponent(e)}`;
  }
}
const googleTranslator = new R();
export { A as G };
export { googleTranslator, translateGoogleChromeExt };
