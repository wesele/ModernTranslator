navigator.userAgent.includes("Firefox") &&
  ((globalThis.requestAnimationFrame = requestAnimationFrame.bind(window)),
  (globalThis.cancelAnimationFrame = cancelAnimationFrame.bind(window)));
