function o(e, t = true) {
  return (t ? e.slice(1) : e).split("&").reduce((e, t) => {
    const [n, o] = t.split("=");
    return ((e[n] = o ? decodeURIComponent(o) : ""), e);
  }, {});
}
export { o as q };
