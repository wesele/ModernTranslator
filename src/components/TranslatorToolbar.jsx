import * as mod_25812 from "./LanguageSelect.jsx";
import { Card, Icon } from "@blueprintjs/core";
import * as mod_73345 from "./ApiCheckboxGroup.jsx";

const ICON_SIZES = {
  small: 12,
  middle: 16,
  large: 20,
};

function TranslatorToolbar(e) {
  const {
    source,
    setSource,
    options,
    setOptions,
    children,
    size,
    portalContainer,
  } = e;
  if (!options) return null;

  const pushRecent = (val, key) => {
    setOptions((draft) => {
      const list = draft[key];
      const idx = list.indexOf(val);
      if (idx >= 0) {
        list.splice(idx, 1);
      } else if (list.length === 4) {
        list.pop();
      }
      list.unshift(val);
    });
  };

  return (
    <Card className="quick-settings">
      <div>
        <mod_25812.A
          lang={source}
          setLang={(val) => {
            setSource(val);
            pushRecent(val, "recentUseLangFrom");
          }}
          addAuto
          recentUse={options.recentUseLangFrom}
          size={size}
          portalContainer={portalContainer}
        />
        <Icon
          icon="arrow-right"
          size={ICON_SIZES[size]}
          style={{ margin: "0 10px" }}
        />
        <mod_25812.A
          lang={options.destination}
          setLang={(val) => {
            setOptions({ destination: val });
            pushRecent(val, "recentUseLangTo");
          }}
          recentUse={options.recentUseLangTo}
          size={size}
          portalContainer={portalContainer}
        />
      </div>
      <div>
        <mod_73345.f
          useShortName
          selectedAPIs={options.selectedAPIs}
          onChange={(next) => {
            setOptions({ selectedAPIs: next });
          }}
        />
      </div>
      {children && <div>{children}</div>}
    </Card>
  );
}

export { TranslatorToolbar as A };
