import * as React from "react";
import { Select } from "@blueprintjs/select";
import { MenuItem, Menu, AnchorButton, Icon } from "@blueprintjs/core";
import classNames from "classnames";
import forEach from "lodash/forEach";
import { useI18n, getLocalizedLanguageName, getLanguageBcp47 } from "../shared/i18n/index.js";

const c = JSON.parse(
  '[{"zhName":"中文(简体)","pinyin":"zhongwenjianti"},{"zhName":"印地语","pinyin":"yindiyu"},{"zhName":"印尼语","pinyin":"yinniyu"},{"zhName":"意大利语","pinyin":"yidaliyu"},{"zhName":"越南语","pinyin":"yuenanyu"},{"zhName":"英语","pinyin":"yingyu"},{"zhName":"西班牙语","pinyin":"xibanyayu"},{"zhName":"日语","pinyin":"riyu"},{"zhName":"葡萄牙语","pinyin":"putaoyayu"},{"zhName":"马来语","pinyin":"malaiyu"},{"zhName":"韩语","pinyin":"hanyu"},{"zhName":"法语","pinyin":"fayu"},{"zhName":"俄语","pinyin":"eyu"},{"zhName":"德语","pinyin":"deyu"},{"zhName":"阿拉伯语","pinyin":"alaboyu"},{"zhName":"土耳其语","pinyin":"tuerqiyu"},{"zhName":"泰语","pinyin":"taiyu"},{"zhName":"荷兰语","pinyin":"helanyu"},{"zhName":"芬兰语","pinyin":"fenlanyu"},{"zhName":"丹麦语","pinyin":"danmaiyu"},{"zhName":"中文(繁体)","pinyin":"zhongwenfanti"},{"zhName":"希伯来语","pinyin":"xibolaiyu"},{"zhName":"希腊语","pinyin":"xilayu"},{"zhName":"匈牙利语","pinyin":"xiongyaliyu"},{"zhName":"威尔士语","pinyin":"weiershiyu"},{"zhName":"乌尔都语","pinyin":"wuerduyu"},{"zhName":"萨摩亚语","pinyin":"samoyayu"},{"zhName":"斯瓦希里语","pinyin":"siwaxiliyu"},{"zhName":"斯洛文尼亚语","pinyin":"siluowenniyayu"},{"zhName":"瑞典语","pinyin":"ruidianyu"},{"zhName":"南非荷兰语","pinyin":"nanfeihelanyu"},{"zhName":"挪威语","pinyin":"nuoweiyu"},{"zhName":"马尔加什语","pinyin":"maerjiashiyu"},{"zhName":"马耳他语","pinyin":"maertayu"},{"zhName":"孟加拉语","pinyin":"mengjialayu"},{"zhName":"拉脱维亚语","pinyin":"latuoweiyayu"},{"zhName":"立陶宛语","pinyin":"litaowanyu"},{"zhName":"罗马尼亚语","pinyin":"luomaniyayu"},{"zhName":"克罗地亚语","pinyin":"keluodiyayu"},{"zhName":"捷克语","pinyin":"jiekeyu"},{"zhName":"海地克里奥尔语","pinyin":"haidikeliaoeryu"},{"zhName":"菲律宾语","pinyin":"feilvbinyu"},{"zhName":"波斯尼亚语","pinyin":"bosiniyayu"},{"zhName":"波斯语","pinyin":"bosiyu"},{"zhName":"保加利亚语","pinyin":"baojialiyayu"},{"zhName":"波兰语","pinyin":"bolanyu"},{"zhName":"爱沙尼亚语","pinyin":"aishaniyayu"},{"zhName":"爪哇语","pinyin":"zhaowayu"},{"zhName":"祖鲁语","pinyin":"zuluyu"},{"zhName":"中文(粤语)","pinyin":"zhongwenyueyu"},{"zhName":"意第绪语","pinyin":"yidixuyu"},{"zhName":"伊博语","pinyin":"yiboyu"},{"zhName":"约鲁巴语","pinyin":"yuelubayu"},{"zhName":"亚美尼亚语","pinyin":"yameiniyayu"},{"zhName":"夏威夷语","pinyin":"xiaweiyiyu"},{"zhName":"修纳语","pinyin":"xiunayu"},{"zhName":"信德语","pinyin":"xindeyu"},{"zhName":"宿务语","pinyin":"suwuyu"},{"zhName":"乌兹别克语","pinyin":"wuzibiekeyu"},{"zhName":"乌克兰语","pinyin":"wukelanyu"},{"zhName":"泰卢固语","pinyin":"tailuguyu"},{"zhName":"塔吉克语","pinyin":"tajikeyu"},{"zhName":"泰米尔语","pinyin":"taimieryu"},{"zhName":"世界语","pinyin":"shijieyu"},{"zhName":"索马里语","pinyin":"suomaliyu"},{"zhName":"僧伽罗语","pinyin":"sengqieluoyu"},{"zhName":"斯洛伐克语","pinyin":"siluofakeyu"},{"zhName":"齐切瓦语","pinyin":"qiqiewayu"},{"zhName":"旁遮普语","pinyin":"pangzhepuyu"},{"zhName":"普什图语","pinyin":"pushituyu"},{"zhName":"尼泊尔语","pinyin":"niboeryu"},{"zhName":"毛利语","pinyin":"maoliyu"},{"zhName":"马拉雅拉姆语","pinyin":"malayalamuyu"},{"zhName":"马拉地语","pinyin":"maladiyu"},{"zhName":"马其顿语","pinyin":"maqidunyu"},{"zhName":"缅甸语","pinyin":"miandianyu"},{"zhName":"卢森堡语","pinyin":"lusenbaoyu"},{"zhName":"拉丁语","pinyin":"ladingyu"},{"zhName":"老挝语","pinyin":"laozhuayu"},{"zhName":"克林贡语","pinyin":"kelingongyu"},{"zhName":"库尔德语","pinyin":"kuerdeyu"},{"zhName":"科西嘉语","pinyin":"kexijiayu"},{"zhName":"卡纳达语","pinyin":"kanadayu"},{"zhName":"吉尔吉斯语","pinyin":"jierjisiyu"},{"zhName":"加利西亚语","pinyin":"jialixiyayu"},{"zhName":"加泰罗尼亚语","pinyin":"jiatailuoniyayu"},{"zhName":"豪萨语","pinyin":"haosayu"},{"zhName":"哈萨克语","pinyin":"hasakeyu"},{"zhName":"古吉拉特语","pinyin":"gujilateyu"},{"zhName":"格鲁吉亚语","pinyin":"gelujiyayu"},{"zhName":"高棉语","pinyin":"gaomianyu"},{"zhName":"冰岛语","pinyin":"bingdaoyu"},{"zhName":"巴斯克语","pinyin":"basikeyu"},{"zhName":"白俄罗斯语","pinyin":"baieluosiyu"},{"zhName":"阿姆哈拉语","pinyin":"amuhalayu"},{"zhName":"爱尔兰语","pinyin":"aierlanyu"},{"zhName":"阿尔巴尼亚语","pinyin":"aerbaniyayu"},{"zhName":"阿塞拜疆语","pinyin":"asaibaijiangyu"},{"zhName":"土库曼语","pinyin":"tukumanyu"},{"zhName":"卢旺达语","pinyin":"luwangdayu"},{"zhName":"鞑靼语","pinyin":"dadayu"},{"zhName":"奥里亚语","pinyin":"aoliyayu"},{"zhName":"弗里西语","pinyin":"fulixiyu"},{"zhName":"蒙古语","pinyin":"mengguyu"},{"zhName":"印尼巽他语","pinyin":"yinnixuntayu"},{"zhName":"斐济语","pinyin":"feijiyu"},{"zhName":"汤加语","pinyin":"tangjiayu"},{"zhName":"塔希提语","pinyin":"taxitiyu"},{"zhName":"扎扎其语","pinyin":"zazaqiyu"},{"zhName":"印古什语","pinyin":"yingushiyu"},{"zhName":"因特语","pinyin":"yinteyu"},{"zhName":"伊努克提图特语","pinyin":"yinuketituteyu"},{"zhName":"伊多语","pinyin":"yiduoyu"},{"zhName":"亚齐语","pinyin":"yaqiyu"},{"zhName":"希利盖农语","pinyin":"xiligainongyu"},{"zhName":"西里西亚语","pinyin":"xilixiyayu"},{"zhName":"叙利亚语","pinyin":"xuliyayu"},{"zhName":"瓦隆语","pinyin":"walongyu"},{"zhName":"文达语","pinyin":"wendayu"},{"zhName":"沃洛夫语","pinyin":"woluofuyu"},{"zhName":"提格利尼亚语","pinyin":"tigeliniyayu"},{"zhName":"他加禄语","pinyin":"tajialuyu"},{"zhName":"掸语","pinyin":"danyu"},{"zhName":"苏格兰语","pinyin":"sugelanyu"},{"zhName":"塞尔维亚语","pinyin":"saierweiyayu"},{"zhName":"切罗基语","pinyin":"qieluojiyu"},{"zhName":"契维语","pinyin":"qiweiyu"},{"zhName":"帕皮阿门托语","pinyin":"papiamentuoyu"},{"zhName":"毛里求斯克里奥尔语","pinyin":"maoliqiusikeliaoeryu"},{"zhName":"马绍尔语","pinyin":"mashaoeryu"},{"zhName":"迈蒂利语","pinyin":"maidiliyu"},{"zhName":"逻辑语","pinyin":"luojiyu"},{"zhName":"罗姆语","pinyin":"luomuyu"},{"zhName":"卢森尼亚语","pinyin":"lusenniyayu"},{"zhName":"卢干达语","pinyin":"lugandayu"},{"zhName":"林堡语","pinyin":"linbaoyu"},{"zhName":"拉特加莱语","pinyin":"latejialaiyu"},{"zhName":"罗曼什语","pinyin":"luomanshiyu"},{"zhName":"林加拉语","pinyin":"linjialayu"},{"zhName":"克丘亚语","pinyin":"keqiuyayu"},{"zhName":"克里米亚鞑靼语","pinyin":"kelimiyadadayu"},{"zhName":"克里克语","pinyin":"kelikeyu"},{"zhName":"卡舒比语","pinyin":"kashubiyu"},{"zhName":"卡努里语","pinyin":"kanuliyu"},{"zhName":"卡拜尔语","pinyin":"kabaieryu"},{"zhName":"克什米尔语","pinyin":"keshimieryu"},{"zhName":"科萨语","pinyin":"kesayu"},{"zhName":"胡帕语","pinyin":"hupayu"},{"zhName":"黑山语","pinyin":"heishanyu"},{"zhName":"格陵兰语","pinyin":"gelinglanyu"},{"zhName":"瓜拉尼语","pinyin":"gualaniyu"},{"zhName":"刚果语","pinyin":"gangguoyu"},{"zhName":"弗留利语","pinyin":"fuliuliyu"},{"zhName":"梵语","pinyin":"fanyu"},{"zhName":"法罗语","pinyin":"faluoyu"},{"zhName":"低地德语","pinyin":"didideyu"},{"zhName":"德顿语","pinyin":"dedunyu"},{"zhName":"楚瓦什语","pinyin":"chuwashiyu"},{"zhName":"聪加语","pinyin":"congjiayu"},{"zhName":"布列塔尼语","pinyin":"bulietaniyu"},{"zhName":"博杰普尔语","pinyin":"bojiepueryu"},{"zhName":"俾路支语","pinyin":"biluzhiyu"},{"zhName":"比林语","pinyin":"bilinyu"},{"zhName":"本巴语","pinyin":"benbayu"},{"zhName":"柏柏尔语","pinyin":"baibaieryu"},{"zhName":"巴什基尔语","pinyin":"bashijieryu"},{"zhName":"比斯拉马语","pinyin":"bisilamayu"},{"zhName":"奥塞梯语","pinyin":"aosaitiyu"},{"zhName":"奥罗莫语","pinyin":"aoluomoyu"},{"zhName":"奥克语","pinyin":"aokeyu"},{"zhName":"奥杰布瓦语","pinyin":"aojiebuwayu"},{"zhName":"艾马拉语","pinyin":"aimalayu"},{"zhName":"阿斯图里亚斯语","pinyin":"asituliyasiyu"},{"zhName":"阿拉贡语","pinyin":"alagongyu"},{"zhName":"阿肯语","pinyin":"akenyu"},{"zhName":"阿萨姆语","pinyin":"asamuyu"},{"zhName":"苗语","pinyin":"miaoyu"},{"zhName":"南非科萨语","pinyin":"nanfeikesayu"},{"zhName":"塞索托语","pinyin":"saisuotuoyu"},{"zhName":"苏格兰盖尔语","pinyin":"sugelangaieryu"},{"zhName":"白苗语","pinyin":"baimiaoyu"},{"zhName":"克雷塔罗奥托米语","pinyin":"keleitaluoaotuomiyu"},{"zhName":"塞尔维亚语(拉丁文)","pinyin":"saierweiyayuladingwen"},{"zhName":"塞尔维亚语(西里尔文)","pinyin":"saierweiyayuxilierwen"},{"zhName":"尤卡坦玛雅语","pinyin":"youkatanmayayu"},{"zhName":"中古法语","pinyin":"zhonggufayu"},{"zhName":"中文(文言文)","pinyin":"zhongwenwenyanwen"},{"zhName":"新挪威语","pinyin":"xinnuoweiyu"},{"zhName":"下索布语","pinyin":"xiasuobuyu"},{"zhName":"西弗里斯语","pinyin":"xifulisiyu"},{"zhName":"西非书面语","pinyin":"xifeishumianyu"},{"zhName":"突尼斯阿拉伯语","pinyin":"tunisialaboyu"},{"zhName":"书面挪威语","pinyin":"shumiannuoweiyu"},{"zhName":"桑海语","pinyin":"sanghaiyu"},{"zhName":"塞尔维亚-克罗地亚语","pinyin":"saierweiyakeluodiyayu"},{"zhName":"萨丁尼亚语","pinyin":"sadingniyayu"},{"zhName":"那不勒斯语","pinyin":"nabulesiyu"},{"zhName":"南恩德贝莱语","pinyin":"nanendebeilaiyu"},{"zhName":"南索托语","pinyin":"nansuotuoyu"},{"zhName":"曼克斯语","pinyin":"mankesiyu"},{"zhName":"康瓦尔语","pinyin":"kangwaeryu"},{"zhName":"孔卡尼语","pinyin":"kongkaniyu"},{"zhName":"加拿大法语","pinyin":"jianadafayu"},{"zhName":"哈卡钦语","pinyin":"hakaqinyu"},{"zhName":"古英语","pinyin":"guyingyu"},{"zhName":"古希腊语","pinyin":"guxilayu"},{"zhName":"高地索布语","pinyin":"gaodisuobuyu"},{"zhName":"盖尔语","pinyin":"gaieryu"},{"zhName":"富拉尼语","pinyin":"fulaniyu"},{"zhName":"迪维希语","pinyin":"diweixiyu"},{"zhName":"北方萨米语","pinyin":"beifangsamiyu"},{"zhName":"邦板牙语","pinyin":"bangbanyayu"},{"zhName":"巴西葡萄牙语","pinyin":"baxiputaoyayu"},{"zhName":"北索托语","pinyin":"beisuotuoyu"},{"zhName":"阿尔及利亚阿拉伯语","pinyin":"aerjiliyaalaboyu"},{"zhName":"维吾尔语","pinyin":"weiwueryu"},{"zhName":"加泰隆语","pinyin":"jiatailongyu"},{"zhName":"克林贡语(piqaD)","pinyin":"kelingongyupiqaD"},{"zhName":"阿布哈兹语","pinyin":"abuhaziyu"},{"zhName":"阿兹特克语","pinyin":"azitekeyu"},{"zhName":"埃维语","pinyin":"aiweiyu"},{"zhName":"巴布亚皮钦语","pinyin":"babuyapiqinyu"},{"zhName":"班巴拉语","pinyin":"banbalayu"},{"zhName":"邦阿西楠语","pinyin":"bangaxinanyu"},{"zhName":"北萨米语","pinyin":"beisamiyu"},{"zhName":"查莫罗语","pinyin":"chamoluoyu"},{"zhName":"查瓦卡诺语","pinyin":"chawakanuoyu"},{"zhName":"迪维西语","pinyin":"diweixiyu"},{"zhName":"侗语","pinyin":"dongyu"},{"zhName":"杜順語","pinyin":"dushunyu"},{"zhName":"富尔语","pinyin":"fueryu"},{"zhName":"格雷罗纳瓦特尔语","pinyin":"geleiluonawateeryu"},{"zhName":"格罗宁根方言","pinyin":"geluoninggenfangyan"},{"zhName":"基里巴斯语","pinyin":"jilibasiyu"},{"zhName":"基隆迪语","pinyin":"jilongdiyu"},{"zhName":"基切语","pinyin":"jiqieyu"},{"zhName":"卡西语","pinyin":"kaxiyu"},{"zhName":"康沃尔语","pinyin":"kangwoeryu"},{"zhName":"马恩语","pinyin":"maenyu"},{"zhName":"马里语（俄罗斯）","pinyin":"maliyu（eluosi）"},{"zhName":"玛雅语","pinyin":"mayayu"},{"zhName":"姆班杜语","pinyin":"mubanduyu"},{"zhName":"纳瓦霍语","pinyin":"nawahuoyu"},{"zhName":"纽埃语","pinyin":"niuaiyu"},{"zhName":"帕姆语","pinyin":"pamuyu"},{"zhName":"桑戈语","pinyin":"sanggeyu"},{"zhName":"上索布语","pinyin":"shangsuobuyu"},{"zhName":"汤加语(赞比亚)","pinyin":"tangjiayuzanbiya"},{"zhName":"图瓦卢语","pinyin":"tuwaluyu"},{"zhName":"图瓦语","pinyin":"tuwayu"},{"zhName":"瓦瑞语(菲律宾)","pinyin":"waruiyufeilvbin"},{"zhName":"沃拉普克语","pinyin":"wolapukeyu"},{"zhName":"乌德穆尔特语","pinyin":"wudemuerteyu"},{"zhName":"西方国际语","pinyin":"xifangguojiyu"},{"zhName":"现代希腊语","pinyin":"xiandaixilayu"},{"zhName":"新共同语言","pinyin":"xingongtongyuyan"},{"zhName":"伊班语","pinyin":"yibanyu"},{"zhName":"伊洛卡诺语","pinyin":"yiluokanuoyu"}]'
);
const AUTO_ZH_NAME = "自动检测";
const m = [
  {
    zhName: AUTO_ZH_NAME,
    pinyin: "zidongjiance",
  },
].concat(c);

function normalizeForSearch(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function LanguageSelect(e) {
  const {
    children: s,
    addAuto: a,
    recentUse: i,
    size: j = "small",
    maxHeight: g,
    portalContainer: b,
    disabled: w,
  } = e;
  const { locale, t, getLanguageName } = useI18n();
  const f = "small" === j;
  const k = "large" === j;
  const [v, z] = React.useState(a ? m : c);

  React.useEffect(() => {
    const base = a ? m : c;
    if (!i || !i.length) return void z(base);
    const list = [...base];
    forEach(i, (item) => {
      const idx = list.findIndex((x) => x.zhName === item);
      if (idx < 0) return;
      const picked = list.splice(idx, 1)[0];
      list.unshift(picked);
    });
    z(list);
  }, [a, i]);

  const N = React.useMemo(() => {
    if (!i || !i.length) return undefined;
    const seen = new Set();
    const validSource = a ? m : c;
    const validSet = new Set(validSource.map((entry) => entry.zhName));
    const list = [];
    for (const raw of i) {
      const normalized = raw === "" ? AUTO_ZH_NAME : raw;
      if (!seen.has(normalized) && validSet.has(normalized)) {
        seen.add(normalized);
        list.push(normalized);
      }
    }
    return list.length ? list : undefined;
  }, [i, a]);

  const targetName = e.lang || AUTO_ZH_NAME;
  const [x, L] = React.useState(null);
  React.useEffect(() => {
    const matched = v.find((item) => item.zhName === targetName) || null;
    L(matched);
  }, [v, targetName]);

  const renderLabel = React.useCallback(
    (zhName) => getLanguageName(zhName),
    [getLanguageName]
  );

  const itemRenderer = React.useCallback(
    (item, { handleClick, handleFocus, modifiers }) => {
      if (!modifiers.matchesPredicate) return null;
      const isSelected = item.zhName === targetName;
      return (
        <MenuItem
          key={item.zhName}
          onClick={handleClick}
          onFocus={handleFocus}
          active={modifiers.active}
          className={classNames("ndt-lang-item", { "is-selected": isSelected })}
          text={
            <span className="ndt-lang-item-main">
              <span className="ndt-lang-item-label">{renderLabel(item.zhName)}</span>
            </span>
          }
          labelElement={
            isSelected ? <Icon icon="tick" size={12} className="ndt-lang-item-check" /> : undefined
          }
        />
      );
    },
    [renderLabel, targetName]
  );

  const itemPredicate = React.useCallback(
    (query, item, _index, exactMatch) => {
      const n = normalizeForSearch(query);
      if (!n) return true;
      const localLabel = normalizeForSearch(renderLabel(item.zhName));
      const enLabel = normalizeForSearch(getLocalizedLanguageName(item.zhName, "en"));
      const zhLabel = item.zhName.toLowerCase();
      const bcp47 = getLanguageBcp47(item.zhName).toLowerCase();
      if (exactMatch) {
        return localLabel === n || zhLabel === n;
      }
      return (
        localLabel.includes(n) ||
        enLabel.includes(n) ||
        zhLabel.includes(n) ||
        item.pinyin.includes(n) ||
        (bcp47 && bcp47.includes(n))
      );
    },
    [renderLabel, locale]
  );

  return (
    <Select
      disabled={w}
      className="lang-select"
      resetOnClose
      resetOnSelect
      onItemSelect={(item) => {
        e.setLang(item.zhName === AUTO_ZH_NAME ? "" : item.zhName);
      }}
      activeItem={x}
      items={v}
      itemListRenderer={({ filteredItems: filtered, itemsParentRef, query, renderItem }) => {
        const baseList = a ? m : c;
        const recentItems =
          !query && N && N.length
            ? N.map((name, idx) => {
                const found = baseList.find((entry) => entry.zhName === name);
                if (found) return renderItem(found, idx);
                return null;
              }).filter((node) => null != node)
            : undefined;
        const mainItems = filtered
          .map(
            recentItems && recentItems.length
              ? (item, idx) => {
                  if (!N?.includes(item.zhName)) return renderItem(item, idx);
                  return null;
                }
              : renderItem
          )
          .filter((node) => null != node);
        return (
          <Menu
            ulRef={itemsParentRef}
            large={k}
            className="ndt-lang-menu"
            style={g ? { maxHeight: g } : undefined}
          >
            {recentItems && recentItems.length > 0 && (
              <>
                <li className="ndt-lang-section-header" role="presentation">
                  {t("langSelect.recent")}
                </li>
                {recentItems}
                <li className="ndt-lang-divider" role="separator" />
              </>
            )}
            <li className="ndt-lang-section-header" role="presentation">
              {query ? t("langSelect.searchResults") : t("langSelect.allLanguages")}
            </li>
            {mainItems.length ? (
              mainItems
            ) : (
              <li className="ndt-lang-empty" role="presentation">
                <Icon icon="search" size={14} />
                <span>{t("langSelect.noResults")}</span>
              </li>
            )}
          </Menu>
        );
      }}
      itemRenderer={itemRenderer}
      itemPredicate={itemPredicate}
      inputProps={{
        placeholder: t("langSelect.searchPlaceholder"),
        className: "ndt-lang-search-input",
      }}
      popoverProps={{
        portalContainer: b,
        targetTagName: "span",
        minimal: true,
        placement: "bottom-start",
        popoverClassName: "ndt-lang-select-popover",
        modifiers: {
          offset: {
            enabled: true,
            options: { offset: [0, 6] },
          },
        },
      }}
    >
      {s || (
        <AnchorButton
          disabled={w}
          className="ndt-lang-trigger"
          rightIcon="caret-down"
          small={f}
          large={k}
          text={
            <span className="ndt-lang-trigger-inner">
              <span className="ndt-lang-trigger-label">
                {x ? renderLabel(x.zhName) : t("langSelect.placeholder")}
              </span>
            </span>
          }
        />
      )}
    </Select>
  );
}
export { LanguageSelect, LanguageSelect as A };
