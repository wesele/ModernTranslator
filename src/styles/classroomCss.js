export default `
/* ======================== Language Classroom Modal ======================== */
#ndt-classroom-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483640;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(9, 11, 16, 0.62);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: ndt-classroom-fade-in 160ms ease-out;
  font-family: var(--ndt-font-sans);
  color: var(--ndt-text-primary);
}

#ndt-classroom-backdrop.is-maximized {
  padding: 0;
}

@keyframes ndt-classroom-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes ndt-classroom-pop-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes ndt-classroom-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.ndt-cls-spin {
  animation: ndt-classroom-spin 0.9s linear infinite;
}

#ndt-classroom-modal {
  --cls-brand: #f97316;
  --cls-brand-soft: rgba(249, 115, 22, 0.12);
  --cls-brand-border: rgba(249, 115, 22, 0.34);
  --cls-brand-fg: #ea580c;
  --cls-indigo: #4f46e5;
  --cls-indigo-soft: rgba(79, 70, 229, 0.1);
  --cls-indigo-fg: #4338ca;
  --cls-amber-soft: rgba(245, 158, 11, 0.14);
  --cls-amber-fg: #b45309;

  width: min(1060px, 94vw);
  height: min(760px, 86vh);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background-color: var(--ndt-bg-window);
  border: 1px solid var(--ndt-border);
  box-shadow: 0 28px 80px -16px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.06);
  overflow: hidden;
  animation: ndt-classroom-pop-in 180ms cubic-bezier(0.16, 1, 0.3, 1);
  transition: width 180ms cubic-bezier(0.16, 1, 0.3, 1),
    height 180ms cubic-bezier(0.16, 1, 0.3, 1),
    border-radius 180ms ease;
}

#ndt-classroom-modal.is-maximized {
  width: 100vw;
  height: 100vh;
  max-height: 100vh;
  border-radius: 0;
  border: none;
}

#root.bp6-dark #ndt-classroom-modal,
.bp6-dark #ndt-classroom-modal {
  --cls-brand: #fb923c;
  --cls-brand-soft: rgba(251, 146, 60, 0.16);
  --cls-brand-border: rgba(251, 146, 60, 0.36);
  --cls-brand-fg: #fdba74;
  --cls-indigo-soft: rgba(129, 140, 248, 0.16);
  --cls-indigo-fg: #a5b4fc;
  --cls-amber-soft: rgba(251, 191, 36, 0.16);
  --cls-amber-fg: #fcd34d;
}

/* Header */
.ndt-cls-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 13px 18px;
  background-color: var(--ndt-bg-surface);
  border-bottom: 1px solid var(--ndt-border);
  flex-shrink: 0;
}

.ndt-cls-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.ndt-cls-brand-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #18181b;
}

.ndt-cls-brand-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ndt-cls-brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ndt-cls-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ndt-cls-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ndt-text-primary);
  margin: 0;
  line-height: 1.25;
}

.ndt-cls-beta-pill {
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--cls-brand-soft);
  color: var(--cls-brand-fg);
  border: 1px solid var(--cls-brand-border);
}

.ndt-cls-video-name {
  font-size: 12px;
  color: var(--ndt-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.ndt-cls-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border-radius: 10px;
  background-color: var(--ndt-bg-subtle);
  border: 1px solid var(--ndt-border);
  flex-shrink: 0;
}

.ndt-cls-tab-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--ndt-text-secondary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 7px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background-color 140ms ease, color 140ms ease, box-shadow 140ms ease;
}

.ndt-cls-tab-btn:hover {
  color: var(--ndt-text-primary);
}

.ndt-cls-tab-btn.is-active {
  background-color: var(--ndt-bg-card);
  color: var(--ndt-text-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ndt-cls-tab-count {
  font-size: 11px;
  font-weight: 700;
  font-family: var(--ndt-font-mono);
  padding: 0 6px;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--cls-brand-soft);
  color: var(--cls-brand-fg);
}

.ndt-cls-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ndt-cls-icon-btn {
  appearance: none;
  border: 1px solid var(--ndt-border);
  background: var(--ndt-bg-card);
  color: var(--ndt-text-secondary);
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
}

.ndt-cls-icon-btn:hover {
  background: var(--ndt-bg-hover);
  color: var(--ndt-text-primary);
  border-color: var(--ndt-border-hover);
}

/* Control Strip */
.ndt-cls-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 14px;
  padding: 10px 18px;
  background-color: var(--ndt-bg-surface);
  border-bottom: 1px solid var(--ndt-border-subtle);
  flex-shrink: 0;
}

.ndt-cls-toolbar-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ndt-cls-field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ndt-text-muted);
  white-space: nowrap;
}

.ndt-cls-track-pills {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.ndt-cls-track-pill {
  appearance: none;
  border: 1px solid var(--ndt-border);
  background: var(--ndt-bg-card);
  color: var(--ndt-text-secondary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 140ms ease;
}

.ndt-cls-track-pill:hover {
  border-color: var(--ndt-border-hover);
  color: var(--ndt-text-primary);
}

.ndt-cls-track-pill.is-selected {
  background: var(--cls-brand-soft);
  border-color: var(--cls-brand-border);
  color: var(--cls-brand-fg);
  font-weight: 600;
}

.ndt-cls-track-cues {
  font-size: 10.5px;
  opacity: 0.72;
  font-family: var(--ndt-font-mono);
}

.ndt-cls-ratio-group {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 8px;
  background: var(--ndt-bg-subtle);
  border: 1px solid var(--ndt-border);
}

.ndt-cls-ratio-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--ndt-text-secondary);
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 130ms ease;
}

.ndt-cls-ratio-btn.is-active {
  background: var(--ndt-bg-card);
  color: var(--ndt-text-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.ndt-cls-select {
  appearance: none;
  border: 1px solid var(--ndt-border);
  background-color: var(--ndt-bg-card);
  color: var(--ndt-text-primary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 26px 5px 10px;
  border-radius: 8px;
  cursor: pointer;
  max-width: 220px;
  outline: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--ndt-text-muted) 50%),
    linear-gradient(135deg, var(--ndt-text-muted) 50%, transparent 50%);
  background-position: calc(100% - 13px) 50%, calc(100% - 8px) 50%;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
}

.ndt-cls-select:hover,
.ndt-cls-select:focus {
  border-color: var(--ndt-border-hover);
}

.ndt-cls-btn {
  appearance: none;
  border: 1px solid var(--ndt-border);
  background: var(--ndt-bg-card);
  color: var(--ndt-text-primary);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  transition: all 140ms ease;
}

.ndt-cls-btn:hover:not(:disabled) {
  background: var(--ndt-bg-hover);
  border-color: var(--ndt-border-hover);
}

.ndt-cls-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ndt-cls-btn.is-primary {
  background: var(--cls-brand);
  border-color: var(--cls-brand);
  color: #ffffff;
}

.ndt-cls-btn.is-primary:hover:not(:disabled) {
  filter: brightness(1.06);
}

.ndt-cls-btn.is-saved {
  background: var(--ndt-success-bg);
  border-color: var(--ndt-success-border);
  color: var(--ndt-success-fg);
}

.ndt-cls-btn.is-danger-ghost {
  color: var(--ndt-danger-fg);
  border-color: transparent;
  background: transparent;
}

.ndt-cls-btn.is-danger-ghost:hover:not(:disabled) {
  background: var(--ndt-danger-bg);
  border-color: var(--ndt-danger-border);
}

.ndt-cls-btn.is-sm {
  font-size: 12px;
  padding: 4px 9px;
  border-radius: 7px;
}

/* Main Body & Ink-Green Classroom Blackboard Surface */
.ndt-cls-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--ndt-bg-window);
}

.ndt-cls-body.is-blackboard {
  --bb-bg: #1b342b;
  --bb-bg-center: #234338;
  --bb-bg-edge: #142720;
  --bb-bg-elevated: rgba(255, 255, 255, 0.055);
  --bb-bg-hover: rgba(255, 255, 255, 0.11);
  --bb-border: rgba(255, 255, 255, 0.1);
  --bb-border-strong: rgba(255, 255, 255, 0.17);
  --bb-text: #f1f5f0;
  --bb-text-strong: #f5f7f3;
  --bb-text-sub: #b6c8be;
  --bb-text-muted: #829c8f;
  --bb-dot-idle: #6d857a;
  --bb-switch-thumb-on: #172d25;
  --bb-chalk-gold: #f6c465;
  --bb-chalk-gold-soft: rgba(246, 196, 101, 0.14);
  --bb-chalk-gold-border: rgba(246, 196, 101, 0.42);

  background: radial-gradient(
    ellipse 92% 72% at 50% 34%,
    var(--bb-bg-center) 0%,
    var(--bb-bg) 62%,
    var(--bb-bg-edge) 100%
  );
  color: var(--bb-text);
  box-shadow: inset 0 6px 20px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.ndt-cls-body.is-slateboard {
  --bb-bg: #26292e;
  --bb-bg-center: #30343b;
  --bb-bg-edge: #1e2024;
  --bb-bg-elevated: rgba(255, 255, 255, 0.06);
  --bb-bg-hover: rgba(255, 255, 255, 0.115);
  --bb-border: rgba(255, 255, 255, 0.1);
  --bb-border-strong: rgba(255, 255, 255, 0.18);
  --bb-text: #f3f4f6;
  --bb-text-strong: #f9fafb;
  --bb-text-sub: #c2c7d0;
  --bb-text-muted: #8f96a3;
  --bb-dot-idle: #6b7280;
  --bb-switch-thumb-on: #23262b;
  --bb-chalk-gold: #f6c465;
  --bb-chalk-gold-soft: rgba(246, 196, 101, 0.15);
  --bb-chalk-gold-border: rgba(246, 196, 101, 0.42);
}

.ndt-cls-body.is-blackboard .ndt-cls-hero-title {
  color: var(--bb-text);
}

.ndt-cls-body.is-blackboard .ndt-cls-hero-desc {
  color: var(--bb-text-sub);
}

.ndt-cls-body.is-blackboard .ndt-cls-hero-badge {
  background: var(--bb-chalk-gold-soft);
  border-color: var(--bb-chalk-gold-border);
  color: var(--bb-chalk-gold);
}

.ndt-cls-body.is-blackboard .ndt-cls-loading-ring {
  border-color: rgba(255, 255, 255, 0.14);
  border-top-color: var(--bb-chalk-gold);
}

.ndt-cls-body.is-blackboard .ndt-cls-progress-card {
  background: rgba(12, 26, 20, 0.38);
  border-color: var(--bb-border);
}

.ndt-cls-body.is-blackboard .ndt-cls-progress-card-label,
.ndt-cls-body.is-blackboard .ndt-cls-progress-card-nums,
.ndt-cls-body.is-blackboard .ndt-cls-progress-overall {
  color: var(--bb-text-sub);
}

.ndt-cls-body.is-blackboard .ndt-cls-progress-card-nums strong,
.ndt-cls-body.is-blackboard .ndt-cls-progress-overall strong {
  color: var(--bb-text);
}

.ndt-cls-body.is-blackboard .ndt-cls-progress-track {
  background: rgba(255, 255, 255, 0.08);
  border-color: transparent;
}

.ndt-cls-body.is-blackboard .ndt-cls-progress-chip {
  background: var(--bb-bg-elevated);
  border-color: var(--bb-border);
  color: var(--bb-text-sub);
}

.ndt-cls-body.is-blackboard .ndt-cls-progress-chip.is-accent {
  background: var(--bb-chalk-gold-soft);
  border-color: var(--bb-chalk-gold-border);
  color: var(--bb-chalk-gold);
}

.ndt-cls-body.is-blackboard .ndt-cls-progress-overall {
  border-top-color: var(--bb-border);
}

.ndt-cls-body.is-blackboard .ndt-cls-btn {
  border-color: var(--bb-border-strong);
  background: var(--bb-bg-elevated);
  color: var(--bb-text);
}

.ndt-cls-body.is-blackboard .ndt-cls-btn:hover:not(:disabled) {
  background: var(--bb-bg-hover);
  border-color: rgba(255, 255, 255, 0.26);
}

.ndt-cls-body.is-blackboard .ndt-cls-btn.is-primary {
  background: #f97316;
  border-color: #f97316;
  color: #ffffff;
}

.ndt-cls-body.is-blackboard .ndt-cls-btn.is-saved {
  background: rgba(74, 222, 128, 0.15);
  border-color: rgba(74, 222, 128, 0.36);
  color: #86efac;
}

.ndt-cls-body.is-blackboard .ndt-cls-btn.is-danger-ghost {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.3);
  color: #fca5a5;
}

/* Centered States (Landing / Loading / Error / Empty) */
.ndt-cls-center-stage {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 28px;
  text-align: center;
  overflow-y: auto;
}

.ndt-cls-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--cls-brand-soft);
  border: 1px solid var(--cls-brand-border);
  color: var(--cls-brand-fg);
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 14px;
}

.ndt-cls-hero-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ndt-text-primary);
}

.ndt-cls-hero-desc {
  margin: 0 0 22px;
  max-width: 560px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--ndt-text-secondary);
}

.ndt-cls-track-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  width: 100%;
  max-width: 720px;
  margin-bottom: 20px;
}

.ndt-cls-track-card {
  appearance: none;
  text-align: left;
  border: 1.5px solid var(--ndt-border);
  background: var(--ndt-bg-card);
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
}

.ndt-cls-track-card:hover {
  transform: translateY(-2px);
  border-color: var(--cls-brand);
  box-shadow: 0 8px 24px -8px rgba(249, 115, 22, 0.25);
}

.ndt-cls-track-card.is-recommended {
  border-color: var(--cls-brand-border);
  background: linear-gradient(180deg, var(--cls-brand-soft) 0%, var(--ndt-bg-card) 60%);
}

.ndt-cls-track-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ndt-cls-track-card-name {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--ndt-text-primary);
}

.ndt-cls-track-card-rec {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--cls-brand);
  color: #ffffff;
}

.ndt-cls-track-card-meta {
  font-size: 12px;
  color: var(--ndt-text-muted);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ndt-cls-track-card-cta {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--cls-brand-fg);
}

.ndt-cls-loading-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid var(--ndt-border);
  border-top-color: var(--cls-brand);
  animation: ndt-classroom-spin 0.85s linear infinite;
  margin-bottom: 16px;
}

/* Section Strip (Integrated Seamlessly into Blackboard) */
.ndt-cls-section-bar {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px 4px;
  background: transparent;
  border-bottom: none;
  flex-shrink: 0;
}

.ndt-cls-bg-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 10px;
  border-radius: 10px;
  background: rgba(246, 196, 101, 0.14);
  border: 1px solid rgba(246, 196, 101, 0.36);
  color: #f6c465;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.ndt-cls-section-bar-actions {
  display: inline-flex;
  align-items: stretch;
  gap: 8px;
  flex-shrink: 0;
  padding-bottom: 2px;
}

.ndt-cls-section-bar-actions .ndt-cls-btn {
  height: auto;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 12.5px;
}

.ndt-cls-all-done-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 14px;
  border-radius: 10px;
  background: rgba(74, 222, 128, 0.14);
  border: 1px solid rgba(74, 222, 128, 0.34);
  color: #86efac;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.ndt-cls-section-pills {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: stretch;
  gap: 7px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: thin;
}

.ndt-cls-section-pills::-webkit-scrollbar {
  height: 5px;
}

.ndt-cls-section-pills::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.16);
  border-radius: 999px;
}

.ndt-cls-section-pill {
  appearance: none;
  flex: 0 0 auto;
  min-width: 128px;
  padding: 5px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(255, 255, 255, 0.045);
  color: #b6c8be;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: all 140ms ease;
}

.ndt-cls-section-pill:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.09);
  color: #f1f5f0;
}

.ndt-cls-section-pill.is-active {
  border-color: rgba(246, 196, 101, 0.48);
  background: rgba(246, 196, 101, 0.13);
  color: #f4f7f2;
  box-shadow: none;
}

.ndt-cls-section-pill-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ndt-cls-section-dot {
  width: 17px;
  height: 17px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.09);
  color: #b6c8be;
  font-family: var(--ndt-font-mono);
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ndt-cls-section-pill.is-done .ndt-cls-section-dot {
  background: rgba(74, 222, 128, 0.18);
  color: #86efac;
}

.ndt-cls-section-pill.is-loading .ndt-cls-section-dot {
  background: rgba(246, 196, 101, 0.18);
  color: #f6c465;
}

.ndt-cls-section-pill.is-err .ndt-cls-section-dot {
  background: rgba(248, 113, 113, 0.2);
  color: #fca5a5;
}

.ndt-cls-section-pill-title {
  font-size: 12.5px;
  font-weight: 700;
  color: #eef3ee;
}

.ndt-cls-section-count {
  margin-left: auto;
  font-family: var(--ndt-font-mono);
  font-size: 10.5px;
  font-weight: 700;
  color: #f6c465;
}

.ndt-cls-section-pill.is-done .ndt-cls-section-count {
  color: #86efac;
}

.ndt-cls-section-pill-sub {
  font-family: var(--ndt-font-mono);
  font-size: 10.5px;
  color: #829c8f;
  white-space: nowrap;
}

/* Detailed Live Progress Card */
.ndt-cls-progress-card {
  width: 100%;
  max-width: 540px;
  margin-top: 12px;
  padding: 16px 18px;
  border-radius: 14px;
  background: var(--ndt-bg-surface);
  border: 1px solid var(--ndt-border);
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.ndt-cls-progress-card-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.ndt-cls-progress-card-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ndt-text-secondary);
}

.ndt-cls-progress-card-nums {
  font-size: 13.5px;
  color: var(--ndt-text-secondary);
}

.ndt-cls-progress-card-nums strong {
  font-family: var(--ndt-font-mono);
  font-size: 15px;
  color: var(--ndt-text-primary);
}

.ndt-cls-progress-track {
  width: 100%;
  height: 9px;
  border-radius: 999px;
  background: var(--ndt-bg-subtle);
  border: 1px solid var(--ndt-border-subtle);
  overflow: hidden;
}

.ndt-cls-progress-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #f97316 0%, #fb923c 100%);
  transition: width 240ms cubic-bezier(0.16, 1, 0.3, 1);
}

.ndt-cls-progress-details {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.ndt-cls-progress-chip {
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--ndt-bg-card);
  border: 1px solid var(--ndt-border);
  color: var(--ndt-text-secondary);
}

.ndt-cls-progress-chip.is-accent {
  background: var(--cls-brand-soft);
  border-color: var(--cls-brand-border);
  color: var(--cls-brand-fg);
}

.ndt-cls-progress-overall {
  padding-top: 8px;
  border-top: 1px dashed var(--ndt-border);
  font-size: 12px;
  color: var(--ndt-text-muted);
}

.ndt-cls-progress-overall strong {
  font-family: var(--ndt-font-mono);
  color: var(--ndt-text-primary);
}

.ndt-cls-error-box {
  max-width: 520px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--ndt-danger-bg);
  border: 1px solid var(--ndt-danger-border);
  color: var(--ndt-danger-fg);
  font-size: 13.5px;
  line-height: 1.6;
  margin-bottom: 16px;
}

.ndt-cls-action-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* Summary Banner & Filter Bar (Integrated into Blackboard, No Divider) */
.ndt-cls-summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 18px 6px;
  background: transparent;
  border-bottom: none;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.ndt-cls-summary-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.ndt-cls-summary-text {
  font-size: 12px;
  color: #93ac9f;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ndt-cls-filter-pills {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.ndt-cls-filter-pill {
  appearance: none;
  border: 1px solid transparent;
  background: transparent;
  color: var(--bb-text-muted, #97b0a3);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 9px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 120ms ease;
}

.ndt-cls-filter-pill:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--bb-text, #f1f5f0);
}

.ndt-cls-filter-pill.is-active {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
  color: var(--bb-text-strong, #f4f7f2);
  font-weight: 600;
}

/* Focus Study Stage (Seamless Ink-Green Blackboard, Zero Internal Dividers) */
.ndt-cls-study-split {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  color: var(--bb-text, #f1f5f0);
}

/* Far-Left 4x4px Status Square Strip (Compact, Floating Naturally, No Divider) */
.ndt-cls-dot-rail {
  position: absolute;
  left: 14px;
  top: 10px;
  bottom: 58px;
  z-index: 2;
  display: flex;
  align-items: center;
  pointer-events: none;
}

.ndt-cls-dot-grid {
  display: grid;
  grid-auto-flow: column;
  gap: 3px;
  align-content: center;
  justify-content: start;
  pointer-events: auto;
}

.ndt-cls-detail-scroll::-webkit-scrollbar,
.ndt-cls-grid-wrap::-webkit-scrollbar,
.ndt-cls-wb-list::-webkit-scrollbar {
  width: 6px;
  height: 5px;
}

.ndt-cls-detail-scroll::-webkit-scrollbar-thumb,
.ndt-cls-grid-wrap::-webkit-scrollbar-thumb,
.ndt-cls-wb-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.16);
  border-radius: 999px;
}

.ndt-cls-dot-cell {
  appearance: none;
  border: none;
  background: transparent;
  width: 10px;
  height: 10px;
  padding: 0;
  border-radius: 2.5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 120ms ease, box-shadow 120ms ease;
}

.ndt-cls-dot-cell:hover {
  background: rgba(255, 255, 255, 0.12);
}

.ndt-cls-dot-cell.is-active {
  box-shadow: inset 0 0 0 1px rgba(241, 245, 240, 0.82);
}

.ndt-cls-dot-sq {
  width: 4px;
  height: 4px;
  border-radius: 1px;
  display: block;
  flex-shrink: 0;
  background: var(--bb-dot-idle, #6d857a);
}

.ndt-cls-dot-cell.is-unstudied .ndt-cls-dot-sq,
.ndt-cls-dot-legend-item.is-unstudied .ndt-cls-dot-sq {
  background: var(--bb-dot-idle, #6d857a);
}

.ndt-cls-dot-cell.is-studied .ndt-cls-dot-sq,
.ndt-cls-dot-legend-item.is-studied .ndt-cls-dot-sq {
  background: #60a5fa;
}

.ndt-cls-dot-cell.is-new .ndt-cls-dot-sq,
.ndt-cls-dot-legend-item.is-new .ndt-cls-dot-sq {
  background: #fb923c;
}

.ndt-cls-dot-cell.is-mastered .ndt-cls-dot-sq,
.ndt-cls-dot-legend-item.is-mastered .ndt-cls-dot-sq {
  background: #4ade80;
}

.ndt-cls-dot-legend {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 6px;
}

.ndt-cls-dot-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  line-height: 1;
  color: #829c8f;
  white-space: nowrap;
}

.ndt-cls-mini-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--ndt-bg-pill);
  color: var(--ndt-text-secondary);
}

.ndt-cls-mini-tag.is-phrase {
  background: var(--cls-indigo-soft);
  color: var(--cls-indigo-fg);
}

/* Detail Study Card (Centered, Natural Chalk Flow on Blackboard) */
.ndt-cls-detail-pane {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: transparent;
}

.ndt-cls-quiz-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--bb-text-sub, #a9bfb3);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: color 140ms ease;
}

.ndt-cls-quiz-toggle:hover,
.ndt-cls-quiz-toggle.is-checked {
  color: var(--bb-text, #f1f5f0);
}

.ndt-cls-quiz-toggle input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  margin: 0;
  pointer-events: none;
}

.ndt-cls-switch-track {
  width: 30px;
  height: 17px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  padding: 2px;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  transition: background-color 180ms ease, border-color 180ms ease;
}

.ndt-cls-switch-thumb {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #d7e3dc;
  transform: translateX(0);
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

.ndt-cls-quiz-toggle.is-checked .ndt-cls-switch-track {
  background: rgba(246, 196, 101, 0.88);
  border-color: #f6c465;
}

.ndt-cls-quiz-toggle.is-checked .ndt-cls-switch-thumb {
  transform: translateX(13px);
  background: var(--bb-switch-thumb-on, #172d25);
}

.ndt-cls-quiz-toggle input:focus-visible + .ndt-cls-switch-track {
  box-shadow: 0 0 0 2px rgba(246, 196, 101, 0.45);
}

.ndt-cls-detail-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 20px 64px 16px;
  background: transparent;
  display: flex;
  flex-direction: column;
}

.ndt-cls-card-inner {
  width: 100%;
  max-width: 620px;
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 24px;
}

.ndt-cls-word-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 2px;
  width: 100%;
}

.ndt-cls-word-title-row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
}

.ndt-cls-word-term {
  margin: 0;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--bb-text-strong, #f5f7f3);
  word-break: break-word;
  user-select: text;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.2);
}

.ndt-cls-word-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.ndt-cls-card-inner .ndt-cls-word-meta {
  justify-content: center;
}

.ndt-cls-phonetic {
  font-family: var(--ndt-font-mono);
  font-size: 13px;
  color: var(--ndt-text-secondary);
  padding: 2px 9px;
  border-radius: 7px;
  background: transparent;
  border: 1px solid var(--ndt-border-subtle);
}

.ndt-cls-body.is-blackboard .ndt-cls-phonetic {
  color: var(--bb-text-sub, #bfd0c6);
  border-color: rgba(255, 255, 255, 0.14);
}

.ndt-cls-pos-chip {
  font-family: var(--ndt-font-mono);
  font-size: 11.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--ndt-pos-bg);
  color: var(--ndt-pos-fg);
}

.ndt-cls-body.is-blackboard .ndt-cls-pos-chip {
  background: rgba(125, 211, 252, 0.14);
  color: #8fd8fb;
}

.ndt-cls-level-chip {
  font-size: 11.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--cls-amber-soft);
  color: var(--cls-amber-fg);
}

.ndt-cls-body.is-blackboard .ndt-cls-level-chip {
  background: rgba(246, 196, 101, 0.16);
  color: #f8d07d;
}

.ndt-cls-type-chip {
  font-size: 11.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--cls-indigo-soft);
  color: var(--cls-indigo-fg);
}

.ndt-cls-body.is-blackboard .ndt-cls-type-chip {
  background: rgba(196, 181, 253, 0.14);
  color: #d0c4fc;
}

.ndt-cls-lang-chip {
  font-size: 11.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.09);
  color: var(--bb-text-sub, #c2c7d0);
}

.ndt-cls-surface-chip {
  font-size: 11.5px;
  color: var(--bb-text-muted, #93ac9f);
  padding: 2px 8px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.ndt-cls-diff-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 2px;
}

.ndt-cls-diff-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
}

.ndt-cls-diff-dot.is-filled {
  background: #f6c465;
}

.ndt-cls-speak-btn {
  appearance: none;
  border: 1px solid var(--ndt-border);
  background: var(--ndt-bg-card);
  color: var(--ndt-text-primary);
  border-radius: 10px;
  padding: 6px 11px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 140ms ease;
}

.ndt-cls-speak-btn:hover {
  border-color: var(--cls-brand-border);
  background: var(--cls-brand-soft);
  color: var(--cls-brand-fg);
}

.ndt-cls-body.is-blackboard .ndt-cls-speak-btn {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: #edf3ee;
}

.ndt-cls-body.is-blackboard .ndt-cls-speak-btn:hover {
  border-color: rgba(246, 196, 101, 0.42);
  background: rgba(246, 196, 101, 0.14);
  color: #f8d07d;
}

.ndt-cls-speak-btn.is-icon-only {
  width: 32px;
  height: 32px;
  padding: 0;
  justify-content: center;
  border-radius: 9px;
}

.ndt-cls-speak-btn.is-mini {
  padding: 4px 6px;
  border-radius: 7px;
  font-size: 11px;
}

/* Section Blocks (Zero Dividers, Natural Vertical Flow on Blackboard) */
.ndt-cls-section {
  width: 100%;
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: none;
  margin-bottom: 0;
  text-align: center;
}

.ndt-cls-section-head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 8px;
}

.ndt-cls-section-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--bb-text-muted, #829c8f);
}

.ndt-cls-meaning-text {
  font-size: 21px;
  font-weight: 700;
  color: var(--bb-text-strong, #f4f7f2);
  line-height: 1.5;
  margin: 0;
  user-select: text;
}

.ndt-cls-explanation {
  margin: 8px 0 0;
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--ndt-text-secondary);
  user-select: text;
}

.ndt-cls-card-inner .ndt-cls-explanation {
  margin: 8px auto 0;
  max-width: 540px;
  color: var(--bb-text-sub, #b5c7bd);
}

.ndt-cls-reveal-mask {
  max-width: 460px;
  margin: 0 auto;
  padding: 16px 18px;
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.03);
  text-align: center;
  cursor: pointer;
  color: var(--bb-text-sub, #b6c8be);
  font-size: 13px;
  font-weight: 600;
  transition: all 140ms ease;
}

.ndt-cls-reveal-mask:hover {
  border-color: #f6c465;
  color: #f8d07d;
  background: rgba(246, 196, 101, 0.1);
}

.ndt-cls-quote-box {
  font-size: 15px;
  line-height: 1.7;
  color: var(--bb-text, #eef3ee);
  max-width: 560px;
  margin: 0 auto;
  user-select: text;
}

.ndt-cls-quote-zh {
  margin: 6px auto 0;
  max-width: 560px;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--bb-text-sub, #a9bfb3);
  user-select: text;
}

.ndt-cls-quote-zh.is-hidden {
  filter: blur(5px);
  user-select: none;
  cursor: pointer;
}

.ndt-cls-highlight {
  background: var(--cls-brand-soft);
  color: var(--cls-brand-fg);
  font-weight: 700;
  padding: 0 3px;
  border-radius: 4px;
}

.ndt-cls-body.is-blackboard .ndt-cls-highlight {
  background: rgba(246, 196, 101, 0.18);
  color: #fcd88a;
}

.ndt-cls-time-btn {
  appearance: none;
  border: 1px solid var(--cls-brand-border);
  background: var(--cls-brand-soft);
  color: var(--cls-brand-fg);
  font-family: var(--ndt-font-mono);
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 130ms ease;
}

.ndt-cls-body.is-blackboard .ndt-cls-time-btn {
  border-color: rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #eef3ee;
}

.ndt-cls-time-btn:hover {
  background: var(--cls-brand);
  color: #ffffff;
}

.ndt-cls-body.is-blackboard .ndt-cls-time-btn:hover {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.ndt-cls-example-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.ndt-cls-example-item {
  width: 100%;
  max-width: 560px;
  padding: 2px 0;
  border-radius: 0;
  background: transparent;
  border: none;
}

.ndt-cls-example-top {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ndt-cls-example-src {
  font-size: 14.5px;
  font-weight: 500;
  line-height: 1.6;
  color: var(--bb-text, #eef3ee);
  user-select: text;
}

.ndt-cls-example-zh {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--bb-text-sub, #a9bfb3);
  user-select: text;
}

.ndt-cls-example-zh.is-hidden {
  filter: blur(5px);
  user-select: none;
  cursor: pointer;
}

.ndt-cls-wb-card-source {
  margin-top: 2px;
  font-size: 12px;
  color: var(--bb-text-muted, #8f96a3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 560px;
}

.ndt-cls-wb-card-source a {
  color: var(--bb-text-sub, #c2c7d0);
  text-decoration: none;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.24);
  transition: color 130ms ease, border-color 130ms ease;
}

.ndt-cls-wb-card-source a:hover {
  color: var(--bb-chalk-gold, #f6c465);
  border-bottom-color: var(--bb-chalk-gold, #f6c465);
}

/* Detail Footer: Seamless on Blackboard (No Divider Line) */
.ndt-cls-detail-footer {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 10px 22px 16px;
  background: transparent;
  border-top: none;
  flex-shrink: 0;
}

.ndt-cls-footer-left {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ndt-cls-nav-btns {
  justify-self: center;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ndt-cls-study-actions {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* Grid Overview Mode (Seamless Blackboard / Slateboard Theme) */
.ndt-cls-grid-wrap {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 12px 18px 22px;
  background: transparent;
  color: var(--bb-text, #f1f5f0);
}

.ndt-cls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.ndt-cls-grid-card {
  padding: 14px 16px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 140ms ease, background-color 140ms ease, opacity 140ms ease;
}

.ndt-cls-grid-card.is-mastered {
  background: rgba(255, 255, 255, 0.032);
  border-color: rgba(74, 222, 128, 0.22);
}

.ndt-cls-grid-card:hover {
  border-color: rgba(246, 196, 101, 0.34);
  background: rgba(255, 255, 255, 0.08);
}

.ndt-cls-grid-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.ndt-cls-grid-term {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  text-align: start;
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  color: var(--bb-text-strong, #f3f6f2);
  cursor: pointer;
}

.ndt-cls-grid-term:hover {
  color: #f8d07d;
}

.ndt-cls-grid-trans {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ndt-text-primary);
  line-height: 1.45;
  user-select: text;
}

.ndt-cls-grid-wrap .ndt-cls-grid-trans {
  color: var(--bb-text, #eef3ee);
}

.ndt-cls-grid-ex {
  font-size: 12.5px;
  color: var(--ndt-text-secondary);
  line-height: 1.5;
  padding-top: 6px;
  border-top: 1px dashed var(--ndt-border-subtle);
  user-select: text;
}

.ndt-cls-grid-wrap .ndt-cls-grid-ex {
  color: var(--bb-text-sub, #b5c7bd);
  border-top-color: rgba(255, 255, 255, 0.1);
}

.ndt-cls-grid-source {
  font-size: 11.5px;
  color: var(--bb-text-muted, #8f96a3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ndt-cls-grid-source a {
  color: var(--bb-text-sub, #c2c7d0);
  text-decoration: none;
}

.ndt-cls-grid-source a:hover {
  color: var(--bb-chalk-gold, #f6c465);
  text-decoration: underline;
}

.ndt-cls-grid-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 4px;
}

/* Wordbook Tab */
.ndt-cls-wb-wrap {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ndt-cls-wb-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 18px;
  background: var(--ndt-bg-surface);
  border-bottom: 1px solid var(--ndt-border-subtle);
  flex-shrink: 0;
}

.ndt-cls-search-box {
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 340px;
}

.ndt-cls-search-input {
  width: 100%;
  padding: 6px 12px 6px 32px;
  border-radius: 9px;
  border: 1px solid var(--ndt-border);
  background: var(--ndt-bg-card);
  color: var(--ndt-text-primary);
  font-family: inherit;
  font-size: 12.5px;
  outline: none;
}

.ndt-cls-search-input:focus {
  border-color: var(--cls-brand-border);
}

.ndt-cls-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ndt-text-muted);
  pointer-events: none;
  display: flex;
}

.ndt-cls-wb-list {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 14px 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ndt-cls-wb-card {
  padding: 14px 16px;
  border-radius: 13px;
  background: var(--ndt-bg-card);
  border: 1px solid var(--ndt-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ndt-cls-wb-card.is-mastered {
  opacity: 0.72;
  background: var(--ndt-bg-surface);
}

.ndt-cls-wb-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.ndt-cls-wb-term-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.ndt-cls-wb-term {
  font-size: 17px;
  font-weight: 700;
  color: var(--ndt-text-primary);
  user-select: text;
}

.ndt-cls-wb-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ndt-cls-wb-source {
  font-size: 11.5px;
  color: var(--ndt-text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ndt-cls-wb-source a {
  color: var(--ndt-link);
  text-decoration: none;
}

.ndt-cls-wb-source a:hover {
  text-decoration: underline;
}

.ndt-cls-toast {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483642;
  padding: 8px 16px;
  border-radius: 999px;
  background: #18181b;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 600;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.14);
  pointer-events: none;
}

/* RTL / Arabic Script Typography (prevent cursive joining breaks & diacritic clipping) */
#ndt-classroom-modal .is-rtl {
  direction: rtl;
  unicode-bidi: isolate;
  letter-spacing: 0 !important;
  font-family: "Noto Naskh Arabic", "Geeza Pro", "Segoe UI", Tahoma, Arial, var(--ndt-font-sans);
}

#ndt-classroom-modal .ndt-cls-word-term.is-rtl {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.55;
}

#ndt-classroom-modal .ndt-cls-quote-box.is-rtl,
#ndt-classroom-modal .ndt-cls-example-src.is-rtl {
  font-size: 16.5px;
  line-height: 1.9;
}

#ndt-classroom-modal .ndt-cls-grid-term.is-rtl,
#ndt-classroom-modal .ndt-cls-wb-term.is-rtl {
  font-size: 18px;
  line-height: 1.55;
}

#ndt-classroom-modal .ndt-cls-grid-ex.is-rtl,
#ndt-classroom-modal .ndt-cls-grid-ex .is-rtl {
  font-size: 14px;
  line-height: 1.8;
  text-align: right;
}

#ndt-classroom-modal .is-rtl .ndt-cls-highlight {
  letter-spacing: 0;
  padding: 1px 4px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

@media (max-width: 780px) {
  #ndt-classroom-modal {
    width: 96vw;
    height: 90vh;
  }
  .ndt-cls-dot-rail {
    position: static;
    padding: 6px 14px 0;
    justify-content: center;
  }
  .ndt-cls-dot-grid {
    grid-auto-flow: row !important;
    grid-template-rows: none !important;
    grid-template-columns: repeat(auto-fill, 10px) !important;
    max-width: 100%;
  }
  .ndt-cls-detail-scroll {
    padding: 16px 20px;
  }
  .ndt-cls-dot-legend {
    display: none;
  }
  .ndt-cls-detail-footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    padding: 10px 14px;
  }
}
`;
