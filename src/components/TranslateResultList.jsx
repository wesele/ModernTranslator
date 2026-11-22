import * as React from "react";
import {
  Classes,
  AnchorButton,
  Button,
  Card,
  Collapse,
  H6,
  Icon,
} from "@blueprintjs/core";
import classNames from "classnames";
import noop from "lodash/noop";
import pick from "lodash/pick";
import * as mod_16224 from "../shared/constants/defaults.js";
import * as mod_25812 from "./LanguageSelect.jsx";
import * as mod_66126 from "./ExpandableText.jsx";
import * as mod_18785 from "../services/translators/index.js";
import * as mod_12752 from "../shared/constants/serviceIcons.js";
import * as mod_76352 from "./TranslateErrorView.jsx";
import * as mod_25148 from "../shared/hooks/useStorage.js";
import * as mod_67116 from "../shared/messaging/index.js";
import { isCustomOpenAIServiceId } from "../shared/openaiUtils.js";
import { useI18n } from "../shared/i18n/index.js";
import * as mod_31085 from "react/jsx-runtime";
async function P(e) {
  mod_67116
    ._({
      action: "audio",
      url: e,
    })
    .catch((e) => {
      console.error(e);
    });
}
function T(e) {
  const { t: tr } = useI18n();
  const t = e.uri,
    a = e.size,
    n = e.style;
  return (
    <AnchorButton
      className="speak-btn"
      style={n}
      icon={<Icon icon="volume-up" size={L[a]} />}
      small={"small" === a}
      large={"large" === a}
      minimal
      disabled={!t}
      onClick={t ? () => P(t) : undefined}
      title={t ? tr("result.speak") : tr("result.ttsUnsupported")}
    />
  );
}
function A(e, t) {
  const a = "GoogleWeb" === t,
    n = [];
  return (
    !e.phonetic ||
      (a && !e.dict) ||
      n.push(e.phonetic.map((e) => `${e.name ? e.name + " " : ""}/${e.value}/`)),
    e.dict
      ? n.push(
          ...e.dict.map((e) => `${e.pos ? e.pos + (a ? ": " : " ") : ""}${e.terms.join(", ")}`)
        )
      : e.result && n.push(...e.result),
    mod_67116._({
      action: "write to clipboard",
      text: n.join("\n"),
    })
  );
}
function E(e) {
  e.stopPropagation();
}
const I = /\b[A-Z\s\-'a-z]+\b/g;
function D(e, t) {
  const a = Array.from(e.matchAll(I)),
    s = e.split(I);
  return (
    <>
      {s.map((e, s) => {
        const r = a[s];
        return (
          <React.Fragment key={s}>
            {e}
            {r ? <a onClick={() => t(r[0])}>{r[0]}</a> : ""}
          </React.Fragment>
        );
      })}
    </>
  );
}
const L = {
  small: 12,
  middle: 16,
  large: 20,
};
function F(e) {
  switch (e) {
    case "美":
      return "英语(美国)";
    case "英":
      return "英语(英国)";
    default:
      return;
  }
}
const R = {
  ...pick(mod_16224.g2, ["googleHidePhonetic", "customOpenAIServices"]),
};
function N(e) {
  const {
      apiId: t,
      result: { loading: a, result: d } = {
        loading: false,
        result: null,
      },
      queryResult: h,
      autoCopy: g = false,
      autoPlay: x = false,
      wordClickable: v = true,
      setQuery: b = noop,
      size: I = "small",
      collapse: N,
      onCollapseChange: O,
      portalContainer: K,
    } = e,
    { t: tr, getLanguageName, getServiceName } = useI18n(),
    [_] = mod_25148.A(R),
    $ = L[I],
    M = "small" === I,
    U = "large" === I,
    [B, G] = React.useState("duplicate"),
    [q, W] = React.useState(),
    customOpenAIMatch = isCustomOpenAIServiceId(t)
      ? (_?.customOpenAIServices || []).find((svc) => svc?.id === t)
      : null,
    H = customOpenAIMatch
      ? { id: t, name: customOpenAIMatch.name || tr("service.customDefault") }
      : {
          id: t,
          name:
            getServiceName(t, _?.customOpenAIServices) ||
            mod_18785.v.find((svc) => svc.id === t)?.name ||
            t,
        },
    Y = "GoogleWeb" === t && !!_?.googleHidePhonetic,
    Z = () => {
      (G("tick"),
        W("success"),
        window.setTimeout(() => {
          (G("duplicate"), W(undefined));
        }, 1e3));
    };
  (React.useEffect(() => {
    d &&
      x &&
      d.text.length < 30 &&
      P({
        apiId: t,
        source: d.from,
        text: d.text,
        ttsURI: d.phonetic?.[0].ttsURI || d.ttsURI,
      });
  }, [t, x, d]),
    React.useEffect(() => {
      d &&
        g &&
        A(d, t).then(
          (ok) => {
            ok ? Z() : window.alert(tr("result.autoCopyFail"));
          },
          (err) => {
            window.alert(tr("result.autoCopyErr", { msg: err?.message || "" }));
          }
        );
    }, [d, g, t]));
  const J =
    mod_12752.K[t] ||
    (isCustomOpenAIServiceId(t) ? chrome.runtime.getURL("custom-llm.svg") : undefined);
  return (
    <Card className="result-block" onClick={E}>
      <div className="legend">
        <div className="legend-left">
          <span
            className="api-ico"
            style={
              J
                ? {
                    backgroundImage: `url(${J})`,
                  }
                : undefined
            }
          />
          <H6>{H.name}</H6>
          {d && (
            <>
              <mod_25812.A
                lang={d.from}
                setLang={h}
                size="small"
                maxHeight={212}
                portalContainer={K}
              >
                <span className="source">
                  <span className="source-text">{getLanguageName(d.from)}</span>
                  <Icon icon="caret-down" size={12} />
                </span>
              </mod_25812.A>
              <T
                uri={{
                  apiId: t,
                  source: d.from,
                  text: d.text,
                  ttsURI: d.phonetic?.[0].ttsURI || d.ttsURI,
                }}
                size={I}
              />
            </>
          )}
        </div>
        <div
          className="legend-actions"
          style={{
            flexShrink: 0,
          }}
        >
          {undefined !== N && (
            <AnchorButton
              minimal
              small={M}
              large={U}
              title={N ? tr("result.expand") : tr("result.collapse")}
              onClick={() => {
                O && O(!N);
              }}
              icon={<Icon icon={N ? "chevron-down" : "chevron-up"} size={$ + 2} />}
            />
          )}
          <AnchorButton
            onClick={() => {
              d &&
                A(d, t).then(
                  (ok) => {
                    ok ? Z() : window.alert(tr("result.copyFail"));
                  },
                  (err) => {
                    window.alert(tr("result.copyErr", { msg: err?.message || "" }));
                  }
                );
            }}
            disabled={!d || !!d.error}
            icon={<Icon icon={B} size={$} />}
            minimal
            small={M}
            large={U}
            intent={q}
            title={tr("result.copy")}
          />
          <Button
            disabled={!d?.link}
            target="_blank"
            href={d?.link || ""}
            icon={<Icon icon="share" size={$} />}
            minimal
            small={M}
            large={U}
            title={tr("result.viewDetail")}
          />
        </div>
      </div>
      <Collapse isOpen={!N}>
        <div
          style={{
            display: a ? "block" : "none",
          }}
        >
          <p
            className={classNames({
              [Classes.SKELETON]: a,
            })}
          >
            1
          </p>
          <p
            className={classNames({
              [Classes.SKELETON]: a,
            })}
            style={{
              width: "150px",
            }}
          >
            1
          </p>
        </div>
        {d?.error && (
          <div className="error">
            <mod_76352.Q error={d.error} onRetry={() => h()} />
          </div>
        )}
        {d?.phonetic && !Y && (
          <div className="phonetic">
            {d.phonetic.map((e, a) => (
              <div
                className="phonetic-item"
                style={{
                  maxWidth: "100%",
                }}
                key={a}
              >
                {e.name && (
                  <span
                    style={{
                      flexShrink: 0,
                      marginRight: 5,
                    }}
                  >
                    {e.name}
                  </span>
                )}
                {e.value && <mod_66126.A>/{e.value}/</mod_66126.A>}
                {e.ttsURI && (
                  <T
                    style={{
                      flexShrink: 0,
                    }}
                    uri={{
                      apiId: t,
                      source: F(e.name) || d.from,
                      text: d.text,
                      ttsURI: e.ttsURI,
                    }}
                    size={I}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        {d && (
          <div className="common-result">
            {d.dict && (
              <div className="dict">
                {d.dict.map((e, t) => {
                  const a = e.terms.join(", ");
                  return (
                    <p key={t}>
                      {e.pos && <span className="dict-pos">{e.pos}</span>}
                      {v ? D(a, b) : a}
                    </p>
                  );
                })}
              </div>
            )}
            {!d.dict && d.result && (
              <div className="general-result">
                {d.result.map((e, a) => (
                  <p key={a}>
                    {e}
                    <T
                      uri={{
                        text: e,
                        apiId: t,
                        source: d?.to,
                      }}
                      size={I}
                    />
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </Collapse>
    </Card>
  );
}
export { N as A };
export { P as Z };
