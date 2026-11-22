# 各大浏览器扩展商店上架清单与审核填报指南

> 适用版本：无登翻译 (Modern Translator) v1.0.0  
> 打包命令：`npm run pack` -> 生成 `release/modern-translator-v1.0.0.zip`

---

## 一、快速检查清单

- [x] `npm run pack` 生成根目录包含 `manifest.json` 的 `.zip`（无 `.map` 源码映射文件）
- [x] 规范尺寸图标：`public/icons/icon16.png`、`icon48.png`、`icon128.png`
- [x] 商店图标物料：`store-assets/chrome-icon-128.png`（Chrome 128×128）、`store-assets/edge-icon-300.png`（Edge 300×300）
- [x] 中英文多语言描述：`public/_locales/zh_CN/messages.json`、`public/_locales/en/messages.json`
- [x] 隐私政策文件：`PRIVACY.md` 与静态页面 `docs/privacy.html`（GitHub Pages：`https://wesele.github.io/ModernTranslator/privacy.html`）
- [ ] **截图物料（需你在本地浏览器实机截取）**：
  - 至少 1 张（建议 3–5 张）**`1280×800`** 或 **`640×400`** PNG/JPG 截图（不能有透明通道，建议展示：1. 网页划词浮窗翻译；2. 网页全文双语对照；3. 设置页大模型/流式配置；4. 弹出控制面板）
  - 可选小型宣传图：**`440×280`** PNG/JPG（Chrome Web Store 推荐）

---

## 二、商店详情页文案（可直接复制）

### 中文（zh_CN）
- **名称**：无登翻译
- **一句话简介（Summary，132 字内）**：
  完全免费、公益性质的划词与网页全文翻译扩展，支持双语对照、大模型流式批量翻译、微软/谷歌翻译、友情赞助商接口及自定义 OpenAI 兼容服务。
- **详细介绍（Description）**：
  无登翻译是一款完全免费、公益性质、无广告且无任何付费门槛的浏览器划词与网页全文翻译扩展，旨在减少繁杂设置，提供流畅的双语阅读体验。

  主要功能：
  1. 网页划词翻译：选中网页文本即可弹出悬浮译文，支持多引擎对比、一键复制与语音朗读（TTS）。
  2. 网页全文翻译：支持双语对照、仅显示译文、仅显示原文三种模式一键切换，并支持自定义译文排版样式。
  3. 大模型流式批量翻译：支持并发节流与分段流式输出，大幅提升长网页翻译速度。
  4. 多引擎自由切换：内置微软翻译、谷歌翻译、友情赞助商大模型接口，并支持添加任意 OpenAI 兼容接口。
  5. 跨 iframe 与本地缓存：支持内嵌 iframe 选区同步，短语结果本地缓存，响应更迅速。

### English（en）
- **Name**：Modern Translator
- **Summary**：
  Completely free, non-profit selection & full-page translator with bilingual view, streaming LLM batch translation, Microsoft/Google engines, community sponsor LLM, and custom OpenAI-compatible APIs.
- **Description**：
  Modern Translator is a completely free, non-profit (public-interest), ad-free browser extension for instant text selection translation and full-page bilingual reading.

  Key Features:
  1. Selection Popover: Translate selected text anywhere on a page with multi-engine support, one-click copy, and text-to-speech playback.
  2. Full-Page Translation: Toggle seamlessly between Bilingual, Translated-only, and Original views with customizable styles.
  3. Streaming LLM Batch Engine: High-speed batched and throttled streaming translation for long articles.
  4. Flexible Engines: Built-in Microsoft Translator, Google Translate, Community Sponsor LLM, plus custom OpenAI-compatible endpoints.
  5. Cross-iframe & Local Cache: Smooth selection across iframes and local IndexedDB caching for frequent phrases.

---

## 三、Chrome Web Store / Edge 审核填报模板

### 1. 单一用途声明（Single Purpose）
- **中文**：本扩展仅有一个核心用途：为用户的网页浏览提供文本划词翻译、网页全文翻译及译文朗读功能。
- **English**：This extension has a single purpose: translating user-selected text and webpage content into the user's target language, along with optional text-to-speech playback of the translated text.

### 2. 权限用途逐项说明（Permission Justifications）

> 提示：Chrome 审核后台为英文界面时，直接粘贴下方 **English** 文案即可。

| 权限 / Permission | English Justification (可直接复制填表) | 中文说明 |
|---|---|---|
| `host_permissions: <all_urls>` | Required to inject the selection translation UI and full-page bilingual translation into any webpage the user visits, as well as to send translation requests to user-configured OpenAI-compatible API endpoints. | 用于在用户浏览的任意网页注入划词浮窗与全文双语译文，并允许向用户自定义的 OpenAI 兼容接口发起翻译请求。 |
| `storage` | Used to persist user preferences (target language, selected engines, UI theme, and custom OpenAI endpoint configurations) in `chrome.storage.local` and transient tab state in `chrome.storage.session`. | 用于保存用户翻译偏好、自定义接口配置及临时会话状态。 |
| `contextMenus` | Used to add right-click context menu items for translating selected text, translating the current webpage, or toggling display modes. | 用于在右键菜单提供“翻译选中文本”“全文翻译”等快捷入口。 |
| `clipboardWrite` | Used to copy translated text to the clipboard when the user clicks the copy button or enables auto-copy. | 用于用户点击复制译文或开启自动复制时写入剪贴板。 |
| `offscreen` | Used by the Manifest V3 service worker to create an offscreen document (`offscreen.html`) for clipboard writing and audio (TTS) playback, which are unavailable directly in service workers. | MV3 Service Worker 无法直接操作 DOM 剪贴板和 Audio 对象，因此通过 `offscreen.html` 完成复制与语音朗读。 |
| `webRequest` | Used strictly when the user selects Google Translate's precise translation mode to inspect the `batchexecute` request parameters/headers from an ephemeral Google Translate popup window so the translation request can be executed reliably. | 仅在用户主动选择谷歌“精确翻译”模式时，用于监听临时窗口发往 Google Translate 的 `batchexecute` 请求参数以完成翻译调用。 |
| `declarativeNetRequestWithHostAccess` | Used with `net_request_rules.json` to remove `Cross-Origin-Resource-Policy` on `translate.googleapis.com/translate_tts` (enabling TTS audio playback) and set `Origin`/`Referer` headers for `translate.google.com/_/TranslateWebserverUi/data/batchexecute`. | 通过静态规则移除谷歌 TTS 音频跨域限制头，并为谷歌网页翻译接口补全 `Origin`/`Referer` 请求头。 |
| **Remote Code** | **No, I am not using Remote code.** All JavaScript/CSS is bundled locally into the extension package via esbuild at build time. | **不使用远程代码**（所有脚本均由 esbuild 本地打包）。 |

### 3. Chrome Web Store 数据使用声明（Data Usage）
在“Privacy practices -> Data usage”中：
- 勾选 **Website content**（如果后台提示传输页面文本：说明仅在用户主动触发划词或全文翻译时发送文本至选定的翻译引擎）。
- 勾选以下三项承诺声明：
  1. I do not sell or transfer user data to third parties, outside of the approved use cases.
  2. I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
  3. I do not use or transfer user data to determine creditworthiness or for lending purposes.

---

## 四、提审前最终操作步骤

1. **托管隐私政策**：启用 GitHub Pages（`main` 分支 `/docs` 目录）即可通过 `https://wesele.github.io/ModernTranslator/privacy.html` 访问。
2. **生成安装包**：在项目根目录执行 `npm run pack`，得到 `release/modern-translator-v1.0.0.zip`。
3. **本地验收**：打开 `chrome://extensions/`（和 `edge://extensions/`），将 `dist/` 加载为已解压扩展，验证图标、名称、划词翻译、全文翻译、设置页与朗读均正常工作，同时截取 `1280×800` 功能截图。
4. **上传提审**：
   - Chrome Web Store：上传 `release/modern-translator-v1.0.0.zip` + `store-assets/chrome-icon-128.png` + 截图 + 隐私政策 URL + 上表英文权限说明。
   - Microsoft Edge Add-ons：上传同一份 `release/modern-translator-v1.0.0.zip` + `store-assets/edge-icon-300.png` + 截图 + 隐私政策 URL。
