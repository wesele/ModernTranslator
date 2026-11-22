import identity from "lodash/identity";
function o(e) {
  return e
    .split("\n")
    .map((e) => e.trim())
    .filter(identity)
    .join("\n");
}
export { o as E };
