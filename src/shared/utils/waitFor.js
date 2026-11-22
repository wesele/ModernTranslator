function o(e, t = 500) {
  return new Promise((n) => {
    !(function o() {
      e() ? n() : setTimeout(o, t);
    })();
  });
}
export { o as f };
