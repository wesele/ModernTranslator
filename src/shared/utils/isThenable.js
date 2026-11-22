export function isThenable(value) {
  return typeof value?.then === "function";
}

export { isThenable as $ };
