import * as React from "react";
import pick from "lodash/pick";
import * as mod_88190 from "./CheckboxGroup.jsx";
import * as mod_25148 from "../shared/hooks/useStorage.js";
import * as mod_16224 from "../shared/constants/defaults.js";
import { getConfiguredTranslationServices } from "../shared/openaiUtils.js";

const CUSTOM_SERVICES_DEFAULT = pick(mod_16224.g2, ["customOpenAIServices"]);

function ApiCheckboxGroup(e) {
  const { selectedAPIs: s, onChange: a } = e;
  const [storage] = mod_25148.A(CUSTOM_SERVICES_DEFAULT);
  const items = React.useMemo(
    () => getConfiguredTranslationServices(storage?.customOpenAIServices),
    [storage?.customOpenAIServices]
  );

  return (
    <mod_88190.x
      items={items}
      selected={s}
      onChange={a}
      valueKey="id"
      labelRenderer={(svc) => svc.name}
    />
  );
}

export { ApiCheckboxGroup as f };
