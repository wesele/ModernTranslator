const actions = [
  { value: "translate", label: "翻译这段文本" },
  { value: "page-translate", label: "网页全文翻译" },
];

const actionValues = actions.map((item) => item.value);

export { actionValues as $, actions as T };
