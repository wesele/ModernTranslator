import "../shared/polyfills/firefoxRaf.js";
import "../shared/utils/setupIcons.js";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { A as ContentRootApp } from "../content/ContentRootApp.jsx";

if (!window.__NDT_CONTENT_MOUNTED__) {
  window.__NDT_CONTENT_MOUNTED__ = true;

  const container = document.createElement("div");
  container.style.all = "initial";
  document.documentElement.appendChild(container);
  createRoot(container).render(<ContentRootApp />);

  const guardTimer = setInterval(() => {
    if (!document.documentElement.contains(container)) {
      document.documentElement.appendChild(container);
      clearInterval(guardTimer);
    }
  }, 300);

  setTimeout(() => {
    clearInterval(guardTimer);
  }, 1000);
}
