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
import * as mod_62337 from "./webpageTranslateDom.js";
import * as mod_69675 from "../shared/storage/watchStorage.js";
import contentPanelCss from "../styles/contentPanelCss.js";
import * as mod_42631 from "../components/ShadowContainer.jsx";
import {
  isLlmService,
  MAX_LLM_BATCH_BYTES,
  PROMPT_HEADER_BYTE_RESERVE,
  estimateSegmentBytes,
} from "../shared/llmBatchProtocol.js";
import { t as tr, useI18n, getServiceDisplayName } from "../shared/i18n/index.js";
const u = "static" !== getComputedStyle(document.documentElement).position;
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
  handleTask() {
    if (this.destroyed) return;
    if (this.isLlm) {
      this.handleLlmBatchTasks();
      return;
    }
    if (this.handling) return;
    let e = this.queue.shift();
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
      let batch = this.queue.shift();
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
function Ke() {
  const e = document.body.childNodes;
  return 1 === e.length && e[0] instanceof HTMLPreElement;
}
class qe {
  constructor(e, t = mod_94903.a.source, n) {
    let s;
    if (n) s = n;
    else {
      if (!Ke()) throw new TypeError(tr("content.notTxtError"));
      s = document.body.firstElementChild;
    }
    ((this.preElement = s),
      (this.showType = mod_94903.a.source),
      (this.originText = s.textContent || ""),
      (this.originParagraphs = this.originText.split(/\n{2,}/)),
      (this.resultParagraphs = []),
      (this.totalCount = 0),
      (this.completedCount = 0),
      this.originParagraphs.forEach((t, n) => {
        const s = t.replace(/\n/g, " ").trim();
        s
          ? ((this.totalCount += 1),
            (this.resultParagraphs[n] = tr("content.translatingWait")),
            e(s, (partial) => {
              if (!this.destroyed && null != partial) {
                this.resultParagraphs[n] = partial;
                this.renderResult();
              }
            }).then(
              (e) => {
                if (!this.destroyed) this.completedCount += 1;
                ((this.resultParagraphs[n] = e || ""), this.renderResult());
              },
              () => {
                if (!this.destroyed) this.completedCount += 1;
              }
            ))
          : (this.resultParagraphs[n] = "");
      }),
      this.switchShowType(t));
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
        this.preElement.textContent = this.resultParagraphs.join("\n\n");
        break;
      case mod_94903.a.both:
        this.preElement.textContent = this.originParagraphs.reduce(
          (e, t, n) => (t.trim() ? e + t + tr("content.txtPrefix") + this.resultParagraphs[n] + "\n\n" : e),
          ""
        );
    }
  }
  switchShowType(e) {
    this.showType !== e && ((this.showType = e), this.renderResult());
  }
  destroy() {
    (this.switchShowType(mod_94903.a.source), (this.destroyed = true));
  }
}
class Xe {
  constructor(e, t, n, s) {
    ((this.rootNode = e),
      (this.staticChildNodes = t),
      (this.translateNodes = []),
      (this.translateFn = n),
      (this.options = s));
  }
  add(e, t) {
    const { rootNode: n, staticChildNodes: s, translateNodes: r, translateFn: o } = this,
      i = s.slice(e, t + 1),
      a = new mod_94903.r(n, i, o, this.options);
    return (r.push(a), a);
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
const Ze = [
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
  ],
  Je = [
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
  ].concat(Ze);
function Ge(e) {
  return e.nodeType === Node.ELEMENT_NODE;
}
function Qe(e) {
  const t = e.tagName.toLowerCase();
  return Je.includes(t) || (t.includes("-") && "g-emoji" !== t);
}
function et(e) {
  const t = e.tagName.toLowerCase();
  return "button" === e.getAttribute("role") ? !Ze.includes(t) : "button" === t || "a" === t;
}
function tt(e, t, n = () => false, s) {
  const r = {
    element: e,
    paragraphs: [],
    children: [],
  };
  if (e instanceof Element && n(e)) return r;
  if (e instanceof Element) {
    const o = e.shadowRoot;
    if (o) {
      const e = tt(o, t, n, s);
      r.children.push(e);
    }
  }
  let o;
  const i = Array.from(e.childNodes);
  let a = false;
  const l = i.filter((e) => {
      if (e.nodeType === Node.TEXT_NODE) {
        const t = !!e.nodeValue?.trim();
        return (t && (a = true), t);
      }
      return e.nodeType === Node.ELEMENT_NODE;
    }),
    c = (e) => i.indexOf(l[e]);
  if (
    (l.forEach((d, u) => {
      if (
        (null == o && (o = u),
        Ge(d) &&
          (Qe(d) ||
            (function (e, t, n) {
              const s = e[t];
              if (!Ge(s)) return false;
              const r = e[t - 1],
                o = e[t + 1];
              if (et(s) && !n) {
                if (r && Ge(r) && et(r)) return true;
                if (o && Ge(o) && et(o)) return true;
              }
              return r ? Ge(r) && Qe(r) : !o || (Ge(o) && Qe(o));
            })(l, u, a)))
      ) {
        const a = u - 1;
        if (a >= o) {
          const n = c(o),
            s = c(a);
          (r.paragraphs.push([n, s]), t?.(e, i, n, s));
        }
        if (
          ((o = undefined),
          !(function (e) {
            if (et(e)) return false;
            const t = e.tagName.toLowerCase();
            return Ze.includes(t);
          })(d) && !n(d))
        ) {
          const e = tt(d, t, n, s);
          r.children.push(e);
        }
      }
    }),
    null != o)
  ) {
    const n = l.length - 1,
      s = c(o),
      a = c(n);
    (r.paragraphs.push([s, a]), t?.(e, i, s, a));
  }
  return (1 === r.paragraphs.length && 0 === r.children.length && s?.(r), r);
}
class nt {
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
    ((document.title = this.text), (this.destroyed = true));
  }
  switchShowType(e) {
    if (!this.destroyed) {
      switch (e) {
        case mod_94903.a.both:
          document.title = `${this.text} ~ ${this.translateResult}`;
          break;
        case mod_94903.a.source:
          document.title = this.text;
          break;
        case mod_94903.a.result:
          document.title = this.translateResult;
      }
      this.showType = e;
    }
  }
  async translate() {
    if (this.destroyed || !this.text || this.translating || this.translated) return;
    let e;
    ((this.translating = true),
      (this.translateResult = tr("content.translatingShort")),
      this.switchShowType(this.showType));
    try {
      e = await this.translateFn(this.text);
    } catch (e) {
      return (
        (this.translating = false),
        (this.translated = true),
        (this.translateResult = tr("content.translateErrPrefix", { msg: e.message })),
        void this.switchShowType(this.showType)
      );
    }
    if (((this.translating = false), null == e)) return this.translate();
    ((this.translated = true), (this.translateResult = e), this.switchShowType(this.showType));
  }
}
const ot = {
  STYLE_NONE: mod_62337.P9,
  STYLE_DOTTED_CLASSIC: mod_62337.O,
  STYLE_DOTTED: mod_62337.pb,
  STYLE_WAVY: mod_62337.UU,
  STYLE_LINE: mod_62337.Zi,
  STYLE_BACKGROUND: mod_62337.dd,
  STYLE_QUOTE: mod_62337.PD,
};
let it;
function at() {
  if (it) return;
  ((it = document.createElement("style")),
    (it.dataset.title = tr("content.styleNodeTitle")),
    document.head.appendChild(it));
  const e = pick(mod_16224.g2, [
    "pageTrsResultStyleId",
    "pageTrsResultStyleMainColor",
    "pageTrsResultStyleTextColor",
    "pageTrsResultStyleTextSize",
    "pageTrsResultStyleTextWeight",
    "pageTrsResultStyleCustom",
  ]);
  mod_69675.A(e, (t) => {
    (t.pageTrsResultStyleId && (e.pageTrsResultStyleId = t.pageTrsResultStyleId),
      undefined !== t.pageTrsResultStyleCustom &&
        (e.pageTrsResultStyleCustom = t.pageTrsResultStyleCustom),
      undefined !== t.pageTrsResultStyleMainColor &&
        (e.pageTrsResultStyleMainColor = t.pageTrsResultStyleMainColor),
      undefined !== t.pageTrsResultStyleTextColor &&
        (e.pageTrsResultStyleTextColor = t.pageTrsResultStyleTextColor),
      undefined !== t.pageTrsResultStyleTextSize &&
        (e.pageTrsResultStyleTextSize = t.pageTrsResultStyleTextSize),
      undefined !== t.pageTrsResultStyleTextWeight &&
        (e.pageTrsResultStyleTextWeight = t.pageTrsResultStyleTextWeight),
      (function () {
        if (!it) return;
        let t = "hcfy-result{";
        (e.pageTrsResultStyleMainColor &&
          (t += `--hcfy-result-main-color:${e.pageTrsResultStyleMainColor};`),
          e.pageTrsResultStyleTextColor &&
            (t += `--hcfy-result-text-color:${e.pageTrsResultStyleTextColor};`),
          e.pageTrsResultStyleTextSize &&
            (t += `--hcfy-result-text-size:${e.pageTrsResultStyleTextSize}em;`),
          e.pageTrsResultStyleTextWeight &&
            (t += `--hcfy-result-text-weight:${e.pageTrsResultStyleTextWeight};`),
          (t += "}"),
          "STYLE_CUSTOM" === e.pageTrsResultStyleId
            ? (t += e.pageTrsResultStyleCustom)
            : (t += ot[e.pageTrsResultStyleId] || ""),
          (it.textContent = t));
      })());
  });
}
function lt(e) {
  const t = e.nodeName.toLowerCase();
  return "body" !== t && "html" !== t;
}
function ct(e) {
  return Array.prototype.some.call(e.childNodes, (e) => "hcfy-result" === e.nodeName.toLowerCase());
}
class dt {
  groups = new Map();
  mutationObserver = new MutationObserver((e) => {
    e.forEach((e) => {
      (e.addedNodes.forEach((e) => {
        Ge(e) &&
          !(function (e, t) {
            let n = e;
            do {
              if (t(n)) return true;
              n = n.parentElement;
            } while (n && lt(n));
            return false;
          })(e, (e) => {
            const t = e.tagName.toLowerCase();
            return "pre" === t || "hcfy-result" === t || !!ct(e) || undefined;
          }) &&
          this.analysis(e);
      }),
        e.removedNodes.forEach((e) => {
          if (Ge(e)) {
            const t = (e) => {
              (this.groups.delete(e), Array.prototype.forEach.call(e.children, t));
            };
            t(e);
          }
        }));
    });
  });
  intersectionObserver = new IntersectionObserver(
    (e) => {
      e.forEach((e) => {
        if (0 === e.intersectionRatio) return;
        const t = this.groups.get(e.target);
        t && t.translate();
      });
    },
    {
      rootMargin: `${window.screen.availHeight * window.devicePixelRatio}px ${window.screen.availWidth * window.devicePixelRatio}px`,
    }
  );
  constructor(e, t = mod_94903.a.both, n = document.body, s) {
    (at(),
      (this.options = s),
      (this.translateFn = e),
      (this.showType = t),
      (this.titleNode = new nt(e)),
      this.titleNode.switchShowType(t),
      this.titleNode.translate(),
      this.analysis(n));
    const r = document.getElementsByTagName("sr-read")[0];
    (r && this.analysis(r),
      this.mutationObserver.observe(n, {
        childList: true,
        subtree: true,
      }));
  }
  analysis(e) {
    const { groups: t, translateFn: n } = this;
    tt(
      e,
      (e, s, r, o) => {
        let i = t.get(e);
        i ||
          ((i = new Xe(e, s, n, this.options)),
          t.set(e, i),
          e instanceof Element && this.intersectionObserver.observe(e));
        i.add(r, o).switchShowType(this.showType);
      },
      (e) => "hcfy-result" === e.tagName.toLowerCase() || ct(e),
      (e) => {
        const n = t.get(e.element);
        n && n.setOnlyChild();
      }
    );
  }
  switchShowType(e) {
    ((this.showType = e), this.titleNode.switchShowType(e));
    for (const t of this.groups.values()) t.switchShowType(e);
  }
  destroy() {
    (this.intersectionObserver.disconnect(),
      this.mutationObserver.disconnect(),
      this.titleNode.destroy());
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
            return txt && !/^[0-9\s.\-_#:()!•+~@$%^&*\n/`]+$/.test(txt);
          });
          if (hasText) total += 1;
        }
      }
    }
    return { completed, total };
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
          zt.getMode().then((e) => {
            (n(e), r.current?.(e));
          });
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
      (text, onChunk) =>
        new Promise((resolve, reject) =>
          r.addStream({
            text,
            onChunk,
            resolve,
            reject,
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
  (React.useEffect(
    () =>
      mod_67116.x((e) => {
        switch (e) {
          case "translate":
            return void (C ? _(false) : ee());
          case "page translate":
            z((e) => !e);
            break;
          case "play":
            G.current?.play();
        }
      }),
    [C, ee]
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
    </div>
  );
}
function fn() {
  return (
    <mod_42631.A
      id="__hcfy__"
      stylesheetURLs={["blueprint-select.css", "lang-select.css"]}
      cssText={
        ((e = contentPanelCss),
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
