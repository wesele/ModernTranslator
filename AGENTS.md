# AGENTS.md

本文件为本仓库（无登翻译 / Modern Translator MV3 扩展）的工程与协作规范，所有 Agent 与开发者必须严格遵守。

---

## 铁律：界面多语言必须同步实现（i18n Iron Rule）

**任何新增或修改用户可见界面的工作，必须同步完成完整的多语言（i18n）支持，严禁事后补票或遗漏任一语种。**

1. **禁止硬编码用户可见文案**
   - 所有用户可见文本（包括按钮、标题、标签、占位符 `placeholder`、`title`、`aria-label`、Toast 提示、空状态文案、进度文案、右键菜单、视频播放器注入控件、以及会展示给用户的错误提示与导出标签）**必须**通过 `src/shared/i18n/index.js` 提供的 `useI18n()`（React 组件）或 `t()`（非 React / Background / Vanilla DOM 模块）获取。
   - 严禁在 `.jsx` / `.js` 中直接写死中文或英文界面字符串（内部存储用的规范语言键名如 `"中文(简体)"`、`debug` 调试日志及 LLM 内部系统指令除外）。
   - 展示规范语言名时，必须通过 `getLanguageName()` / `getLocalizedLanguageName()` 转为当前界面语言。

2. **7 种界面语言必须全量同步补齐**
   - 本项目支持的界面语言定义于 `src/shared/i18n/locales.js`，当前为 **7 种**：
     `zh`（中文）、`en`（English）、`es`（Español）、`fr`（Français）、`de`（Deutsch）、`ja`（日本語）、`ko`（한국어）。
   - 每次在 `src/shared/i18n/messages.js` 中新增、修改或删除 key 时，**必须在同一提交 / 同一次任务内同步更新全部 7 个语种字典**，并保证所有 `{placeholder}` 变量名完全一致。
   - 若修改扩展名称、描述或快捷键命令说明，须同步更新 `public/_locales/{zh_CN,en,es,fr,de,ja,ko}/messages.json`。

3. **动态语言切换响应**
   - React 组件必须使用 `useI18n()`，确保切换界面语言后即时重渲染。
   - 非 React 的原生 DOM 注入控件（如视频播放器按钮、右键菜单等）必须通过 `subscribeUiLocale()` 监听语言变更并实时刷新文案、`title` 与 `aria-label`。

4. **交付前必须验收**
   - 每次涉及界面的改动完成后，交付前必须校验：
     1. `src/shared/i18n/messages.js` 中全部 7 个语种的 key 集合完全一致（零缺失、零多余），且占位符 `{var}` 完全对齐。
     2. 修改或新增的界面文件中不存在遗漏的硬编码中文/英文可见文本。
     3. 执行 `npm run build`（必要时 `npm run build:all`）确认 Chrome / Firefox 构建均无报错。

---

## 项目常用命令

- 构建 Chrome 版本：`npm run build`
- 构建 Firefox 版本：`npm run build:firefox`
- 全平台构建：`npm run build:all`
- 打包发布包：`npm run pack:all`
- 代码格式化：`npm run format`
