class o extends Error {
  request;
  response;
  constructor(e, t) {
    const n = e instanceof Response;
    var o;
    (super(
      n
        ? `Request failed with status code ${e.status}.`
        : (o = e) instanceof Error
          ? o.message
          : "Unknown error. See `error.cause` for detail."
    ),
      (this.request = t),
      (this.name = "FetchError"),
      n ? (this.response = e) : (this.cause = e));
  }
}
function r(e) {
  return e instanceof o;
}
export { o as A };
export { r as N };
