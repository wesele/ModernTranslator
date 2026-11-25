import * as mod_62337 from "./webpageTranslateDom.js";
import _A_97519 from "dompurify";
import { a as i } from "../shared/constants/showType.js";
const { sanitize: o } = _A_97519;

const INVALID_ONLY_PUNCT_RE = /^[0-9\s.,\-_#:()[\]!•+~@$%^&*\n/`]+$/;
const PLACEHOLDER_TOKEN_RE = /\{\{\s*\d+\s*\}\}/g;

function isInlineMathNode(node) {
  if (!(node instanceof Element)) return false;
  const tag = node.tagName.toLowerCase();
  if (tag !== "math" && tag !== "mjx-container") return false;
  if (node.getAttribute("display") === "block" || node.getAttribute("display") === "true") {
    return false;
  }
  return window.getComputedStyle(node).display !== "block";
}

function clonePlaceholderNode(node) {
  const clone = node.cloneNode(true);
  if (clone instanceof Element) {
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  }
  return clone;
}

function collectInlineMathNodes(roots) {
  const collected = [];
  const visit = (node) => {
    if (!(node instanceof Element)) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "hcfy-result") return;
    if (window.getComputedStyle(node).display === "none") return;
    if (isInlineMathNode(node)) {
      collected.push(node);
      return;
    }
    for (const child of node.children) {
      visit(child);
    }
  };
  roots.forEach(visit);
  return collected;
}

class a {
  inited = false;
  valid = true;
  isOnlyChild = false;
  destroyed = false;
  innerText = "";
  placeholders = [];
  translating = false;
  translated = false;
  hasStreamOutput = false;
  sourceRemoved = false;
  inline = false;
  showType = i.source;
  #e;
  #t;
  constructor(e, t, n, r) {
    ((this.rootNode = e),
      (this.sourceNodes = t),
      (this.translateFn = n),
      (this.isInlineSpan = !!r?.isInlineSpan),
      (this.#e = new mod_62337.HT()),
      (this.#e.props.editable = null != r?.editable && r.editable),
      (this.#e.props.containerDisplay =
        null != r?.containerDisplay
          ? r.containerDisplay
          : e instanceof Element
            ? window.getComputedStyle(e).display
            : ""),
      (this.#e.props.onRetry = () => this.retry()),
      (function (e, t, n) {
        const s = n.nextSibling;
        s ? e.insertBefore(t, s) : e.appendChild(t);
      })(e, this.#e.container, t[t.length - 1]));
  }
  init() {
    this.destroyed ||
      this.inited ||
      (this.calcInnerText(),
      (this.valid = (function (e) {
        const t = e.replace(PLACEHOLDER_TOKEN_RE, "").trim();
        return !!t && !INVALID_ONLY_PUNCT_RE.test(t);
      })(this.innerText)),
      this.valid || this.destroy(),
      (this.inited = true));
  }
  calcInnerText() {
    const { sourceNodes: e, rootNode: t } = this;
    const roots = this.isOnlyChild ? [t] : e;
    const mathNodes = collectInlineMathNodes(roots);
    this.placeholders = mathNodes.map(clonePlaceholderNode);

    const replacements = [];
    const swapMathWithPlaceholders = () => {
      mathNodes.forEach((mathEl, idx) => {
        const parent = mathEl.parentNode;
        if (!parent) return;
        const placeholderNode = document.createTextNode(`{{${idx}}}`);
        parent.replaceChild(placeholderNode, mathEl);
        replacements.push({ parent, mathEl, placeholderNode });
      });
    };
    const restoreMathNodes = () => {
      for (let idx = replacements.length - 1; idx >= 0; idx -= 1) {
        const { parent, mathEl, placeholderNode } = replacements[idx];
        if (placeholderNode.parentNode === parent) {
          parent.replaceChild(mathEl, placeholderNode);
        }
      }
    };

    let n;
    if (this.isOnlyChild) {
      const prevShowType = this.showType;
      this.switchShowType(i.source);
      swapMathWithPlaceholders();
      try {
        n = (function (el) {
          if (el instanceof HTMLElement) return el.innerText;
          const wrapper = document.createElement("hcfy-result");
          Array.from(el.childNodes).forEach((child) => {
            wrapper.appendChild(child);
          });
          el.appendChild(wrapper);
          const text = wrapper.innerText;
          el.removeChild(wrapper);
          Array.from(wrapper.childNodes).forEach((child) => {
            el.appendChild(child);
          });
          return text;
        })(t).trim();
      } finally {
        restoreMathNodes();
      }
      this.switchShowType(prevShowType);
    } else {
      const span = document.createElement("span");
      span.setAttribute("data-hcfy-ignore", "1");
      e.forEach((node) => {
        span.appendChild(node);
      });
      this.sourceRemoved = true;
      t.insertBefore(span, this.#e.container);
      swapMathWithPlaceholders();
      try {
        n = span.innerText.trim();
      } finally {
        restoreMathNodes();
        if (span.parentNode === t) {
          t.removeChild(span);
        }
        if (this.showType !== i.result) {
          this.appendSourceNodes();
        }
      }
    }
    this.innerText = n;
  }
  setOnlyChild() {
    if (this.destroyed) return;
    const { rootNode: e } = this;
    ((this.isOnlyChild = true),
      this.inited && this.calcInnerText(),
      e instanceof Element &&
        (("span" === e.nodeName.toLowerCase() && this.isInlineSpan) ||
          (function (e, t, n = 3) {
            let s = e,
              r = 0;
            do {
              if (((r += 1), s.matches(t))) return s;
              if (r === n) return null;
              s = s.parentElement;
            } while (s);
            return null;
          })(e, "a, button, [role=button], h1,h2,h3,h4,h5,h6")) &&
        ((this.inline = true), this.inited && this.renderResult()));
  }
  destroy() {
    this.showType = i.source;
    if (this.sourceRemoved) {
      this.appendSourceNodes();
    }
    this.#e.props.mode = "hide";
    this.removeResult();
    this.#e.destroy();
    this.destroyed = true;
  }
  renderResult(e) {
    (this.translating && !this.hasStreamOutput
      ? (this.#e.props.mode = "hide")
      : this.showType === i.both
        ? (this.#e.props.mode = "comparison")
        : this.showType === i.result
          ? (this.#e.props.mode = "plain")
          : (this.#e.props.mode = "hide"),
      (this.#e.props.comparison.newLine = !this.inline),
      e && (this.#e.props.content = e),
      this.#e.render());
  }
  onStreamChunk(chunkText) {
    if (this.destroyed || !this.translating || null == chunkText) return;
    if (this.#t) {
      this.showType = this.#t;
      this.#t = undefined;
    }
    this.hasStreamOutput = true;
    if (this.showType === i.result && !this.sourceRemoved) {
      this.removeSourceNodes();
    }
    this.renderResult({
      value: chunkText,
      type: "text",
      placeholders: this.placeholders.length ? this.placeholders : undefined,
      isStreaming: true,
    });
  }
  async translate() {
    if ((this.inited || this.init(), this.destroyed || !this.innerText)) return;
    if (this.translating || this.translated) return;
    let e;
    this.translating = true;
    this.hasStreamOutput = false;
    try {
      e = await this.translateFn(
        this.innerText,
        (partial) => this.onStreamChunk(partial),
        this.rootNode
      );
    } catch (e) {
      if (this.destroyed) return;
      this.translating = false;
      this.hasStreamOutput = false;
      this.translated = true;
      if (this.sourceRemoved) {
        this.appendSourceNodes();
      }
      this.renderResult({
        error: o(
          e.message +
            (e.link ? `<a target='_blank' href='${e.link.url}'>${e.link.name}</a>` : ""),
          {
            ALLOWED_TAGS: ["a", "#text", "b", "i"],
            ALLOWED_ATTR: ["target", "rel", "href", "class"],
          }
        ),
        type: "html",
      });
      if (this.#t) {
        const e = this.#t;
        this.#t = undefined;
        this.switchShowType(e);
      }
      return;
    }
    if (!this.destroyed) {
      if (((this.translating = false), null == e)) return this.translate();
      this.hasStreamOutput = false;
      this.translated = true;
      if (this.#t) {
        const nextType = this.#t;
        this.#t = undefined;
        this.showType = nextType;
      }
      if (this.showType === i.result && !this.sourceRemoved) {
        this.removeSourceNodes();
      } else if (this.showType !== i.result && this.sourceRemoved) {
        this.appendSourceNodes();
      }
      this.renderResult({
        value: e,
        type: "text",
        placeholders: this.placeholders.length ? this.placeholders : undefined,
        isStreaming: false,
      });
    }
  }
  retry() {
    if (!this.translated) throw new Error("未翻译过");
    ((this.#t = this.showType),
      this.switchShowType(i.source),
      (this.#e.props.content = undefined),
      this.#e.renderInner(),
      (this.translated = false),
      (this.hasStreamOutput = false),
      this.translate());
  }
  removeSourceNodes() {
    if (this.sourceRemoved) return;
    const { rootNode: e, sourceNodes: t } = this;
    t.forEach((t) => {
      try {
        e.removeChild(t);
      } catch (e) {
        console.error("移除源节点失败：", e);
      }
    });
    this.sourceRemoved = true;
  }
  appendSourceNodes() {
    if (!this.sourceRemoved) return;
    const { rootNode: e } = this,
      t = this.#e.container;
    this.sourceNodes.forEach((n) => {
      try {
        e.insertBefore(n, t);
      } catch (e) {
        console.error("插入源节点失败：", e);
      }
    });
    this.sourceRemoved = false;
  }
  removeResult() {
    try {
      this.rootNode.removeChild(this.#e.container);
    } catch (e) {
      console.error("移除翻译结果失败：", e);
    }
  }
  switchShowType(e) {
    if (this.destroyed || e === this.showType) return;
    if (!this.translated && !this.hasStreamOutput) return void (this.#t = e);
    const t = this.showType;
    switch (((this.showType = e), e)) {
      case i.source:
        (this.appendSourceNodes(),
          (this.#e.props.mode = "hide"),
          this.renderResult());
        break;
      case i.result:
        ((this.#e.props.mode = "plain"), this.renderResult(), this.removeSourceNodes());
        break;
      case i.both:
        ((this.#e.props.mode = "comparison"),
          this.renderResult(),
          this.appendSourceNodes());
        break;
      default:
        throw ((this.showType = t), new TypeError(`不支持的显示类型：${e}`));
    }
  }
}
export { i as a };
export { a as r };
