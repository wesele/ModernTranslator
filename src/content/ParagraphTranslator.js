import * as mod_62337 from "./webpageTranslateDom.js";
import _A_97519 from "dompurify";
import { a as i } from "../shared/constants/showType.js";
const { sanitize: o } = _A_97519;
class a {
  inited = false;
  valid = true;
  isOnlyChild = false;
  destroyed = false;
  innerText = "";
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
      (this.#e = new mod_62337.HT()),
      (this.#e.props.editable = null != r?.editable && r.editable),
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
        const t = e.trim();
        return !!t && !/^[0-9\s.\-_#:()!•+~@$%^&*\n/`]+$/.test(t);
      })(this.innerText)),
      this.valid || this.destroy(),
      (this.inited = true));
  }
  calcInnerText() {
    const { sourceNodes: e, rootNode: t } = this;
    let n;
    if (this.isOnlyChild) {
      const e = this.showType;
      (this.switchShowType(i.source),
        (n = (function (e) {
          if (e instanceof HTMLElement) return e.innerText;
          const t = document.createElement("hcfy-result");
          (Array.from(e.childNodes).forEach((e) => {
            t.appendChild(e);
          }),
            e.appendChild(t));
          const n = t.innerText;
          return (
            e.removeChild(t),
            Array.from(t.childNodes).forEach((t) => {
              e.appendChild(t);
            }),
            n
          );
        })(t).trim()),
        this.switchShowType(e));
    } else {
      const t = document.createElement("span");
      (e.forEach((e) => {
        t.appendChild(e);
      }),
        document.documentElement.appendChild(t),
        (n = t.innerText.trim()),
        document.documentElement.removeChild(t),
        this.showType !== i.result && this.appendSourceNodes());
    }
    this.innerText = n;
  }
  setOnlyChild() {
    if (this.destroyed) return;
    const { rootNode: e } = this;
    ((this.isOnlyChild = true),
      this.inited && this.calcInnerText(),
      e instanceof Element &&
        ("span" === e.nodeName.toLowerCase() ||
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
    });
  }
  async translate() {
    if ((this.inited || this.init(), this.destroyed || !this.innerText)) return;
    if (this.translating || this.translated) return;
    let e;
    this.translating = true;
    this.hasStreamOutput = false;
    try {
      e = await this.translateFn(this.innerText, (partial) => this.onStreamChunk(partial));
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
