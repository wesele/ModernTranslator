try {
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("Firefox")) {
    if (typeof requestAnimationFrame === "function" && typeof window !== "undefined") {
      globalThis.requestAnimationFrame = requestAnimationFrame.bind(window);
    }
    if (typeof cancelAnimationFrame === "function" && typeof window !== "undefined") {
      globalThis.cancelAnimationFrame = cancelAnimationFrame.bind(window);
    }
  }
} catch {
  // ignore in restricted environments
}
