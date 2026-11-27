import _Ay_57422 from "ky";
import { t as tr } from "../../../shared/i18n/index.js";
const o = "https://edge.microsoft.com/translate/translatetext",
  a = "https://api.cognitive.microsofttranslator.com/translate",
  i =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0";
async function c(e, t, n) {
  const r = n?.from,
    u = Array.isArray(t) ? t : [t],
    f = Array.isArray(e) ? e : [e],
    { authenticationHeaders: d, userAgent: p, translateOptions: h } = n || {},
    v = {
      "User-Agent": p || i,
      "Content-Type": "application/json",
    };
  if (d) {
    const m = f.map((e) => ({ Text: e })),
      g = new URLSearchParams([...u.map((e) => ["to", e]), ["api-version", "3.0"]]);
    r && g.append("from", r);
    h &&
      Object.entries(h).forEach(([e, t]) => {
        null != t && "" !== t && g.append(e, String(t));
      });
    Object.assign(v, d);
    try {
      return await (
        await _Ay_57422.post(a, {
          searchParams: g,
          json: m,
          headers: v,
          timeout: 3e4,
        })
      ).json();
    } catch (e) {
      let t = "";
      if (e.response)
        try {
          const n = await e.response.json();
          t = ` HTTP ${e.response.status} (${e.response.statusText})\n${JSON.stringify(n, null, 2)}\n`;
        } catch {
          t = ` HTTP ${e.response.status} (${e.response.statusText})\n`;
        }
      else t = `: ${e.message}`;
      throw new Error(tr("error.msFailed", { detail: t }));
    }
  }
  const g = new URLSearchParams([...u.map((e) => ["to", e]), ["isEnterpriseClient", "false"]]);
  r && g.append("from", r);
  h &&
    Object.entries(h).forEach(([e, t]) => {
      null != t && "" !== t && g.append(e, String(t));
    });
  try {
    return await (
      await _Ay_57422.post(o, {
        searchParams: g,
        json: f,
        headers: v,
        timeout: 3e4,
      })
    ).json();
  } catch (e) {
    let t = "";
    if (e.response)
      try {
        const n = await e.response.json();
        t = ` HTTP ${e.response.status} (${e.response.statusText})\n${JSON.stringify(n, null, 2)}\n`;
      } catch {
        t = ` HTTP ${e.response.status} (${e.response.statusText})\n`;
      }
    else t = `: ${e.message}`;
    throw new Error(tr("error.msFailed", { detail: t }));
  }
}
export { c as T };
