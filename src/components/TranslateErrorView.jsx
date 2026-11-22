import * as mod_29842 from "../shared/errors/index.js";
import { Classes, AnchorButton, OL, NonIdealState } from "@blueprintjs/core";
import * as mod_67116 from "../shared/messaging/index.js";

function openSettings() {
  mod_67116._({
    action: "open options page",
  });
}

function ErrorLink({ link }) {
  return link ? (
    <a href={link.url} target="_blank" rel="noreferrer">
      {link.name}
    </a>
  ) : null;
}

function ErrorDetail({ error }) {
  return (
    <div style={{ textAlign: "left" }}>
      <p>
        {error.message}
        <ErrorLink link={error.link} />
      </p>
      {error.errors && error.errors.length && (
        <OL>
          {error.errors.map((item, idx) => (
            <li key={idx}>
              <ErrorDetail error={item} />
            </li>
          ))}
        </OL>
      )}
    </div>
  );
}

function ErrorAction({ error }) {
  switch (error.type) {
    case mod_29842.VC.NEED_KEY:
    case mod_29842.VC.NO_POINTS:
      return (
        <AnchorButton
          small
          onClick={openSettings}
          style={{ marginRight: 15 }}
        >
          前往配置页面
        </AnchorButton>
      );
    case undefined:
      return (
        <AnchorButton
          small
          onClick={() => window.location.reload()}
          style={{ marginRight: 15 }}
        >
          刷新网页
        </AnchorButton>
      );
    default:
      return null;
  }
}

function TranslateErrorView({ error, onRetry }) {
  return (
    <NonIdealState
      description={<ErrorDetail error={error} />}
      action={
        <div style={{ display: "flex" }}>
          <ErrorAction error={error} />
          <AnchorButton small onClick={onRetry}>
            重试
          </AnchorButton>
        </div>
      }
    >
      {!error.type && (
        <p className={`${Classes.TEXT_MUTED} ${Classes.TEXT_SMALL}`}>
          出现 Extension context invalidated 错误时刷新网页即可恢复。
        </p>
      )}
    </NonIdealState>
  );
}

export { TranslateErrorView as Q };
