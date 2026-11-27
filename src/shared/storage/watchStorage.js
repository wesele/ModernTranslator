import createDebug from "debug";
import isEmpty from "lodash/isEmpty";
const a = createDebug("utils/watchStorage");
const i = [];
function c(e, t, n, o = "local") {
  try {
    chrome.storage[o]
      .get(e)
      .then((e) => {
        (n || t)(e, true);
      })
      .then(() => {
        const n = Object.keys(e);
        i.push({
          defaultOptions: e,
          onChange: t,
          area: o,
          keys: n,
        });
      })
      .catch(() => {});
  } catch {
    // ignore invalidated extension context
  }
  return () => {
    const n = i.findIndex((n) => n.onChange === t && n.area === o && n.defaultOptions === e);
    return n >= 0 && (i.splice(n, 1), true);
  };
}
chrome.storage.onChanged.addListener((e, t) => {
  (a("storage.onChanged 事件调用了", e, t),
    i.forEach((n) => {
      if (n.area !== t) return;
      const o = (function (e, t) {
        const n = {};
        for (const o in e)
          Object.prototype.hasOwnProperty.call(e, o) && t.includes(o) && (n[o] = e[o].newValue);
        return n;
      })(e, n.keys);
      isEmpty(o) || n.onChange(o);
    }));
});
export { c as A };
