function o(e, t) {
  return new Promise((n, o) => {
    const r = Object.assign(
      {
        timeout: 1e3,
        interval: 50,
        count: 0,
      },
      t
    );
    let s, a, i;
    r.timeout > 0 &&
      (i = setTimeout(() => {
        (a && clearTimeout(a), o(s));
      }, r.timeout));
    let c = 0;
    (async function t() {
      let n;
      c += 1;
      try {
        n = await e();
      } catch (e) {
        if (c === r.count) throw (i && clearTimeout(i), e);
        return (
          (s = e),
          new Promise((e, n) => {
            a = setTimeout(() => {
              t().then(e, n);
            }, r.interval);
          })
        );
      }
      return (i && clearTimeout(i), n);
    })().then(n, o);
  });
}
export { o as f };
