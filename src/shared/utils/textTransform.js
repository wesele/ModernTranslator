const n = /^[A-Z]?[a-z]+([A-Z][a-z]*)+$/,
  s = /^([A-Za-z]+_)+[A-Za-z]+$/;
function r(e, t) {
  let a = e.trim();
  return (
    t &&
      (t.sourceTransformNoBr && (a = a.replace(/\r?\n/g, " ")),
      t.sourceTransformNoComment && (a = a.replace(/\/\//g, " ")),
      t.sourceTransformRegExps &&
        (a = t.sourceTransformRegExps.reduce((e, t) => {
          let a;
          try {
            a = new RegExp(t.pattern, t.flags);
          } catch (t) {
            return (console.error("创建正则表达式失败：", t), e);
          }
          return e.replace(a, t.replaceTo || "");
        }, a)),
      t.sourceTransformNCaml &&
        (n.test(a)
          ? (a = a.replace(/[A-Z]/g, (e, t) => (0 === t ? e.toLowerCase() : " " + e.toLowerCase())))
          : s.test(a) && (a = a.replace(/_/g, " "))),
      t.sourceLower && (a = a.toLowerCase())),
    a
  );
}
export { r as W };
