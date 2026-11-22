import * as React from "react";
import { resolveFlagCode } from "../shared/i18n/languageFlags.js";

function hStripes(colors, ratios) {
  const total = ratios ? ratios.reduce((a, b) => a + b, 0) : colors.length;
  let y = 0;
  return colors.map((fill, idx) => {
    const h = (15 * (ratios ? ratios[idx] : 1)) / total;
    const el = <rect key={idx} x="0" y={y} width="20" height={h + 0.1} fill={fill} />;
    y += h;
    return el;
  });
}

function vStripes(colors, ratios) {
  const total = ratios ? ratios.reduce((a, b) => a + b, 0) : colors.length;
  let x = 0;
  return colors.map((fill, idx) => {
    const w = (20 * (ratios ? ratios[idx] : 1)) / total;
    const el = <rect key={idx} x={x} y="0" width={w + 0.1} height="15" fill={fill} />;
    x += w;
    return el;
  });
}

function nordic(bg, cross, inner) {
  return (
    <>
      <rect width="20" height="15" fill={bg} />
      <rect x="5.5" y="0" width="3.2" height="15" fill={cross} />
      <rect x="0" y="5.9" width="20" height="3.2" fill={cross} />
      {inner && (
        <>
          <rect x="6.3" y="0" width="1.6" height="15" fill={inner} />
          <rect x="0" y="6.7" width="20" height="1.6" fill={inner} />
        </>
      )}
    </>
  );
}

function unionCanton(w = 10, h = 8) {
  return (
    <>
      <rect width={w} height={h} fill="#012169" />
      <path d={`M0,0 L${w},${h} M${w},0 L0,${h}`} stroke="#fff" strokeWidth="1.6" />
      <path d={`M0,0 L${w},${h} M${w},0 L0,${h}`} stroke="#C8102E" strokeWidth="0.8" />
      <rect x={w / 2 - 1.2} y="0" width="2.4" height={h} fill="#fff" />
      <rect x="0" y={h / 2 - 1.2} width={w} height="2.4" fill="#fff" />
      <rect x={w / 2 - 0.7} y="0" width="1.4" height={h} fill="#C8102E" />
      <rect x="0" y={h / 2 - 0.7} width={w} height="1.4" fill="#C8102E" />
    </>
  );
}

function star(cx, cy, r, fill = "#fff") {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rad * Math.cos(ang)).toFixed(2)},${(cy + rad * Math.sin(ang)).toFixed(2)}`);
  }
  return <polygon points={pts.join(" ")} fill={fill} />;
}

const H_FLAG_SPECS = {
  DE: ["#111111", "#DD0000", "#FFCE00"],
  RU: ["#FFFFFF", "#0039A6", "#D52B1E"],
  NL: ["#AE1C28", "#FFFFFF", "#21468B"],
  LU: ["#EA141D", "#FFFFFF", "#51ADDA"],
  UA: ["#0057B7", "#FFD700"],
  PL: ["#FFFFFF", "#DC143C"],
  ID: ["#CE1126", "#FFFFFF"],
  HU: ["#CE2939", "#FFFFFF", "#477050"],
  BG: ["#FFFFFF", "#00966E", "#D62612"],
  EE: ["#0072CE", "#111111", "#FFFFFF"],
  LT: ["#FDB913", "#006A44", "#C1272D"],
  LV: [["#9E3039", "#FFFFFF", "#9E3039"], [2, 1, 2]],
  AT: ["#ED2939", "#FFFFFF", "#ED2939"],
  AM: ["#D90012", "#0033A0", "#F2A800"],
  BO: ["#D52B1E", "#F9E300", "#007934"],
  HT: ["#00209F", "#D21034"],
  ES_GA: ["#FFFFFF", "#0099CC", "#FFFFFF"],
  MU: ["#EA2839", "#1A206D", "#FFD500", "#00A551"],
  SL: ["#FFFFFF", "#005DA4", "#ED1C24"],
  SI: ["#FFFFFF", "#005DA4", "#ED1C24"],
  SK: ["#FFFFFF", "#0B4EA2", "#EE1C25"],
  HR: ["#FF0000", "#FFFFFF", "#171796"],
  RS: ["#C6363C", "#0C4076", "#FFFFFF"],
  ME: ["#C40308"],
  BY: [["#C8313E", "#4AA657"], [2, 1]],
  UZ: [["#0099B5", "#CE1126", "#FFFFFF", "#CE1126", "#1EB53A"], [5, 0.4, 5, 0.4, 5]],
  AF: ["#111111", "#D32011", "#007A36"],
};

const V_FLAG_SPECS = {
  FR: ["#002395", "#FFFFFF", "#ED2939"],
  IT: ["#009246", "#FFFFFF", "#CE2B37"],
  BE: ["#111111", "#FAE042", "#ED2939"],
  IE: ["#169B62", "#FFFFFF", "#FF883E"],
  RO: ["#002B7F", "#FCD116", "#CE1126"],
  ML: ["#14B53A", "#FCD116", "#CE1126"],
  GN: ["#CE1126", "#FCD116", "#009460"],
  NG: ["#008751", "#FFFFFF", "#008751"],
  PE: ["#D91023", "#FFFFFF", "#D91023"],
  MX: ["#006847", "#FFFFFF", "#CE1126"],
  CA: [["#FF0000", "#FFFFFF", "#FF0000"], [1, 2, 1]],
  PT: [["#006600", "#FF0000"], [2, 3]],
  MT: ["#FFFFFF", "#CF142B"],
  DZ: ["#006233", "#FFFFFF"],
  VA: ["#FFE000", "#FFFFFF"],
};

function renderFlagContent(code) {
  if (code === "AUTO") {
    return (
      <>
        <rect width="20" height="15" fill="#1E293B" />
        <circle cx="10" cy="7.5" r="4.6" fill="none" stroke="#60A5FA" strokeWidth="1.2" />
        <ellipse cx="10" cy="7.5" rx="2.1" ry="4.6" fill="none" stroke="#93C5FD" strokeWidth="1" />
        <line x1="5.6" y1="7.5" x2="14.4" y2="7.5" stroke="#93C5FD" strokeWidth="1" />
      </>
    );
  }

  if (code === "CONLANG") {
    return (
      <>
        <rect width="20" height="15" fill="#2563EB" />
        <circle cx="10" cy="7.5" r="4.5" fill="none" stroke="#FFFFFF" strokeWidth="1.15" />
        <ellipse cx="10" cy="7.5" rx="2" ry="4.5" fill="none" stroke="#DBEAFE" strokeWidth="0.95" />
        <line x1="5.5" y1="7.5" x2="14.5" y2="7.5" stroke="#DBEAFE" strokeWidth="0.95" />
      </>
    );
  }

  switch (code) {
    case "CN":
      return (
        <>
          <rect width="20" height="15" fill="#DE2910" />
          {star(4.4, 4.4, 2.2, "#FFDE00")}
          <circle cx="7.9" cy="2.3" r="0.65" fill="#FFDE00" />
          <circle cx="9.1" cy="3.8" r="0.65" fill="#FFDE00" />
          <circle cx="9.1" cy="5.7" r="0.65" fill="#FFDE00" />
          <circle cx="7.9" cy="7.1" r="0.65" fill="#FFDE00" />
        </>
      );
    case "TW":
      return (
        <>
          <rect width="20" height="15" fill="#FE0000" />
          <rect width="10" height="7.5" fill="#000095" />
          <circle cx="5" cy="3.75" r="2.1" fill="#FFFFFF" />
          <circle cx="5" cy="3.75" r="1.45" fill="#000095" />
          <circle cx="5" cy="3.75" r="1.15" fill="#FFFFFF" />
        </>
      );
    case "HK":
      return (
        <>
          <rect width="20" height="15" fill="#DE2910" />
          <circle cx="10" cy="7.5" r="3.4" fill="none" stroke="#FFFFFF" strokeWidth="1.3" strokeDasharray="2.2 1.8" />
          <circle cx="10" cy="7.5" r="1.2" fill="#FFFFFF" />
        </>
      );
    case "US":
      return (
        <>
          {hStripes(["#B22234", "#FFFFFF", "#B22234", "#FFFFFF", "#B22234", "#FFFFFF", "#B22234"])}
          <rect width="9" height="8" fill="#3C3B6E" />
          <circle cx="2.3" cy="2.1" r="0.6" fill="#FFFFFF" />
          <circle cx="4.5" cy="2.1" r="0.6" fill="#FFFFFF" />
          <circle cx="6.7" cy="2.1" r="0.6" fill="#FFFFFF" />
          <circle cx="3.4" cy="4" r="0.6" fill="#FFFFFF" />
          <circle cx="5.6" cy="4" r="0.6" fill="#FFFFFF" />
          <circle cx="2.3" cy="5.9" r="0.6" fill="#FFFFFF" />
          <circle cx="4.5" cy="5.9" r="0.6" fill="#FFFFFF" />
          <circle cx="6.7" cy="5.9" r="0.6" fill="#FFFFFF" />
        </>
      );
    case "US_HI":
      return (
        <>
          {hStripes(["#FFFFFF", "#CF142B", "#00247D", "#FFFFFF", "#CF142B", "#00247D", "#FFFFFF", "#CF142B"])}
          {unionCanton(9, 7.5)}
        </>
      );
    case "GB":
      return (
        <>
          <rect width="20" height="15" fill="#012169" />
          <path d="M0,0 L20,15 M20,0 L0,15" stroke="#FFFFFF" strokeWidth="2.8" />
          <path d="M0,0 L20,15 M20,0 L0,15" stroke="#C8102E" strokeWidth="1.2" />
          <rect x="8" y="0" width="4" height="15" fill="#FFFFFF" />
          <rect x="0" y="5.5" width="20" height="4" fill="#FFFFFF" />
          <rect x="8.8" y="0" width="2.4" height="15" fill="#C8102E" />
          <rect x="0" y="6.3" width="20" height="2.4" fill="#C8102E" />
        </>
      );
    case "GB_SCT":
      return (
        <>
          <rect width="20" height="15" fill="#005EB8" />
          <path d="M0,0 L20,15 M20,0 L0,15" stroke="#FFFFFF" strokeWidth="2.6" />
        </>
      );
    case "GB_WLS":
      return (
        <>
          {hStripes(["#FFFFFF", "#00AD36"])}
          <ellipse cx="10" cy="7.6" rx="4.2" ry="2.6" fill="#D30731" />
          <circle cx="12.5" cy="6.4" r="1.2" fill="#D30731" />
        </>
      );
    case "JP":
      return (
        <>
          <rect width="20" height="15" fill="#FFFFFF" />
          <circle cx="10" cy="7.5" r="4.1" fill="#BC002D" />
        </>
      );
    case "KR":
      return (
        <>
          <rect width="20" height="15" fill="#FFFFFF" />
          <circle cx="10" cy="7.5" r="3.4" fill="#0047A0" />
          <path d="M6.6,7.5 A3.4,3.4 0 0,1 13.4,7.5 A1.7,1.7 0 0,1 10,7.5 A1.7,1.7 0 0,0 6.6,7.5 Z" fill="#CD2E3A" />
          <rect x="3.5" y="3" width="2.3" height="0.8" transform="rotate(-35 4.6 3.4)" fill="#111111" />
          <rect x="14.2" y="3" width="2.3" height="0.8" transform="rotate(35 15.3 3.4)" fill="#111111" />
          <rect x="3.5" y="11.2" width="2.3" height="0.8" transform="rotate(35 4.6 11.6)" fill="#111111" />
          <rect x="14.2" y="11.2" width="2.3" height="0.8" transform="rotate(-35 15.3 11.6)" fill="#111111" />
        </>
      );
    case "ES":
      return (
        <>
          {hStripes(["#AA151B", "#F1BF00", "#AA151B"], [1, 2, 1])}
          <rect x="4.5" y="5.7" width="2.4" height="3.6" rx="0.6" fill="#AA151B" />
        </>
      );
    case "ES_CT":
      return hStripes(["#FCDD09", "#DA121A", "#FCDD09", "#DA121A", "#FCDD09", "#DA121A", "#FCDD09", "#DA121A", "#FCDD09"]);
    case "ES_PV":
      return (
        <>
          <rect width="20" height="15" fill="#D52B1E" />
          <path d="M0,0 L20,15 M20,0 L0,15" stroke="#009B48" strokeWidth="2.5" />
          <rect x="8.6" y="0" width="2.8" height="15" fill="#FFFFFF" />
          <rect x="0" y="6.1" width="20" height="2.8" fill="#FFFFFF" />
        </>
      );
    case "CA":
      return (
        <>
          {vStripes(["#FF0000", "#FFFFFF", "#FF0000"], [1, 2, 1])}
          <polygon points="10,3.8 11.1,6.5 13.5,6.1 11.7,8.2 12.4,10.5 10,9.5 7.6,10.5 8.3,8.2 6.5,6.1 8.9,6.5" fill="#FF0000" />
        </>
      );
    case "BR":
      return (
        <>
          <rect width="20" height="15" fill="#009C3B" />
          <polygon points="10,2 17.5,7.5 10,13 2.5,7.5" fill="#FFDF00" />
          <circle cx="10" cy="7.5" r="2.7" fill="#002776" />
          <path d="M7.5,7.1 Q10,6.1 12.5,7.9" fill="none" stroke="#FFFFFF" strokeWidth="0.7" />
        </>
      );
    case "PT":
      return (
        <>
          {vStripes(["#006600", "#FF0000"], [2, 3])}
          <circle cx="8" cy="7.5" r="2.4" fill="#FFDF00" />
          <circle cx="8" cy="7.5" r="1.4" fill="#FFFFFF" />
        </>
      );
    case "AR":
      return (
        <>
          {hStripes(["#74ACDF", "#FFFFFF", "#74ACDF"])}
          <circle cx="10" cy="7.5" r="1.7" fill="#F6B40E" />
        </>
      );
    case "MX":
      return (
        <>
          {vStripes(["#006847", "#FFFFFF", "#CE1126"])}
          <circle cx="10" cy="7.5" r="1.5" fill="#8C5A2B" />
        </>
      );
    case "IN":
      return (
        <>
          {hStripes(["#FF9933", "#FFFFFF", "#138808"])}
          <circle cx="10" cy="7.5" r="1.7" fill="none" stroke="#000080" strokeWidth="0.9" />
          <circle cx="10" cy="7.5" r="0.5" fill="#000080" />
        </>
      );
    case "SA":
      return (
        <>
          <rect width="20" height="15" fill="#006C35" />
          <rect x="4.5" y="5.5" width="11" height="1.5" rx="0.7" fill="#FFFFFF" />
          <rect x="5.5" y="9" width="9" height="1.1" rx="0.5" fill="#FFFFFF" />
        </>
      );
    case "TR":
      return (
        <>
          <rect width="20" height="15" fill="#E30A17" />
          <circle cx="8" cy="7.5" r="3.4" fill="#FFFFFF" />
          <circle cx="9.1" cy="7.5" r="2.7" fill="#E30A17" />
          {star(12.2, 7.5, 1.5, "#FFFFFF")}
        </>
      );
    case "IL":
      return (
        <>
          <rect width="20" height="15" fill="#FFFFFF" />
          <rect x="0" y="2" width="20" height="2" fill="#0038B8" />
          <rect x="0" y="11" width="20" height="2" fill="#0038B8" />
          <polygon points="10,4.8 12.2,8.8 7.8,8.8" fill="none" stroke="#0038B8" strokeWidth="0.9" />
          <polygon points="10,10.2 12.2,6.2 7.8,6.2" fill="none" stroke="#0038B8" strokeWidth="0.9" />
        </>
      );
    case "GR":
      return (
        <>
          {hStripes(["#0D5EAF", "#FFFFFF", "#0D5EAF", "#FFFFFF", "#0D5EAF", "#FFFFFF", "#0D5EAF", "#FFFFFF", "#0D5EAF"])}
          <rect width="8.5" height="8.3" fill="#0D5EAF" />
          <rect x="3.4" y="0" width="1.7" height="8.3" fill="#FFFFFF" />
          <rect x="0" y="3.3" width="8.5" height="1.7" fill="#FFFFFF" />
        </>
      );
    case "CH":
      return (
        <>
          <rect width="20" height="15" fill="#FF0000" />
          <rect x="8.5" y="3.5" width="3" height="8" fill="#FFFFFF" />
          <rect x="6" y="6" width="8" height="3" fill="#FFFFFF" />
        </>
      );
    case "SE":
      return nordic("#006AA7", "#FECC00");
    case "FI":
      return nordic("#FFFFFF", "#003580");
    case "DK":
      return nordic("#C8102E", "#FFFFFF");
    case "NO":
      return nordic("#BA0C2F", "#FFFFFF", "#00205B");
    case "IS":
      return nordic("#02529C", "#FFFFFF", "#DC1E35");
    case "FO":
      return nordic("#FFFFFF", "#005EB8", "#EF3340");
    case "AU":
    case "NZ":
      return (
        <>
          <rect width="20" height="15" fill="#012169" />
          {unionCanton(10, 7.5)}
          {star(15.2, 4.2, 1.1, code === "NZ" ? "#C8102E" : "#FFFFFF")}
          {star(13.5, 8.2, 1.0, code === "NZ" ? "#C8102E" : "#FFFFFF")}
          {star(16.8, 7.6, 1.0, code === "NZ" ? "#C8102E" : "#FFFFFF")}
          {star(15.2, 11.4, 1.2, code === "NZ" ? "#C8102E" : "#FFFFFF")}
          {code === "AU" && star(5, 11.2, 1.6, "#FFFFFF")}
        </>
      );
    case "FJ":
      return (
        <>
          <rect width="20" height="15" fill="#68BFE5" />
          {unionCanton(10, 7.5)}
          <rect x="13.2" y="5" width="3.8" height="5" rx="0.8" fill="#FFFFFF" />
          <rect x="14.7" y="5" width="0.8" height="5" fill="#C8102E" />
          <rect x="13.2" y="7" width="3.8" height="0.8" fill="#C8102E" />
        </>
      );
    case "TV":
      return (
        <>
          <rect width="20" height="15" fill="#5B97B1" />
          {unionCanton(10, 7.5)}
          <circle cx="13.5" cy="11" r="0.8" fill="#FFCE00" />
          <circle cx="15.5" cy="9" r="0.8" fill="#FFCE00" />
          <circle cx="17" cy="6.5" r="0.8" fill="#FFCE00" />
        </>
      );
    case "NU":
      return (
        <>
          <rect width="20" height="15" fill="#FEDD00" />
          {unionCanton(10, 7.5)}
        </>
      );
    case "VN":
      return (
        <>
          <rect width="20" height="15" fill="#DA251D" />
          {star(10, 7.5, 3.8, "#FFFF00")}
        </>
      );
    case "TH":
      return hStripes(["#A51931", "#F4F5F8", "#2D2A4A", "#F4F5F8", "#A51931"], [1, 1, 2, 1, 1]);
    case "MY":
      return (
        <>
          {hStripes(["#CC0001", "#FFFFFF", "#CC0001", "#FFFFFF", "#CC0001", "#FFFFFF", "#CC0001"])}
          <rect width="10" height="8.5" fill="#010066" />
          <circle cx="4.5" cy="4.25" r="2.3" fill="#FFCC00" />
          <circle cx="5.2" cy="4.25" r="1.9" fill="#010066" />
          {star(6.8, 4.25, 1.1, "#FFCC00")}
        </>
      );
    case "PH":
      return (
        <>
          {hStripes(["#0038A8", "#CE1126"])}
          <polygon points="0,0 8.5,7.5 0,15" fill="#FFFFFF" />
          <circle cx="3.2" cy="7.5" r="1.5" fill="#FCD116" />
        </>
      );
    case "CZ":
      return (
        <>
          {hStripes(["#FFFFFF", "#D7141A"])}
          <polygon points="0,0 9.5,7.5 0,15" fill="#11457E" />
        </>
      );
    case "ZA":
      return (
        <>
          {hStripes(["#E03C31", "#FFFFFF", "#007749", "#FFFFFF", "#001489"], [5, 1.2, 2.6, 1.2, 5])}
          <polygon points="0,0 8.5,7.5 0,15" fill="#007749" />
          <polygon points="0,2.2 6.2,7.5 0,12.8" fill="#111111" stroke="#FFB81C" strokeWidth="1" />
        </>
      );
    case "PK":
      return (
        <>
          {vStripes(["#FFFFFF", "#01411C"], [1, 3])}
          <circle cx="12.6" cy="7.5" r="3" fill="#FFFFFF" />
          <circle cx="13.5" cy="7.1" r="2.5" fill="#01411C" />
          {star(14.3, 6.2, 1.0, "#FFFFFF")}
        </>
      );
    case "BD":
      return (
        <>
          <rect width="20" height="15" fill="#006A4E" />
          <circle cx="9" cy="7.5" r="4" fill="#F42A41" />
        </>
      );
    case "GL":
      return (
        <>
          {hStripes(["#FFFFFF", "#D00C33"])}
          <circle cx="7.5" cy="7.5" r="4.2" fill="#D00C33" />
          <path d="M3.3,7.5 A4.2,4.2 0 0,0 11.7,7.5 Z" fill="#FFFFFF" />
        </>
      );
    case "LK":
      return (
        <>
          <rect width="20" height="15" fill="#FFB700" />
          <rect x="1.5" y="1.8" width="2.2" height="11.4" fill="#00534E" />
          <rect x="3.7" y="1.8" width="2.2" height="11.4" fill="#EB7400" />
          <rect x="7" y="1.8" width="11.5" height="11.4" fill="#8D153A" />
          <circle cx="12.8" cy="7.5" r="2.2" fill="#FFB700" />
        </>
      );
    case "NP":
      return (
        <>
          <rect width="20" height="15" fill="#F3F4F6" />
          <polygon points="3,1.5 14,7.5 7,7.5 14,13.5 3,13.5" fill="#DC143C" stroke="#003893" strokeWidth="1.2" />
          <circle cx="6.2" cy="10.4" r="1.1" fill="#FFFFFF" />
        </>
      );
    case "KH":
      return (
        <>
          {hStripes(["#032EA1", "#E00025", "#032EA1"], [1, 2, 1])}
          <rect x="6.5" y="6.3" width="7" height="3.2" fill="#FFFFFF" />
          <rect x="9.3" y="4.8" width="1.4" height="2" fill="#FFFFFF" />
        </>
      );
    case "LA":
      return (
        <>
          {hStripes(["#CE1126", "#002868", "#CE1126"], [1, 2, 1])}
          <circle cx="10" cy="7.5" r="2.7" fill="#FFFFFF" />
        </>
      );
    case "MM":
      return (
        <>
          {hStripes(["#FECB00", "#34B233", "#EA2839"])}
          {star(10, 7.7, 3.6, "#FFFFFF")}
        </>
      );
    case "MN":
      return (
        <>
          {vStripes(["#C4272F", "#015197", "#C4272F"])}
          <circle cx="3.3" cy="6.8" r="1.4" fill="#F9CF02" />
        </>
      );
    case "KZ":
      return (
        <>
          <rect width="20" height="15" fill="#00AFCA" />
          <circle cx="10" cy="7.2" r="2.8" fill="#FEC50C" />
          <rect x="1.5" y="2" width="1.4" height="11" fill="#FEC50C" />
        </>
      );
    case "KG":
      return (
        <>
          <rect width="20" height="15" fill="#E8112D" />
          <circle cx="10" cy="7.5" r="3.4" fill="#FFEF00" />
          <circle cx="10" cy="7.5" r="2.2" fill="#E8112D" />
        </>
      );
    case "TJ":
      return (
        <>
          {hStripes(["#CC0000", "#FFFFFF", "#006600"], [2, 3, 2])}
          <circle cx="10" cy="7.5" r="1.3" fill="#F8C300" />
        </>
      );
    case "TM":
      return (
        <>
          <rect width="20" height="15" fill="#00843D" />
          <rect x="2.2" y="0" width="3.2" height="15" fill="#D22630" />
          <circle cx="9.2" cy="5.5" r="2" fill="#FFFFFF" />
          <circle cx="9.9" cy="5.2" r="1.7" fill="#00843D" />
        </>
      );
    case "AZ":
      return (
        <>
          {hStripes(["#00B5E2", "#EF3340", "#509E2F"])}
          <circle cx="10" cy="7.5" r="1.8" fill="#FFFFFF" />
          <circle cx="10.6" cy="7.5" r="1.45" fill="#EF3340" />
        </>
      );
    case "GE":
      return (
        <>
          <rect width="20" height="15" fill="#FFFFFF" />
          <rect x="8.5" y="0" width="3" height="15" fill="#FF0000" />
          <rect x="0" y="6" width="20" height="3" fill="#FF0000" />
          <circle cx="4.2" cy="3" r="0.9" fill="#FF0000" />
          <circle cx="15.8" cy="3" r="0.9" fill="#FF0000" />
          <circle cx="4.2" cy="12" r="0.9" fill="#FF0000" />
          <circle cx="15.8" cy="12" r="0.9" fill="#FF0000" />
        </>
      );
    case "AL":
      return (
        <>
          <rect width="20" height="15" fill="#E41E20" />
          <ellipse cx="10" cy="7.5" rx="2.8" ry="3.4" fill="#111111" />
        </>
      );
    case "MK":
      return (
        <>
          <rect width="20" height="15" fill="#D20000" />
          <path d="M0,0 L20,15 M20,0 L0,15 M10,0 L10,15 M0,7.5 L20,7.5" stroke="#FFE600" strokeWidth="1.5" />
          <circle cx="10" cy="7.5" r="2.7" fill="#FFE600" stroke="#D20000" strokeWidth="0.8" />
        </>
      );
    case "BA":
      return (
        <>
          <rect width="20" height="15" fill="#002395" />
          <polygon points="6,0 16,0 16,13.5" fill="#FECB00" />
        </>
      );
    case "IR":
      return (
        <>
          {hStripes(["#239F40", "#FFFFFF", "#DA0000"])}
          <circle cx="10" cy="7.5" r="1.4" fill="#DA0000" />
        </>
      );
    case "IQ":
      return (
        <>
          {hStripes(["#CE1126", "#FFFFFF", "#111111"])}
          <rect x="7" y="6.8" width="6" height="1.4" rx="0.5" fill="#007A3D" />
        </>
      );
    case "SY":
      return (
        <>
          {hStripes(["#CE1126", "#FFFFFF", "#111111"])}
          {star(7.2, 7.5, 1.2, "#007A3D")}
          {star(12.8, 7.5, 1.2, "#007A3D")}
        </>
      );
    case "TN":
      return (
        <>
          <rect width="20" height="15" fill="#E70013" />
          <circle cx="10" cy="7.5" r="3.6" fill="#FFFFFF" />
          <circle cx="10.4" cy="7.5" r="2.4" fill="#E70013" />
          <circle cx="11.1" cy="7.5" r="1.9" fill="#FFFFFF" />
        </>
      );
    case "DZ":
      return (
        <>
          {vStripes(["#006233", "#FFFFFF"])}
          <circle cx="10.2" cy="7.5" r="3.1" fill="#D21034" />
          <circle cx="11.2" cy="7.5" r="2.4" fill="#FFFFFF" />
        </>
      );
    case "ET":
      return (
        <>
          {hStripes(["#078930", "#FCDD09", "#DA121A"])}
          <circle cx="10" cy="7.5" r="2.6" fill="#0F47AF" />
          {star(10, 7.5, 1.5, "#FCDD09")}
        </>
      );
    case "SO":
      return (
        <>
          <rect width="20" height="15" fill="#4189DD" />
          {star(10, 7.5, 3.3, "#FFFFFF")}
        </>
      );
    case "TZ":
      return (
        <>
          <rect width="20" height="15" fill="#1EB53A" />
          <polygon points="0,15 20,0 20,15" fill="#00A3DD" />
          <line x1="-2" y1="16.5" x2="22" y2="-1.5" stroke="#FCD116" strokeWidth="4.6" />
          <line x1="-2" y1="16.5" x2="22" y2="-1.5" stroke="#111111" strokeWidth="3.0" />
        </>
      );
    case "GH":
      return (
        <>
          {hStripes(["#CF0921", "#FCD20F", "#006B3D"])}
          {star(10, 7.6, 1.8, "#111111")}
        </>
      );
    case "SN":
      return (
        <>
          {vStripes(["#00853F", "#FDEF42", "#E31B23"])}
          {star(10, 7.5, 1.8, "#00853F")}
        </>
      );
    case "MG":
      return (
        <>
          <rect x="0" y="0" width="7" height="15" fill="#FFFFFF" />
          <rect x="7" y="0" width="13" height="7.5" fill="#FC3D32" />
          <rect x="7" y="7.5" width="13" height="7.5" fill="#007E3A" />
        </>
      );
    case "RW":
      return (
        <>
          {hStripes(["#00A1DE", "#FAD201", "#20603D"], [2, 1, 1])}
          <circle cx="15.5" cy="3.6" r="1.4" fill="#E5BE01" />
        </>
      );
    case "ZW":
      return (
        <>
          {hStripes(["#319208", "#FFD200", "#DE2010", "#111111", "#DE2010", "#FFD200", "#319208"])}
          <polygon points="0,0 8.5,7.5 0,15" fill="#FFFFFF" stroke="#111111" strokeWidth="0.9" />
          {star(3.2, 7.5, 1.5, "#DE2010")}
        </>
      );
    case "LS":
      return (
        <>
          {hStripes(["#00209F", "#FFFFFF", "#009543"])}
          <circle cx="10" cy="7.5" r="1.6" fill="#111111" />
        </>
      );
    case "ER":
      return (
        <>
          <rect width="20" height="7.5" fill="#12AD2B" />
          <rect y="7.5" width="20" height="7.5" fill="#4189DD" />
          <polygon points="0,0 16,7.5 0,15" fill="#EA0437" />
          <circle cx="4.5" cy="7.5" r="2.1" fill="none" stroke="#FFC726" strokeWidth="1" />
        </>
      );
    case "CD":
      return (
        <>
          <rect width="20" height="15" fill="#007FFF" />
          <line x1="0" y1="15" x2="20" y2="0" stroke="#F7D618" strokeWidth="4.2" />
          <line x1="0" y1="15" x2="20" y2="0" stroke="#CE1021" strokeWidth="2.8" />
          {star(4, 3.6, 1.7, "#F7D618")}
        </>
      );
    case "ZM":
      return (
        <>
          <rect width="20" height="15" fill="#198A00" />
          <rect x="12.5" y="5.5" width="2.5" height="9.5" fill="#DE2010" />
          <rect x="15" y="5.5" width="2.5" height="9.5" fill="#111111" />
          <rect x="17.5" y="5.5" width="2.5" height="9.5" fill="#EF7D00" />
        </>
      );
    case "MW":
      return (
        <>
          {hStripes(["#111111", "#CE1126", "#339E35"])}
          <circle cx="10" cy="5" r="2.5" fill="#CE1126" />
        </>
      );
    case "SD":
      return (
        <>
          {hStripes(["#D21034", "#FFFFFF", "#111111"])}
          <polygon points="0,0 8.5,7.5 0,15" fill="#007229" />
        </>
      );
    case "BI":
      return (
        <>
          <rect width="20" height="15" fill="#1EB53A" />
          <polygon points="0,0 20,0 10,7.5" fill="#CE1126" />
          <polygon points="0,15 20,15 10,7.5" fill="#CE1126" />
          <path d="M0,0 L20,15 M20,0 L0,15" stroke="#FFFFFF" strokeWidth="1.8" />
          <circle cx="10" cy="7.5" r="3" fill="#FFFFFF" />
        </>
      );
    case "UG":
      return (
        <>
          {hStripes(["#111111", "#FCDC04", "#D90000", "#111111", "#FCDC04", "#D90000"])}
          <circle cx="10" cy="7.5" r="2.3" fill="#FFFFFF" />
        </>
      );
    case "AO":
      return (
        <>
          {hStripes(["#CC092F", "#111111"])}
          <circle cx="10" cy="7.5" r="2.2" fill="none" stroke="#FFCB00" strokeWidth="1.1" />
        </>
      );
    case "CF":
      return (
        <>
          {hStripes(["#003082", "#FFFFFF", "#289728", "#FFCE00"])}
          <rect x="8.3" y="0" width="3.4" height="15" fill="#D21034" />
          {star(3.3, 2, 1.1, "#FFCE00")}
        </>
      );
    case "MV":
      return (
        <>
          <rect width="20" height="15" fill="#D21034" />
          <rect x="3" y="2.5" width="14" height="10" fill="#007E3A" />
          <circle cx="10.8" cy="7.5" r="2.6" fill="#FFFFFF" />
          <circle cx="11.8" cy="7.5" r="2.2" fill="#007E3A" />
        </>
      );
    case "PG":
      return (
        <>
          <rect width="20" height="15" fill="#111111" />
          <polygon points="0,0 20,0 20,15" fill="#CE1126" />
          <circle cx="14.2" cy="5.2" r="2.1" fill="#FCD116" />
        </>
      );
    case "TL":
      return (
        <>
          <rect width="20" height="15" fill="#DC241F" />
          <polygon points="0,0 11,7.5 0,15" fill="#FFC726" />
          <polygon points="0,0 7.5,7.5 0,15" fill="#111111" />
          {star(2.7, 7.5, 1.4, "#FFFFFF")}
        </>
      );
    case "CW":
      return (
        <>
          <rect width="20" height="15" fill="#002B7F" />
          <rect x="0" y="9.5" width="20" height="2.2" fill="#F9E814" />
          {star(3.2, 3.2, 1.2, "#FFFFFF")}
          {star(5.8, 5.2, 1.5, "#FFFFFF")}
        </>
      );
    case "MH":
      return (
        <>
          <rect width="20" height="15" fill="#003893" />
          <polygon points="0,15 20,2 20,5" fill="#FFFFFF" />
          <polygon points="0,15 20,0 20,2.5" fill="#DD7500" />
          {star(4.4, 4.4, 2.1, "#FFFFFF")}
        </>
      );
    case "WS":
      return (
        <>
          <rect width="20" height="15" fill="#CE1126" />
          <rect width="10" height="8" fill="#002B7F" />
          <circle cx="5" cy="2.3" r="0.6" fill="#FFFFFF" />
          <circle cx="3.2" cy="4" r="0.6" fill="#FFFFFF" />
          <circle cx="6.8" cy="4" r="0.6" fill="#FFFFFF" />
          <circle cx="5" cy="5.8" r="0.7" fill="#FFFFFF" />
        </>
      );
    case "TO":
      return (
        <>
          <rect width="20" height="15" fill="#C10000" />
          <rect width="9" height="7.5" fill="#FFFFFF" />
          <rect x="3.7" y="1.5" width="1.6" height="4.5" fill="#C10000" />
          <rect x="2.2" y="2.9" width="4.6" height="1.6" fill="#C10000" />
        </>
      );
    case "VU":
      return (
        <>
          {hStripes(["#D21034", "#111111", "#009543"], [6, 2, 6])}
          <polygon points="0,0 9,7.5 0,15" fill="#111111" stroke="#FDCE12" strokeWidth="1" />
        </>
      );
    case "KI":
      return (
        <>
          {hStripes(["#CE1126", "#FFFFFF", "#003F87", "#FFFFFF", "#003F87"], [7, 1.5, 2, 1.5, 2])}
          <circle cx="10" cy="5.5" r="2.2" fill="#FCD116" />
        </>
      );
    case "PF":
      return (
        <>
          {hStripes(["#CE1126", "#FFFFFF", "#CE1126"], [1, 2, 1])}
          <circle cx="10" cy="7.5" r="2.2" fill="#FCD116" />
        </>
      );
    case "GT":
      return (
        <>
          {vStripes(["#4997D0", "#FFFFFF", "#4997D0"])}
          <circle cx="10" cy="7.5" r="1.5" fill="#6AA84F" />
        </>
      );
    case "PY":
      return (
        <>
          {hStripes(["#D52B1E", "#FFFFFF", "#0038A8"])}
          <circle cx="10" cy="7.5" r="1.3" fill="#FCD116" />
        </>
      );
    case "EO":
      return (
        <>
          <rect width="20" height="15" fill="#009900" />
          <rect width="8.5" height="7.5" fill="#FFFFFF" />
          {star(4.25, 3.75, 2.3, "#009900")}
        </>
      );
    case "TLH":
      return (
        <>
          <rect width="20" height="15" fill="#8B1218" />
          <polygon points="10,2.5 14.2,12 10,9.5 5.8,12" fill="#F8FAFC" />
        </>
      );
    case "ME":
      return (
        <>
          <rect width="20" height="15" fill="#C40308" />
          <rect x="0.8" y="0.8" width="18.4" height="13.4" fill="none" stroke="#D4AF37" strokeWidth="1.2" />
          <circle cx="10" cy="7.5" r="2.3" fill="#D4AF37" />
        </>
      );
    default:
      break;
  }

  const hSpec = H_FLAG_SPECS[code];
  if (hSpec) {
    return Array.isArray(hSpec[0]) ? hStripes(hSpec[0], hSpec[1]) : hStripes(hSpec);
  }

  const vSpec = V_FLAG_SPECS[code];
  if (vSpec) {
    return Array.isArray(vSpec[0]) ? vStripes(vSpec[0], vSpec[1]) : vStripes(vSpec);
  }

  return (
    <>
      <rect width="20" height="15" fill="#2563EB" />
      <circle cx="10" cy="7.5" r="4.2" fill="none" stroke="#FFFFFF" strokeWidth="1.1" />
    </>
  );
}

export function LanguageFlag({ zhName, localeCode, size = 16, className = "" }) {
  const code = React.useMemo(
    () => resolveFlagCode({ zhName, localeCode }),
    [zhName, localeCode]
  );
  const width = size;
  const height = Math.round((size * 3) / 4);

  return (
    <span
      className={`ndt-lang-flag ${className}`.trim()}
      aria-hidden="true"
      style={{ width, height }}
    >
      <svg
        viewBox="0 0 20 15"
        width={width}
        height={height}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", borderRadius: "2.5px" }}
      >
        {renderFlagContent(code)}
        <rect
          x="0.4"
          y="0.4"
          width="19.2"
          height="14.2"
          rx="2.1"
          fill="none"
          stroke="rgba(128, 128, 128, 0.28)"
          strokeWidth="0.8"
        />
      </svg>
    </span>
  );
}
