import _L_404, * as mod_404 from "fast-deep-equal";
import * as React from "react";
const o = function (t, e, n) {
  var r = React.useRef(undefined);
  ((r.current && n(e, r.current)) || (r.current = e), React.useEffect(t, r.current));
};
var a = function (t, e) {
  return t.every(function (t, n) {
    return _L_404(t, e[n]);
  });
};
const s = function (t, e) {
  o(t, e, a);
};
export { s as A };
