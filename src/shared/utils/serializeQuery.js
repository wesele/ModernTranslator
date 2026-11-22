import forEach from "lodash/forEach";
function i(e) {
  const s = [];
  return (
    forEach(e, (e, a) => {
      const t = Array.isArray(e) ? e : [e];
      s.push(...t.map((e) => `${a}=${null == e ? "" : encodeURIComponent(e)}`));
    }),
    s.join("&")
  );
}
export { i as qs };
