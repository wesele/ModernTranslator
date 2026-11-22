import * as React from "react";
import { MenuItem } from "@blueprintjs/core";
import * as mod_25148 from "../shared/hooks/useStorage.js";
import pick from "lodash/pick";
import * as mod_16224 from "../shared/constants/defaults.js";
import { getConfiguredTranslationServices } from "../shared/openaiUtils.js";
import { useI18n } from "../shared/i18n/index.js";

const STORAGE_KEYS = pick(mod_16224.g2, ["selectedAPIs", "customOpenAIServices"]);

function AddApiMenuItems() {
  const { locale } = useI18n();
  const [e, t] = mod_25148.A(STORAGE_KEYS);
  const items = React.useMemo(
    () => getConfiguredTranslationServices(e?.customOpenAIServices, locale),
    [e?.customOpenAIServices, locale]
  );

  return (
    <>
      {items.map((svc) => (
        <MenuItem
          text={svc.name}
          onClick={() => {
            t((draft) => {
              const list = draft.selectedAPIs || [];
              if (!list.includes(svc.id)) {
                list.push(svc.id);
              }
            });
          }}
          disabled={!e || (e.selectedAPIs || []).includes(svc.id)}
          key={svc.id}
        />
      ))}
    </>
  );
}

export { AddApiMenuItems as A };
