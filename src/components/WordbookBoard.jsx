import * as React from "react";
import { formatSubtitleTime } from "../shared/subtitleTimeline.js";
import { findHighlightRanges, isRtlText } from "../shared/textScript.js";
import { useI18n } from "../shared/i18n/index.js";

function SpeakerIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.5 7.5h3.2L11 4v12l-4.3-3.5H3.5a1 1 0 01-1-1v-3a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 7.3a4 4 0 010 5.4M16.2 5.2a7 7 0 010 9.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.75 5.5h12.5M7.5 5.5V4a1 1 0 011-1h3a1 1 0 011 1v1.5M5.5 5.5l.7 10.1a1.4 1.4 0 001.4 1.3h4.8a1.4 1.4 0 001.4-1.3l.7-10.1"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function renderHighlightedQuote(quote, term, surfaceForm) {
  const text = String(quote || "");
  if (!text) return null;
  const ranges = findHighlightRanges(text, [surfaceForm, term]);
  if (ranges.length === 0) return text;
  const nodes = [];
  let cursor = 0;
  for (let i = 0; i < ranges.length; i += 1) {
    const { start, end } = ranges[i];
    if (start > cursor) {
      nodes.push(<React.Fragment key={`t-${i}`}>{text.slice(cursor, start)}</React.Fragment>);
    }
    nodes.push(
      <span key={`h-${i}`} className="ndt-cls-highlight">
        {text.slice(start, end)}
      </span>
    );
    cursor = end;
  }
  if (cursor < text.length) {
    nodes.push(<React.Fragment key="t-end">{text.slice(cursor)}</React.Fragment>);
  }
  return nodes;
}

export const WordbookBoard = React.forwardRef(function WordbookBoard(
  {
    items = [],
    totalCount = 0,
    viewMode = "focus",
    onViewModeChange,
    onSpeak,
    onToggleMastered,
    onRemove,
    onSeekVideo,
    currentVideoId = "",
    onGoStudy,
    emptyHint = "",
    enableKeyboardShortcuts = true,
    className = "",
  },
  ref
) {
  const { t, getLanguageName } = useI18n();
  const [activeItemId, setActiveItemId] = React.useState("");
  const [quizMode, setQuizMode] = React.useState(false);
  const [revealedIds, setRevealedIds] = React.useState(() => new Set());
  const [sessionReviewedIds, setSessionReviewedIds] = React.useState(() => new Set());
  const [dotRowsPerCol, setDotRowsPerCol] = React.useState(24);

  const dotRailRef = React.useRef(null);
  const lastIndexRef = React.useRef(0);

  const activeIndex = React.useMemo(() => {
    if (items.length === 0) return -1;
    const idx = items.findIndex((it) => it.id === activeItemId);
    if (idx >= 0) return idx;
    return Math.min(lastIndexRef.current, items.length - 1);
  }, [items, activeItemId]);

  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;

  React.useEffect(() => {
    if (activeIndex >= 0) {
      lastIndexRef.current = activeIndex;
    } else {
      lastIndexRef.current = 0;
    }
    if (activeItem && activeItem.id !== activeItemId) {
      setActiveItemId(activeItem.id);
    } else if (!activeItem && activeItemId) {
      setActiveItemId("");
    }
  }, [activeIndex, activeItem, activeItemId]);

  React.useEffect(() => {
    if (viewMode !== "focus" || !activeItem?.id) return;
    setSessionReviewedIds((prev) => {
      if (prev.has(activeItem.id)) return prev;
      const next = new Set(prev);
      next.add(activeItem.id);
      return next;
    });
  }, [viewMode, activeItem?.id]);

  React.useEffect(() => {
    const el = dotRailRef.current;
    if (!el) return;
    const updateRows = () => {
      const h = el.clientHeight;
      if (h > 0) {
        setDotRowsPerCol(Math.max(8, Math.floor((h + 3) / 13)));
      }
    };
    updateRows();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateRows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode, items.length]);

  const toggleRevealItem = React.useCallback((id) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleKeyDown = React.useCallback(
    (e) => {
      if (viewMode !== "focus" || !activeItem) return false;
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      const actualTarget = path[0] || e.target;
      const tag = (actualTarget?.tagName || "").toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || tag === "select" || actualTarget?.isContentEditable;
      if (isTyping) return false;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        if (activeIndex < items.length - 1) {
          setActiveItemId(items[activeIndex + 1].id);
        }
        return true;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (activeIndex > 0) {
          setActiveItemId(items[activeIndex - 1].id);
        }
        return true;
      }
      if (e.key === " ") {
        if (quizMode) {
          e.preventDefault();
          toggleRevealItem(activeItem.id);
          return true;
        }
        return false;
      }
      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        onToggleMastered?.(activeItem);
        return true;
      }
      return false;
    },
    [viewMode, activeItem, activeIndex, items, quizMode, toggleRevealItem, onToggleMastered]
  );

  React.useImperativeHandle(ref, () => ({ handleKeyDown }), [handleKeyDown]);

  React.useEffect(() => {
    if (!enableKeyboardShortcuts) return undefined;
    const listener = (e) => {
      handleKeyDown(e);
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, [enableKeyboardShortcuts, handleKeyDown]);

  const getItemDotStatus = React.useCallback(
    (item) => {
      if (item?.mastered) return "mastered";
      if (sessionReviewedIds.has(item?.id)) return "studied";
      return "new";
    },
    [sessionReviewedIds]
  );

  const isMeaningHidden =
    Boolean(activeItem) && quizMode && !revealedIds.has(activeItem.id);

  const canSeekActiveVideo = Boolean(
    activeItem &&
      onSeekVideo &&
      currentVideoId &&
      activeItem.sourceBvid &&
      currentVideoId === activeItem.sourceBvid &&
      activeItem.videoTime != null
  );

  return (
    <div
      className={`ndt-cls-body is-blackboard is-slateboard ${className}`.trim()}
    >
      {items.length === 0 ? (
        <div className="ndt-cls-center-stage">
          <h3 className="ndt-cls-hero-title">
            {totalCount === 0 ? t("wordbook.emptyTitle") : t("wordbook.noMatchTitle")}
          </h3>
          <p className="ndt-cls-hero-desc">
            {totalCount === 0
              ? emptyHint || t("wordbook.emptyDesc")
              : t("wordbook.noMatchDesc")}
          </p>
          {totalCount === 0 && onGoStudy && (
            <button
              type="button"
              className="ndt-cls-btn is-primary"
              onClick={onGoStudy}
            >
              {t("wordbook.goStudyBtn")}
            </button>
          )}
        </div>
      ) : viewMode === "focus" ? (
        <div className="ndt-cls-study-split">
          {/* Far-left 4x4px Status Squares */}
          <aside
            ref={dotRailRef}
            className="ndt-cls-dot-rail"
            aria-label={t("wordbook.statusRailAria")}
          >
            {(() => {
              const rows = Math.min(items.length, dotRowsPerCol);
              const cols = Math.max(1, Math.ceil(items.length / dotRowsPerCol));
              return (
                <div
                  className="ndt-cls-dot-grid"
                  style={{
                    gridTemplateRows: `repeat(${rows}, 10px)`,
                    gridTemplateColumns: `repeat(${cols}, 10px)`,
                  }}
                >
                  {items.map((item, idx) => {
                    const isActive = activeItem?.id === item.id;
                    const status = getItemDotStatus(item);
                    const statusLabel =
                      status === "mastered"
                        ? t("wordbook.statusMastered")
                        : status === "studied"
                          ? t("wordbook.statusReviewed")
                          : t("wordbook.statusLearning");
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`ndt-cls-dot-cell is-${status} ${
                          isActive ? "is-active" : ""
                        }`}
                        onClick={() => setActiveItemId(item.id)}
                        title={`${idx + 1}. ${item.term} · ${statusLabel}`}
                        aria-label={`${idx + 1}. ${item.term}, ${statusLabel}`}
                        aria-current={isActive ? "true" : undefined}
                      >
                        <span className="ndt-cls-dot-sq" />
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </aside>

          {/* Centered Learning Card */}
          {activeItem && (
            <section className="ndt-cls-detail-pane">
              <div className="ndt-cls-detail-scroll">
                <div className="ndt-cls-card-inner">
                  {/* Term Hero */}
                  <div className="ndt-cls-word-header">
                    <div className="ndt-cls-word-title-row">
                      <h3
                        className={`ndt-cls-word-term${
                          isRtlText(activeItem.term) ? " is-rtl" : ""
                        }`}
                        dir="auto"
                      >
                        {activeItem.term}
                      </h3>
                      <button
                        type="button"
                        className="ndt-cls-speak-btn is-icon-only"
                        onClick={() => onSpeak?.(activeItem.term, activeItem)}
                        title={t("wordbook.speakTerm")}
                        aria-label={t("wordbook.speakTerm")}
                      >
                        <SpeakerIcon size={16} />
                      </button>
                    </div>
                    <div className="ndt-cls-word-meta">
                      {activeItem.phonetic && (
                        <span className="ndt-cls-phonetic">{activeItem.phonetic}</span>
                      )}
                      {activeItem.pos && (
                        <span className="ndt-cls-pos-chip">{activeItem.pos}</span>
                      )}
                      <span className="ndt-cls-type-chip">
                        {activeItem.type === "phrase"
                          ? t("wordbook.typePhrase")
                          : t("wordbook.typeWord")}
                      </span>
                      {activeItem.level && (
                        <span className="ndt-cls-level-chip">{activeItem.level}</span>
                      )}
                      {activeItem.languageLabel && (
                        <span className="ndt-cls-lang-chip">
                          {getLanguageName(activeItem.languageLabel)}
                        </span>
                      )}
                      <span
                        className="ndt-cls-diff-dots"
                        title={t("wordbook.difficultyTitle", { level: activeItem.difficulty || 4 })}
                      >
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <span
                            key={lvl}
                            className={`ndt-cls-diff-dot ${
                              lvl <= (activeItem.difficulty || 4) ? "is-filled" : ""
                            }`}
                          />
                        ))}
                      </span>
                      {activeItem.surfaceForm &&
                        activeItem.surfaceForm.toLowerCase() !==
                          activeItem.term.toLowerCase() && (
                          <span className="ndt-cls-surface-chip">
                            {t("wordbook.surfaceFormPrefix")}
                            <bdi
                              dir="auto"
                              className={
                                isRtlText(activeItem.surfaceForm) ? "is-rtl" : undefined
                              }
                            >
                              {activeItem.surfaceForm}
                            </bdi>
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Translation & Usage */}
                  <div className="ndt-cls-section">
                    {quizMode && !isMeaningHidden && (
                      <div className="ndt-cls-section-head">
                        <button
                          type="button"
                          className="ndt-cls-filter-pill"
                          onClick={() => toggleRevealItem(activeItem.id)}
                        >
                          {t("wordbook.hideAgain")}
                        </button>
                      </div>
                    )}
                    {isMeaningHidden ? (
                      <div
                        className="ndt-cls-reveal-mask"
                        onClick={() => toggleRevealItem(activeItem.id)}
                      >
                        {t("wordbook.quizRevealMask")}
                      </div>
                    ) : (
                      <>
                        <p className="ndt-cls-meaning-text">
                          {activeItem.translation || t("wordbook.noMeaning")}
                        </p>
                        {activeItem.explanation && (
                          <p className="ndt-cls-explanation">{activeItem.explanation}</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Subtitle Context */}
                  {activeItem.videoQuote && (
                    <div className="ndt-cls-section">
                      <div className="ndt-cls-section-head">
                        <span className="ndt-cls-section-label">
                          {t("wordbook.videoQuoteLabel")}
                        </span>
                        <div className="ndt-cls-study-actions">
                          <button
                            type="button"
                            className="ndt-cls-speak-btn is-mini"
                            onClick={() => onSpeak?.(activeItem.videoQuote, activeItem)}
                            title={t("wordbook.speakQuote")}
                          >
                            <SpeakerIcon size={13} />
                          </button>
                          {canSeekActiveVideo && (
                            <button
                              type="button"
                              className="ndt-cls-time-btn"
                              onClick={() => onSeekVideo(activeItem.videoTime, true)}
                              title={t("wordbook.seekVideoTitle")}
                            >
                              {t("wordbook.seekVideoBtn", {
                                time: formatSubtitleTime(activeItem.videoTime),
                              })}
                            </button>
                          )}
                        </div>
                      </div>
                      <div
                        className={`ndt-cls-quote-box${
                          isRtlText(activeItem.videoQuote) ? " is-rtl" : ""
                        }`}
                        dir="auto"
                      >
                        {renderHighlightedQuote(
                          activeItem.videoQuote,
                          activeItem.term,
                          activeItem.surfaceForm
                        )}
                      </div>
                      {activeItem.videoQuoteTranslation && (
                        <div
                          className={`ndt-cls-quote-zh ${
                            isMeaningHidden ? "is-hidden" : ""
                          }`}
                          onClick={() => {
                            if (isMeaningHidden) {
                              toggleRevealItem(activeItem.id);
                            }
                          }}
                        >
                          {activeItem.videoQuoteTranslation}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Examples */}
                  {Array.isArray(activeItem.examples) && activeItem.examples.length > 0 && (
                    <div className="ndt-cls-section">
                      <div className="ndt-cls-section-head">
                        <span className="ndt-cls-section-label">
                          {t("wordbook.examplesLabel", { count: activeItem.examples.length })}
                        </span>
                      </div>
                      <div className="ndt-cls-example-list">
                        {activeItem.examples.map((ex, idx) => (
                          <div key={idx} className="ndt-cls-example-item">
                            <div className="ndt-cls-example-top">
                              <div
                                className={`ndt-cls-example-src${
                                  isRtlText(ex.sentence) ? " is-rtl" : ""
                                }`}
                                dir="auto"
                              >
                                {renderHighlightedQuote(
                                  ex.sentence,
                                  activeItem.term,
                                  activeItem.surfaceForm
                                )}
                              </div>
                              <button
                                type="button"
                                className="ndt-cls-speak-btn is-mini"
                                onClick={() => onSpeak?.(ex.sentence, activeItem)}
                                title={t("wordbook.speakExample")}
                              >
                                <SpeakerIcon size={13} />
                              </button>
                            </div>
                            {ex.translation && (
                              <div
                                className={`ndt-cls-example-zh ${
                                  isMeaningHidden ? "is-hidden" : ""
                                }`}
                                onClick={() => {
                                  if (isMeaningHidden) {
                                    toggleRevealItem(activeItem.id);
                                  }
                                }}
                              >
                                {ex.translation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source Video Info */}
                  {activeItem.sourceTitle && (
                    <div className="ndt-cls-wb-card-source">
                      <span>{t("wordbook.sourceVideoPrefix")}</span>
                      {activeItem.sourceUrl ? (
                        <a href={activeItem.sourceUrl} target="_blank" rel="noreferrer">
                          {activeItem.sourceTitle}
                        </a>
                      ) : (
                        <span>{activeItem.sourceTitle}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Nav & Actions */}
              <div className="ndt-cls-detail-footer">
                <div className="ndt-cls-footer-left">
                  <label
                    className={`ndt-cls-quiz-toggle ${quizMode ? "is-checked" : ""}`}
                    title={t("wordbook.quizModeTitle")}
                  >
                    <input
                      type="checkbox"
                      checked={quizMode}
                      onChange={(e) => {
                        setQuizMode(e.target.checked);
                        setRevealedIds(new Set());
                      }}
                    />
                    <span className="ndt-cls-switch-track" aria-hidden="true">
                      <span className="ndt-cls-switch-thumb" />
                    </span>
                    <span>{t("wordbook.quizModeLabel")}</span>
                  </label>
                </div>

                <div className="ndt-cls-nav-btns">
                  <button
                    type="button"
                    className="ndt-cls-btn"
                    disabled={activeIndex <= 0}
                    onClick={() => setActiveItemId(items[activeIndex - 1].id)}
                  >
                    {t("wordbook.prevItem")}
                  </button>
                  {activeIndex < items.length - 1 ? (
                    <button
                      type="button"
                      className="ndt-cls-btn"
                      onClick={() => setActiveItemId(items[activeIndex + 1].id)}
                    >
                      {t("wordbook.nextItem")}
                    </button>
                  ) : (
                    <button type="button" className="ndt-cls-btn" disabled>
                      {t("wordbook.lastItem")}
                    </button>
                  )}
                </div>

                <div className="ndt-cls-study-actions">
                  <button
                    type="button"
                    className={`ndt-cls-btn ${activeItem.mastered ? "is-saved" : ""}`}
                    onClick={() => onToggleMastered?.(activeItem)}
                    title={t("wordbook.masteredHotkey")}
                  >
                    <CheckIcon size={14} />
                    <span>
                      {activeItem.mastered ? t("wordbook.mastered") : t("wordbook.markMastered")}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="ndt-cls-btn is-danger-ghost"
                    onClick={() => onRemove?.(activeItem)}
                    title={t("wordbook.removeTitle")}
                  >
                    <TrashIcon size={13} />
                    <span>{t("wordbook.remove")}</span>
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      ) : (
        /* Grid Overview Mode */
        <div className="ndt-cls-grid-wrap">
          <div className="ndt-cls-grid">
            {items.map((item) => {
              const previewSentence =
                item.examples?.[0]?.sentence || item.videoQuote || "";
              return (
                <div
                  key={item.id}
                  className={`ndt-cls-grid-card ${item.mastered ? "is-mastered" : ""}`}
                >
                  <div className="ndt-cls-grid-card-head">
                    <div style={{ minWidth: 0 }}>
                      <button
                        type="button"
                        className={`ndt-cls-grid-term${
                          isRtlText(item.term) ? " is-rtl" : ""
                        }`}
                        dir="auto"
                        onClick={() => {
                          setActiveItemId(item.id);
                          onViewModeChange?.("focus");
                        }}
                      >
                        {item.term}
                      </button>
                      <div className="ndt-cls-word-meta" style={{ marginTop: 4 }}>
                        {item.phonetic && (
                          <span className="ndt-cls-phonetic">{item.phonetic}</span>
                        )}
                        {item.pos && (
                          <span className="ndt-cls-pos-chip">{item.pos}</span>
                        )}
                        {item.level && (
                          <span className="ndt-cls-level-chip">{item.level}</span>
                        )}
                        {item.languageLabel && (
                          <span className="ndt-cls-lang-chip">
                            {getLanguageName(item.languageLabel)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ndt-cls-speak-btn is-mini"
                      onClick={() => onSpeak?.(item.term, item)}
                      title={t("wordbook.speakShort")}
                    >
                      <SpeakerIcon size={13} />
                    </button>
                  </div>

                  <div className="ndt-cls-grid-trans">{item.translation}</div>

                  {previewSentence ? (
                    <div
                      className={`ndt-cls-grid-ex${
                        isRtlText(previewSentence) ? " is-rtl" : ""
                      }`}
                      dir="auto"
                    >
                      {renderHighlightedQuote(
                        previewSentence,
                        item.term,
                        item.surfaceForm
                      )}
                    </div>
                  ) : item.explanation ? (
                    <div className="ndt-cls-grid-ex">{item.explanation}</div>
                  ) : null}

                  {item.sourceTitle && (
                    <div className="ndt-cls-grid-source" title={item.sourceTitle}>
                      <span>{t("wordbook.sourceShortPrefix")}</span>
                      {item.sourceUrl ? (
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                          {item.sourceTitle}
                        </a>
                      ) : (
                        <span>{item.sourceTitle}</span>
                      )}
                    </div>
                  )}

                  <div className="ndt-cls-grid-foot">
                    <button
                      type="button"
                      className="ndt-cls-filter-pill"
                      onClick={() => {
                        setActiveItemId(item.id);
                        onViewModeChange?.("focus");
                      }}
                    >
                      {t("wordbook.detailStudyBtn")}
                    </button>

                    <div className="ndt-cls-wb-actions">
                      <button
                        type="button"
                        className={`ndt-cls-btn is-sm ${item.mastered ? "is-saved" : ""}`}
                        onClick={() => onToggleMastered?.(item)}
                      >
                        <CheckIcon size={12} />
                        <span>
                          {item.mastered ? t("wordbook.mastered") : t("wordbook.markMasteredShort")}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="ndt-cls-btn is-sm is-danger-ghost"
                        onClick={() => onRemove?.(item)}
                        title={t("wordbook.removeTitle")}
                      >
                        {t("wordbook.remove")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
