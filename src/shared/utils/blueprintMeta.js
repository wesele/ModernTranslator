const a = "Blueprint6",
  s = [
    "active",
    "alignText",
    "asyncControl",
    "containerRef",
    "current",
    "elementRef",
    "ellipsizeText",
    "endIcon",
    "fill",
    "icon",
    "iconSize",
    "inputClassName",
    "inputRef",
    "intent",
    "inline",
    "large",
    "loading",
    "leftElement",
    "leftIcon",
    "minimal",
    "onRemove",
    "outlined",
    "panel",
    "panelClassName",
    "popoverProps",
    "rightElement",
    "rightIcon",
    "round",
    "selectedValue",
    "size",
    "small",
    "tagName",
    "text",
    "textClassName",
    "variant",
  ];
function l(t, e = s, c = false) {
  return (
    c && (e = e.concat(s)),
    e.reduce((t, e) => (-1 !== e.indexOf("-") || (t.hasOwnProperty(e) && delete t[e]), t), {
      ...t,
    })
  );
}
export { l as f };
export { a as l };
