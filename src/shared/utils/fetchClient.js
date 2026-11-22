class s extends Error {
  request;
  response;
  url;
  constructor(e, t, n) {
    const s = t instanceof Response;
    var r;
    (super(
      s
        ? `Request failed with status code ${t.status}.`
        : (r = t) instanceof Error
          ? r.message
          : "Unknown error. See `error.cause` for details."
    ),
      (this.request = n),
      (this.url = e),
      (this.name = "FetchError"),
      s ? (this.response = t) : (this.cause = t));
  }
}
function r(e, t) {
  return fetch(e, t).then(
    (n) => {
      if (!n.ok) throw new s(e, n, t);
      return n;
    },
    (n) => {
      throw new s(e, n, t);
    }
  );
}
function o(e) {
  return e instanceof s;
}
export { o as NF };
export { r as Z5 };
