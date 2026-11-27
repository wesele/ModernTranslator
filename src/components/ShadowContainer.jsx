import _Ay_38470, * as mod_38470 from "react-shadow";
import contentRootCss from "../styles/contentRootCss.js";
import normalizeCss from "../../public/normalize.css";
import blueprintCss from "../../public/blueprint.css";
import blueprintSelectCss from "../../public/blueprint-select.css";
import langSelectCss from "../../public/lang-select.css";
import * as React from "react";
import * as mod_31085 from "react/jsx-runtime";

const INLINE_STYLESHEETS = {
  "normalize.css": normalizeCss,
  "blueprint.css": blueprintCss,
  "blueprint-select.css": blueprintSelectCss,
  "lang-select.css": langSelectCss,
};

function l(e) {
  const { children: t, id: n, stylesheetURLs: r, cssText: l } = e,
    [c, d] = React.useState(null),
    u = React.useRef(null);
  return (
    React.useEffect(() => {
      const e = document.getElementById("dark-mode");
      if (!e) return;
      const t = () => {
        if (e.getAttribute("href")) {
          const e = u.current?.shadowRoot;
          e &&
            setTimeout(() => {
              try {
                e.adoptedStyleSheets = [];
              } catch {
                // Firefox Xray wrapper may reject adoptedStyleSheets assignment in content scripts
              }
            }, 800);
        }
      };
      t();
      const n = new MutationObserver(t);
      return (
        n.observe(e, {
          attributeFilter: ["href"],
        }),
        () => {
          n.disconnect();
        }
      );
    }, []),
    (
      <_Ay_38470.div
        style={{
          all: "initial",
        }}
        id={n}
        ref={u}
      >
        <style>{contentRootCss}</style>
        <style>{normalizeCss}</style>
        <style>{blueprintCss}</style>
        {r?.map((e) =>
          INLINE_STYLESHEETS[e] ? (
            <style key={e}>{INLINE_STYLESHEETS[e]}</style>
          ) : (
            <link rel="stylesheet" href={chrome.runtime.getURL(e)} key={e} />
          )
        )}
        {l && <style>{l}</style>}
        <div id="root" ref={d} dir="ltr">
          {t(c)}
        </div>
      </_Ay_38470.div>
    )
  );
}
export { l as A };
