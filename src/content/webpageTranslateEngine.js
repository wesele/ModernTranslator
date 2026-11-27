import pick from "lodash/pick";
import * as mod_16224 from "../shared/constants/defaults.js";
import * as mod_94903 from "./ParagraphTranslator.js";
import * as mod_62337 from "./webpageTranslateDom.js";
import * as mod_69675 from "../shared/storage/watchStorage.js";
import { t as tr } from "../shared/i18n/index.js";
import { isIconFontElement, HorizontalRailManager } from "./bilingualLayoutEngine.js";

const { isSameAsSourceText, isVisuallyHiddenElement } = mod_94903;

const SEPARATOR_ONLY_TEXT_RE = /^[\s|·•\/»›—–\-:,]+$/;
const BLOCK_DISPLAY_VALUES = new Set([
  "block",
  "flex",
  "grid",
  "list-item",
  "table",
  "table-row",
  "table-cell",
  "flow-root",
]);
const SKIP_CODE_TAGS = new Set(["code", "kbd", "samp", "var"]);

export function computeViewportPriority(target, rectOverride) {
  const vh = window.innerHeight || document.documentElement.clientHeight || 800;
  if (!(target instanceof Element) || !target.isConnected) {
    return [3, Number.MAX_SAFE_INTEGER];
  }
  const rect = rectOverride || target.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return [3, Number.MAX_SAFE_INTEGER];
  }
  const inViewport = rect.bottom > 0 && rect.top < vh;
  const isChrome = !!target.closest("nav, header, footer, aside");
  const tier = (inViewport ? 0 : 2) + (isChrome ? 1 : 0);
  const dist = inViewport
    ? Math.max(0, rect.top)
    : Math.abs((rect.top + rect.bottom) / 2 - vh / 2);
  return [tier, dist];
}

export function compareViewportPriority(a, b) {
  if (a[0] !== b[0]) return a[0] - b[0];
  return a[1] - b[1];
}

export function isPlainTxtDocument() {
  const e = document.body.childNodes;
  return 1 === e.length && e[0] instanceof HTMLPreElement;
}

export class TxtPageTranslator {
  constructor(e, t = mod_94903.a.source, n) {
    let s;
    if (n) s = n;
    else {
      if (!isPlainTxtDocument()) throw new TypeError(tr("content.notTxtError"));
      s = document.body.firstElementChild;
    }
    this.preElement = s;
    this.showType = mod_94903.a.source;
    this.originText = s.textContent || "";
    this.originParagraphs = this.originText.split(/\n{2,}/);
    this.resultParagraphs = [];
    this.totalCount = 0;
    this.completedCount = 0;
    this.originParagraphs.forEach((orig, idx) => {
      const cleaned = orig.replace(/\n/g, " ").trim();
      if (cleaned) {
        this.totalCount += 1;
        this.resultParagraphs[idx] = tr("content.translatingWait");
        e(cleaned, (partial) => {
          if (!this.destroyed && null != partial) {
            this.resultParagraphs[idx] = partial;
            this.renderResult();
          }
        }).then(
          (res) => {
            if (!this.destroyed) this.completedCount += 1;
            this.resultParagraphs[idx] = res || "";
            this.renderResult();
          },
          () => {
            if (!this.destroyed) this.completedCount += 1;
          }
        );
      } else {
        this.resultParagraphs[idx] = "";
      }
    });
    this.switchShowType(t);
  }
  getProgress() {
    return {
      completed: this.completedCount,
      total: this.totalCount,
    };
  }
  renderResult() {
    switch (this.showType) {
      case mod_94903.a.source:
        this.preElement.textContent = this.originText;
        break;
      case mod_94903.a.result:
        this.preElement.textContent = this.originParagraphs
          .map((orig, idx) => {
            const translated = this.resultParagraphs[idx];
            return isSameAsSourceText(orig, translated) ? orig : translated;
          })
          .join("\n\n");
        break;
      case mod_94903.a.both:
        this.preElement.textContent = this.originParagraphs.reduce((acc, orig, idx) => {
          if (!orig.trim()) return acc;
          const translated = this.resultParagraphs[idx];
          if (isSameAsSourceText(orig, translated)) {
            return acc + orig + "\n\n";
          }
          return acc + orig + tr("content.txtPrefix") + translated + "\n\n";
        }, "");
    }
  }
  switchShowType(e) {
    if (this.showType !== e) {
      this.showType = e;
      this.renderResult();
    }
  }
  destroy() {
    this.switchShowType(mod_94903.a.source);
    this.destroyed = true;
  }
}

class ParagraphGroup {
  constructor(e, t, n, s) {
    this.rootNode = e;
    this.staticChildNodes = t;
    this.translateNodes = [];
    this.translateFn = n;
    this.options = s;
  }
  add(e, t) {
    const { rootNode: n, staticChildNodes: s, translateNodes: r, translateFn: o } = this;
    const i = s.slice(e, t + 1);
    const a = new mod_94903.r(n, i, o, this.options);
    r.push(a);
    return a;
  }
  translate() {
    this.translateNodes.forEach((e) => e.translate());
  }
  setOnlyChild() {
    this.translateNodes[0]?.setOnlyChild();
  }
  switchShowType(e) {
    this.translateNodes.forEach((t) => t.switchShowType(e));
  }
  destroy() {
    this.translateNodes.forEach((e) => e.destroy());
  }
}

const SKIP_SUBTREE_TAGS = [
  "base",
  "head",
  "link",
  "meta",
  "style",
  "body",
  "hr",
  "pre",
  "br",
  "area",
  "audio",
  "img",
  "map",
  "track",
  "video",
  "embed",
  "iframe",
  "object",
  "param",
  "picture",
  "portal",
  "source",
  "svg",
  "math",
  "canvas",
  "noscript",
  "script",
  "input",
  "meter",
  "progress",
  "textarea",
  "select",
];

const BLOCK_TAGS = [
  "article",
  "aside",
  "footer",
  "header",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "main",
  "nav",
  "section",
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "li",
  "ol",
  "p",
  "ul",
  "details",
  "dialog",
  "menu",
  "summary",
  "form",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "center",
  "label",
].concat(SKIP_SUBTREE_TAGS);

function isElementNode(e) {
  return e.nodeType === Node.ELEMENT_NODE;
}

function isInlineMathElement(e, getDisplay = (el) => window.getComputedStyle(el).display) {
  const t = e.tagName.toLowerCase();
  if ("math" !== t && "mjx-container" !== t) return false;
  if ("block" === e.getAttribute("display") || "true" === e.getAttribute("display")) {
    return false;
  }
  return "block" !== getDisplay(e);
}

function isFlexOrGridContainer(e, getDisplay = (el) => window.getComputedStyle(el).display) {
  if (!(e instanceof Element)) return false;
  const disp = getDisplay(e);
  return "flex" === disp || "inline-flex" === disp || "grid" === disp || "inline-grid" === disp;
}

function isBlockBoundaryElement(e, getDisplay) {
  if (isInlineMathElement(e, getDisplay)) return false;
  const t = e.tagName.toLowerCase();
  if (BLOCK_TAGS.includes(t) || (t.includes("-") && "g-emoji" !== t)) {
    return true;
  }
  const disp = getDisplay(e);
  return BLOCK_DISPLAY_VALUES.has(disp);
}

function isInteractiveControl(e) {
  const t = e.tagName.toLowerCase();
  return "button" === e.getAttribute("role")
    ? !SKIP_SUBTREE_TAGS.includes(t)
    : "button" === t || "a" === t;
}

export function walkDomParagraphs(
  e,
  t,
  n = () => false,
  s,
  getDisplay = (el) => window.getComputedStyle(el).display,
  onShadowRoot
) {
  const r = {
    element: e,
    paragraphs: [],
    children: [],
  };
  if (e instanceof Element && n(e)) return r;
  if (e instanceof Element) {
    const o = e.shadowRoot;
    if (o) {
      onShadowRoot?.(o);
      const childRes = walkDomParagraphs(o, t, n, s, getDisplay, onShadowRoot);
      r.children.push(childRes);
    }
  }
  let o;
  const i = Array.from(e.childNodes);
  let hasDirectProseText = false;
  const l = i.filter((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const trimmed = node.nodeValue?.trim();
      if (!trimmed) return false;
      if (!SEPARATOR_ONLY_TEXT_RE.test(trimmed)) {
        hasDirectProseText = true;
      }
      return true;
    }
    return node.nodeType === Node.ELEMENT_NODE;
  });
  const c = (idx) => i.indexOf(l[idx]);
  const containerIsFlexOrGrid = !hasDirectProseText && isFlexOrGridContainer(e, getDisplay);

  l.forEach((d, u) => {
    if (null == o) o = u;
    if (
      isElementNode(d) &&
      !isInlineMathElement(d, getDisplay) &&
      (isBlockBoundaryElement(d, getDisplay) ||
        containerIsFlexOrGrid ||
        (function (nodes, idx, hasProse) {
          const cur = nodes[idx];
          if (!isElementNode(cur)) return false;
          const prev = nodes[idx - 1];
          const next = nodes[idx + 1];
          if (isInteractiveControl(cur) && !hasProse) {
            const prevEl =
              prev && prev.nodeType === Node.TEXT_NODE && SEPARATOR_ONLY_TEXT_RE.test(prev.nodeValue || "")
                ? nodes[idx - 2]
                : prev;
            const nextEl =
              next && next.nodeType === Node.TEXT_NODE && SEPARATOR_ONLY_TEXT_RE.test(next.nodeValue || "")
                ? nodes[idx + 2]
                : next;
            if (prevEl && isElementNode(prevEl) && isInteractiveControl(prevEl)) return true;
            if (nextEl && isElementNode(nextEl) && isInteractiveControl(nextEl)) return true;
          }
          return prev
            ? isElementNode(prev) && isBlockBoundaryElement(prev, getDisplay)
            : !next || (isElementNode(next) && isBlockBoundaryElement(next, getDisplay));
        })(l, u, hasDirectProseText))
    ) {
      const endIdx = u - 1;
      if (endIdx >= o) {
        const startPos = c(o);
        const endPos = c(endIdx);
        r.paragraphs.push([startPos, endPos]);
        t?.(e, i, startPos, endPos);
      }
      o = undefined;
      const shouldSkipRecurse =
        !isInteractiveControl(d) && SKIP_SUBTREE_TAGS.includes(d.tagName.toLowerCase());
      if (!shouldSkipRecurse && !n(d)) {
        const childRes = walkDomParagraphs(d, t, n, s, getDisplay, onShadowRoot);
        r.children.push(childRes);
      }
    }
  });
  if (null != o) {
    const lastIdx = l.length - 1;
    const startPos = c(o);
    const endPos = c(lastIdx);
    r.paragraphs.push([startPos, endPos]);
    t?.(e, i, startPos, endPos);
  }
  if (1 === r.paragraphs.length && 0 === r.children.length) {
    s?.(r);
  }
  return r;
}

export class TitleTranslator {
  text = document.title;
  translateResult = "";
  translating = false;
  translated = false;
  showType = mod_94903.a.source;
  destroyed = false;
  constructor(e) {
    this.translateFn = e;
  }
  destroy() {
    document.title = this.text;
    this.destroyed = true;
  }
  switchShowType(e) {
    if (!this.destroyed) {
      const sameAsSource =
        this.translated && isSameAsSourceText(this.text, this.translateResult);
      switch (e) {
        case mod_94903.a.both:
          document.title = sameAsSource
            ? this.text
            : `${this.text} ~ ${this.translateResult}`;
          break;
        case mod_94903.a.source:
          document.title = this.text;
          break;
        case mod_94903.a.result:
          document.title = sameAsSource ? this.text : this.translateResult;
          break;
      }
      this.showType = e;
    }
  }
  async translate() {
    if (this.destroyed || !this.text || this.translating || this.translated) return;
    let e;
    this.translating = true;
    this.translateResult = tr("content.translatingShort");
    this.switchShowType(this.showType);
    try {
      e = await this.translateFn(this.text);
    } catch (err) {
      this.translating = false;
      this.translated = true;
      this.translateResult = tr("content.translateErrPrefix", { msg: err.message });
      this.switchShowType(this.showType);
      return;
    }
    this.translating = false;
    if (null == e) return this.translate();
    this.translated = true;
    this.translateResult = e;
    this.switchShowType(this.showType);
  }
}

export const PAGE_TRS_STYLE_MAP = {
  STYLE_NONE: mod_62337.P9,
  STYLE_DOTTED_CLASSIC: mod_62337.O,
  STYLE_DOTTED: mod_62337.pb,
  STYLE_WAVY: mod_62337.UU,
  STYLE_LINE: mod_62337.Zi,
  STYLE_BACKGROUND: mod_62337.dd,
  STYLE_QUOTE: mod_62337.PD,
};

export function buildWebpageTranslateStyleCss(styleOptions) {
  let css = "hcfy-result{text-decoration:none;";
  if (styleOptions.pageTrsResultStyleMainColor) {
    css += `--hcfy-result-main-color:${styleOptions.pageTrsResultStyleMainColor};`;
  }
  if (styleOptions.pageTrsResultStyleTextColor) {
    css += `--hcfy-result-text-color:${styleOptions.pageTrsResultStyleTextColor};`;
  }
  if (styleOptions.pageTrsResultStyleTextSize) {
    css += `--hcfy-result-text-size:${styleOptions.pageTrsResultStyleTextSize}em;`;
  }
  if (styleOptions.pageTrsResultStyleTextWeight) {
    css += `--hcfy-result-text-weight:${styleOptions.pageTrsResultStyleTextWeight};`;
  }
  css += "}\n";
  css +=
    "hcfy-result.__hcfy-result-comparison-block__{margin-top:0.35em;margin-bottom:0.3em;text-indent:0;white-space:normal;overflow-wrap:anywhere;word-break:break-word;}\n";
  css +=
    ":is(h1,h2,h3,h4,h5,h6) hcfy-result.__hcfy-result-comparison-block__{margin-top:0.2em;margin-bottom:0.1em;line-height:1.35;}\n";
  css += "hcfy-result.__hcfy-result-comparison-inline__{margin-inline-start:0.4em;margin-inline-end:0.15em;}\n";
  css +=
    "[data-hcfy-ruby-host='1']{display:inline-flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;vertical-align:middle!important;line-height:1.18!important;height:auto!important;min-height:0!important;padding-top:3px!important;padding-bottom:3px!important;}\n";
  css +=
    "hcfy-result.__hcfy-result-comparison-ruby__{display:block!important;margin:2px 0 0 0!important;font-size:0.76em!important;font-weight:400!important;line-height:1.15!important;white-space:nowrap!important;text-align:center!important;opacity:0.88;}\n";
  css +=
    "hcfy-result.__hcfy-result-comparison-ruby__ hcfy-result-content{text-decoration-thickness:1px!important;text-underline-offset:0.16em!important;}\n";
  css +=
    "[data-hcfy-rail-expand='1']{height:auto!important;overflow-y:visible!important;}\n";
  css +=
    "[data-hcfy-unclamp='1']{-webkit-line-clamp:unset!important;line-clamp:unset!important;max-height:none!important;overflow:visible!important;}\n";
  if ("STYLE_CUSTOM" === styleOptions.pageTrsResultStyleId) {
    css += styleOptions.pageTrsResultStyleCustom || "";
  } else {
    css += PAGE_TRS_STYLE_MAP[styleOptions.pageTrsResultStyleId] || "";
  }
  return css;
}

let styleNode;
let currentStyleCss = "";
const shadowStyleNodes = new Map();

function syncShadowStyles() {
  for (const [root, node] of shadowStyleNodes.entries()) {
    if (!root.host?.isConnected) {
      shadowStyleNodes.delete(root);
      continue;
    }
    node.textContent = currentStyleCss;
  }
}

export function ensureShadowRootTranslateStyles(shadowRoot) {
  if (!shadowRoot) return;
  let node = shadowStyleNodes.get(shadowRoot);
  if (!node || !shadowRoot.contains(node)) {
    node = document.createElement("style");
    node.setAttribute("data-hcfy-ignore", "1");
    node.setAttribute("data-hcfy-shadow-style", "1");
    shadowRoot.appendChild(node);
    shadowStyleNodes.set(shadowRoot, node);
  }
  if (currentStyleCss) {
    node.textContent = currentStyleCss;
  }
}

export function ensurePageTranslateStyles(overrideOptions) {
  if (!styleNode) {
    styleNode = document.createElement("style");
    styleNode.dataset.title = tr("content.styleNodeTitle");
    document.head.appendChild(styleNode);
  }
  const styleOptions = {
    ...pick(mod_16224.g2, [
      "pageTrsResultStyleId",
      "pageTrsResultStyleMainColor",
      "pageTrsResultStyleTextColor",
      "pageTrsResultStyleTextSize",
      "pageTrsResultStyleTextWeight",
      "pageTrsResultStyleCustom",
    ]),
    ...(overrideOptions || {}),
  };
  currentStyleCss = buildWebpageTranslateStyleCss(styleOptions);
  styleNode.textContent = currentStyleCss;
  syncShadowStyles();

  if (overrideOptions || typeof chrome === "undefined" || !chrome?.storage?.local) {
    return;
  }
  mod_69675.A(styleOptions, (changes) => {
    if (changes.pageTrsResultStyleId) styleOptions.pageTrsResultStyleId = changes.pageTrsResultStyleId;
    if (undefined !== changes.pageTrsResultStyleCustom) {
      styleOptions.pageTrsResultStyleCustom = changes.pageTrsResultStyleCustom;
    }
    if (undefined !== changes.pageTrsResultStyleMainColor) {
      styleOptions.pageTrsResultStyleMainColor = changes.pageTrsResultStyleMainColor;
    }
    if (undefined !== changes.pageTrsResultStyleTextColor) {
      styleOptions.pageTrsResultStyleTextColor = changes.pageTrsResultStyleTextColor;
    }
    if (undefined !== changes.pageTrsResultStyleTextSize) {
      styleOptions.pageTrsResultStyleTextSize = changes.pageTrsResultStyleTextSize;
    }
    if (undefined !== changes.pageTrsResultStyleTextWeight) {
      styleOptions.pageTrsResultStyleTextWeight = changes.pageTrsResultStyleTextWeight;
    }
    if (styleNode) {
      currentStyleCss = buildWebpageTranslateStyleCss(styleOptions);
      styleNode.textContent = currentStyleCss;
      syncShadowStyles();
    }
  });
}

function isNotDocumentRoot(e) {
  const t = e.nodeName.toLowerCase();
  return "body" !== t && "html" !== t;
}

function hasDirectResultChild(e) {
  return Array.prototype.some.call(e.childNodes, (child) => "hcfy-result" === child.nodeName.toLowerCase());
}

export function shouldSkipElement(el, getStyle = (node) => window.getComputedStyle(node)) {
  if (!(el instanceof Element)) return false;
  const tag = el.tagName.toLowerCase();
  if ("hcfy-result" === tag || hasDirectResultChild(el)) return true;
  if (SKIP_CODE_TAGS.has(tag)) return true;
  if ("1" === el.getAttribute("data-hcfy-ignore")) return true;
  if ("no" === el.getAttribute("translate") || el.classList?.contains("notranslate")) {
    return true;
  }
  const style = getStyle(el);
  if (isIconFontElement(el, style)) return true;
  return isVisuallyHiddenElement(el, style);
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

export class WebpageTranslator {
  groups = new Map();
  destroyed = false;
  titleTimer = null;
  mutationObserver = new MutationObserver((records) => {
    records.forEach((rec) => {
      rec.addedNodes.forEach((node) => {
        if (
          isElementNode(node) &&
          node.isConnected &&
          !(function (el, pred) {
            let cur = el;
            do {
              if (pred(cur)) return true;
              cur = cur.parentElement;
            } while (cur && isNotDocumentRoot(cur));
            return false;
          })(node, (el) => {
            const tag = el.tagName.toLowerCase();
            return (
              "pre" === tag ||
              "hcfy-result" === tag ||
              SKIP_CODE_TAGS.has(tag) ||
              "1" === el.getAttribute("data-hcfy-ignore") ||
              !!hasDirectResultChild(el) ||
              undefined
            );
          })
        ) {
          this.analysis(node);
        }
      });
      rec.removedNodes.forEach((node) => {
        if (isElementNode(node)) {
          const cleanup = (el) => {
            this.groups.delete(el);
            Array.prototype.forEach.call(el.children, cleanup);
          };
          cleanup(node);
        }
      });
    });
  });
  intersectionObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => ({
          entry,
          score: computeViewportPriority(entry.target, entry.boundingClientRect),
        }))
        .sort((a, b) => compareViewportPriority(a.score, b.score));
      for (const { entry } of visibleEntries) {
        const group = this.groups.get(entry.target);
        if (group) group.translate();
      }
    },
    {
      rootMargin: `${Math.min(200, Math.round((window.innerHeight || 800) * 0.2))}px 0px`,
    }
  );
  constructor(e, t = mod_94903.a.both, n = document.body, s) {
    ensurePageTranslateStyles(s?.styleOptions);
    this.options = s;
    this.translateFn = e;
    this.showType = t;
    this.railManager = new HorizontalRailManager(() => this.groups);
    this.titleNode = new TitleTranslator(e);
    this.titleNode.switchShowType(t);
    this.analysis(n);
    const r = document.getElementsByTagName("sr-read")[0];
    if (r) this.analysis(r);
    this.mutationObserver.observe(n, {
      childList: true,
      subtree: true,
    });
    if ((window.scrollY || document.documentElement.scrollTop || 0) < 100) {
      this.titleNode.translate();
    } else {
      this.titleTimer = setTimeout(() => {
        this.titleTimer = null;
        if (!this.destroyed) {
          this.titleNode.translate();
        }
      }, 400);
    }
  }
  analysis(e) {
    const { groups: t, translateFn: n } = this;
    const styleCache = new Map();
    const getStyle = (el) => {
      let st = styleCache.get(el);
      if (st === undefined) {
        st = window.getComputedStyle(el);
        styleCache.set(el, st);
      }
      return st;
    };
    const getDisplay = (el) => getStyle(el).display;
    const pendingNodes = [];
    const pendingOnlyChild = [];
    walkDomParagraphs(
      e,
      (rootNode, childNodesSnapshot, startIdx, endIdx) => {
        pendingNodes.push({ rootNode, childNodesSnapshot, startIdx, endIdx });
      },
      (el) => shouldSkipElement(el, getStyle),
      (entry) => {
        pendingOnlyChild.push(entry);
      },
      getDisplay,
      (shadowRoot) => {
        ensureShadowRootTranslateStyles(shadowRoot);
      }
    );

    const rootStyleCache = new Map();
    for (const { rootNode } of pendingNodes) {
      if (!rootStyleCache.has(rootNode)) {
        let meta = {
          containerDisplay: "",
          containerFlexDirection: "",
          containerFlexWrap: "",
          containerWhiteSpace: "",
          containerLineClamp: "",
          isInlineSpan: false,
          isHeading: false,
          isInButton: false,
          isInInteractive: false,
          isInNavOrBreadcrumb: false,
        };
        if (rootNode instanceof Element) {
          const st = getStyle(rootNode);
          const containerDisplay = st.display || "";
          const isInNavOrBreadcrumb = !!closestWithin(
            rootNode,
            "nav, [role=navigation], [role=menubar], [role=tablist], [aria-label*='breadcrumb' i], .breadcrumb, .breadcrumbs, .related",
            6
          );
          meta = {
            containerDisplay,
            containerFlexDirection: st.flexDirection || "",
            containerFlexWrap: st.flexWrap || "",
            containerWhiteSpace: st.whiteSpace || "",
            containerLineClamp: st.webkitLineClamp || "",
            isInlineSpan:
              "span" === rootNode.nodeName.toLowerCase() && containerDisplay.startsWith("inline"),
            isHeading: !isInNavOrBreadcrumb && !!closestWithin(rootNode, "h1,h2,h3,h4,h5,h6", 3),
            isInButton: !!closestWithin(rootNode, "button, [role=button]", 3),
            isInInteractive: !!closestWithin(
              rootNode,
              "a, button, [role=button], [role=tab], [role=menuitem], label",
              3
            ),
            isInNavOrBreadcrumb,
          };
        }
        rootStyleCache.set(rootNode, meta);
      }
    }

    for (const { rootNode, childNodesSnapshot, startIdx, endIdx } of pendingNodes) {
      let group = t.get(rootNode);
      if (!group) {
        const styleMeta = rootStyleCache.get(rootNode);
        group = new ParagraphGroup(rootNode, childNodesSnapshot, n, {
          ...this.options,
          ...styleMeta,
          railManager: this.railManager,
          onLayoutRendered: () => this.railManager.scheduleSolve(),
        });
        t.set(rootNode, group);
        if (rootNode instanceof Element) {
          this.intersectionObserver.observe(rootNode);
        }
      }
      group.add(startIdx, endIdx).switchShowType(this.showType);
    }

    for (const entry of pendingOnlyChild) {
      const group = t.get(entry.element);
      if (group) group.setOnlyChild();
    }
  }
  switchShowType(e) {
    this.showType = e;
    if (e !== mod_94903.a.both) {
      this.railManager.resetAll();
    }
    this.titleNode.switchShowType(e);
    for (const t of this.groups.values()) t.switchShowType(e);
    if (e === mod_94903.a.both) {
      this.railManager.scheduleSolve();
    }
  }
  destroy() {
    this.destroyed = true;
    if (this.titleTimer) {
      clearTimeout(this.titleTimer);
      this.titleTimer = null;
    }
    this.railManager.destroy();
    this.intersectionObserver.disconnect();
    this.mutationObserver.disconnect();
    this.titleNode.destroy();
    for (const e of this.groups.values()) e.destroy();
  }
  getProgress() {
    let total = 0;
    let completed = 0;
    if (this.titleNode && !this.titleNode.destroyed && this.titleNode.text?.trim()) {
      total += 1;
      if (this.titleNode.translated) completed += 1;
    }
    for (const group of this.groups.values()) {
      for (const node of group.translateNodes) {
        if (node.destroyed) continue;
        if (node.inited) {
          if (!node.valid) continue;
          total += 1;
          if (node.translated) completed += 1;
        } else {
          const hasText = node.sourceNodes.some((src) => {
            const txt = src.textContent?.trim();
            return txt && !/^[0-9\s.,\-_#:()[\]!•+~@$%^&*\n/`]+$/.test(txt);
          });
          if (hasText) total += 1;
        }
      }
    }
    return { completed, total };
  }
}
