import * as React from "react";
import { useI18n } from "../shared/i18n/index.js";

function ExpandableText(e) {
  const { children: s } = e,
    { t } = useI18n(),
    [a, i] = React.useState(false),
    [o, r] = React.useState(null);
  React.useEffect(() => {
    o && o.scrollWidth <= o.clientWidth && i(true);
  }, [o]);
  const l = Object.assign(
    {
      position: "relative",
    },
    a
      ? undefined
      : {
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          paddingRight: 25,
        }
  );
  return (
    <span ref={r} style={l}>
      {s}
      {!a && (
        <a
          style={{
            position: "absolute",
            top: 0,
            right: 0,
          }}
          onClick={() => {
            i(true);
          }}
        >
          {t("result.expand")}
        </a>
      )}
    </span>
  );
}
export { ExpandableText as A };
