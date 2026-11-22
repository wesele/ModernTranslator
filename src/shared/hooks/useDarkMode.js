import * as React from "react";
import * as mod_25148 from "./useStorage.js";
import * as mod_16224 from "../constants/defaults.js";
import pick from "lodash/pick";
import { Classes } from "@blueprintjs/core";
const c = pick(mod_16224.g2, ["darkMode"]);
function j(e = document.body) {
  const [s, a] = mod_25148.A(c),
    i = s?.darkMode;
  return (
    React.useEffect(() => {
      if (!e) return;
      const s =
        "function" == typeof e
          ? e
          : (s) => {
              e?.classList[s ? "add" : "remove"](Classes.DARK);
            };
      switch (i) {
        case "open":
          return void s(true);
        case "close":
          return void s(false);
        case "system": {
          const e = window.matchMedia("(prefers-color-scheme: dark)");
          s(e.matches);
          const a = () => {
            s(e.matches);
          };
          return (
            e.addEventListener("change", a),
            () => {
              e.removeEventListener("change", a);
            }
          );
        }
      }
    }, [i, e]),
    {
      darkMode: i,
      setDarkMode: (e) => {
        a({
          darkMode: e,
        });
      },
    }
  );
}
export { j as A };
