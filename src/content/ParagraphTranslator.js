import * as mod_62337 from "./webpageTranslateDom.js";
import createDebug from "debug";
import _A_97519 from "dompurify";
import { a as i } from "../shared/constants/showType.js";
import {
  isIconFontElement,
  splitTrailingDecorativeNodes,
  decideBilingualPlacement,
} from "./bilingualLayoutEngine.js";
const { sanitize: o } = _A_97519;
const paraLog = createDebug("ndt:paragraphTranslator");

const INVALID_ONLY_PUNCT_RE = /^[0-9\s.,\-_#:()[\]!•+~@$%^&*\n/`]+$/;
const DOTFILE_RE = /^\.[a-z0-9._-]+$/i;
const PURE_URL_OR_EMAIL_RE = /^(?:https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w-]+\.[\w.-]+)$/i;
const PLACEHOLDER_TOKEN_RE = /\{\{\s*\d+\s*\}\}/g;
const SR_ONLY_CLASS_RE =
  /(?:^|\s)(?:sr-only|visually-?hidden|screen-reader-text|skip-link|skip-content-link|mw-jump-link|show-on-focus)(?:\s|$)|VisuallyHidden/i;

function normalizeCompareText(text) {
  return String(text || "")
    .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isSameAsSourceText(sourceText, translatedText) {
  const normalizedTarget = normalizeCompareText(translatedText);
  if (!normalizedTarget) return true;
  const normalizedSource = normalizeCompareText(sourceText);
  return normalizedSource === normalizedTarget;
}

function isUntranslatableText(text) {
  const cleaned = String(text || "").replace(PLACEHOLDER_TOKEN_RE, "").trim();
  if (!cleaned) return true;
  if (INVALID_ONLY_PUNCT_RE.test(cleaned)) return true;
  if (DOTFILE_RE.test(cleaned)) return true;
  if (PURE_URL_OR_EMAIL_RE.test(cleaned)) return true;
  return false;
}

function isVisuallyHiddenElement(el, styleOverride) {
  if (!(el instanceof Element)) return false;
  if (el.hidden) return true;
  const cls = typeof el.className === "string" ? el.className : "";
  if (cls && document.activeElement !== el && SR_ONLY_CLASS_RE.test(cls)) {
    return true;
  }
  const style = styleOverride || window.getComputedStyle(el);
  if (!style) return false;
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.visibility === "collapse" ||
    style.opacity === "0"
  ) {
    return true;
  }
  if (parseFloat(style.fontSize) === 0) {
    return true;
  }
  const clip = style.clip || "";
  if (
    clip === "rect(0px, 0px, 0px, 0px)" ||
    clip === "rect(0px 0px 0px 0px)" ||
    clip === "rect(1px, 1px, 1px, 1px)" ||
    clip === "rect(1px 1px 1px 1px)"
  ) {
    return true;
  }
  const clipPath = style.clipPath || "";
  if (
    clipPath.includes("inset(50%)") ||
    clipPath.includes("inset(100%)") ||
    clipPath === "polygon(0px 0px, 0px 0px, 0px 0px)"
  ) {
    return true;
  }
  const overflowHidden =
    style.overflow === "hidden" ||
    style.overflow === "clip" ||
    (style.overflowX === "hidden" && style.overflowY === "hidden");
  if (overflowHidden) {
    const w = parseFloat(style.width);
    const h = parseFloat(style.height);
    if (Number.isFinite(w) && Number.isFinite(h) && w <= 1.5 && h <= 1.5) {
      return true;
    }
    const indent = parseFloat(style.textIndent);
    if (Number.isFinite(indent) && Math.abs(indent) >= 999) {
      return true;
    }
  }
  return false;
}

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

const FORM_CONTROL_TAGS = new Set(["select", "input", "textarea", "option", "optgroup", "noscript"]);

function collectSpecialInnerNodes(roots) {
  const mathNodes = [];
  const hiddenNodes = [];
  const visit = (node) => {
    if (!(node instanceof Element)) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "hcfy-result") return;
    if (FORM_CONTROL_TAGS.has(tag)) {
      hiddenNodes.push(node);
      return;
    }
    const style = window.getComputedStyle(node);
    if (style.display === "none") return;
    if (isVisuallyHiddenElement(node, style) || isIconFontElement(node, style)) {
      hiddenNodes.push(node);
      return;
    }
    if (isInlineMathNode(node)) {
      mathNodes.push(node);
      return;
    }
    for (const child of node.children) {
      visit(child);
    }
  };
  roots.forEach(visit);
  return { mathNodes, hiddenNodes };
}

function closestWithin(el, selector, maxDepth = 3) {
  if (!(el instanceof Element)) return null;
  let cur = el;
  let depth = 0;
  do {
    depth += 1;
    if (cur.matches(selector)) return cur;
    if (depth >= maxDepth) return null;
    cur = cur.parentElement;
  } while (cur);
  return null;
}

class a {
  inited = false;
  valid = true;
  isOnlyChild = false;
  destroyed = false;
  innerText = "";
  translatedText = "";
  placeholders = [];
  translating = false;
  translated = false;
  sameAsSource = false;
  hasStreamOutput = false;
  sourceRemoved = false;
  inline = false;
  layoutMode = "block";
  showType = i.source;
  #e;
  #t;
  constructor(e, t, n, r) {
    this.rootNode = e;
    const { coreNodes, trailingNodes } = splitTrailingDecorativeNodes(t, isVisuallyHiddenElement);
    this.sourceNodes = coreNodes;
    this.trailingNodes = trailingNodes;
    this.allOriginalSourceNodes = t;
    this.translateFn = n;
    this.railManager = r?.railManager || null;
    this.onLayoutRendered = r?.onLayoutRendered || null;
    this.isInlineSpan = !!r?.isInlineSpan;
    const computed =
      null == r?.containerDisplay && e instanceof Element ? window.getComputedStyle(e) : null;
    this.containerDisplay = r?.containerDisplay ?? computed?.display ?? "";
    this.containerFlexDirection = r?.containerFlexDirection ?? computed?.flexDirection ?? "";
    this.containerFlexWrap = r?.containerFlexWrap ?? computed?.flexWrap ?? "";
    this.containerWhiteSpace = r?.containerWhiteSpace ?? computed?.whiteSpace ?? "";
    this.containerLineClamp = r?.containerLineClamp ?? computed?.webkitLineClamp ?? "";
    this.isInButton =
      r?.isInButton ?? (e instanceof Element && !!closestWithin(e, "button, [role=button]", 3));
    this.isInInteractive =
      r?.isInInteractive ??
      (e instanceof Element &&
        !!closestWithin(e, "a, button, [role=button], [role=tab], [role=menuitem], label", 3));
    this.isInNavOrBreadcrumb =
      r?.isInNavOrBreadcrumb ??
      (e instanceof Element &&
        !!closestWithin(
          e,
          "nav, [role=navigation], [role=menubar], [role=tablist], [aria-label*='breadcrumb' i], .breadcrumb, .breadcrumbs, .related",
          6
        ));

    this.#e = new mod_62337.HT();
    this.#e.props.editable = null != r?.editable && r.editable;
    this.#e.props.containerDisplay = this.containerDisplay;
    this.#e.props.containerFlexDirection = this.containerFlexDirection;
    this.#e.props.containerFlexWrap = this.containerFlexWrap;
    this.#e.props.onRetry = () => this.retry();

    const anchor = this.sourceNodes[this.sourceNodes.length - 1];
    const next = anchor.nextSibling;
    next ? e.insertBefore(this.#e.container, next) : e.appendChild(this.#e.container);
  }
  syncContainerAnchor(effectiveMode) {
    if (!this.trailingNodes.length || this.sourceRemoved) return;
    const targetList = effectiveMode === "block" ? this.trailingNodes : this.sourceNodes;
    const anchor = targetList[targetList.length - 1];
    if (!anchor || anchor.parentNode !== this.rootNode) return;
    const desiredNext = anchor.nextSibling;
    if (desiredNext !== this.#e.container) {
      try {
        desiredNext
          ? this.rootNode.insertBefore(this.#e.container, desiredNext)
          : this.rootNode.appendChild(this.#e.container);
      } catch {
        // ignore
      }
    }
  }
  resolveLayoutMode(translatedTextOverride) {
    if (this.layoutMode === "ruby" && this.showType === i.both) {
      return "ruby";
    }
    const inRubyRail = !!(
      this.showType === i.both &&
      this.railManager &&
      this.railManager.isInsideActiveRubyRail(this.rootNode)
    );
    const mode = decideBilingualPlacement({
      rootNode: this.rootNode,
      coreNodes: this.sourceNodes,
      sourceText: this.innerText,
      translatedText: translatedTextOverride ?? this.translatedText ?? this.innerText,
      isInNavOrBreadcrumb: this.isInNavOrBreadcrumb,
      isInButton: this.isInButton,
      isInInteractive: this.isInInteractive,
      inRubyRail,
    });
    if (mode === "ruby" && this.rootNode instanceof Element) {
      if (this.railManager) {
        return this.railManager.applyRubyToNode(this, true) ? "ruby" : "inline";
      }
      this.rootNode.setAttribute("data-hcfy-ruby-host", "1");
      return "ruby";
    }
    return mode;
  }
  setLayoutMode(mode) {
    if (this.destroyed) return;
    const prev = this.layoutMode;
    this.layoutMode = mode;
    this.inline = mode === "inline";
    if (prev !== mode) {
      this.renderResult();
    }
  }
  updateLineClampState() {
    if (!(this.rootNode instanceof Element)) return;
    if (!this.containerLineClamp || this.containerLineClamp === "none") return;
    const shouldUnclamp =
      !this.destroyed &&
      !this.sameAsSource &&
      this.showType === i.both &&
      (this.translated || this.hasStreamOutput);
    if (shouldUnclamp) {
      this.rootNode.setAttribute("data-hcfy-unclamp", "1");
    } else {
      this.rootNode.removeAttribute("data-hcfy-unclamp");
    }
  }
  init() {
    if (this.destroyed || this.inited) return;
    this.calcInnerText();
    this.valid = !isUntranslatableText(this.innerText);
    if (!this.valid) {
      this.destroy();
    } else {
      this.layoutMode = this.resolveLayoutMode(this.innerText);
      this.inline = this.layoutMode === "inline";
    }
    this.inited = true;
  }
  calcInnerText() {
    const { sourceNodes: e, rootNode: t } = this;
    const roots = this.isOnlyChild ? [t] : e;
    const { mathNodes, hiddenNodes } = collectSpecialInnerNodes(roots);
    this.placeholders = mathNodes.map(clonePlaceholderNode);

    const replacements = [];
    const swapSpecialNodes = () => {
      hiddenNodes.forEach((hiddenEl) => {
        const parent = hiddenEl.parentNode;
        if (!parent) return;
        const emptyNode = document.createTextNode("");
        parent.replaceChild(emptyNode, hiddenEl);
        replacements.push({ parent, origEl: hiddenEl, placeholderNode: emptyNode });
      });
      mathNodes.forEach((mathEl, idx) => {
        const parent = mathEl.parentNode;
        if (!parent) return;
        const placeholderNode = document.createTextNode(`{{${idx}}}`);
        parent.replaceChild(placeholderNode, mathEl);
        replacements.push({ parent, origEl: mathEl, placeholderNode });
      });
    };
    const restoreSpecialNodes = () => {
      for (let idx = replacements.length - 1; idx >= 0; idx -= 1) {
        const { parent, origEl, placeholderNode } = replacements[idx];
        if (placeholderNode.parentNode === parent) {
          parent.replaceChild(origEl, placeholderNode);
        }
      }
    };

    let n;
    if (this.isOnlyChild) {
      const prevShowType = this.showType;
      this.switchShowType(i.source);
      swapSpecialNodes();
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
        restoreSpecialNodes();
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
      swapSpecialNodes();
      try {
        n = span.innerText.trim();
      } finally {
        restoreSpecialNodes();
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
    this.isOnlyChild = true;
    if (this.inited) {
      this.calcInnerText();
      this.layoutMode = this.resolveLayoutMode(this.translatedText || this.innerText);
      this.inline = this.layoutMode === "inline";
      this.renderResult();
    }
  }
  destroy() {
    this.showType = i.source;
    if (this.sourceRemoved) {
      this.appendSourceNodes();
    }
    if (this.rootNode instanceof Element) {
      this.rootNode.removeAttribute("data-hcfy-unclamp");
      this.rootNode.removeAttribute("data-hcfy-ruby-host");
    }
    this.#e.props.mode = "hide";
    this.removeResult();
    this.#e.destroy();
    this.destroyed = true;
  }
  renderResult(e) {
    if (this.sameAsSource) {
      if (this.sourceRemoved) {
        this.appendSourceNodes();
      }
      if (this.rootNode instanceof Element) {
        this.rootNode.removeAttribute("data-hcfy-ruby-host");
      }
      this.#e.props.mode = "hide";
      this.updateLineClampState();
      this.#e.render();
      return;
    }
    this.translating && !this.hasStreamOutput
      ? (this.#e.props.mode = "hide")
      : this.showType === i.both
        ? (this.#e.props.mode = "comparison")
        : this.showType === i.result
          ? (this.#e.props.mode = "plain")
          : (this.#e.props.mode = "hide");
    const effectiveMode = this.showType === i.both ? this.layoutMode : this.inline ? "inline" : "block";
    if (this.showType === i.both) {
      this.syncContainerAnchor(effectiveMode);
    }
    this.#e.props.comparison.layoutMode = effectiveMode;
    this.#e.props.comparison.newLine = effectiveMode !== "inline";
    if (e) this.#e.props.content = e;
    this.updateLineClampState();
    this.#e.render();
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
    } catch (err) {
      if (this.destroyed) return;
      this.translating = false;
      this.hasStreamOutput = false;
      this.translated = true;
      if (this.sourceRemoved) {
        this.appendSourceNodes();
      }
      this.renderResult({
        error: o(
          err.message +
            (err.link ? `<a target='_blank' href='${err.link.url}'>${err.link.name}</a>` : ""),
          {
            ALLOWED_TAGS: ["a", "#text", "b", "i"],
            ALLOWED_ATTR: ["target", "rel", "href", "class"],
          }
        ),
        type: "html",
      });
      if (this.#t) {
        const nextType = this.#t;
        this.#t = undefined;
        this.switchShowType(nextType);
      }
      return;
    }
    if (!this.destroyed) {
      if (((this.translating = false), null == e)) return this.translate();
      this.hasStreamOutput = false;
      this.translated = true;
      this.translatedText = e;
      if (this.#t) {
        const nextType = this.#t;
        this.#t = undefined;
        this.showType = nextType;
      }
      this.sameAsSource = isSameAsSourceText(this.innerText, e);
      if (this.sameAsSource) {
        this.#e.props.content = undefined;
        if (this.sourceRemoved) {
          this.appendSourceNodes();
        }
        if (this.rootNode instanceof Element) {
          this.rootNode.removeAttribute("data-hcfy-ruby-host");
        }
        this.#e.props.mode = "hide";
        this.updateLineClampState();
        this.#e.render();
        return;
      }
      // Compute final geometry-driven placement using real translated text width
      this.layoutMode = this.resolveLayoutMode(e);
      this.inline = this.layoutMode === "inline";
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
      this.onLayoutRendered?.(this);
    }
  }
  retry() {
    if (!this.translated) throw new Error("未翻译过");
    this.#t = this.showType;
    this.sameAsSource = false;
    this.translatedText = "";
    this.layoutMode = "block";
    if (this.rootNode instanceof Element) {
      this.rootNode.removeAttribute("data-hcfy-ruby-host");
    }
    this.switchShowType(i.source);
    this.#e.props.content = undefined;
    this.#e.renderInner();
    this.translated = false;
    this.hasStreamOutput = false;
    this.translate();
  }
  removeSourceNodes() {
    if (this.sourceRemoved) return;
    const { rootNode: e, sourceNodes: t } = this;
    t.forEach((node) => {
      if (!node || node.parentNode !== e) return;
      try {
        e.removeChild(node);
      } catch (err) {
        paraLog("移除源节点失败：%o", err);
      }
    });
    this.sourceRemoved = true;
  }
  appendSourceNodes() {
    if (!this.sourceRemoved) return;
    const { rootNode: e } = this;
    const t = this.#e.container;
    const refNode = t && t.parentNode === e ? t : null;
    this.sourceNodes.forEach((n) => {
      if (!n) return;
      try {
        e.insertBefore(n, refNode);
      } catch (err) {
        paraLog("插入源节点失败：%o", err);
      }
    });
    this.sourceRemoved = false;
  }
  removeResult() {
    const container = this.#e.container;
    if (!container || container.parentNode !== this.rootNode) return;
    try {
      this.rootNode.removeChild(container);
    } catch (err) {
      paraLog("移除翻译结果失败：%o", err);
    }
  }
  switchShowType(e) {
    if (this.destroyed || e === this.showType) return;
    if (!this.translated && !this.hasStreamOutput) return void (this.#t = e);
    if (this.sameAsSource) {
      this.showType = e;
      if (this.sourceRemoved) {
        this.appendSourceNodes();
      }
      this.#e.props.mode = "hide";
      this.renderResult();
      return;
    }
    const t = this.showType;
    this.showType = e;
    if (e !== i.both && this.layoutMode === "ruby") {
      this.layoutMode = "inline";
      this.inline = true;
      if (this.rootNode instanceof Element) {
        this.rootNode.removeAttribute("data-hcfy-ruby-host");
      }
    }
    switch (e) {
      case i.source:
        this.appendSourceNodes();
        this.#e.props.mode = "hide";
        this.renderResult();
        break;
      case i.result:
        this.#e.props.mode = "plain";
        this.renderResult();
        this.removeSourceNodes();
        break;
      case i.both:
        this.layoutMode = this.resolveLayoutMode(this.translatedText || this.innerText);
        this.inline = this.layoutMode === "inline";
        this.#e.props.mode = "comparison";
        this.renderResult();
        this.appendSourceNodes();
        this.onLayoutRendered?.(this);
        break;
      default:
        this.showType = t;
        throw new TypeError(`不支持的显示类型：${e}`);
    }
  }
}

export { i as a, isSameAsSourceText, isVisuallyHiddenElement };
export { a as r };
