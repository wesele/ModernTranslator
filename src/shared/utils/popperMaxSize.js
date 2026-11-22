import * as mod_42950 from "@popperjs/core";
import { detectOverflow } from "@popperjs/core";
const i = {
  name: "maxSize",
  enabled: true,
  phase: "main",
  requiresIfExists: ["offset", "preventOverflow", "flip"],
  fn: function (t) {
    var e = t.state,
      n = t.name,
      i = t.options,
      o = detectOverflow(e, i),
      a = e.modifiersData.preventOverflow || {
        x: 0,
        y: 0,
      },
      s = a.x,
      l = a.y,
      c = e.rects.popper,
      u = c.width,
      h = c.height,
      p = e.placement.split("-")[0],
      d = "left" === p ? "left" : "right",
      f = "top" === p ? "top" : "bottom";
    e.modifiersData[n] = {
      width: u - o[d] - s,
      height: h - o[f] - l,
    };
  },
};
export { i as A };
