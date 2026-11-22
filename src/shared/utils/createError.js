function r(e, t) {
  let n;
  n = t
    ? "string" == typeof t
      ? {
          name: t,
        }
      : t
    : {};
  const r = new (n.ctor || Error)(e, {
    cause: n.cause,
  });
  return (n.name && (r.name = n.name), r);
}
export { r as $ };
