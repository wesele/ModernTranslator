import * as React from "react";
import * as mod_72531 from "../shared/utils/InteractionModeEngine.js";
import classNames from "classnames";
import {
  Classes,
  ResizeSensor,
  AnchorButton,
  Icon,
  Popover,
  Collapse,
  NonIdealState,
  Menu,
  OverlayToaster,
} from "@blueprintjs/core";
import { usePopper } from "react-popper";
import * as mod_46250 from "../shared/utils/popperMaxSize.js";
import interact from "interactjs";
import * as mod_25148 from "../shared/hooks/useStorage.js";
import pick from "lodash/pick";
import * as mod_16224 from "../shared/constants/defaults.js";
import createDebug from "debug";
import * as mod_93963 from "../shared/hooks/useDeepCompareEffect.js";
import deepEqual from "fast-deep-equal";
import * as mod_64795 from "../shared/hooks/useOverflow.js";
import * as mod_68046 from "../shared/dom/getScrollbarSize.js";
import * as mod_54449 from "../components/TranslateResultList.jsx";
import last from "lodash/last";
import noop from "lodash/noop";
import * as mod_62269 from "../components/AddApiMenuItems.jsx";
import * as mod_91307 from "../components/TranslatorToolbar.jsx";
import * as mod_81152 from "../shared/hooks/useTranslateResults.js";
import {
  DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY,
  DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY,
  OFFICIAL_LLM_ID,
  filterSelectionAPIs,
  isCustomOpenAIServiceId,
  normalizeLlmConcurrency,
} from "../shared/openaiUtils.js";
import { produce } from "immer";
import { usePrevious } from "react-use";
import {
  SUBTITLE_LEAD_PAD_COUNT,
  formatSubtitleTime,
  pickDefaultSelectedTrackKeys,
  mergeSubtitleTimelineRows,
  findActiveSubtitleIndex,
} from "../shared/subtitleTimeline.js";
import * as mod_66690 from "../services/translators/standardLanguages.js";
import * as mod_81215 from "../shared/utils/textTransform.js";
import * as mod_67116 from "../shared/messaging/index.js";
import * as mod_96538 from "../shared/hooks/useDarkMode.js";
import map from "lodash/map";
import uniqueId from "lodash/uniqueId";
import * as mod_43785 from "./selectionManager.js";
import * as mod_90274 from "../shared/messaging/frameForwarder.js";
import identity from "lodash/identity";
import * as mod_18785 from "../services/translators/index.js";
import _A_27429 from "eventemitter3";
import * as mod_94903 from "./ParagraphTranslator.js";
import {
  computeViewportPriority,
  compareViewportPriority,
  isPlainTxtDocument as Ke,
  TxtPageTranslator as qe,
  WebpageTranslator as dt,
} from "./webpageTranslateEngine.js";
import contentPanelCss from "../styles/contentPanelCss.js";
import classroomCss from "../styles/classroomCss.js";
import * as mod_42631 from "../components/ShadowContainer.jsx";
import { LanguageClassroomModal } from "./LanguageClassroomModal.jsx";
import { mountBilibiliClassroomButton } from "./bilibiliClassroomButton.js";
import { isRtlText } from "../shared/textScript.js";
import {
  isLlmService,
  MAX_LLM_BATCH_BYTES,
  PROMPT_HEADER_BYTE_RESERVE,
  estimateSegmentBytes,
} from "../shared/llmBatchProtocol.js";
import { t as tr, useI18n, getServiceDisplayName } from "../shared/i18n/index.js";
const u = "static" !== getComputedStyle(document.documentElement)?.position;
function f() {
  return {
    edges: {
      left: true,
      right: true,
      bottom: false,
      top: false,
    },
    modifiers: [
      interact.modifiers.restrictSize({
        min: {
          width: 250,
          height: 100,
        },
      }),
    ],
  };
}
function m(e) {
  if (!e || !e.startsWith("translate")) return null;
  const t = e.startsWith("translate3d"),
    n = e.replace("translate" + (t ? "3d" : ""), "").match(/-?\d+(\.\d+)?/g);
  if (!n) return null;
  const s = Number(n[0]),
    r = Number(n[1]);
  return Number.isNaN(s) || Number.isNaN(r)
    ? null
    : {
        x: s,
        y: r,
        is3d: t,
      };
}
function g(e) {
  return `translate${e.is3d ? "3d" : ""}(${Math.round(e.x)}px,${Math.round(e.y)}px${e.is3d ? ",0" : ""})`;
}
function S(e, t) {
  switch (t.type) {
    case "overload":
      return t.payload;
    case "incremental": {
      if (!e || !t.payload.placement) return e;
      const n = m(e.transform);
      if (!n) throw new Error("未解析到箭头的位置信息");
      return (
        t.payload.placement.startsWith("bottom") || t.payload.placement.startsWith("top")
          ? (n.x = n.x - t.payload.x)
          : (t.payload.placement.startsWith("left") || t.payload.placement.startsWith("right")) &&
            (n.y = n.y - t.payload.y),
        {
          ...e,
          transform: g(n),
        }
      );
    }
  }
}
function N(e, t) {
  const n = e.pos;
  switch (t.type) {
    case "setWidth": {
      const n = e.width,
        s = t.payload;
      return n === s
        ? e
        : {
            ...e,
            width: s,
          };
    }
    case "readWidth":
      return (t.payload(e.width), e);
    case "setPosSafe": {
      const { pos: s, containerWidth: r = 0, containerHeight: o = 0 } = t.payload,
        i = mod_64795.D(document.documentElement),
        a = mod_68046.V() || 0;
      let l = s.x;
      const c = l + r - (window.innerWidth - (i.v ? a : 0));
      (c > 0 && (l -= c), l < 0 && (l = 0));
      let d = s.y;
      if (o) {
        const e = d + o - (window.innerHeight - (i.h ? a : 0));
        e > 0 && (d -= e);
      }
      return (
        d < 0 && (d = 0),
        l === n.x && d === n.y
          ? null == e.otherStyles
            ? e
            : {
                ...e,
                otherStyles: null,
              }
          : {
              ...e,
              pos: {
                x: l,
                y: d,
                is3d: n.is3d,
              },
              otherStyles: null,
            }
      );
    }
    case "readPos":
      return (t.payload(e.pos), e);
    case "importPopperStyles": {
      const n = t.payload,
        s = {
          pos: m(n.transform) || {
            x: 0,
            y: 0,
            is3d: false,
          },
          otherStyles: n,
        };
      return deepEqual(s, pick(e, ["pos", "otherStyles"]))
        ? e
        : {
            ...e,
            ...s,
          };
    }
    case "incrementalPos": {
      const { dx: s, dy: r } = t.payload;
      return 0 === s && 0 === r
        ? e
        : {
            ...e,
            pos: {
              x: n.x + s,
              y: n.y + r,
              is3d: n.is3d,
            },
          };
    }
    case "switch2fixed": {
      const { pageXOffset: t, pageYOffset: s } = window,
        r = {
          ...e,
          otherStyles: null,
        };
      return (
        u ||
          (0 === t && 0 === s) ||
          (r.pos = {
            x: n.x - t,
            y: n.y - s,
            is3d: n.is3d,
          }),
        r
      );
    }
    default:
      return e;
  }
}
const L = createDebug("popperContainer"),
  A = pick(mod_16224.g2, ["width", "pinPos", "pinAfterDrag"]),
  I = React.forwardRef(function (e, t) {
    const { pin: n, setPin: r, range: o, show: p, placement: m, setMaxHeight: x, targetRef: w } = e,
      [v, T] = React.useState(false);
    (React.useEffect(() => {
      p && T(false);
    }, [p]),
      React.useEffect(() => {
        n || T(false);
      }, [n]));
    const [C, _] = React.useState(null),
      k = React.useRef(null),
      j = React.useMemo(() => (p && !n && o ? o : null), [o, p, n]),
      [I, P] = React.useReducer(N, {
        width: A.width,
        pos: {
          x: 0,
          y: 0,
          is3d: false,
        },
        otherStyles: null,
      }),
      [O, z] = mod_25148.A(A),
      M = O ? O.width : A.width,
      F = (e) => {
        (L("保存窗口宽度", e),
          z({
            width: e,
          }));
      };
    React.useEffect(() => {
      (L("同步 storage 中的宽度", M),
        P({
          type: "setWidth",
          payload: M,
        }));
    }, [M]);
    const $ = O ? O.pinPos : A.pinPos,
      D = (e) => {
        const t = e && pick(e, ["x", "y"]);
        (L("保存窗口位置", t),
          z({
            pinPos: t,
          }));
      },
      B = () => {
        n
          ? P({
              type: "readPos",
              payload: D,
            })
          : L("保存窗口位置时由于不是 pin 状态，取消保存");
      },
      H = React.useCallback(() => {
        $ &&
          (L("设置窗口位置"),
          P({
            type: "setPosSafe",
            payload: {
              pos: $,
              containerWidth: C?.clientWidth,
              containerHeight: C?.clientHeight,
            },
          }));
      }, [C, $]);
    React.useEffect(() => {
      if (n && p)
        return (
          H(),
          window.addEventListener("resize", H),
          () => {
            window.removeEventListener("resize", H);
          }
        );
    }, [H, n, p]);
    const [W, U] = React.useReducer(S, null),
      {
        realtimePlacement: V,
        updatePopper: Y,
        popperStyles: K,
        popperAttrs: q,
        arrowStyles: X,
        maxSizeObj: Z,
      } = (function (e, t, n, s) {
        const {
          styles: r,
          attributes: o,
          update: i,
          state: a,
        } = usePopper(e, t, {
          placement: s,
          strategy: u ? "fixed" : undefined,
          modifiers: [
            {
              name: "arrow",
              options: {
                element: n,
              },
            },
            {
              name: "computeStyles",
              options: {
                adaptive: false,
              },
            },
            {
              name: "offset",
              options: {
                offset: [0, 12],
              },
            },
            mod_46250.A,
          ],
        });
        return {
          realtimePlacement: (e && a?.placement) || null,
          updatePopper: e ? i : null,
          popperStyles: e ? r.popper : null,
          popperAttrs: e ? o.popper : null,
          arrowStyles: e ? r.arrow : null,
          maxSizeObj: (e && a?.modifiersData.maxSize) || null,
        };
      })(j, C, k.current, m);
    (React.useEffect(() => {
      U({
        type: "overload",
        payload: X,
      });
    }, [X]),
      React.useEffect(() => {
        !n && Z && x(Z.height);
      }, [Z, n, x]),
      mod_93963.A(() => {
        K &&
          (L("导入 popperjs 的样式", K),
          P({
            type: "importPopperStyles",
            payload: K,
          }));
      }, [K]));
    const J = (function (e, t, n, r) {
      const [o, i] = React.useState(null),
        [a, l] = React.useState(false);
      return (
        React.useEffect(() => {
          if (!e) return;
          const t = interact(e);
          return (
            t.resizable({
              ...f(),
              onstart() {
                l(true);
              },
            }),
            i(t),
            () => {
              (t.unset(), i(null));
            }
          );
        }, [e]),
        React.useEffect(() => {
          if (!o) return;
          let e;
          if (t) {
            const n = t.indexOf("-");
            switch (((e = n > 0 ? t.slice(0, n) : t), e)) {
              case "top":
                e = "bottom";
                break;
              case "bottom":
                e = "top";
                break;
              case "left":
                e = "right";
                break;
              case "right":
                e = "left";
            }
            if ("top" === e || "bottom" === e) return;
          }
          const n = f();
          (e && (n.edges[e] = false),
            o.set({
              resize: n,
            }));
        }, [t, o]),
        React.useEffect(() => {
          if (!o) return;
          const e = function (e) {
            n(e.rect.width, e.deltaRect.left, e.deltaRect.top);
          };
          return (
            o.on("resizemove", e),
            () => {
              o.off("resizemove", e);
            }
          );
        }, [n, o]),
        React.useEffect(() => {
          if (!o) return;
          const e = function () {
            (l(false), r());
          };
          return (
            o.on("resizeend", e),
            () => {
              o.off("resizeend", e);
            }
          );
        }, [o, r]),
        a
      );
    })(
      C,
      V,
      (e, t, n) => {
        (P({
          type: "setWidth",
          payload: e,
        }),
          P({
            type: "incrementalPos",
            payload: {
              dx: t,
              dy: n,
            },
          }),
          U({
            type: "incremental",
            payload: {
              x: t,
              y: n,
              placement: V,
            },
          }));
      },
      () => {
        (P({
          type: "readWidth",
          payload: F,
        }),
          B());
      }
    );
    (!(function (e, t, n, r, o) {
      const [i, a] = React.useState(null),
        [l, c] = React.useState(false);
      (React.useEffect(() => {
        if (!e) return;
        const n = e.querySelector(t);
        if (!n)
          return void console.warn("未找到 selector “" + t + "”对应的元素，将不会启动拖拽功能。");
        const s = interact(n);
        return (
          s.draggable(true).styleCursor(false),
          a(s),
          () => {
            (s.unset(), a(null));
          }
        );
      }, [e, t]),
        React.useEffect(() => {
          if (!i) return;
          const e = () => {
            (c(true), n());
          };
          return (
            i.on("dragstart", e),
            () => {
              i.off("dragstart", e);
            }
          );
        }, [i, n]),
        React.useEffect(() => {
          if (!i) return;
          const e = (e) => {
            r(e.dx, e.dy);
          };
          return (
            i.on("dragmove", e),
            () => {
              i.off("dragmove", e);
            }
          );
        }, [i, r]),
        React.useEffect(() => {
          if (!i) return;
          const e = () => {
            (c(false), o());
          };
          return (
            i.on("dragend", e),
            () => {
              i.off("dragend", e);
            }
          );
        }, [i, o]));
    })(
      C,
      ".drag-block",
      React.useCallback(() => {
        (T(true),
          (null == O?.pinAfterDrag ? A.pinAfterDrag : O.pinAfterDrag) &&
            r(
              (e) => (
                e ||
                  (L("拖拽过程中将窗口转为固定模式位置"),
                  P({
                    type: "switch2fixed",
                  })),
                true
              )
            ));
      }, [r, O?.pinAfterDrag]),
      (e, t) => {
        P({
          type: "incrementalPos",
          payload: {
            dx: e,
            dy: t,
          },
        });
      },
      () => {
        B();
      }
    ),
      React.useImperativeHandle(t, () => ({
        switch2pin() {
          (L("主动调用 switch2pin 方法转为固定模式"),
            P({
              type: "switch2fixed",
            }),
            B());
        },
        clearPos() {
          (L("由于转为了非固定模式，所以清空了 storage 里的位置"),
            D(null),
            window.setTimeout(() => {
              Y && Y();
            }));
        },
      })));
    const G = React.useMemo(() => {
      const e = {
        ...I.otherStyles,
        width: I.width,
        transform: g(I.pos),
      };
      return (L("合成 container 样式", e), e);
    }, [I]);
    return (
      <div
        id="popper-container"
        ref={_}
        style={G}
        {...q}
        className={classNames(
          {
            show: p,
            pin: n,
          },
          Classes.ELEVATION_4
        )}
      >
        <ResizeSensor
          onResize={() => {
            n && p && !J && H();
          }}
          targetRef={w}
        >
          {e.children}
        </ResizeSensor>
        {!v && <div className="arrow" ref={k} style={W || undefined} />}
      </div>
    );
  });
const ae = pick(
    mod_16224.g2,
    "secondDestinationLatestSource",
    "selectedAPIs",
    "collapsedAPIs",
    "source",
    "destination",
    "autoPlay",
    "autoCopy",
    "recentUseLangFrom",
    "recentUseLangTo",
    "sourceTransformNCaml",
    "sourceTransformNoBr",
    "sourceTransformNoComment",
    "sourceLower",
    "sourceTransformRegExps",
    "tipPanelSettingsClosed",
    "panelCustomStyle",
    "customAPINames",
    "customOpenAIServices",
    "panelSize"
  ),
  ce = {
    small: 14,
    middle: 18,
    large: 22,
  },
  Comp_De = React.forwardRef(function (e, t) {
    const {
        headerLeft: r,
        headerRight: o,
        extendOptions: i,
        size: c = "small",
        style: d,
        hasDragTip: u,
        portalContainer: p,
        showOptionsTip: h = true,
        onTranslate: f,
        elementRef: m,
      } = e,
      [g, x, w] = mod_25148.A(ae),
      S = React.useMemo(() => {
        const apis = g?.selectedAPIs;
        if (!apis) return;
        return filterSelectionAPIs(apis, g?.customOpenAIServices);
      }, [g?.customOpenAIServices, g?.selectedAPIs]),
      E = React.useMemo(() => {
        const e = g?.collapsedAPIs;
        return e && e.length
          ? produce(S, (t) => {
              t &&
                e.forEach((e) => {
                  const n = t.indexOf(e);
                  n >= 0 && t.splice(n, 1);
                });
            })
          : S;
      }, [S, g?.collapsedAPIs]),
      _ = g || ae,
      k = ce[c],
      j = "small" === c,
      N = "large" === c,
      L = g?.source || "",
      A = React.useCallback(
        (e) => {
          x({
            source: e,
          });
        },
        [x]
      ),
      [I, H] = React.useState(""),
      [U, de] = React.useState(""),
      ue = I === U,
      pe = React.useRef(null),
      [he, fe] = React.useState(false),
      [sourceCopied, setSourceCopied] = React.useState(false),
      {
        results: me,
        queryResult: ge,
      } = mod_81152.L(U, E, L, g?.destination, f),
      [xe, be] = React.useState([]),
      {
        sourceTransformNCaml: Ee,
        sourceTransformNoBr: Ce,
        sourceTransformNoComment: _e,
        sourceLower: ke,
        sourceTransformRegExps: je,
      } = pick(g || ae, [
        "sourceTransformNCaml",
        "sourceTransformNoBr",
        "sourceTransformNoComment",
        "sourceLower",
        "sourceTransformRegExps",
      ]),
      Ne = React.useRef(""),
      Re = React.useCallback(
        (e) => {
          if (e === Ne.current) return;
          ((Ne.current = e),
            be((e) =>
              produce(e, (e) => {
                e.splice(0);
              })
            ));
          const t = mod_81215.W(e, {
            sourceTransformNCaml: Ee,
            sourceTransformNoBr: Ce,
            sourceTransformNoComment: _e,
            sourceLower: ke,
            sourceTransformRegExps: je,
          });
          (H(t), de(t));
        },
        [Ee, Ce, _e, ke, je]
      ),
      Le = React.useRef(Re);
    Le.current = Re;
    const Ae = usePrevious(U);
    React.useEffect(() => {
      setSourceCopied(false);
    }, [U]);
    (React.useEffect(() => {
        _.secondDestinationLatestSource &&
          Ae !== U &&
          U &&
          mod_66690.o(U).then((e) => {
            null != e &&
              "中文(简体)" !== e &&
              chrome.storage.local.set({
                latestSource: e,
              });
          });
      }, [U, _.secondDestinationLatestSource]),
      React.useImperativeHandle(
        t,
        () => ({
          select() {
            pe.current?.select();
          },
          async play() {
            if (!S) return;
            const e = S[0],
              t = me.results[e]?.result;
            return e && t?.text === Ne.current
              ? mod_54449.Z({
                  apiId: e,
                  source: t.from,
                  text: t.text,
                  ttsURI: t.phonetic?.[0].ttsURI || t.ttsURI,
                })
              : undefined;
          },
          async setText(e) {
            await w;
            if ("text" === e.type) H(e.text);
          },
          async translate(e, t) {
            await w;
            if ("text" === e.type) {
              Le.current(e.text);
              if (t) this.select();
            }
          },
        }),
        [w, me.results, S]
      ));
    const { t: trLocal } = useI18n();
    const Pe = (
        <AnchorButton
          icon={<Icon icon="cog" size={k} />}
          small={j}
          large={N}
          minimal
          active={he}
          className="settings"
          onClick={() => {
            fe((e) => !e);
          }}
          title={trLocal("content.quickSettings")}
        />
      );
    return (
      <>
        {g?.panelCustomStyle && (
          <style>
            {g.panelCustomStyle
              .replace(/bp3/g, "bp4")
              .replace(/bp4/g, "bp5")
              .replace(/bp5/g, "bp6")}
          </style>
        )}
        <div id="translate-panel" className={"size-" + c} style={d} ref={m}>
          <div className="fixed">
            <div className="header">
              <div className="left">
                {r}
              </div>
              <div className="drag-block" title={u ? trLocal("content.dragTip") : undefined}>
                <span className="drag-pill" aria-hidden="true" />
              </div>
              <div className="right">
                {!!xe.length && (
                  <AnchorButton
                    icon={<Icon icon="undo" size={k} />}
                    small={j}
                    large={N}
                    minimal
                    title={trLocal("content.backPrev")}
                    onClick={() => {
                      const e = last(xe);
                      (e && (H(e), de(e)),
                        be((e) =>
                          produce(e, (e) => {
                            e.pop();
                          })
                        ));
                    }}
                  />
                )}
                {g && (
                  <>
                    {g.tipPanelSettingsClosed && Pe}
                    {!g.tipPanelSettingsClosed && (
                      <Popover
                        enforceFocus={false}
                        content={
                          <div
                            className={Classes.TEXT_SMALL}
                            style={{
                              width: "210px",
                              padding: "8px 10px",
                            }}
                          >
                            {trLocal("content.quickTipText")}{" "}
                            <a
                              onClick={() => {
                                x({
                                  tipPanelSettingsClosed: true,
                                });
                              }}
                            >
                              {trLocal("content.dontShowAgain")}
                            </a>
                          </div>
                        }
                        canEscapeKeyClose={false}
                        isOpen={!g.tipPanelSettingsClosed && h}
                        portalContainer={p}
                      >
                        {Pe}
                      </Popover>
                    )}
                  </>
                )}
                {o}
              </div>
            </div>
            <Collapse isOpen={he} keepChildrenMounted>
              <mod_91307.A
                source={L}
                setSource={A}
                options={g}
                setOptions={x}
                size={c}
                portalContainer={p}
              >
                {i}
              </mod_91307.A>
            </Collapse>
            {U && (
              <div className="source-preview">
                <span className="source-preview-text" title={U}>
                  {U}
                </span>
                <button
                  type="button"
                  className={classNames("source-copy-btn", {
                    "is-copied": sourceCopied,
                  })}
                  title={trLocal("content.copySource")}
                  onClick={() => {
                    mod_67116
                      ._({
                        action: "write to clipboard",
                        text: U,
                      })
                      .then((ok) => {
                        if (ok) {
                          setSourceCopied(true);
                          window.setTimeout(() => setSourceCopied(false), 1200);
                        }
                      })
                      .catch(noop);
                  }}
                >
                  <Icon icon={sourceCopied ? "tick" : "duplicate"} size={12} />
                </button>
              </div>
            )}
          </div>
          <div
            className="body"
            style={
              ue
                ? undefined
                : {
                    opacity: 0.7,
                  }
            }
          >
            {!U && <div className="empty-state">{trLocal("content.emptySelection")}</div>}
            {U &&
              g &&
              S?.map((e, t) => {
                const n = me.results[e];
                return (
                  <mod_54449.A
                    portalContainer={p}
                    apiId={e}
                    result={n}
                    size={c}
                    queryResult={(t) => {
                      ge(U, e, t || L);
                    }}
                    autoPlay={g.autoPlay && 0 === t}
                    autoCopy={g.autoCopy && 0 === t}
                    setQuery={(e) => {
                      (be((e) =>
                        produce(e, (e) => {
                          e.push(U);
                        })
                      ),
                        de(e),
                        H(e));
                    }}
                    collapse={g.collapsedAPIs.includes(e)}
                    onCollapseChange={() => {
                      x((t) => {
                        const n = t.collapsedAPIs.indexOf(e);
                        n >= 0 ? t.collapsedAPIs.splice(n, 1) : t.collapsedAPIs.push(e);
                      });
                    }}
                    key={e}
                  />
                );
              })}
            {S && !S.length && (
              <NonIdealState
                className="no-api"
                title={trLocal("content.allHiddenTitle")}
                description={trLocal("content.allHiddenDesc")}
                action={
                  <Popover
                    portalContainer={p}
                    content={
                      <Menu>
                        <mod_62269.A />
                      </Menu>
                    }
                  >
                    <AnchorButton icon="add" small={j} large={N} text={trLocal("content.addEngine")} />
                  </Popover>
                }
              />
            )}
          </div>
        </div>
      </>
    );
  }),
  ue = function (e) {
    e.preventDefault();
  },
  pe = pick(mod_16224.g2, [
    "buttonAutoClose",
    "buttonHover",
    "buttonOffsetTop",
    "buttonOffsetLeft",
  ]);
function Comp_He(e) {
  const { btnPos: t, setBtnPos: n, onBtnClick: r } = e,
    o = t ? "show" : undefined,
    [i] = mod_25148.A(pe),
    a = React.useRef(),
    [l, c] = React.useState(false),
    d = t
      ? {
          transform: `translate(${t.x + 10 - (i?.buttonOffsetLeft || 0)}px,${t.y + 10 - (i?.buttonOffsetTop || 0)}px)`,
        }
      : undefined;
  return (
    React.useEffect(() => {
      if (!i?.buttonAutoClose) return (c(false), void window.clearTimeout(a.current));
      t
        ? l
          ? window.clearTimeout(a.current)
          : (a.current = window.setTimeout(() => {
              n(null);
            }, 2e3))
        : (c(false), window.clearTimeout(a.current));
    }, [t, l, n, i?.buttonAutoClose]),
    (
      <div
        id="translate-btn"
        className={o}
        style={d}
        onPointerDown={ue}
        onPointerEnter={() => {
          (c(true), i?.buttonHover && r());
        }}
        onPointerLeave={() => {
          c(false);
        }}
      >
        <AnchorButton icon={<span className="btn-icon" />} onClick={r} />
      </div>
    )
  );
}
function ge(e) {
  const t = e.match(/^(([^:]+):\/\/)?([^/]+)?(\/.*)?$/);
  if (!t) return;
  let n = t[3] || "";
  const s = n.indexOf(":");
  s >= 0 && (n = n.slice(0, s));
  let r = t[4] || "";
  const o = r.indexOf("#");
  if ((o >= 0 && (r = r.slice(0, o)), !n.startsWith("."))) {
    if (!r) {
      if (!n) return;
      r = "/";
    }
    return {
      host: n,
      path: r,
    };
  }
}
function ye(e, t) {
  return new RegExp(
    "^" +
      e
        .replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&")
        .replace("*", ".*")
        .replace(/^\.\*\\\./, "(.*\\.)?") +
      "$"
  ).test(t);
}
function xe(e, t) {
  return new RegExp(
    "^" + e.replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&").replace(/\*/g, ".*") + "$"
  ).test(t);
}
function be(e, t, n) {
  let s, r;
  s = "string" == typeof e ? ge(e) : e;
  let o = false,
    i = false;
  if (s) {
    const e = (e) => {
      const t = (function (e, t) {
        let n;
        if (((n = "string" == typeof t ? ge(t) : t), n))
          return ye(e.host, n.host) && xe(e.path, n.path);
      })(e, s);
      return (t && (r = e), t);
    };
    ((o = n.some(e)), o || (i = t.some(e)));
  }
  return {
    urlParts: s,
    matchedRule: r,
    whiteListMatched: o,
    blackListMatched: i,
  };
}
const Re = createDebug("detector master");
function Le(e) {
  const t = e.selection;
  let n = null;
  if (t) {
    const s = t.text,
      r = t.event;
    let o, i, a;
    if ("function" == typeof t.rect)
      ((o = t.rect()),
        (i = {
          getBoundingClientRect: t.rect,
        }),
        (a = r
          ? {
              x: r.clientX + e.path[0].scrollLeft,
              y: r.clientY + e.path[0].scrollTop,
            }
          : null));
    else {
      a = r
        ? {
            x: r.clientX,
            y: r.clientY,
          }
        : null;
      const n = e.path;
      ((o = pick(t.rect, ["top", "left", "width", "height", "right", "bottom"])),
        map(n, (e) => {
          if (e.rect && e.computedStyles) {
            const t = e.rect.left + e.computedStyles.paddingLeft + e.computedStyles.borderLeftWidth,
              n = e.rect.top + e.computedStyles.paddingTop + e.computedStyles.borderTopWidth;
            ((o.left += t), (o.top += n), a && ((a.x += t), (a.y += n)));
          }
        }),
        (o.right = o.left + o.width),
        (o.bottom = o.top + o.height),
        (i = {
          getBoundingClientRect: () => o,
        }));
      const s = last(e.path);
      a = a
        ? {
            x: a.x + s.scrollLeft,
            y: a.y + s.scrollTop,
          }
        : null;
    }
    n = {
      text: s,
      mouseUpEvent: r,
      multiClick: t.multiClick,
      isTop: t.isTop,
      isInTextarea: t.isInTextarea,
      isInContentEditable: t.isInContentEditable,
      range: i,
      btnPos: a,
    };
  }
  return {
    parsedData: n,
    activeFrameIndex: e.path.map((e) => e.frameIndex),
  };
}
const LLM_BATCH_PAYLOAD_LIMIT = MAX_LLM_BATCH_BYTES - PROMPT_HEADER_BYTE_RESERVE;
const NATIVE_BATCH_APIS = new Set(["GoogleWeb", "Microsoft"]);
const NATIVE_BATCH_MAX_ITEMS = 20;
const NATIVE_BATCH_MAX_CHARS = 2500;

class Ve extends _A_27429 {
  stream = [];
  streamBytes = 0;
  queue = [];
  handling = false;
  activeCount = 0;
  activePorts = new Set();
  destroyed = false;
  flushTimer = null;
  maxWaitTimer = null;
  constructor(e, t) {
    super();
    this.apiCode = e;
    this.options = t;
    this.isLlm = isLlmService(e);
    this.isNativeBatch = NATIVE_BATCH_APIS.has(e);
    const llmCfg = t?.llmConfig || {};
    this.llmBatchEnabled = llmCfg.batchEnabled !== false;
    const rawLimit = Number(llmCfg.batchMaxBytes);
    const maxBytes = Number.isFinite(rawLimit) && rawLimit >= 500 ? rawLimit : MAX_LLM_BATCH_BYTES;
    const headerReserve = Math.min(PROMPT_HEADER_BYTE_RESERVE, Math.floor(maxBytes * 0.25));
    this.llmPayloadLimit = Math.max(400, maxBytes - headerReserve);
    this.llmStreamEnabled = llmCfg.streamEnabled !== false;
    const defaultConcurrency =
      e === OFFICIAL_LLM_ID
        ? DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY
        : DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY;
    this.llmMaxConcurrency = normalizeLlmConcurrency(llmCfg.maxConcurrency, defaultConcurrency);
    this.llmServiceName = llmCfg.serviceName || "";
  }
  getServiceDisplayName() {
    if (this.llmServiceName) return this.llmServiceName;
    return getServiceDisplayName(this.apiCode) || mod_18785.v.find((svc) => svc.id === this.apiCode)?.name || this.apiCode;
  }
  prefixError(err) {
    if (!err) return err;
    const msg = err.message || tr("content.translateFailed");
    if (!msg.startsWith("【")) {
      err.message = `【${this.getServiceDisplayName()}】${msg}`;
    }
    return err;
  }
  clearTimers() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
  }
  flushStream() {
    this.clearTimers();
    if (!this.stream.length) return;
    this.queue.push(this.stream);
    this.stream = [];
    this.streamBytes = 0;
    this.handleTask();
  }
  addStream(e) {
    if (this.destroyed) return;
    const text = e.text;
    const charLen = text.length;
    if (!charLen) return;

    if (this.isLlm) {
      if (!this.llmBatchEnabled) {
        this.queue.push([e]);
        this.handleLlmBatchTasks();
        return;
      }
      const nextIndex = this.stream.length;
      const segBytes = estimateSegmentBytes(nextIndex, text);
      if (this.stream.length > 0 && this.streamBytes + segBytes > this.llmPayloadLimit) {
        this.flushStream();
      }
      this.stream.push(e);
      this.streamBytes += estimateSegmentBytes(this.stream.length - 1, text);

      if (this.streamBytes >= this.llmPayloadLimit) {
        this.flushStream();
        return;
      }

      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => {
        this.flushStream();
      }, 60);
      if (!this.maxWaitTimer) {
        this.maxWaitTimer = setTimeout(() => {
          this.flushStream();
        }, 160);
      }
      return;
    }

    if (this.isNativeBatch) {
      if (
        this.stream.length >= NATIVE_BATCH_MAX_ITEMS ||
        (this.stream.length > 0 && this.streamBytes + charLen > NATIVE_BATCH_MAX_CHARS)
      ) {
        this.flushStream();
      }
      this.stream.push(e);
      this.streamBytes += charLen;
      if (this.stream.length >= NATIVE_BATCH_MAX_ITEMS || this.streamBytes >= NATIVE_BATCH_MAX_CHARS) {
        this.flushStream();
        return;
      }
      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => {
        this.flushStream();
      }, 150);
      return;
    }

    if (this.stream.length > 0 && this.streamBytes + charLen > 3e3) {
      this.flushStream();
    }
    this.stream.push(e);
    this.streamBytes += charLen;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushStream();
    }, 300);
  }
  translateSingleFallback(item) {
    mod_67116
      ._({
        action: "translate",
        data: {
          apiCode: this.apiCode,
          source: this.options.source,
          destinations: this.options.dest,
          text: item.text,
        },
      })
      .then(
        (res) => {
          if (this.destroyed) return;
          if (res?.error) {
            item.reject(this.prefixError(res.error));
            return;
          }
          const out = res?.result
            ? res.result.join("\n")
            : (res?.dict?.[0]?.terms?.[0] ?? "");
          item.resolve(out);
        },
        (err) => {
          if (!this.destroyed) item.reject(this.prefixError(err));
        }
      );
  }
  popNextBatch() {
    if (this.queue.length <= 1) {
      return this.queue.shift();
    }
    let bestIndex = 0;
    let bestScore = null;
    for (let i = 0; i < this.queue.length; i += 1) {
      const batch = this.queue[i];
      let batchBest = [3, Number.MAX_SAFE_INTEGER];
      for (const item of batch) {
        const score = item.targetNode
          ? computeViewportPriority(item.targetNode)
          : [2, Number.MAX_SAFE_INTEGER - 1];
        if (compareViewportPriority(score, batchBest) < 0) {
          batchBest = score;
        }
      }
      if (!bestScore || compareViewportPriority(batchBest, bestScore) < 0) {
        bestScore = batchBest;
        bestIndex = i;
      }
    }
    return this.queue.splice(bestIndex, 1)[0];
  }
  handleTask() {
    if (this.destroyed) return;
    if (this.isLlm) {
      this.handleLlmBatchTasks();
      return;
    }
    if (this.handling) return;
    let e = this.popNextBatch();
    if (!e) {
      if (!this.stream.length) return;
      e = this.stream;
      this.stream = [];
      this.streamBytes = 0;
    }
    this.handling = true;
    this.emit("translate-before");

    if (this.isNativeBatch) {
      mod_67116
        ._({
          action: "translate batch texts",
          data: {
            apiCode: this.apiCode,
            source: this.options.source,
            destinations: this.options.dest,
            texts: e.map((item) => item.text),
          },
        })
        .finally(() => {
          this.emit("translate-after");
          this.handling = false;
        })
        .then(
          (res) => {
            if (this.destroyed) return;
            if (res?.error) {
              const err = this.prefixError({ ...res.error });
              e.forEach((item) => item.reject(err));
              return;
            }
            const results = Array.isArray(res?.results) ? res.results : [];
            e.forEach((item, idx) => {
              if (idx < results.length && results[idx] != null) {
                item.resolve(results[idx]);
              } else {
                this.translateSingleFallback(item);
              }
            });
          },
          (err) => {
            if (!this.destroyed) {
              e.forEach((item) => item.reject(this.prefixError(err)));
            }
          }
        )
        .then(() => {
          this.handleTask();
        });
      return;
    }

    const t = [],
      n = [];
    e.forEach((item) => {
      const s = item.text
        .split("\n")
        .map((line) => line.trim())
        .filter(identity);
      n.push({
        start: t.length,
        end: t.length + s.length,
      });
      t.push(...s);
    });
    mod_67116
      ._({
        action: "translate",
        data: {
          apiCode: this.apiCode,
          source: this.options.source,
          destinations: this.options.dest,
          text: t.join("\n"),
        },
      })
      .finally(() => {
        this.emit("translate-after");
        this.handling = false;
      })
      .then(
        (res) => {
          if (this.destroyed) return;
          let s;
          if (res.result) s = res.result;
          else {
            const firstTerm = res.dict?.[0]?.terms?.[0];
            firstTerm && (s = [firstTerm]);
          }
          const r = res.error;
          r?.message && (r.message = `【${this.getServiceDisplayName()}】${r.message}`);
          e.forEach((item, idx) => {
            if (r) return void item.reject(r);
            if (!s) return void item.reject(new Error(tr("content.noBatchResult")));
            const o = n[idx],
              i = o.end - o.start,
              a = s.slice(o.start, o.end);
            if (a.length === i) {
              item.resolve(a.join("\n"));
            } else {
              this.translateSingleFallback(item);
            }
          });
        },
        (err) => {
          if (!this.destroyed) {
            e.forEach((item) => item.reject(this.prefixError(err)));
          }
        }
      )
      .then(() => {
        this.handleTask();
      });
  }
  handleLlmBatchTasks() {
    while (!this.destroyed && this.activeCount < this.llmMaxConcurrency) {
      let batch = this.popNextBatch();
      if (!batch) {
        if (!this.stream.length) break;
        batch = this.stream;
        this.stream = [];
        this.streamBytes = 0;
        this.clearTimers();
      }
      this.runLlmBatch(batch);
    }
  }
  runLlmBatch(batch) {
    if (this.destroyed || !batch.length) return;
    if (this.activeCount === 0) {
      this.emit("translate-before");
    }
    this.activeCount += 1;

    const settled = new Array(batch.length).fill(false);
    let finished = false;
    let port = null;

    const finalizePort = () => {
      if (finished) return;
      finished = true;
      if (port) {
        this.activePorts.delete(port);
        try {
          port.disconnect();
        } catch {
          // ignore
        }
      }
      this.activeCount = Math.max(0, this.activeCount - 1);
      if (this.activeCount === 0) {
        this.emit("translate-after");
      }
      if (!this.destroyed) {
        this.handleLlmBatchTasks();
      }
    };

    try {
      port = chrome.runtime.connect({ name: "ndt-llm-batch-stream" });
    } catch (err) {
      batch.forEach((item) => item.reject(err));
      finalizePort();
      return;
    }

    this.activePorts.add(port);

    port.onMessage.addListener((msg) => {
      if (this.destroyed || !msg) return;
      switch (msg.type) {
        case "delta": {
          const item = batch[msg.index];
          if (item && !settled[msg.index]) {
            item.onChunk?.(msg.text);
          }
          break;
        }
        case "item-done": {
          const item = batch[msg.index];
          if (item && !settled[msg.index]) {
            settled[msg.index] = true;
            item.resolve(msg.text);
          }
          break;
        }
        case "done": {
          const results = msg.results || [];
          batch.forEach((item, idx) => {
            if (settled[idx]) return;
            settled[idx] = true;
            if (results[idx] != null) {
              item.resolve(results[idx]);
            } else {
              item.reject(new Error(tr("content.missingSegmentResult")));
            }
          });
          finalizePort();
          break;
        }
        case "error": {
          const err = new Error(msg.error?.message || tr("content.translateFailed"));
          if (msg.error?.link) err.link = msg.error.link;
          batch.forEach((item, idx) => {
            if (settled[idx]) return;
            settled[idx] = true;
            item.reject(err);
          });
          finalizePort();
          break;
        }
      }
    });

    port.onDisconnect.addListener(() => {
      if (!finished && !this.destroyed) {
        const err = new Error(tr("content.streamDisconnected"));
        batch.forEach((item, idx) => {
          if (settled[idx]) return;
          settled[idx] = true;
          item.reject(err);
        });
      }
      finalizePort();
    });

    port.postMessage({
      action: "translate batch stream",
      data: {
        apiCode: this.apiCode,
        source: this.options.source,
        destination: this.options.dest?.[0] || "中文(简体)",
        texts: batch.map((item) => item.text),
        streamEnabled: this.llmStreamEnabled,
      },
    });
  }
  destroy() {
    this.destroyed = true;
    this.clearTimers();
    this.queue = [];
    this.stream = [];
    this.streamBytes = 0;
    for (const port of this.activePorts) {
      try {
        port.disconnect();
      } catch {
        // ignore
      }
    }
    this.activePorts.clear();
    if (this.activeCount > 0) {
      this.activeCount = 0;
      this.emit("translate-after");
    }
  }
}
const ut = pick(mod_16224.g2, ["pageTrsEditable"]);
const Ct = [
    {
      name: "双语",
      value: mod_94903.a.both,
    },
    {
      name: "原文",
      value: mod_94903.a.source,
    },
    {
      name: "译文",
      value: mod_94903.a.result,
    },
  ];
const Pt = createDebug("@hcfyapp/aftr");
class Ot extends _A_27429 {
  constructor() {
    (super(),
      chrome.runtime.onMessage.addListener((e) => {
        if (
          typeof e === "object" &&
          e !== null &&
          "__aftrMessage__" in e &&
          (Pt("收到消息 %o", e), "setMode" === e.__aftrAction__)
        )
          this.emit("change", e.__aftrPayload__);
      }));
  }
  getMode() {
    return chrome.runtime.sendMessage({
      __aftrMessage__: true,
      __aftrAction__: "getMode",
    });
  }
  setMode(e) {
    return chrome.runtime.sendMessage({
      __aftrMessage__: true,
      __aftrAction__: "setMode",
      __aftrPayload__: e,
    });
  }
}
const zt = new Ot();
const $t = {
    ...pick(mod_16224.g2, [
      "pageTrsApi",
      "pageTrsSource",
      "pageTrsDest",
      "officialLLMBatchEnabled",
      "officialLLMBatchMaxBytes",
      "officialLLMStreamEnabled",
      "officialLLMMaxConcurrency",
      "customOpenAIServices",
    ]),
    ...pick(mod_16224.Ne, ["pageTrsType"]),
  },
  Dt = pick(mod_16224.g2, ["pageTrsJumpTwo"]);
function Bt(e) {
  const { open: t, setOpen: n, pos: o = "bottom-right" } = e,
    { mode: i, setMode: a } = (function (e) {
      const [t, n] = React.useState(null),
        r = React.useRef(e);
      return (
        React.useEffect(() => {
          r.current = e;
        }, [e]),
        React.useEffect(() => {
          zt.getMode()
            .then((e) => {
              (n(e), r.current?.(e));
            })
            .catch(() => {});
        }, []),
        React.useEffect(
          () => (
            zt.on("change", n),
            () => {
              zt.off("change", n);
            }
          ),
          []
        ),
        {
          mode: t,
          setMode: React.useCallback((e) => {
            (n(e), zt.setMode(e));
          }, []),
        }
      );
    })((e) => {
      "close" !== e && n(true);
    }),
    [l, c] = React.useState(null),
    d = React.useRef(),
    u = React.useRef(""),
    [p, h] = React.useState(mod_94903.a.both),
    [f, m] = React.useState(""),
    g = React.useCallback((e) => {
      (chrome.storage.local.set({
        pageTrsType: e,
      }),
        h(e),
        d.current
          ? d.current.switchShowType(e)
          : console.warn("不应该在未开启全文翻译时切换显示类型。"));
    }, []),
    [y, x] = React.useState($t.pageTrsSource),
    [b, w] = React.useState($t.pageTrsDest[0]),
    [v, T] = React.useState(false),
    sessionIdRef = React.useRef(0),
    suppressTipRef = React.useRef(false),
    stateRef = React.useRef({
      active: t,
      translating: v,
      showType: p,
      apiCode: f,
      source: y,
      target: b,
    });
  stateRef.current = {
    active: t,
    translating: v,
    showType: p,
    apiCode: f,
    source: y,
    target: b,
  };
  const S = React.useCallback(async () => {
    const currentSession = ++sessionIdRef.current;
    d.current && (d.current.destroy(), (d.current = undefined));
    T(false);
    const {
      pageTrsType: e,
      pageTrsApi: apiCode,
      pageTrsDest: dest,
      pageTrsSource: source,
      officialLLMBatchEnabled,
      officialLLMBatchMaxBytes,
      officialLLMStreamEnabled,
      officialLLMMaxConcurrency,
      customOpenAIServices,
    } = await chrome.storage.local.get($t);
    if (sessionIdRef.current !== currentSession) return;
    h(e);
    m(apiCode);
    w(dest[0]);
    x(source);
    let llmConfig = null;
    if (apiCode === OFFICIAL_LLM_ID) {
      llmConfig = {
        batchEnabled: officialLLMBatchEnabled !== false,
        batchMaxBytes: officialLLMBatchMaxBytes,
        streamEnabled: officialLLMStreamEnabled !== false,
        maxConcurrency: normalizeLlmConcurrency(
          officialLLMMaxConcurrency,
          DEFAULT_OFFICIAL_LLM_MAX_CONCURRENCY
        ),
        serviceName: tr("service.officialLlm"),
      };
    } else if (isCustomOpenAIServiceId(apiCode)) {
      const customSvc = (customOpenAIServices || []).find((item) => item?.id === apiCode);
      if (customSvc) {
        llmConfig = {
          batchEnabled: customSvc.batchEnabled !== false,
          batchMaxBytes: customSvc.batchMaxBytes,
          streamEnabled: customSvc.streamEnabled !== false,
          maxConcurrency: normalizeLlmConcurrency(
            customSvc.maxConcurrency,
            DEFAULT_CUSTOM_LLM_MAX_CONCURRENCY
          ),
          serviceName: customSvc.name || tr("service.customDefault"),
        };
      }
    }
    const r = new Ve(apiCode, {
      dest,
      source,
      llmConfig,
    });
    r.on("translate-before", () => {
      if (sessionIdRef.current === currentSession) T(true);
    });
    r.on("translate-after", () => {
      if (sessionIdRef.current === currentSession) T(false);
    });
    const instance = await (async function (fn, mode = mod_94903.a.both) {
      if (Ke()) return new qe(fn, mode);
      const editableCfg = await chrome.storage.local.get(ut);
      return new dt(fn, mode, document.body, {
        editable: editableCfg.pageTrsEditable,
      });
    })(
      (text, onChunk, targetNode) =>
        new Promise((resolve, reject) =>
          r.addStream({
            text,
            onChunk,
            resolve,
            reject,
            targetNode,
          })
        ),
      e
    );
    const origDestroy = instance.destroy.bind(instance);
    instance.destroy = () => {
      r.destroy();
      origDestroy();
    };
    if (sessionIdRef.current !== currentSession) {
      instance.destroy();
      return;
    }
    d.current = instance;
  }, [n, a, l]);

  React.useEffect(
    () =>
      mod_67116.x((msg) => {
        if (msg === "get page translate status") {
          const progress = d.current?.getProgress?.() || { completed: 0, total: 0 };
          return Promise.resolve({
            ...stateRef.current,
            completed: progress.completed,
            total: progress.total,
          });
        }
        if (msg === "start page translate") {
          suppressTipRef.current = true;
          if (stateRef.current.active) {
            S();
          } else {
            n(true);
          }
          return Promise.resolve({ active: true });
        }
        if (msg === "stop page translate") {
          sessionIdRef.current += 1;
          suppressTipRef.current = false;
          if (d.current) {
            d.current.destroy();
            d.current = undefined;
          }
          T(false);
          n(false);
          return Promise.resolve({ active: false });
        }
        if (msg === "restart page translate") {
          if (stateRef.current.active) {
            S();
          }
          return Promise.resolve({ active: stateRef.current.active });
        }
        if (msg && typeof msg === "object" && msg.action === "set page translate showType") {
          g(msg.showType);
          return Promise.resolve({ ok: true });
        }
      }),
    [S, n, g]
  );

  return (
    React.useEffect(() => {
      t && S();
    }, [t, S]),
    React.useEffect(() => {
      l &&
        !t &&
        ((sessionIdRef.current += 1),
        (suppressTipRef.current = false),
        d.current && (d.current.destroy(), (d.current = undefined)),
        T(false),
        u.current && (l.dismiss(u.current), (u.current = "")));
    }, [t, l]),
    React.useEffect(() => {
      if (t)
        return (
          chrome.runtime.onMessage.addListener(e),
          () => {
            chrome.runtime.onMessage.removeListener(e);
          }
        );
      function e(e) {
        switch (e) {
          case "page translate switch mode": {
            const e = Ct.findIndex((e) => e.value === p);
            if (e < 0) return;
            let t = e + 1;
            t >= Ct.length
              ? chrome.storage.local.get(Dt).then(({ pageTrsJumpTwo: e }) => {
                  ((t = e ? 1 : 0), g(Ct[t].value));
                })
              : g(Ct[t].value);
            break;
          }
        }
      }
    }, [t, p, g]),
    (
      <div id="web-trs-panel">
        <OverlayToaster
          position={"hidden" === o ? undefined : o}
          ref={c}
          className="app-toaster-container"
          usePortal={false}
        />
      </div>
    )
  );
}
const on = {
  ...pick(mod_16224.g2, [
    "button",
    "closeAfterMove",
    "disableInTextarea",
    "domainBlackList",
    "domainWhiteList",
    "textList",
    "placement",
    "pin",
    "pinPos",
    "panelSize",
    "charsLimit",
    "pageTrsPanelPos",
    "pinEnhance",
    "bilibiliVideoIntegration",
    "youtubeVideoIntegration",
  ]),
};
function an(e, t, s) {
  return !!e && !s?.some((e) => e.test(t));
}
function Comp_Ln(e) {
  const { pin: t, onClick: n, size: s } = e;
  return (
    <div className="switch-pin">
      <AnchorButton
        icon={<Icon icon="pin" size={ce[s]} />}
        small={"small" === s}
        large={"large" === s}
        minimal
        active={t}
        onClick={n}
      />
    </div>
  );
}
const cn = new (class {
  topParsedData = null;
  activeFrameIndex = null;
  msgMap = new Map();
  listeners = null;
  constructor() {
    ((this.topWorker = new mod_43785.Z((e) => {
      (Re("收到来自顶层 worker 发送的消息", e), this.sendMsg(e));
    })),
      (this.messagePassingBetweenFrames = new mod_90274.B()),
      this.messagePassingBetweenFrames.on("message", (e) => {
        const t = e;
        t && (Re("收到来自 iframe worker 发送的消息", t), this.sendMsg(t));
      }));
  }
  sendMsg(e) {
    switch (e.type) {
      case "HCFY_SELECTION_EVENT_MOUSEDOWN":
        (this.clearSelectionData(), this.listeners?.onMouseDown(e.event));
        break;
      case "HCFY_SELECTION_EVENT_RECEIVE_SELECTION_INFO": {
        const { parsedData: t, activeFrameIndex: n } = Le(e.data);
        ((this.topParsedData = t?.isTop ? t : null), (this.activeFrameIndex = n));
        const { reason: s } = e.meta;
        if ("mouseup" === s) t && this.listeners?.onMouseUp(t, t.mouseUpEvent);
        else if ("proactive" === s) {
          const n = e.meta.mid;
          if (n) {
            const e = this.msgMap.get(n);
            e && (this.msgMap.delete(n), e(t || undefined));
          }
        }
        break;
      }
      case "HCFY_SELECTION_EVENT_SCROLL":
        if (this.topParsedData) this.listeners?.onScroll(this.topParsedData, e.event);
        else if (this.isTopFrameActivated()) {
          const t = this.getInfoSync();
          t && this.listeners?.onScroll(t, e.event);
        } else
          this.getInfo().then((t) => {
            t && this.listeners?.onScroll(t, e.event);
          });
        break;
      case "HCFY_SELECTION_EVENT_ESC_KEY":
        (this.clearSelectionData(), this.listeners?.onEsc());
        break;
    }
  }
  isTopFrameActivated() {
    return -1 === this.activeFrameIndex?.[0];
  }
  getInfoSync() {
    const e = this.topWorker.sendMsg({
      type: "HCFY_SELECTION_EVENT_REPORT_INFO_PROACTIVE",
      mid: "sync",
    });
    if (e) return Le(e.data).parsedData;
  }
  getInfo() {
    return new Promise((e) => {
      if (!this.activeFrameIndex) return void e(undefined);
      if (this.isTopFrameActivated()) return void e(this.getInfoSync());
      const t = uniqueId();
      (this.msgMap.set(t, e),
        this.messagePassingBetweenFrames.tell(
          {
            type: "HCFY_SELECTION_EVENT_REPORT_INFO_PROACTIVE",
            mid: t,
          },
          this.isTopFrameActivated() ? "top" : this.activeFrameIndex.reverse().slice(1)
        ));
    });
  }
  clearSelectionData() {
    this.topParsedData = null;
  }
})();
function findBestVideoElement() {
  const ytMain =
    document.querySelector("#movie_player video.html5-main-video") ||
    document.querySelector("ytd-watch-flexy #movie_player video") ||
    document.querySelector("#shorts-player video.html5-main-video");
  if (ytMain) return ytMain;

  const videos = Array.from(document.querySelectorAll("video"));
  if (videos.length === 0) return null;
  let best = videos[0];
  let bestScore = -1;
  for (const video of videos) {
    const rect = video.getBoundingClientRect();
    const area = Math.max(0, rect.width * rect.height);
    const score =
      (video.readyState > 0 ? 1e8 : 0) +
      (!video.paused ? 5e7 : 0) +
      area;
    if (score > bestScore) {
      bestScore = score;
      best = video;
    }
  }
  return best;
}

function detectDomVideoSubtitles() {
  const videos = Array.from(document.querySelectorAll("video"));
  const tracks = [];
  for (const video of videos) {
    const rawTracks = Array.from(video.textTracks || []);
    rawTracks.forEach((track, idx) => {
      const cueList = Array.from(track.cues || []);
      if (cueList.length === 0) return;
      const cues = cueList
        .map((cue) => ({
          from: Number(cue.startTime ?? 0),
          to: Number(cue.endTime ?? 0),
          content: String(cue.text || "").trim(),
        }))
        .filter((c) => c.content.length > 0)
        .sort((a, b) => a.from - b.from);
      if (cues.length === 0) return;
      const lan = track.language || "";
      const lanDoc = track.label || lan || `HTML5 轨道 ${tracks.length + 1}`;
      tracks.push({
        key: `dom-${tracks.length}-${lan || idx}`,
        id: `dom-${tracks.length}`,
        lan,
        lanDoc,
        author: "",
        subtitleUrl: "",
        cues,
        totalCues: cues.length,
      });
    });
  }
  if (tracks.length === 0) return null;
  return {
    ok: true,
    partial: false,
    source: "dom",
    videoTitle: document.title,
    trackCount: tracks.length,
    tracks,
    track: tracks[0],
    firstSubtitle: tracks[0]?.cues?.[0] || null,
    totalCues: tracks[0]?.totalCues || 0,
  };
}

function SubtitleSidePanel({ open, state, onRefresh, onLoadTrack, onClose }) {
  const { loading, data, error } = state || {};
  const tracks = Array.isArray(data?.tracks) ? data.tracks : [];
  const [selectedTrackKeys, setSelectedTrackKeys] = React.useState([]);
  const [loadingTrackKeys, setLoadingTrackKeys] = React.useState(() => new Set());
  const [videoTime, setVideoTime] = React.useState(0);
  const [autoFollow, setAutoFollow] = React.useState(true);

  const streamRef = React.useRef(null);
  const slotRefs = React.useRef([]);
  const prevActiveRef = React.useRef(-1);
  const lastProgrammaticTopRef = React.useRef(0);
  const userScrollingUntilRef = React.useRef(0);
  const loadedUrlRef = React.useRef("");
  const lastVideoIdRef = React.useRef("");

  React.useEffect(() => {
    if (!open) return;
    loadedUrlRef.current = window.location.href;
  }, [open, data]);

  React.useEffect(() => {
    const nextVideoId = data?.videoId || data?.bvid || "";
    if (!data || nextVideoId !== lastVideoIdRef.current || selectedTrackKeys.length === 0) {
      lastVideoIdRef.current = nextVideoId;
      setSelectedTrackKeys(pickDefaultSelectedTrackKeys(tracks));
      setAutoFollow(true);
      prevActiveRef.current = -1;
    }
  }, [data]);

  React.useEffect(() => {
    if (!open) return;
    let currentVideo = findBestVideoElement();
    const syncTime = () => {
      const candidate = findBestVideoElement();
      if (candidate !== currentVideo) {
        if (currentVideo) {
          currentVideo.removeEventListener("timeupdate", syncTime);
          currentVideo.removeEventListener("seeked", syncTime);
          currentVideo.removeEventListener("playing", syncTime);
        }
        currentVideo = candidate;
        if (currentVideo) {
          currentVideo.addEventListener("timeupdate", syncTime);
          currentVideo.addEventListener("seeked", syncTime);
          currentVideo.addEventListener("playing", syncTime);
        }
      }
      if (currentVideo && Number.isFinite(currentVideo.currentTime)) {
        setVideoTime(currentVideo.currentTime);
      }
      if (loadedUrlRef.current && window.location.href !== loadedUrlRef.current) {
        loadedUrlRef.current = window.location.href;
        onRefresh?.();
      }
    };
    if (currentVideo) {
      currentVideo.addEventListener("timeupdate", syncTime);
      currentVideo.addEventListener("seeked", syncTime);
      currentVideo.addEventListener("playing", syncTime);
    }
    syncTime();
    const timer = window.setInterval(syncTime, 120);
    return () => {
      window.clearInterval(timer);
      if (currentVideo) {
        currentVideo.removeEventListener("timeupdate", syncTime);
        currentVideo.removeEventListener("seeked", syncTime);
        currentVideo.removeEventListener("playing", syncTime);
      }
    };
  }, [open, onRefresh]);

  const rows = React.useMemo(
    () => mergeSubtitleTimelineRows(tracks, selectedTrackKeys),
    [tracks, selectedTrackKeys]
  );

  const activeIndex = React.useMemo(
    () => findActiveSubtitleIndex(rows, videoTime),
    [rows, videoTime]
  );

  const scrollActiveToFifthRow = React.useCallback(
    (idx, behavior = "smooth") => {
      const streamEl = streamRef.current;
      if (!streamEl || idx < 0) return;
      const topSlotEl = slotRefs.current[idx];
      if (!topSlotEl) return;
      const streamRect = streamEl.getBoundingClientRect();
      const topRect = topSlotEl.getBoundingClientRect();
      const targetTop = Math.max(0, streamEl.scrollTop + (topRect.top - streamRect.top));
      lastProgrammaticTopRef.current = targetTop;
      streamEl.scrollTo({ top: targetTop, behavior });
    },
    []
  );

  React.useEffect(() => {
    if (!open || !autoFollow || activeIndex < 0) return;
    const prevIdx = prevActiveRef.current;
    const isStepForward = prevIdx >= 0 && Math.abs(activeIndex - prevIdx) <= 2;
    prevActiveRef.current = activeIndex;
    scrollActiveToFifthRow(activeIndex, isStepForward ? "smooth" : "auto");
  }, [open, autoFollow, activeIndex, rows, scrollActiveToFifthRow]);

  const handleToggleTrack = (trackKey) => {
    const isCurrentlySelected = selectedTrackKeys.includes(trackKey);
    setSelectedTrackKeys((prev) =>
      prev.includes(trackKey) ? prev.filter((k) => k !== trackKey) : [...prev, trackKey]
    );
    if (!isCurrentlySelected && onLoadTrack) {
      const tr = tracks.find((t) => t.key === trackKey);
      if (tr && (!Array.isArray(tr.cues) || tr.cues.length === 0) && (tr.subtitleUrl || tr.hasSubtitleUrl)) {
        setLoadingTrackKeys((prev) => {
          const next = new Set(prev);
          next.add(trackKey);
          return next;
        });
        Promise.resolve(onLoadTrack(tr)).finally(() => {
          setLoadingTrackKeys((prev) => {
            if (!prev.has(trackKey)) return prev;
            const next = new Set(prev);
            next.delete(trackKey);
            return next;
          });
        });
      }
    }
  };

  const handleSeekToRow = (row) => {
    const video = findBestVideoElement();
    if (video && Number.isFinite(row.from)) {
      video.currentTime = Math.max(0, row.from + 0.01);
    }
    setAutoFollow(true);
    setVideoTime(row.from + 0.01);
  };

  const handleStreamUserScroll = () => {
    const streamEl = streamRef.current;
    if (!streamEl) return;
    if (Date.now() < userScrollingUntilRef.current) {
      if (Math.abs(streamEl.scrollTop - lastProgrammaticTopRef.current) > 40) {
        setAutoFollow(false);
      }
    }
  };

  if (!open) return null;

  slotRefs.current.length = SUBTITLE_LEAD_PAD_COUNT + rows.length;
  const showLangTags = selectedTrackKeys.length > 1;

  return (
    <aside id="ndt-subtitle-panel" aria-label="视频字幕流窗口">
      <div className="ndt-sub-header">
        <div className="ndt-sub-header-left">
          <span className="ndt-sub-title" title={data?.videoTitle || "字幕流"}>
            {data?.videoTitle ? data.videoTitle : "字幕流"}
          </span>
          <span className="ndt-sub-clock">{formatSubtitleTime(videoTime)}</span>
        </div>
        <div className="ndt-sub-actions">
          {!autoFollow && rows.length > 0 && (
            <button
              type="button"
              className="ndt-sub-follow-btn"
              onClick={() => {
                setAutoFollow(true);
                scrollActiveToFifthRow(activeIndex, "smooth");
              }}
            >
              回到第5行
            </button>
          )}
          <AnchorButton
            icon={<Icon icon="refresh" size={14} />}
            onClick={onRefresh}
            small
            minimal
            title="刷新字幕"
          />
          <AnchorButton
            icon={<Icon icon="cross" size={14} />}
            onClick={onClose}
            small
            minimal
            title="关闭"
          />
        </div>
      </div>

      {!loading && !error && data?.ok && tracks.length > 0 && (
        <div className="ndt-sub-tracks" aria-label="字幕语言选择">
          {tracks.map((track) => {
            const checked = selectedTrackKeys.includes(track.key);
            return (
              <label
                key={track.key}
                className={`ndt-sub-track-checkbox${checked ? " is-checked" : ""}`}
                title={`${track.lanDoc}${track.author ? ` · ${track.author}` : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggleTrack(track.key)}
                />
                <span>
                  <bdi dir="auto">
                    {loadingTrackKeys.has(track.key)
                      ? `${track.lanDoc || track.lan || "字幕"}...`
                      : track.lanDoc || track.lan || "字幕"}
                  </bdi>
                </span>
              </label>
            );
          })}
        </div>
      )}

      <div className="ndt-sub-body">
        {loading && <div className="ndt-sub-hint">正在探测当前视频字幕...</div>}
        {!loading && error && <div className="ndt-sub-error">{error}</div>}
        {!loading && !error && data?.ok && (
          <>
            {data.partial && data.rateLimited ? (
              <div className="ndt-sub-hint">
                YouTube 字幕接口当前触发了频率限制（HTTP 429），请等待片刻后点击右上角刷新重试。
              </div>
            ) : data.partial && data.needLoginSubtitle ? (
              <div className="ndt-sub-hint">
                已探测到 {tracks.length} 条字幕轨，但当前 B 站未登录（need_login_subtitle=true），B 站接口未返回字幕正文 URL；登录后点击刷新即可显示多语言字幕流。
              </div>
            ) : selectedTrackKeys.length === 0 ? (
              <div className="ndt-sub-hint">请在顶部勾选至少一条字幕以显示字幕流。</div>
            ) : loadingTrackKeys.size > 0 && rows.length === 0 ? (
              <div className="ndt-sub-hint">正在加载所选字幕轨道...</div>
            ) : rows.length === 0 ? (
              <div className="ndt-sub-hint">所选字幕轨道内暂无字幕内容。</div>
            ) : (
              <div
                ref={streamRef}
                className="ndt-sub-stream"
                onWheel={() => {
                  userScrollingUntilRef.current = Date.now() + 800;
                }}
                onTouchMove={() => {
                  userScrollingUntilRef.current = Date.now() + 800;
                }}
                onScroll={handleStreamUserScroll}
              >
                {Array.from({ length: SUBTITLE_LEAD_PAD_COUNT }).map((_, padIdx) => (
                  <div
                    key={`pad-${padIdx}`}
                    ref={(el) => {
                      slotRefs.current[padIdx] = el;
                    }}
                    className="ndt-sub-row-pad"
                    aria-hidden="true"
                  >
                    ·
                  </div>
                ))}
                {rows.map((row, idx) => {
                  const isActive = idx === activeIndex;
                  const statusClass = isActive
                    ? "is-active"
                    : idx < activeIndex
                      ? "is-past"
                      : "is-future";
                  return (
                    <div
                      key={row.key}
                      ref={(el) => {
                        slotRefs.current[SUBTITLE_LEAD_PAD_COUNT + idx] = el;
                      }}
                      className={`ndt-sub-row ${statusClass}`}
                      onClick={() => handleSeekToRow(row)}
                      title="点击跳转到该句视频时间"
                    >
                      <div className="ndt-sub-row-head">
                        <span className="ndt-sub-row-time">
                          {formatSubtitleTime(row.from, true)} - {formatSubtitleTime(row.to, true)}
                        </span>
                        {isActive && <span className="ndt-sub-row-badge">当前 · 第5行</span>}
                      </div>
                      <div className="ndt-sub-lines">
                        {row.items.map((item) => (
                          <div key={`${row.key}-${item.trackKey}`} className="ndt-sub-line">
                            {showLangTags && (
                              <span className="ndt-sub-lang-tag">
                                {item.lan || item.lanDoc}
                              </span>
                            )}
                            <span
                              className={`ndt-sub-line-text${
                                isRtlText(item.content) ? " is-rtl" : ""
                              }`}
                              dir="auto"
                            >
                              {item.content}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="ndt-sub-stream-tail" aria-hidden="true" />
              </div>
            )}
          </>
        )}
        {!loading && !error && data && !data.ok && (
          <div className="ndt-sub-hint">
            {(data.reason === "NOT_BILIBILI" || data.reason === "NOT_SUPPORTED_VIDEO_SITE") &&
              "当前页面不是 B 站或 YouTube 视频页，且未检测到 HTML5 视频字幕轨。"}
            {data.reason === "NOT_BILIBILI_VIDEO" &&
              "当前在 B 站页面，但未识别到具体视频 BV/AV 号，请打开视频播放页后重试。"}
            {data.reason === "NOT_YOUTUBE_VIDEO" &&
              "当前在 YouTube 页面，但未识别到具体视频播放页，请打开视频后重试。"}
            {data.reason === "NEED_LOGIN" &&
              "当前 B 站未登录，播放器接口返回 need_login_subtitle=true，请先登录 B 站后再试。"}
            {data.reason === "RATE_LIMITED" &&
              "YouTube 字幕接口当前触发了频率限制（HTTP 429），请等待片刻后点击刷新重试。"}
            {data.reason === "NO_SUBTITLE" &&
              (data.platform === "youtube"
                ? "当前 YouTube 视频未检测到可用字幕。"
                : "当前 B 站视频未检测到 CC 字幕。")}
          </div>
        )}
      </div>
    </aside>
  );
}

function Comp_Dn(e) {
  const { portalContainer: t } = e,
    { t: trLocal } = useI18n(),
    [n, o] = mod_25148.A(on),
    l = n?.button,
    c = n?.closeAfterMove || on.closeAfterMove,
    d = n?.domainBlackList,
    u = n?.domainWhiteList,
    p = n?.textList,
    h = n?.placement || on.placement,
    f = n ? n.pin : on.pin,
    g = n ? n.pinEnhance : on.pinEnhance,
    x = n?.panelSize || on.panelSize,
    b = "small" === x,
    w = "large" === x,
    v = React.useMemo(
      () => p?.reduce((e, t) => (t.enabled && e.push(new RegExp(t.value)), e), []),
      [p]
    ),
    T = React.useCallback(
      (e) => {
        o(
          "function" == typeof e
            ? (t) => {
                t.pin = e(t.pin);
              }
            : {
                pin: e,
              }
        );
      },
      [o]
    ),
    [S, E] = React.useState(null),
    [C, _] = React.useState(false),
    k = React.useRef(null),
    [j, N] = React.useState(),
    [A, z] = React.useState(false),
    [subtitleOpen, setSubtitleOpen] = React.useState(false),
    [subtitleState, setSubtitleState] = React.useState({
      loading: false,
      data: null,
      error: "",
    }),
    [classroomOpen, setClassroomOpen] = React.useState(false),
    classroomOpenRef = React.useRef(false),
    [$, D] = React.useState(undefined),
    B = (() => {
      const e = window.location.href;
      return (
        undefined !== u && undefined !== d
          ? (function (e, t, n) {
              const s = be(e, t, n);
              return !s.urlParts || s.whiteListMatched || !s.blackListMatched;
            })(e, d, u)
          : undefined
      );
    })();
  React.useEffect(() => {
    if (f) {
      function e() {
        D(window.innerHeight);
      }
      return (
        e(),
        window.addEventListener("resize", e),
        () => {
          window.removeEventListener("resize", e);
        }
      );
    }
    D(undefined);
  }, [f]);
  const H = React.useRef(null);
  (mod_96538.A(t), mod_96538.A(H.current));
  async function Z() {
    const e = await cn.getInfo();
    e &&
      (N(e.range),
      G.current?.translate({
        type: "text",
        text: e.text,
      }),
      _(true));
  }
  React.useEffect(() => {
    if (!t) return;
    const e = new mod_72531.y(t, Classes.FOCUS_DISABLED);
    return (
      e.start(),
      () => {
        e.stop();
      }
    );
  }, [t]);
  const J = React.useRef(C),
    G = React.useRef(null);
  React.useEffect(
    () => (
      C &&
        !J.current &&
        chrome.storage.local.get("autoPlay").then(({ autoPlay: e }) => {
          e && G.current?.play();
        }),
      () => {
        J.current = C;
      }
    ),
    [C]
  );
  const ee = React.useCallback(() => {
    (E(null), Z());
  }, []);
  const loadSubtitles = React.useCallback(async (forceRefresh = false) => {
    setSubtitleOpen(true);
    setSubtitleState({ loading: true, data: null, error: "" });
    try {
      const destCfg = await chrome.storage.local.get({
        pageTrsDest: mod_16224.g2.pageTrsDest,
        destination: mod_16224.g2.destination,
      });
      const targetLanguage = destCfg?.pageTrsDest?.[0] || destCfg?.destination || "中文(简体)";
      const res = await mod_67116._({
        action: "fetch video subtitles",
        pageUrl: window.location.href,
        targetLanguage,
        forceRefresh: Boolean(forceRefresh),
      });
      if (
        res &&
        !res.ok &&
        (res.reason === "NOT_BILIBILI" || res.reason === "NOT_SUPPORTED_VIDEO_SITE")
      ) {
        const domRes = detectDomVideoSubtitles();
        if (domRes) {
          setSubtitleState({ loading: false, data: domRes, error: "" });
          return;
        }
      }
      setSubtitleState({ loading: false, data: res, error: "" });
    } catch (err) {
      setSubtitleState({
        loading: false,
        data: null,
        error: err?.message || "探测字幕失败",
      });
    }
  }, []);
  const refreshSubtitles = React.useCallback(() => {
    loadSubtitles(true);
  }, [loadSubtitles]);
  const loadSubtitleTrack = React.useCallback(async (track) => {
    if (!track) return;
    try {
      const res = await mod_67116._({
        action: "fetch video subtitle track",
        pageUrl: window.location.href,
        trackKey: track.key,
        subtitleUrl: track.subtitleUrl || "",
      });
      if (res?.ok && res.track?.cues?.length > 0) {
        setSubtitleState((prev) => {
          if (!prev.data || !Array.isArray(prev.data.tracks)) return prev;
          const nextTracks = prev.data.tracks.map((tr) =>
            tr.key === track.key ? { ...tr, ...res.track } : tr
          );
          return {
            ...prev,
            data: {
              ...prev.data,
              partial: false,
              rateLimited: false,
              tracks: nextTracks,
            },
          };
        });
      }
    } catch {
      // ignore track load error
    }
  }, []);
  classroomOpenRef.current = classroomOpen;
  const storageLoaded = Boolean(n);
  const bilibiliVideoIntegration = n?.bilibiliVideoIntegration !== false;
  const youtubeVideoIntegration = n?.youtubeVideoIntegration !== false;
  React.useEffect(() => {
    if (!storageLoaded) return undefined;
    return mountBilibiliClassroomButton(
      () => {
        setClassroomOpen(true);
      },
      {
        isModalOpen: () => classroomOpenRef.current,
        bilibiliEnabled: bilibiliVideoIntegration,
        youtubeEnabled: youtubeVideoIntegration,
      }
    );
  }, [storageLoaded, bilibiliVideoIntegration, youtubeVideoIntegration]);

  (React.useEffect(
    () =>
      mod_67116.x((e) => {
        switch (e) {
          case "translate":
            return void (C ? _(false) : ee());
          case "page translate":
            z((e) => !e);
            break;
          case "open subtitle panel":
            loadSubtitles();
            return Promise.resolve({ open: true });
          case "open language classroom":
            setClassroomOpen(true);
            return Promise.resolve({ open: true });
          case "play":
            G.current?.play();
        }
      }),
    [C, ee, loadSubtitles]
  ),
    React.useEffect(() => {
      undefined !== B &&
        undefined !== l &&
        v &&
        (cn.listeners = {
          onMouseUp(e) {
            if (n?.disableInTextarea && (e.isInTextarea || e.isInContentEditable)) return;
            if (n?.charsLimit && e.text.length > n.charsLimit) return;
            an(B, e.text, v) && (C || !l || e.multiClick ? Z() : E(e.btnPos));
          },
          onMouseDown() {
            (E(null), (f && g) || _(false));
          },
          onScroll(e, t) {
            (e.isTop && t?.target === document) ||
              N(e.isTop ? Object.assign({}, e.range) : e.range);
          },
          onEsc() {
            (E(null), _(false));
          },
        });
    }, [
      l,
      B,
      v,
      C,
      n?.disableInTextarea,
      n?.charsLimit,
      f,
      g,
    ]),
    React.useEffect(() => {
      if (!C) return;
      if (!c) return;
      const e = () => {
        (_(false), getSelection()?.removeAllRanges());
      };
      return (
        document.addEventListener("mousemove", e),
        () => {
          document.removeEventListener("mousemove", e);
        }
      );
    }, [C, c]));
  const te = () => {
      _(false);
    },
    ne = () => {
      o((e) => {
        const t = !e.pin;
        ((e.pin = t),
          window.setTimeout(() => {
            t ? k.current?.switch2pin() : k.current?.clearPos();
          }));
      });
    },
    ae = React.useRef(null);
  return (
    <div id="app" ref={H}>
      {n && (
        <>
          <Comp_He btnPos={S} setBtnPos={E} onBtnClick={ee} />
          <I
            show={C}
            pin={f}
            setMaxHeight={D}
            setPin={T}
            range={j}
            placement={h}
            ref={k}
            targetRef={ae}
          >
            <Comp_De
              hasDragTip
              ref={G}
              elementRef={ae}
              style={{
                maxHeight: $,
              }}
              showOptionsTip={C}
              headerLeft={<Comp_Ln pin={f} onClick={ne} size={x} />}
              headerRight={
                <AnchorButton
                  icon={<Icon icon="cross" size={ce[x]} />}
                  onClick={te}
                  small={b}
                  large={w}
                  minimal
                  title={trLocal("content.closeEsc")}
                />
              }
              size={x}
              portalContainer={t}
            />
          </I>
        </>
      )}
      <Bt
        open={A}
        setOpen={z}
        portalContainer={t}
        pos={n ? n.pageTrsPanelPos : on.pageTrsPanelPos}
      />
      <SubtitleSidePanel
        open={subtitleOpen}
        state={subtitleState}
        onRefresh={refreshSubtitles}
        onLoadTrack={loadSubtitleTrack}
        onClose={() => setSubtitleOpen(false)}
      />
      <LanguageClassroomModal
        open={classroomOpen}
        hasPopupOpen={Boolean(C || S)}
        onDismissPopup={() => {
          E(null);
          _(false);
        }}
        onClose={() => {
          setClassroomOpen(false);
          E(null);
          if (!f) _(false);
        }}
      />
    </div>
  );
}
function fn() {
  return (
    <mod_42631.A
      id="__hcfy__"
      stylesheetURLs={["blueprint-select.css", "lang-select.css"]}
      cssText={
        ((e = `${contentPanelCss}\n${classroomCss}`),
        e.replace(/url\((["']?)(.*?)\1\)/g, function (e, t, n) {
          return n.startsWith("data:") ||
            n.startsWith("chrome-extension:") ||
            n.startsWith("moz-extension:")
            ? e
            : `url(${chrome.runtime.getURL(n)})`;
        }))
      }
    >
      {(e) => <Comp_Dn portalContainer={e || undefined} />}
    </mod_42631.A>
  );
  var e;
}
export { fn as A };
