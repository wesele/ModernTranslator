import * as React from "react";
import * as mod_31085 from "react/jsx-runtime";
function i(e) {
  const { children: s } = e,
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
          展开
        </a>
      )}
    </span>
  );
}
export { i as A };
