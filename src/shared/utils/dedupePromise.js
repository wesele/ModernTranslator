function o(e) {
  let t = null;
  return function () {
    return (
      t ||
      ((t = e().finally(() => {
        t = null;
      })),
      t)
    );
  };
}
export { o as $ };
