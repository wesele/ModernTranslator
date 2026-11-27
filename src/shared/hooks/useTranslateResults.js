import * as React from "react";
import { produce } from "immer";
import set from "lodash/set";
import * as mod_67116 from "../messaging/index.js";
import { usePrevious } from "react-use";
import uniqueId from "lodash/uniqueId";
import difference from "lodash/difference";
import { t } from "../i18n/index.js";

const INITIAL_STATE = {
  results: {},
};

function resultsReducer(state, action) {
  return produce(state, (draft) => {
    switch (action.type) {
      case "set loading":
        if (action.value) {
          draft.results[action.apiId] = { loading: true, result: null };
        } else {
          set(draft.results, [action.apiId, "loading"], false);
        }
        break;
      case "set result":
        set(draft.results, [action.apiId, "result"], action.result);
        break;
      case "clear results":
        draft.results = {};
        break;
    }
  });
}

function useTranslateResults(text, apis, source, show, onTranslate) {
  const queryIdRef = React.useRef("");
  const [state, dispatch] = React.useReducer(resultsReducer, INITIAL_STATE);
  const onTranslateRef = React.useRef();
  onTranslateRef.current = onTranslate;

  const prevText = usePrevious(text);
  const prevSource = usePrevious(source);
  const prevApis = usePrevious(apis);
  const prevShow = usePrevious(show);

  const queryResult = async (qText, apiId, qSource, isStale = () => false) => {
    let res;
    dispatch({ type: "set loading", apiId, value: true });
    try {
      res = await mod_67116._({
        action: "translate",
        data: {
          apiCode: apiId,
          text: qText,
          source: qSource,
        },
      });
    } catch (err) {
      if (isStale()) return;
      dispatch({ type: "set loading", apiId, value: false });
      dispatch({
        type: "set result",
        apiId,
        result: {
          text: qText,
          error: { message: err?.message || t("error.unknown") },
        },
      });
      return;
    }
    if (!isStale()) {
      dispatch({ type: "set loading", apiId, value: false });
      if (res) {
        if (apiId === "GoogleWeb") {
          const detected = res.from;
          if (detected && detected !== "中文(简体)") {
            try {
              chrome.storage.local.set({ latestSource: detected }).catch(() => {});
            } catch {
              // ignore invalidated extension context
            }
          }
        }
        dispatch({ type: "set result", apiId, result: res });
      }
    }
  };

  React.useEffect(() => {
    if (!show) return;
    if (text === prevText && source === prevSource && show === prevShow) return;
    dispatch({ type: "clear results" });
    const reqId = uniqueId();
    queryIdRef.current = reqId;
    if (!text) return;
    onTranslateRef.current?.();
    const isStale = () => reqId !== queryIdRef.current;
    apis?.forEach((apiId) => {
      queryResult(text, apiId, source, isStale);
    });
  }, [show, text, apis, source]);

  React.useEffect(() => {
    if (!prevApis || !apis) return;
    const added = difference(apis, prevApis);
    if (!added.length) return;
    const reqId = queryIdRef.current;
    const isStale = () => reqId !== queryIdRef.current;
    added.forEach((apiId) => {
      if (!state.results[apiId]) {
        queryResult(text, apiId, source, isStale);
      }
    });
  }, [text, state.results, apis, source]);

  return {
    results: state,
    queryResult,
    dispatchResults: dispatch,
  };
}

export { useTranslateResults as L };
