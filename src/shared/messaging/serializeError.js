function s(e) {
  return null == e
    ? e
    : "object" == typeof e && "toJSON" in e && "function" == typeof e.toJSON
      ? e.toJSON()
      : e instanceof Error
        ? {
            name: e.name,
            message: e.message,
          }
        : e;
}
export { s as U };
