var r = function (e) {
  if ("undefined" == typeof document) return 0;
  if (document.body && (!document.readyState || "loading" !== document.readyState)) {
    if (true !== e && "number" == typeof r.__cache) return r.__cache;
    var t = document.createElement("div"),
      n = t.style;
    ((n.display = "block"),
      (n.position = "absolute"),
      (n.width = "100px"),
      (n.height = "100px"),
      (n.left = "-999px"),
      (n.top = "-999px"),
      (n.overflow = "scroll"),
      document.body.insertBefore(t, null));
    var o = t.clientWidth;
    if (0 !== o) return ((r.__cache = 100 - o), document.body.removeChild(t), r.__cache);
    document.body.removeChild(t);
  }
};
export { r as V };
