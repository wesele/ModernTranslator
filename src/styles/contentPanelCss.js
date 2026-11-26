export default `
#root,
#root *,
#root *::before,
#root *::after {
  box-sizing: border-box;
}

#root {
  --ndt-font-sans: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --ndt-font-mono: ui-monospace, "SFMono-Regular", "JetBrains Mono", Menlo, Monaco, Consolas, monospace;

  --ndt-bg-window: #ffffff;
  --ndt-bg-surface: #f9f9fb;
  --ndt-bg-card: #ffffff;
  --ndt-bg-subtle: #f4f4f6;
  --ndt-bg-pill: #f1f1f4;
  --ndt-bg-hover: rgba(0, 0, 0, 0.055);
  --ndt-bg-active: rgba(0, 0, 0, 0.09);

  --ndt-border: #e4e4e7;
  --ndt-border-subtle: #ededf1;
  --ndt-border-hover: #d4d4d8;

  --ndt-text-primary: #111113;
  --ndt-text-secondary: #52525b;
  --ndt-text-muted: #71717a;

  --ndt-accent: #18181b;
  --ndt-accent-fg: #ffffff;
  --ndt-accent-hover: #27272a;
  --ndt-link: #2563eb;

  --ndt-success-bg: rgba(16, 185, 129, 0.1);
  --ndt-success-border: rgba(16, 185, 129, 0.28);
  --ndt-success-fg: #059669;

  --ndt-pos-bg: #eef2ff;
  --ndt-pos-fg: #4338ca;

  --ndt-danger-bg: rgba(239, 68, 68, 0.07);
  --ndt-danger-border: rgba(239, 68, 68, 0.22);
  --ndt-danger-fg: #dc2626;

  --ndt-focus-ring: rgba(24, 24, 27, 0.14);
  --ndt-shadow-window: 0 16px 40px -10px rgba(0, 0, 0, 0.14), 0 4px 12px -2px rgba(0, 0, 0, 0.06);
  --ndt-shadow-popover: 0 14px 36px -8px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.07);
  --ndt-shadow-card: 0 1px 2px rgba(0, 0, 0, 0.03);
  --ndt-scrollbar-thumb: rgba(0, 0, 0, 0.18);
  --ndt-scrollbar-thumb-hover: rgba(0, 0, 0, 0.34);

  font-family: var(--ndt-font-sans);
  color: var(--ndt-text-primary);
}

#root.bp6-dark,
#root .bp6-dark {
  --ndt-bg-window: #161618;
  --ndt-bg-surface: #1b1b1e;
  --ndt-bg-card: #1f1f23;
  --ndt-bg-subtle: #242429;
  --ndt-bg-pill: rgba(255, 255, 255, 0.07);
  --ndt-bg-hover: rgba(255, 255, 255, 0.075);
  --ndt-bg-active: rgba(255, 255, 255, 0.13);

  --ndt-border: rgba(255, 255, 255, 0.09);
  --ndt-border-subtle: rgba(255, 255, 255, 0.06);
  --ndt-border-hover: rgba(255, 255, 255, 0.18);

  --ndt-text-primary: #ececef;
  --ndt-text-secondary: #a1a1aa;
  --ndt-text-muted: #71717a;

  --ndt-accent: #f4f4f5;
  --ndt-accent-fg: #18181b;
  --ndt-accent-hover: #ffffff;
  --ndt-link: #60a5fa;

  --ndt-success-bg: rgba(52, 211, 153, 0.12);
  --ndt-success-border: rgba(52, 211, 153, 0.28);
  --ndt-success-fg: #34d399;

  --ndt-pos-bg: rgba(96, 165, 250, 0.14);
  --ndt-pos-fg: #93c5fd;

  --ndt-danger-bg: rgba(248, 113, 113, 0.1);
  --ndt-danger-border: rgba(248, 113, 113, 0.24);
  --ndt-danger-fg: #f87171;

  --ndt-focus-ring: rgba(255, 255, 255, 0.16);
  --ndt-shadow-window: 0 22px 54px -12px rgba(0, 0, 0, 0.68), 0 0 0 1px rgba(255, 255, 255, 0.05);
  --ndt-shadow-popover: 0 18px 40px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.09);
  --ndt-shadow-card: 0 1px 2px rgba(0, 0, 0, 0.22);
  --ndt-scrollbar-thumb: rgba(255, 255, 255, 0.18);
  --ndt-scrollbar-thumb-hover: rgba(255, 255, 255, 0.34);
}

#app {
  cursor: default;
  font-family: var(--ndt-font-sans);
  color: var(--ndt-text-primary);
}

#popper-container {
  width: 250px;
  max-width: calc(100vw - 16px);
  position: absolute;
  left: 0;
  top: 0;
  z-index: 9999999998;
  touch-action: none;
  border-radius: 14px;
  background-color: var(--ndt-bg-window);
  border: 1px solid var(--ndt-border);
  box-shadow: var(--ndt-shadow-window) !important;
  transition: opacity 0.16s cubic-bezier(0.16, 1, 0.3, 1);
}

#popper-container.show {
  opacity: 1;
  pointer-events: auto;
  user-select: auto;
}

#popper-container,
#popper-container[data-popper-reference-hidden="true"] {
  opacity: 0;
  pointer-events: none;
  user-select: none;
}

#popper-container.pin {
  position: fixed;
}

#popper-container.pin .arrow {
  display: none;
}

#popper-container .arrow,
#popper-container .arrow::before {
  position: absolute;
  width: 10px;
  height: 10px;
  z-index: -1;
}

#popper-container .arrow {
  display: none;
}

#popper-container.show[data-popper-placement]:not([data-popper-reference-hidden="true"]) .arrow {
  display: block;
}

#popper-container .arrow::before {
  content: "";
  transform: rotate(45deg);
  background: var(--ndt-bg-surface);
}

#popper-container[data-popper-placement^="top"] .arrow {
  bottom: -5px;
}

#popper-container[data-popper-placement^="top"] .arrow::before {
  border-right: 1px solid var(--ndt-border);
  border-bottom: 1px solid var(--ndt-border);
}

#popper-container[data-popper-placement^="bottom"] .arrow {
  top: -5px;
}

#popper-container[data-popper-placement^="bottom"] .arrow::before {
  border-left: 1px solid var(--ndt-border);
  border-top: 1px solid var(--ndt-border);
}

#popper-container[data-popper-placement^="left"] .arrow {
  right: -5px;
}

#popper-container[data-popper-placement^="left"] .arrow::before {
  border-right: 1px solid var(--ndt-border);
  border-top: 1px solid var(--ndt-border);
}

#popper-container[data-popper-placement^="right"] .arrow {
  left: -5px;
}

#popper-container[data-popper-placement^="right"] .arrow::before {
  border-left: 1px solid var(--ndt-border);
  border-bottom: 1px solid var(--ndt-border);
}

#translate-panel {
  display: flex;
  flex-direction: column;
  border-radius: 13px;
  overflow: hidden;
  background-color: var(--ndt-bg-window);
  color: var(--ndt-text-primary);
  font-family: var(--ndt-font-sans);
  padding-bottom: 0;
}

#translate-panel .fixed {
  flex-shrink: 0;
  margin-bottom: 0;
  background-color: var(--ndt-bg-surface);
  border-bottom: 1px solid var(--ndt-border);
}

#translate-panel .header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  min-height: 36px;
  border-bottom: none;
}

#translate-panel .header .left,
#translate-panel .header .right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
}

#translate-panel .header .drag-block {
  min-width: 16px;
  flex: 1 0 16px;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}

#translate-panel .header .drag-block:active {
  cursor: grabbing;
}

#translate-panel .header .drag-pill {
  display: block;
  width: 24px;
  height: 3.5px;
  border-radius: 999px;
  background-color: var(--ndt-border-hover);
  opacity: 0.75;
  transition: opacity 0.15s ease, width 0.15s ease, background-color 0.15s ease;
}

#translate-panel .header .drag-block:hover .drag-pill {
  width: 32px;
  opacity: 1;
}

#translate-panel .header .bp6-button {
  min-height: 26px;
  min-width: 26px;
  padding: 0 5px;
  border-radius: 7px;
  color: var(--ndt-text-secondary);
  background: transparent;
  box-shadow: none;
  background-image: none;
  transition: background-color 0.14s ease, color 0.14s ease;
}

#translate-panel .header .bp6-button:hover:not(.bp6-disabled) {
  background-color: var(--ndt-bg-hover);
  color: var(--ndt-text-primary);
}

#translate-panel .header .bp6-button.bp6-active {
  background-color: var(--ndt-bg-active);
  color: var(--ndt-text-primary);
}

#translate-panel .header .bp6-button svg,
#translate-panel .header .bp6-button .bp6-icon {
  color: inherit;
  fill: currentColor;
}

.switch-pin {
  flex-shrink: 0;
  cursor: pointer;
}

.switch-pin .bp6-icon-pin {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease;
  transform: rotate(-45deg);
}

.pin .switch-pin .bp6-icon-pin {
  transform: rotate(-70deg);
}

.cut-btn {
  margin-left: 0;
}

#translate-panel .source-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin: 0 10px 8px;
  padding: 5px 6px 5px 10px;
  border-radius: 8px;
  background-color: var(--ndt-bg-card);
  border: 1px solid var(--ndt-border);
}

#translate-panel .source-preview-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ndt-text-primary);
  line-height: 1.4;
}

#translate-panel .source-copy-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ndt-text-muted);
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;
}

#translate-panel .source-copy-btn:hover {
  background-color: var(--ndt-bg-hover);
  color: var(--ndt-text-primary);
}

#translate-panel .source-copy-btn.is-copied {
  color: var(--ndt-success-fg);
}

#translate-panel .quick-settings {
  margin: 2px 10px 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background-color: var(--ndt-bg-card);
  border: 1px solid var(--ndt-border);
  box-shadow: var(--ndt-shadow-card);
  color: var(--ndt-text-primary);
}

#translate-panel .quick-settings > div {
  margin-bottom: 8px;
}

#translate-panel .quick-settings > div:last-child {
  margin-bottom: 0;
}

#translate-panel .quick-settings .bp6-control {
  margin-bottom: 2px;
  color: var(--ndt-text-primary);
}

#translate-panel .quick-settings a {
  color: var(--ndt-link);
  text-decoration: none;
}

#translate-panel .quick-settings a:hover {
  text-decoration: underline;
}

#translate-panel .quick-settings .bp6-button {
  border-radius: 7px;
  background-color: var(--ndt-bg-subtle);
  background-image: none;
  border: 1px solid var(--ndt-border);
  box-shadow: none;
  color: var(--ndt-text-primary);
}

#translate-panel .quick-settings .bp6-button:hover {
  background-color: var(--ndt-bg-hover);
  border-color: var(--ndt-border-hover);
}

#translate-panel .query-text {
  position: relative;
  padding: 4px 10px 10px;
}

#translate-panel .query-text textarea.bp6-input {
  min-height: 48px;
  font-family: var(--ndt-font-sans);
  line-height: 1.5;
  padding: 8px 34px 8px 10px;
  border-radius: 10px;
  background-color: var(--ndt-bg-card);
  color: var(--ndt-text-primary);
  border: 1px solid var(--ndt-border);
  box-shadow: none;
  overscroll-behavior: contain;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

#translate-panel .query-text textarea.bp6-input::placeholder {
  color: var(--ndt-text-muted);
}

#translate-panel .query-text textarea.bp6-input:focus {
  border-color: var(--ndt-border-hover);
  box-shadow: 0 0 0 2px var(--ndt-focus-ring);
  outline: none;
}

#translate-panel .query-text .translate-btn,
#translate-panel .query-text .translate-btn.bp6-button.bp6-intent-primary {
  position: absolute;
  border-radius: 7px;
  min-height: 24px;
  min-width: 24px;
  background-color: var(--ndt-accent);
  background-image: none;
  color: var(--ndt-accent-fg);
  box-shadow: none;
  opacity: 0.92;
  transition: opacity 0.14s ease, background-color 0.14s ease;
}

#translate-panel .query-text .translate-btn:hover,
#translate-panel .query-text .translate-btn.bp6-button.bp6-intent-primary:hover {
  opacity: 1;
  background-color: var(--ndt-accent-hover);
}

#translate-panel .query-text .clear-btn {
  border-radius: 6px;
  color: var(--ndt-text-muted);
  box-shadow: none;
  background-image: none;
}

#translate-panel .query-text .clear-btn:hover {
  background-color: var(--ndt-bg-hover);
  color: var(--ndt-text-primary);
}

#translate-panel .body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 8px 10px;
  background-color: var(--ndt-bg-window);
}

#translate-panel .body::-webkit-scrollbar {
  width: 6px;
  background-color: transparent;
}

#translate-panel .body::-webkit-scrollbar-thumb:vertical {
  background-color: var(--ndt-scrollbar-thumb);
  border-radius: 999px;
}

#translate-panel .body::-webkit-scrollbar-thumb:vertical:hover {
  background-color: var(--ndt-scrollbar-thumb-hover);
}

#translate-panel .empty-state {
  padding: 20px 8px;
  text-align: center;
  font-size: 12.5px;
  color: var(--ndt-text-muted);
}

#translate-panel .body .no-api {
  margin: 16px 0;
  color: var(--ndt-text-secondary);
}

#translate-panel .body .no-api .bp6-heading {
  color: var(--ndt-text-primary);
}

#translate-panel.size-small,
#translate-panel.size-small h6.bp6-heading,
#translate-panel.size-small .bp6-control.bp6-large,
#translate-panel.size-small textarea.bp6-input.bp6-small {
  font-size: 13.5px;
}

#translate-panel.size-small .phonetic-item,
#translate-panel.size-small .quick-settings a {
  font-size: 11.5px;
}

#translate-panel.size-middle,
#translate-panel.size-middle h6.bp6-heading,
#translate-panel.size-middle .bp6-control.bp6-large,
#translate-panel.size-middle textarea.bp6-input {
  font-size: 16px;
}

#translate-panel.size-middle .phonetic-item,
#translate-panel.size-middle .quick-settings a {
  font-size: 13px;
}

#translate-panel.size-large,
#translate-panel.size-large h6.bp6-heading,
#translate-panel.size-large .bp6-control.bp6-large,
#translate-panel.size-large textarea.bp6-input.bp6-large {
  font-size: 19px;
}

#translate-panel.size-large .source,
#translate-panel.size-large .phonetic-item,
#translate-panel.size-large .quick-settings a {
  font-size: 15px;
}

#translate-panel .bp6-button.bp6-small,
#translate-panel .bp6-small .bp6-button {
  min-height: 22px;
  min-width: 22px;
}

#translate-panel .result-block,
.result-block.bp6-card {
  margin: 0 0 8px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background-color: var(--ndt-bg-card);
  border: 1px solid var(--ndt-border);
  box-shadow: var(--ndt-shadow-card);
  color: var(--ndt-text-primary);
  transition: border-color 0.15s ease;
}

#translate-panel .result-block:last-child {
  margin-bottom: 0;
}

#translate-panel .result-block:hover {
  border-color: var(--ndt-border-hover);
}

.result-block .bp6-button {
  border-radius: 6px;
  box-shadow: none;
  background-image: none;
  color: var(--ndt-text-secondary);
}

.result-block .bp6-button:hover:not(.bp6-disabled) {
  background-color: var(--ndt-bg-hover);
  color: var(--ndt-text-primary);
}

.result-block .legend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.result-block .legend .legend-left {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.result-block .legend .api-ico,
.result-block .legend .bp6-heading {
  flex-shrink: 0;
  white-space: nowrap;
}

.result-block .legend .api-ico {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  margin-right: 6px;
}

.result-block .legend .bp6-heading {
  margin-bottom: 0;
  margin-right: 7px;
  font-size: 12.5px !important;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ndt-text-primary);
}

.result-block .legend .source {
  cursor: pointer;
  font-size: 11px;
  line-height: 1.5;
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 999px;
  background-color: var(--ndt-bg-pill);
  color: var(--ndt-text-secondary);
  transition: background-color 0.14s ease, color 0.14s ease;
}

.result-block .legend .source:hover {
  background-color: var(--ndt-bg-hover);
  color: var(--ndt-text-primary);
}

.result-block .legend .source .source-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-block .legend .source .bp6-icon {
  position: relative;
  top: 0;
  margin-left: 2px;
}

.result-block .legend .speak-btn {
  opacity: 0.6;
  margin-left: 2px;
  transition: opacity 0.14s ease, background-color 0.14s ease;
}

.result-block .legend .speak-btn:hover:not(.bp6-disabled) {
  opacity: 1;
}

.result-block .legend .legend-actions {
  display: flex;
  align-items: center;
  gap: 1px;
}

.result-block .legend .legend-actions .bp6-button {
  opacity: 0;
  transition: opacity 0.15s ease, background-color 0.14s ease, color 0.14s ease;
}

.result-block:hover .legend .legend-actions .bp6-button,
.result-block:focus-within .legend .legend-actions .bp6-button {
  opacity: 1;
}

.result-block .phonetic {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
}

.result-block .phonetic .phonetic-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--ndt-font-mono);
  font-size: 11.5px;
  padding: 1px 7px;
  border-radius: 6px;
  background-color: var(--ndt-bg-pill);
  border: 1px solid var(--ndt-border-subtle);
  color: var(--ndt-text-secondary);
}

.result-block .phonetic .phonetic-item:not(:last-child) {
  margin-right: 0;
}

.result-block .phonetic .phonetic-item .speak-btn {
  opacity: 0.7;
  min-width: 18px;
  min-height: 18px;
}

.result-block .phonetic .phonetic-item .speak-btn:hover {
  opacity: 1;
}

.result-block .common-result {
  margin-top: 7px;
  color: var(--ndt-text-primary);
}

.result-block .common-result p {
  line-height: 1.55;
  margin: 3px 0;
  overflow-wrap: break-word;
}

.result-block .common-result .dict a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px dashed var(--ndt-border-hover);
  border-radius: 2px;
  cursor: pointer;
  transition: color 0.12s ease, background-color 0.12s ease, border-color 0.12s ease;
}

.result-block .common-result .dict a:hover {
  color: var(--ndt-link);
  background-color: var(--ndt-bg-hover);
  border-bottom-color: var(--ndt-link);
}

.result-block .dict-pos {
  display: inline-block;
  font-family: var(--ndt-font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--ndt-pos-fg);
  background-color: var(--ndt-pos-bg);
  border-radius: 5px;
  padding: 0 5px;
  margin-right: 6px;
  line-height: 1.55;
}

.result-block .general-result p .speak-btn {
  opacity: 0;
  vertical-align: middle;
  margin-left: 4px;
  transition: opacity 0.14s ease, background-color 0.14s ease;
}

.result-block:hover .general-result p .speak-btn {
  opacity: 0.75;
}

.result-block .general-result p .speak-btn:hover {
  opacity: 1;
}

.result-block .error {
  margin-top: 6px;
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background-color: var(--ndt-danger-bg);
  border: 1px solid var(--ndt-danger-border);
  color: var(--ndt-danger-fg);
}

.result-block .error .bp6-non-ideal-state {
  padding: 4px 0;
  color: inherit;
}

.result-block .error .bp6-button {
  opacity: 1;
  visibility: visible;
  border: 1px solid var(--ndt-border);
  background-color: var(--ndt-bg-card);
  color: var(--ndt-text-primary);
}

.result-block .bp6-skeleton {
  border-radius: 6px;
  margin-top: 6px;
}

#translate-btn {
  display: none;
  position: absolute;
  z-index: 9999999999;
  left: 0;
  top: 0;
}

#translate-btn.show {
  display: block;
}

#translate-btn .bp6-button {
  padding: 4px;
  min-width: 28px;
  min-height: 28px;
  border-radius: 9px;
  background-color: var(--ndt-bg-card);
  background-image: none;
  border: 1px solid var(--ndt-border);
  box-shadow: var(--ndt-shadow-window);
  transition: transform 0.12s ease, border-color 0.12s ease;
}

#translate-btn .bp6-button:hover {
  border-color: var(--ndt-border-hover);
  transform: translateY(-1px);
}

#translate-btn .btn-icon {
  width: 18px;
  height: 18px;
  background-image: url(logo.png);
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.bp6-dark #translate-btn .btn-icon {
  background-image: url(logowhite36.png);
}

#root .bp6-popover {
  border-radius: 10px;
  box-shadow: var(--ndt-shadow-window);
}

#root .bp6-popover .bp6-popover-content {
  border-radius: 10px;
  background-color: var(--ndt-bg-card);
  color: var(--ndt-text-primary);
  border: 1px solid var(--ndt-border);
}

#root .bp6-popover .bp6-popover-arrow-fill {
  fill: var(--ndt-bg-card);
}

#root .bp6-popover .bp6-popover-arrow-border {
  fill: var(--ndt-border);
}

#root .bp6-menu {
  background-color: var(--ndt-bg-card);
  color: var(--ndt-text-primary);
  border-radius: 8px;
  padding: 4px;
}

#root .bp6-menu-item {
  border-radius: 6px;
  color: var(--ndt-text-primary);
}

#root .bp6-menu-item:hover,
#root .bp6-menu-item.bp6-active {
  background-color: var(--ndt-bg-hover);
  color: var(--ndt-text-primary);
}

#root .bp6-callout {
  border-radius: 8px;
  font-size: 12px;
}

.translate-type-selector .bp6-label {
  display: inline;
}

.translate-type-selector .bp6-radio {
  margin-bottom: 0;
}

#ocr-container {
  position: fixed;
  z-index: 99999999999999;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
}

#ocr-container .toolbar {
  display: none;
  position: absolute;
  z-index: 1;
}

#ocr-container img {
  max-width: 100%;
}

.app-toaster-container {
  position: fixed !important;
  z-index: 9999999999 !important;
}

.app-toaster-container .bp6-toast {
  min-width: auto;
  border-radius: 10px;
  border: 1px solid var(--ndt-border);
  box-shadow: var(--ndt-shadow-window);
}

#web-trs-panel .app-toaster-container {
  padding-right: 0;
  padding-left: 0;
}

#web-trs-panel .page-trs-form-group {
  margin: 0;
  align-items: center;
}

#web-trs-panel .page-trs-form-group > label {
  width: 70px;
}

#ndt-subtitle-panel {
  position: fixed;
  top: 5vh;
  right: 12px;
  height: 90vh;
  width: calc(90vh * 0.5);
  max-width: calc(100vw - 24px);
  z-index: 9999999998;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background-color: #000000;
  color: #f5f5f5;
  border: 1px solid #262626;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.85);
  overflow: hidden;
  font-family: var(--ndt-font-sans);
}

#ndt-subtitle-panel .ndt-sub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  background-color: #0a0a0a;
  border-bottom: 1px solid #222222;
  flex-shrink: 0;
}

#ndt-subtitle-panel .ndt-sub-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

#ndt-subtitle-panel .ndt-sub-title {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#ndt-subtitle-panel .ndt-sub-clock {
  font-family: var(--ndt-font-mono);
  font-size: 11px;
  color: #94a3b8;
  background-color: #161616;
  border: 1px solid #2a2a2a;
  padding: 1px 6px;
  border-radius: 999px;
  flex-shrink: 0;
}

#ndt-subtitle-panel .ndt-sub-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

#ndt-subtitle-panel .ndt-sub-actions .bp6-button,
#ndt-subtitle-panel .ndt-sub-actions .bp6-icon {
  color: #cbd5e1 !important;
}

#ndt-subtitle-panel .ndt-sub-actions .bp6-button:hover {
  background-color: #1e293b !important;
  color: #ffffff !important;
}

#ndt-subtitle-panel .ndt-sub-follow-btn {
  appearance: none;
  border: 1px solid rgba(56, 189, 248, 0.55);
  background-color: rgba(14, 165, 233, 0.16);
  color: #7dd3fc;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  cursor: pointer;
}

#ndt-subtitle-panel .ndt-sub-follow-btn:hover {
  background-color: rgba(14, 165, 233, 0.28);
  color: #ffffff;
}

#ndt-subtitle-panel .ndt-sub-tracks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: #070707;
  border-bottom: 1px solid #1f1f1f;
  flex-shrink: 0;
  max-height: 112px;
  overflow-y: auto;
}

#ndt-subtitle-panel .ndt-sub-track-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  background-color: #141414;
  border: 1px solid #2b2b2b;
  color: #a3a3a3;
  font-size: 11.5px;
  line-height: 1.3;
  cursor: pointer;
  user-select: none;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}

#ndt-subtitle-panel .ndt-sub-track-checkbox.is-checked {
  background-color: rgba(14, 165, 233, 0.16);
  border-color: rgba(56, 189, 248, 0.6);
  color: #f8fafc;
}

#ndt-subtitle-panel .ndt-sub-track-checkbox input {
  margin: 0;
  accent-color: #38bdf8;
  cursor: pointer;
}

#ndt-subtitle-panel .ndt-sub-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background-color: #000000;
}

#ndt-subtitle-panel .ndt-sub-stream {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 10px;
  background-color: #000000;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
}

#ndt-subtitle-panel .ndt-sub-stream::-webkit-scrollbar {
  width: 6px;
}

#ndt-subtitle-panel .ndt-sub-stream::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.22);
  border-radius: 3px;
}

#ndt-subtitle-panel .ndt-sub-row-pad {
  min-height: 54px;
  padding: 8px 10px;
  border-bottom: 1px solid #101010;
  display: flex;
  align-items: center;
  color: #262626;
  font-size: 11px;
  box-sizing: border-box;
  user-select: none;
}

#ndt-subtitle-panel .ndt-sub-row {
  min-height: 54px;
  padding: 8px 10px;
  margin: 2px 0;
  border-radius: 8px;
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  background-color: transparent;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  box-sizing: border-box;
  transition: background-color 160ms ease, border-color 160ms ease, opacity 160ms ease;
}

#ndt-subtitle-panel .ndt-sub-row:hover {
  background-color: #111111;
}

#ndt-subtitle-panel .ndt-sub-row.is-past {
  opacity: 0.56;
  color: #8a8a8a;
}

#ndt-subtitle-panel .ndt-sub-row.is-future {
  opacity: 0.84;
  color: #bdbdbd;
}

#ndt-subtitle-panel .ndt-sub-row.is-active {
  opacity: 1;
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.26) 0%, rgba(30, 58, 138, 0.2) 100%);
  border-color: rgba(56, 189, 248, 0.6);
  border-left: 3px solid #38bdf8;
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.18);
  color: #ffffff;
}

#ndt-subtitle-panel .ndt-sub-row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

#ndt-subtitle-panel .ndt-sub-row-time {
  font-family: var(--ndt-font-mono);
  font-size: 10.5px;
  color: #666666;
}

#ndt-subtitle-panel .ndt-sub-row.is-active .ndt-sub-row-time {
  color: #7dd3fc;
  font-weight: 600;
}

#ndt-subtitle-panel .ndt-sub-row-badge {
  font-size: 10px;
  font-weight: 600;
  color: #38bdf8;
  background-color: rgba(14, 165, 233, 0.18);
  border: 1px solid rgba(56, 189, 248, 0.45);
  padding: 0 5px;
  border-radius: 4px;
}

#ndt-subtitle-panel .ndt-sub-lines {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

#ndt-subtitle-panel .ndt-sub-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12.5px;
  line-height: 1.42;
  word-break: break-word;
}

#ndt-subtitle-panel .ndt-sub-row.is-active .ndt-sub-line {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.48;
  color: #ffffff;
}

#ndt-subtitle-panel .ndt-sub-lang-tag {
  font-size: 10px;
  font-weight: 600;
  color: #737373;
  background-color: #171717;
  border: 1px solid #262626;
  border-radius: 4px;
  padding: 0 4px;
  flex-shrink: 0;
  text-transform: uppercase;
}

#ndt-subtitle-panel .ndt-sub-row.is-active .ndt-sub-lang-tag {
  color: #bae6fd;
  background-color: rgba(14, 165, 233, 0.25);
  border-color: rgba(56, 189, 248, 0.5);
}

#ndt-subtitle-panel .ndt-sub-stream-tail {
  min-height: 62vh;
  flex-shrink: 0;
}

#ndt-subtitle-panel .ndt-sub-hint {
  margin: 12px;
  font-size: 12px;
  color: #b3b3b3;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: #0d0d0d;
  border: 1px solid #262626;
  line-height: 1.5;
}

#ndt-subtitle-panel .ndt-sub-error {
  margin: 12px;
  font-size: 12px;
  color: #fca5a5;
  background-color: rgba(127, 29, 29, 0.35);
  border: 1px solid rgba(248, 113, 113, 0.4);
  border-radius: 8px;
  padding: 10px 12px;
}
`;
