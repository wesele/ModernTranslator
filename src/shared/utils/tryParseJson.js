import createDebug from "debug";
const parseJsonLog = createDebug("ndt:tryParseJson");

export function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    parseJsonLog("JSON 解析失败，返回原始字符串：%o", err);
    return text;
  }
}

export { tryParseJson as N };
