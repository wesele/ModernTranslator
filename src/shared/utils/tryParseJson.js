export function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("JSON 解析失败，返回原始字符串：", err);
    return text;
  }
}

export { tryParseJson as N };
