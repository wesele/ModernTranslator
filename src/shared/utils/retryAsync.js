const r = {
  delay: 0,
  count: 2,
  beforeRetry: () => false,
};
function n(e, t) {
  const s = t ? Object.assign({}, r, t) : r;
  if (s.count <= 0) return e();
  let n = 0;
  const i = () =>
    e().catch((e) =>
      n < s.count && ((n += 1), !s.beforeRetry(e))
        ? new Promise((e, t) => {
            setTimeout(() => {
              i().then(e, t);
            }, s.delay);
          })
        : Promise.reject(e)
    );
  return i();
}
export { n as L };
