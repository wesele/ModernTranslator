import * as React from "react";
import { createRoot } from "react-dom/client";
import { t as tr } from "../shared/i18n/index.js";
function o(e, t, n, s = "text") {
  const [o, i] = React.useState(false);
  return (
    (function (e, t) {
      const n = React.useRef(null),
        s = React.useRef(t);
      (React.useEffect(() => {
        s.current = t;
      }, [t]),
        React.useEffect(() => {
          if (!e) return;
          const t = (t) => {
              ((n.current = {
                x: t.pageX,
                y: t.pageY,
              }),
                e.addEventListener("pointerup", r));
            },
            r = (t) => {
              e.removeEventListener("pointerup", r);
              const o = n.current;
              o && ((n.current = null), o.x === t.pageX && o.y === t.pageY && s.current());
            };
          return (
            e.addEventListener("pointerdown", t),
            () => {
              (e.removeEventListener("pointerdown", t), e.removeEventListener("pointerup", r));
            }
          );
        }, [e]));
    })(t ? e : null, () => {
      i(true);
    }),
    React.useEffect(() => {
      t || i(false);
    }, [t]),
    React.useEffect(() => {
      o && e && e.focus();
    }, [e, o]),
    React.useEffect(() => {
      if (!o || !e) return;
      const t = (t) => {
        const n = t.target;
        e.contains(n) || i(false);
      };
      return (
        document.addEventListener("pointerup", t),
        () => {
          document.removeEventListener("pointerup", t);
        }
      );
    }, [o, e]),
    React.useEffect(() => {
      if (!o || !e || !n) return;
      const t = (e) => {
        const t = e.target;
        n({
          value: "html" === s ? t.innerHTML : t.innerText,
          type: s,
        });
      };
      return (
        e.addEventListener("input", t),
        () => {
          e.removeEventListener("input", t);
        }
      );
    }, [e, o, n, s]),
    t
      ? {
          isEditing: o,
          props: {
            contentEditable: o ? "true" : undefined,
          },
        }
      : {
          isEditing: o,
        }
  );
}
const i = {
  visibility: "visible",
};

const PLACEHOLDER_SPLIT_RE = /\{\{\s*(\d+)\s*\}\}/g;
const TRAILING_INCOMPLETE_PLACEHOLDER_RE = /\{\{?\s*\d*$/;

function ClonedPlaceholderNode({ node }) {
  const hostRef = React.useRef(null);
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host || !node) return;
    host.replaceChildren(node.cloneNode(true));
  }, [node]);
  return <span ref={hostRef} contentEditable={false} style={{ display: "inline" }} />;
}

function RichTranslatedText({ text, placeholders, isStreaming }) {
  const displayText = isStreaming ? text.replace(TRAILING_INCOMPLETE_PLACEHOLDER_RE, "") : text;
  const parts = [];
  let lastIndex = 0;
  let match;
  PLACEHOLDER_SPLIT_RE.lastIndex = 0;
  while ((match = PLACEHOLDER_SPLIT_RE.exec(displayText)) !== null) {
    if (match.index > lastIndex) {
      parts.push(displayText.slice(lastIndex, match.index));
    }
    const idx = Number(match[1]);
    const node = placeholders[idx];
    if (node) {
      parts.push(<ClonedPlaceholderNode key={`ph-${idx}-${match.index}`} node={node} />);
    } else {
      parts.push(match[0]);
    }
    lastIndex = PLACEHOLDER_SPLIT_RE.lastIndex;
  }
  if (lastIndex < displayText.length) {
    parts.push(displayText.slice(lastIndex));
  }
  return parts;
}

function Comp_A(e) {
  const { content: t, onRetry: n, editable: a, onEdit: l } = e,
    [c, d] = React.useState(null),
    { isEditing: u, props: p } = o(c, a && !!t && "value" in t, l, t?.type);
  const hasPlaceholders = !!(t && "value" in t && t.placeholders?.length);
  return (
    React.useEffect(() => {
      if (u && c)
        return (
          c.closest("hcfy-result").classList.add("__hcfy-result-editing__"),
          () => {
            c.closest("hcfy-result").classList.remove("__hcfy-result-editing__");
          }
        );
    }, [c, u]),
    t ? (
      <>
        {"html" === t.type ? (
          <hcfy-result-content
            style={i}
            ref={d}
            {...p}
            dangerouslySetInnerHTML={{
              __html: "value" in t ? t.value : t.error,
            }}
          />
        ) : (
          <hcfy-result-content style={i} ref={d} {...p}>
            {"value" in t ? (
              hasPlaceholders ? (
                <RichTranslatedText
                  text={t.value}
                  placeholders={t.placeholders}
                  isStreaming={!!t.isStreaming}
                />
              ) : (
                t.value
              )
            ) : (
              t.error
            )}
          </hcfy-result-content>
        )}
        <hcfy-result-actions style={i}>
          {"error" in t && <button onClick={n}>{tr("content.clickRetry")}</button>}
        </hcfy-result-actions>
      </>
    ) : null
  );
}
class c {
  container;
  #n = null;
  props;
  constructor() {
    const e = document.createElement("hcfy-result");
    e.style.display = "none";
    ((this.container = e),
      (this.props = {
        mode: "hide",
        comparison: {
          newLine: true,
        },
        editable: false,
        containerDisplay: "",
      }));
  }
  renderContainer() {
    const isBlock = !!this.props.comparison.newLine;
    const containerDisplay = this.props.containerDisplay || "";
    const applyLayoutSpan = (active) => {
      this.container.style.gridColumn =
        active && isBlock && containerDisplay.includes("grid") ? "1 / -1" : "";
      this.container.style.flexBasis =
        active && isBlock && containerDisplay.includes("flex") ? "100%" : "";
    };
    switch (this.props.mode) {
      case "hide":
        this.container.style.display = "none";
        this.container.className = "";
        applyLayoutSpan(false);
        break;
      case "plain":
        this.container.style.display = isBlock ? "block" : "inline";
        this.container.className = "";
        applyLayoutSpan(true);
        break;
      case "comparison":
        this.container.style.display = isBlock ? "block" : "inline";
        this.container.className =
          "__hcfy-result-comparison__ " +
          (isBlock ? "__hcfy-result-comparison-block__" : "__hcfy-result-comparison-inline__");
        applyLayoutSpan(true);
        break;
    }
  }
  renderInner() {
    if (!this.#n) {
      if (!this.props.content) return;
      this.#n = createRoot(this.container);
    }
    this.#n.render(
      <Comp_A
        content={this.props.content}
        editable={this.props.editable}
        onEdit={(e) => {
          (this.props.onEdit?.(e), (this.props.content = e));
        }}
        onRetry={this.props.onRetry}
      />
    );
  }
  render() {
    (this.renderContainer(), this.renderInner());
  }
  destroy() {
    if (this.#n) {
      this.#n.unmount();
      this.#n = null;
    }
  }
}
export { c as H };
