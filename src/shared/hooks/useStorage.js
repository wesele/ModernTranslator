import * as React from "react";
import pick from "lodash/pick";
import deepEqual from "fast-deep-equal";
import * as mod_69675 from "../storage/watchStorage.js";
import * as mod_83813 from "immer";
import { produce, applyPatches, enablePatches } from "immer";
function j(e) {
  const [s, a] = React.useState(null),
    n = React.useRef(null),
    o = React.useRef(
      new Promise((e) => {
        n.current || (n.current = e);
      })
    ),
    j = React.useCallback((e) => {
      a((s) => {
        if (!s) return s;
        if ("function" != typeof e) {
          const s = e;
          e = (e) => {
            Object.assign(e, s);
          };
        }
        return produce(s, e, (e) => {
          const a = e.map((e) => e.path[0]),
            t = pick(s, a),
            n = applyPatches(t, e);
          chrome.storage.local.set(n);
        });
      });
    }, []);
  return (
    React.useEffect(() => {
      if (!e) return;
      const s = mod_69675.A(
        e,
        (e) => {
          a((s) =>
            s
              ? deepEqual(e, pick(s, Object.keys(e)))
                ? s
                : produce(s, (s) => {
                    Object.assign(s, e);
                  })
              : s
          );
        },
        (e) => {
          (a(e),
            setTimeout(() => {
              n.current && n.current();
            }));
        }
      );
      return () => {
        s();
      };
    }, [e]),
    [s, j, o.current]
  );
}
enablePatches();
export { j as A };
