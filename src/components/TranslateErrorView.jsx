import * as mod_29842 from "../shared/errors/index.js";
import { Classes, AnchorButton, OL, NonIdealState } from "@blueprintjs/core";
import * as mod_67116 from "../shared/messaging/index.js";
import { useI18n } from "../shared/i18n/index.js";

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

function ErrorAction({ error, t }) {
  switch (error.type) {
    case mod_29842.VC.NEED_KEY:
    case mod_29842.VC.NO_POINTS:
      return (
        <AnchorButton
          small
          onClick={openSettings}
          style={{ marginRight: 15 }}
        >
          {t("error.openSettings")}
        </AnchorButton>
      );
    case undefined:
      return (
        <AnchorButton
          small
          onClick={() => window.location.reload()}
          style={{ marginRight: 15 }}
        >
          {t("error.refreshPage")}
        </AnchorButton>
      );
    default:
      return null;
  }
}

function TranslateErrorView({ error, onRetry }) {
  const { t } = useI18n();
  return (
    <NonIdealState
      description={<ErrorDetail error={error} />}
      action={
        <div style={{ display: "flex" }}>
          <ErrorAction error={error} t={t} />
          <AnchorButton small onClick={onRetry}>
            {t("common.retry")}
          </AnchorButton>
        </div>
      }
    >
      {!error.type && (
        <p className={`${Classes.TEXT_MUTED} ${Classes.TEXT_SMALL}`}>
          {t("error.contextInvalidatedHint")}
        </p>
      )}
    </NonIdealState>
  );
}

export { TranslateErrorView as Q };
