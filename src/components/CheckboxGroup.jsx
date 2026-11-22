import * as mod_78107 from "@blueprintjs/core";
import { Checkbox } from "@blueprintjs/core";
import * as mod_83813 from "immer";
import { produce } from "immer";
import * as mod_31085 from "react/jsx-runtime";
const o = produce((e, s) => {
    const a = e.indexOf(s);
    a >= 0 && e.splice(a, 1);
  }),
  r = produce((e, s) => {
    e.includes(s) || e.push(s);
  }),
  l = (e, s, a, n, o) => (
    <Checkbox
      inline
      labelElement={s}
      checked={n}
      onChange={(e) => {
        o(e.target.checked);
      }}
      key={a}
    />
  );
function c(e) {
  const {
    items: s,
    valueKey: a = "value",
    labelKey: t = "label",
    selected: n,
    onChange: c,
    itemRenderer: j = l,
    labelRenderer: u = (e) => e[t],
  } = e;
  return (
    <>
      {s.map((e) => {
        const s = u(e),
          t = e[a],
          i = n.includes(t);
        return j(e, s, t, i, (e) => {
          c(e ? r(n, t) : o(n, t));
        });
      })}
    </>
  );
}
export { c as x };
