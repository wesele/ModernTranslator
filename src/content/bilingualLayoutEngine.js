import { a as ShowType } from "../shared/constants/showType.js";

const ICON_FONT_FAMILY_RE =
  /material\s*(?:icons|symbols)|google\s*(?:material\s*)?(?:icons|symbols)|font\s*awesome|fontawesome|icomoon|codicon|octicon|glyphicon|iconfont|remixicon|bootstrap-icons|lucide|feather|heroicons|tabler-icons/i;
const ICON_LIGATURE_TEXT_RE = /^[a-z]{2,}(?:_[a-z0-9]+)+$/;
const PUA_ONLY_RE = /^[\uE000-\uF8FF\u{F0000}-\u{FFFFD}\s]+$/u;
const CJK_CHAR_RE = /[\u2E80-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/;
const NARROW_ASCII_RE = /[il1jI.,:;'|!()[\]/\\-]/;
const SENTENCE_END_RE = /[.?!;:。？！；：]$/;
const PROSE_TAGS = new Set(["p", "blockquote", "figcaption", "dd", "li"]);
const DECORATIVE_TAGS = new Set(["svg", "img", "picture", "canvas", "br", "hr"]);
const RAIL_SEMANTIC_SELECTOR =
  "nav, header, [role='navigation'], [role='menubar'], [role='tablist'], [role='menu']";

export function isIconFontElement(el, styleOverride) {
  if (!(el instanceof Element)) return false;
  const style = styleOverride || window.getComputedStyle(el);
  const fontFamily = style?.fontFamily || "";
  if (fontFamily && ICON_FONT_FAMILY_RE.test(fontFamily)) {
    return true;
  }
  const text = (el.textContent || "").trim();
  if (!text) return false;
  if (PUA_ONLY_RE.test(text)) {
    return true;
  }
  if (
    el.getAttribute("aria-hidden") === "true" &&
    el.children.length === 0 &&
    ICON_LIGATURE_TEXT_RE.test(text)
  ) {
    return true;
  }
  return false;
}

export function isTrailingDecorativeNode(node, isHiddenFn) {
  if (!node) return true;
  if (node.nodeType === Node.COMMENT_NODE) return true;
  if (node.nodeType === Node.TEXT_NODE) {
    return !(node.nodeValue || "").trim();
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tag = node.tagName.toLowerCase();
    if (DECORATIVE_TAGS.has(tag)) return true;
    const style = window.getComputedStyle(node);
    if (isIconFontElement(node, style)) return true;
    if (isHiddenFn && isHiddenFn(node, style)) return true;
    if (
      node.children.length > 0 &&
      !(node.textContent || "").trim() &&
      node.querySelector("svg, img")
    ) {
      return true;
    }
  }
  return false;
}

export function splitTrailingDecorativeNodes(sourceNodes, isHiddenFn) {
  let end = sourceNodes.length - 1;
  while (end >= 0 && isTrailingDecorativeNode(sourceNodes[end], isHiddenFn)) {
    end -= 1;
  }
  if (end < 0) {
    return { coreNodes: sourceNodes, trailingNodes: [] };
  }
  return {
    coreNodes: sourceNodes.slice(0, end + 1),
    trailingNodes: sourceNodes.slice(end + 1),
  };
}

export function estimateTranslatedWidth(text, fontSize = 14) {
  const str = String(text || "").trim();
  if (!str) return 0;
  let units = 0;
  for (const ch of str) {
    if (CJK_CHAR_RE.test(ch)) {
      units += 1.02;
    } else if (/\s/.test(ch)) {
      units += 0.32;
    } else if (NARROW_ASCII_RE.test(ch)) {
      units += 0.38;
    } else {
      units += 0.58;
    }
  }
  return units * fontSize + 0.45 * fontSize;
}

function findNextSameRowSiblingLeft(el, sourceTop, sourceBottom, sourceRight) {
  let sib = el?.nextElementSibling;
  while (sib) {
    if (sib.tagName.toLowerCase() !== "hcfy-result") {
      const rect = sib.getBoundingClientRect();
      if (rect.width >= 1 && rect.height >= 1) {
        const verticallyOverlaps = rect.top < sourceBottom - 2 && rect.bottom > sourceTop + 2;
        if (verticallyOverlaps && rect.left >= sourceRight - 4) {
          return rect.left;
        }
      }
    }
    sib = sib.nextElementSibling;
  }
  return null;
}

export function measureSourceGeometry(rootNode, coreNodes, styleOverride) {
  if (!(rootNode instanceof Element) || !coreNodes.length) {
    return null;
  }
  const style = styleOverride || window.getComputedStyle(rootNode);
  const fontSize = parseFloat(style.fontSize) || 14;
  const parsedLineHeight = parseFloat(style.lineHeight);
  const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontSize * 1.3;

  const rects = [];
  try {
    const range = document.createRange();
    range.setStartBefore(coreNodes[0]);
    range.setEndAfter(coreNodes[coreNodes.length - 1]);
    for (const r of range.getClientRects()) {
      if (r.width >= 0.5 && r.height >= 0.5) {
        rects.push(r);
      }
    }
  } catch {
    // fallback to element bounding rect
  }

  const rootRect = rootNode.getBoundingClientRect();
  if (!rects.length) {
    if (rootRect.width < 0.5 && rootRect.height < 0.5) return null;
    rects.push(rootRect);
  }

  const lineTolerance = Math.max(4, lineHeight * 0.45);
  const lines = [];
  for (const r of rects) {
    let matched = null;
    for (const line of lines) {
      const overlap = Math.min(r.bottom, line.bottom) - Math.max(r.top, line.top);
      const minH = Math.min(r.height, line.height);
      if (overlap > minH * 0.35 || Math.abs(r.top - line.top) <= lineTolerance * 0.5) {
        matched = line;
        break;
      }
    }
    if (matched) {
      matched.left = Math.min(matched.left, r.left);
      matched.right = Math.max(matched.right, r.right);
      matched.top = Math.min(matched.top, r.top);
      matched.bottom = Math.max(matched.bottom, r.bottom);
      matched.height = matched.bottom - matched.top;
    } else {
      lines.push({
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        height: r.height,
      });
    }
  }

  const lineCount = lines.length;
  const firstLine = lines[0];
  const lastLine = lines[lines.length - 1];
  const sourceLeft = Math.min(...lines.map((l) => l.left));
  const sourceRight = Math.max(...lines.map((l) => l.right));
  const sourceTop = firstLine.top;
  const sourceBottom = lastLine.bottom;
  const sourceWidth = Math.max(0, sourceRight - sourceLeft);

  const padL = parseFloat(style.paddingLeft) || 0;
  const padR = parseFloat(style.paddingRight) || 0;
  const borderL = parseFloat(style.borderLeftWidth) || 0;
  const borderR = parseFloat(style.borderRightWidth) || 0;
  const rootInnerWidth = Math.max(0, rootRect.width - padL - padR - borderL - borderR);
  let effectiveRightEdge = rootRect.right - padR - borderR;
  let effectiveContainerWidth = Math.max(rootInnerWidth, sourceWidth);

  const viewportRight = (window.innerWidth || document.documentElement.clientWidth || 1024) - 8;
  let rightCap = viewportRight;

  const directSibLeft = findNextSameRowSiblingLeft(rootNode, sourceTop, sourceBottom, sourceRight);
  if (directSibLeft !== null) {
    rightCap = Math.min(rightCap, directSibLeft - 10);
  }

  // If the root element is shrink-wrapped around its text (e.g., hgroup > h1, flex link, time),
  // inspect up to 3 enclosing containers to discover actual free right-hand space.
  if (effectiveRightEdge - sourceRight < 28) {
    let cur = rootNode;
    for (let depth = 0; depth < 3; depth += 1) {
      const parent = cur.parentElement;
      if (!parent || parent === document.body || parent === document.documentElement) break;
      const pStyle = window.getComputedStyle(parent);
      const pRect = parent.getBoundingClientRect();
      const pPadL = parseFloat(pStyle.paddingLeft) || 0;
      const pPadR = parseFloat(pStyle.paddingRight) || 0;
      const pBorderL = parseFloat(pStyle.borderLeftWidth) || 0;
      const pBorderR = parseFloat(pStyle.borderRightWidth) || 0;
      const pInnerRight = pRect.right - pPadR - pBorderR;

      const sibLeft = findNextSameRowSiblingLeft(cur, sourceTop, sourceBottom, sourceRight);
      if (sibLeft !== null) {
        rightCap = Math.min(rightCap, sibLeft - 10);
      }

      if (
        pStyle.overflowX === "hidden" ||
        pStyle.overflowX === "clip" ||
        pStyle.overflow === "hidden"
      ) {
        rightCap = Math.min(rightCap, pInnerRight);
      }

      const pInnerWidth = pRect.width - pPadL - pPadR - pBorderL - pBorderR;
      if (pInnerWidth > effectiveContainerWidth + 36) {
        effectiveRightEdge = Math.min(pInnerRight, rightCap);
        effectiveContainerWidth = Math.max(
          sourceWidth,
          Math.min(pInnerWidth, effectiveRightEdge - Math.max(pRect.left + pPadL, sourceLeft))
        );
        break;
      }
      cur = parent;
    }
  } else {
    effectiveRightEdge = Math.min(effectiveRightEdge, rightCap);
  }

  const isCentered = style.textAlign === "center";
  const availableRight = isCentered
    ? Math.max(0, effectiveContainerWidth - sourceWidth)
    : Math.max(0, effectiveRightEdge - sourceRight);

  return {
    lineCount,
    lineHeight,
    fontSize,
    sourceLeft,
    sourceRight,
    sourceTop,
    sourceBottom,
    sourceWidth,
    rootWidth: rootRect.width,
    rootInnerWidth,
    rootHeight: rootRect.height,
    containerWidth: Math.max(effectiveContainerWidth, sourceWidth),
    availableRight,
    display: style.display || "",
    flexDirection: style.flexDirection || "",
    whiteSpace: style.whiteSpace || "",
    textAlign: style.textAlign || "",
    isCentered,
  };
}

function isInSingleLineTruncatedBox(el) {
  let cur = el;
  for (let depth = 0; depth < 3 && cur && cur !== document.body; depth += 1) {
    const st = window.getComputedStyle(cur);
    if (st.textOverflow === "ellipsis") return true;
    const clippedX = st.overflowX === "hidden" || st.overflowX === "clip" || st.overflow === "hidden";
    if (st.whiteSpace === "nowrap" && clippedX) return true;
    cur = cur.parentElement;
  }
  return false;
}

function isInsideCompactButtonLikeControl(el) {
  let cur = el;
  for (let depth = 0; depth < 4 && cur && cur !== document.body; depth += 1) {
    const tag = cur.tagName.toLowerCase();
    if (tag === "button" || cur.getAttribute("role") === "button") return true;
    if (tag === "a") {
      const st = window.getComputedStyle(cur);
      const disp = st.display || "";
      const rect = cur.getBoundingClientRect();
      if (
        (disp.includes("flex") || disp.includes("grid") || disp === "inline-block") &&
        rect.height > 0 &&
        rect.height <= 44
      ) {
        return true;
      }
    }
    cur = cur.parentElement;
  }
  return false;
}

export function decideBilingualPlacement({
  rootNode,
  coreNodes,
  sourceText,
  translatedText,
  style,
  isInNavOrBreadcrumb,
  isInButton,
  isInInteractive,
  inRubyRail,
}) {
  if (inRubyRail) return "ruby";

  const trimmedSource = String(sourceText || "").trim();
  const geo = measureSourceGeometry(rootNode, coreNodes, style);
  if (!geo) {
    return isInButton || isInNavOrBreadcrumb ? "inline" : "block";
  }

  // 0. Single-line ellipsized / nowrap-clipped metadata slots must stay inline (never blow up vertically!)
  if (geo.lineCount <= 1 && isInSingleLineTruncatedBox(rootNode)) {
    return "inline";
  }

  // 1. Multi-line source ALWAYS gets a clean block translation below
  if (geo.lineCount >= 2) {
    return "block";
  }

  const words = trimmedSource.split(/\s+/).filter(Boolean).length;
  const hasEndPunct = SENTENCE_END_RE.test(trimmedSource);
  const tag = rootNode instanceof Element ? rootNode.tagName.toLowerCase() : "";
  const isCompactLabel = trimmedSource.length <= 36 && words <= 5 && !hasEndPunct;
  const estTransW = estimateTranslatedWidth(translatedText || trimmedSource, geo.fontSize);

  // 2. Flex-row CTA buttons / links with direct text that would squish into 2 narrow columns -> Ruby stacked dual-line!
  const isFlexRowHost =
    (geo.display === "flex" || geo.display === "inline-flex") &&
    !geo.flexDirection.startsWith("column");
  if (
    isFlexRowHost &&
    isInInteractive &&
    isCompactLabel &&
    !hasLeadingIconElement(rootNode) &&
    geo.rootInnerWidth > 40 &&
    geo.sourceWidth + estTransW > geo.rootInnerWidth - 6
  ) {
    return "ruby";
  }

  // 3. Tall single-line vertically-centered header/logo boxes (e.g. line-height >= 1.9em) & compact header labels
  if (
    trimmedSource.length <= 30 &&
    words <= 4 &&
    (geo.lineHeight >= geo.fontSize * 1.9 ||
      (rootNode instanceof Element && !!rootNode.closest("header")))
  ) {
    return "inline";
  }

  // 4. Single-line button, button-like control (e.g. inline-grid/flex button link), or nav bar items
  if (
    (isInButton || isInNavOrBreadcrumb || isInsideCompactButtonLikeControl(rootNode)) &&
    trimmedSource.length <= 40
  ) {
    return "inline";
  }

  // 5. Single-line prose paragraphs / full sentences ALWAYS break onto a new line for parallel reading
  const isProseContainer = PROSE_TAGS.has(tag);
  const isParagraphProse =
    (isProseContainer && (words >= 5 || hasEndPunct || trimmedSource.length >= 34)) ||
    words >= 7 ||
    trimmedSource.length >= 44 ||
    (hasEndPunct && words >= 5);

  if (isParagraphProse) {
    return "block";
  }

  // 6. Short single-line labels/headings/metadata: place inline iff there is comfortable right-side spatial budget
  const fillRatio = geo.containerWidth > 0 ? geo.sourceWidth / geo.containerWidth : 1;

  if (geo.availableRight >= estTransW + 12 && fillRatio <= 0.65) {
    return "inline";
  }

  // Keep short nowrap metadata / badges / inline interactive tokens inline (e.g. timestamps, tags, breadcrumbs)
  if (
    isCompactLabel &&
    trimmedSource.length <= 24 &&
    (geo.whiteSpace === "nowrap" ||
      tag === "time" ||
      geo.display.startsWith("inline") ||
      (isInInteractive && geo.display !== "block" && geo.display !== "-webkit-box"))
  ) {
    return "inline";
  }

  return "block";
}

function isCandidateRailAncestor(el) {
  if (!(el instanceof Element)) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "body" || tag === "html" || tag === "main" || tag === "article" || tag === "section") {
    return false;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width < 220 || rect.height < 16 || rect.height > 120) {
    return false;
  }
  if (el.matches(RAIL_SEMANTIC_SELECTOR)) {
    return true;
  }
  const style = window.getComputedStyle(el);
  const disp = style.display || "";
  if (
    disp === "flex" ||
    disp === "inline-flex" ||
    disp === "grid" ||
    disp === "inline-grid" ||
    disp === "table-row" ||
    tag === "ul" ||
    tag === "ol"
  ) {
    return true;
  }
  if (tag === "span" && el.classList?.contains("pagetop")) {
    return true;
  }
  return false;
}

function findRailCandidate(rootNode) {
  if (!(rootNode instanceof Element)) return null;
  let cur = rootNode.parentElement;
  let fallback = null;
  for (let depth = 0; depth < 5 && cur; depth += 1) {
    if (cur === document.body || cur === document.documentElement) break;
    if (isCandidateRailAncestor(cur)) {
      if (cur.matches(RAIL_SEMANTIC_SELECTOR)) {
        return cur;
      }
      if (!fallback) fallback = cur;
    }
    cur = cur.parentElement;
  }
  return fallback;
}

function hasLeadingIconElement(rootNode) {
  if (!(rootNode instanceof Element)) return false;
  for (const child of rootNode.children) {
    const tag = child.tagName.toLowerCase();
    if (tag === "hcfy-result") continue;
    if (tag === "svg" || tag === "img" || child.querySelector("svg, img")) {
      return true;
    }
  }
  return false;
}

export class HorizontalRailManager {
  rubyRails = new Map();
  rubyHosts = new Set();
  expandedEls = new Set();
  rafId = null;
  resizeTimer = null;
  destroyed = false;

  constructor(getTranslatorGroups) {
    this.getTranslatorGroups = getTranslatorGroups;
    this.onResize = () => {
      if (this.destroyed) return;
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.resizeTimer = null;
        this.solve();
      }, 150);
    };
    window.addEventListener("resize", this.onResize, { passive: true });
  }

  isInsideActiveRubyRail(el) {
    if (!(el instanceof Element) || this.rubyRails.size === 0) return false;
    return !!el.closest("[data-hcfy-rail='ruby']");
  }

  scheduleSolve() {
    if (this.destroyed || this.rafId != null) return;
    this.rafId = window.requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.destroyed) {
        this.solve();
      }
    });
  }

  applyRubyToNode(node, skipRender = false) {
    if (!node || node.destroyed || node.sameAsSource) return false;
    if (node.showType !== ShowType.both) return false;
    const root = node.rootNode;
    if (!(root instanceof Element)) return false;
    if (hasLeadingIconElement(root)) return false;

    root.setAttribute("data-hcfy-ruby-host", "1");
    this.rubyHosts.add(root);
    if (skipRender) {
      node.layoutMode = "ruby";
      node.inline = false;
    } else {
      node.setLayoutMode("ruby");
    }
    return true;
  }

  ensureRailVerticalRoom(railEl) {
    let cur = railEl;
    for (let depth = 0; depth < 3 && cur && cur !== document.body; depth += 1) {
      const style = window.getComputedStyle(cur);
      const rect = cur.getBoundingClientRect();
      const overflowsY = cur.scrollHeight > cur.clientHeight + 2;
      const tightClip =
        (style.overflowY === "hidden" || style.overflowY === "clip" || style.overflow === "hidden") &&
        rect.height > 0 &&
        rect.height < 44;
      if (overflowsY || tightClip) {
        cur.setAttribute("data-hcfy-rail-expand", "1");
        this.expandedEls.add(cur);
      }
      cur = cur.parentElement;
    }
  }

  isRailOverflowing(railEl, members) {
    if (this.rubyRails.has(railEl)) return true;

    const railRect = railEl.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
    const rightBound = Math.min(railRect.right, vw);

    // 1. Direct horizontal scroll overflow on rail container
    if (railEl.scrollWidth > railEl.clientWidth + 4) {
      return true;
    }

    // 2. Overflow on enclosing header/bar containers (up to 3 ancestors)
    let anc = railEl.parentElement;
    for (let depth = 0; depth < 3 && anc && anc !== document.body; depth += 1) {
      const aRect = anc.getBoundingClientRect();
      if (aRect.height <= 120 && anc.scrollWidth > anc.clientWidth + 6) {
        return true;
      }
      anc = anc.parentElement;
    }

    // 3. Any interactive/tab item inside rail pushed past right boundary or viewport (e.g., Health pushed off-screen!)
    const railItems = railEl.querySelectorAll("a, button, [role='tab'], [role='menuitem']");
    for (const item of railItems) {
      const itemStyle = window.getComputedStyle(item);
      if (itemStyle.display === "none" || itemStyle.visibility === "hidden") continue;
      const ir = item.getBoundingClientRect();
      if (ir.width < 1 || ir.height < 1) continue;
      if (ir.right > rightBound + 4) {
        return true;
      }
    }

    // 4. Document-level horizontal overflow caused by this rail
    if (
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 8 &&
      railRect.right >= vw - 16
    ) {
      return true;
    }

    // 5. Inline translations inside the rail forced awkward 2-line wrapping or squeezed items
    let wrappedCount = 0;
    for (const node of members) {
      const root = node.rootNode;
      if (!(root instanceof Element)) continue;
      const resEl = root.querySelector(":scope > hcfy-result");
      if (!resEl) continue;
      const resRect = resEl.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      if (resRect.height > 1 && rootRect.height > 1) {
        const fontSize = parseFloat(window.getComputedStyle(root).fontSize) || 14;
        if (rootRect.height > fontSize * 2.25 && resRect.top > rootRect.top + fontSize * 0.85) {
          wrappedCount += 1;
        }
      }
    }
    if (wrappedCount >= 2) {
      return true;
    }

    return false;
  }

  solve() {
    if (this.destroyed) return;
    const groups = this.getTranslatorGroups();
    if (!groups) return;

    const railMap = new Map();
    for (const group of groups.values()) {
      for (const node of group.translateNodes) {
        if (node.destroyed || node.sameAsSource || !node.translated) continue;
        if (node.showType !== ShowType.both) continue;
        if (node.innerText.length > 36) continue;
        const root = node.rootNode;
        if (!(root instanceof Element) || !root.isConnected) continue;
        if (root.closest("p, blockquote, article > div > a")) continue;

        const rail = findRailCandidate(root);
        if (!rail) continue;
        let list = railMap.get(rail);
        if (!list) {
          list = [];
          railMap.set(rail, list);
        }
        list.push(node);
      }
    }

    for (const [railEl, members] of railMap.entries()) {
      if (members.length < 3) continue;

      // Verify members form a horizontal row (not a vertical sidebar menu!)
      const rects = members
        .map((n) => n.rootNode.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0);
      if (rects.length < 3) continue;
      const xs = rects.map((r) => r.left);
      const ys = rects.map((r) => (r.top + r.bottom) / 2);
      const xSpread = Math.max(...xs) - Math.min(...xs);
      const ySpread = Math.max(...ys) - Math.min(...ys);
      // Must be predominantly horizontal (wider than tall)
      if (xSpread < 140 || ySpread > 85 || xSpread < ySpread * 1.8) {
        continue;
      }

      if (this.isRailOverflowing(railEl, members)) {
        const eligible = members.filter((node) => !hasLeadingIconElement(node.rootNode));
        if (eligible.length < 3 || eligible.length < members.length * 0.5) {
          continue;
        }
        railEl.setAttribute("data-hcfy-rail", "ruby");
        this.rubyRails.set(railEl, members);
        for (const node of eligible) {
          this.applyRubyToNode(node);
        }
        this.ensureRailVerticalRoom(railEl);
      }
    }
  }

  resetAll() {
    for (const railEl of this.rubyRails.keys()) {
      railEl.removeAttribute("data-hcfy-rail");
    }
    this.rubyRails.clear();
    for (const host of this.rubyHosts) {
      host.removeAttribute("data-hcfy-ruby-host");
    }
    this.rubyHosts.clear();
    for (const el of this.expandedEls) {
      el.removeAttribute("data-hcfy-rail-expand");
    }
    this.expandedEls.clear();
  }

  destroy() {
    this.destroyed = true;
    if (this.rafId != null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    window.removeEventListener("resize", this.onResize);
    this.resetAll();
  }
}
