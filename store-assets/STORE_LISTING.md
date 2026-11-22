# 各大浏览器扩展商店上架清单与审核填报指南

> 适用版本：无登翻译 (Modern Translator / short_name: ModernTrans) v1.0.0  
> 联系邮箱：`wh1018@gmail.com`  
> 主页与源码：`https://github.com/wesele/ModernTranslator`  
> 欧盟 DSA 身份声明：**Non-Trader**（非商业个人开源开发者）  
> 打包命令：`npm run pack` -> 生成 `release/modern-translator-v1.0.0.zip`

---

## 一、快速检查清单

- [x] `npm run pack` 生成根目录包含 `manifest.json` 的 `.zip`（无 `.map` 源码映射文件，且自动校验所有 `_locales/*/messages.json` 的 `description` <= 132 字符）
- [x] `short_name` 已设为 `ModernTrans`（11 字符 <= 12 字符推荐上限）
- [x] 规范尺寸图标：`public/icons/icon16.png`、`icon48.png`、`icon128.png`
- [x] 商店图标物料：`store-assets/chrome-icon-128.png`（Chrome 128×128）、`store-assets/edge-icon-300.png`（Edge 300×300）
- [x] 多语言 Manifest 描述（均 <= 132 字符）：`zh_CN`、`en`、`de`、`es`、`fr`、`ja`、`ko`
- [x] 隐私政策文件：`PRIVACY.md` 与静态页面 `docs/privacy.html`（已含 `wh1018@gmail.com`、Non-Trader 说明与完整权限披露；推送到 GitHub `main` 后通过 `https://wesele.github.io/ModernTranslator/privacy.html` 访问）
- [ ] **截图物料（需你在本地浏览器实机截取）**：
  - 至少 1 张（建议 3–5 张）**`1280×800`** 或 **`640×400`** PNG/JPG 截图（不能有透明通道，建议展示：1. 网页划词浮窗翻译；2. 网页全文双语对照；3. 设置页大模型/流式配置；4. 弹出控制面板）
  - 可选小型宣传图：**`440×280`** PNG/JPG（Chrome Web Store 推荐，不能有透明通道）

---

## 二、商店详情页文案（可直接复制）

### 中文（zh_CN）
- **名称**：无登翻译
- **Short Name**：`ModernTrans`
- **一句话简介（Summary，132 字内）**：
  完全免费、公益性质的划词与网页全文翻译扩展，支持双语对照、大模型流式批量翻译、微软/谷歌翻译、友情赞助商大模型AI接口及自定义 OpenAI 兼容服务。
- **详细介绍 / 商店概述（Description）**：
  完全免费、公益性质的划词与网页全文翻译扩展，支持双语对照、大模型流式批量翻译、微软/谷歌翻译、友情赞助商大模型AI接口及自定义 OpenAI 兼容服务。

  三大独特功能：1. 超级流式大模型API调用，快而省。2. 开箱即用，大模型API社区互助。3. 现代极简界面。

### English（en）
- **Name**：Modern Translator
- **Short Name**：`ModernTrans`
- **Summary（<= 132 字符，与 `_locales/en/messages.json` 一致）**：
  Free selection & full-page translator with bilingual view, streaming LLM batching, Microsoft/Google, and custom OpenAI APIs.
- **Description**：
  A completely free, non-profit, open-source, ad-free extension for selection and full-page bilingual translation, supporting streaming LLM batching, Microsoft/Google Translate, a community sponsor LLM API, and custom OpenAI-compatible services.

  Three unique highlights:
  1. Super-streaming LLM API calls — fast and token-efficient.
  2. Out-of-the-box community-sponsored LLM API support.
  3. Modern, minimalist UI.

  Note: Google Translate and Microsoft Translator are used as translation engines via user-triggered requests; this extension is an independent open-source project and is not affiliated with or endorsed by Google, Microsoft, or OpenAI.

---

## 三、Chrome Web Store / Edge 审核填报模板

### 1. 账号与基础信息（Account / Store Listing）
- **Support Email / Contact Email**：`wh1018@gmail.com`
- **Homepage / Support URL**：`https://github.com/wesele/ModernTranslator`
- **Privacy Policy URL**：`https://wesele.github.io/ModernTranslator/privacy.html`
- **EU Digital Services Act (DSA)**：选择 **Non-Trader**（非商业个人开发者）

### 2. 单一用途声明（Single Purpose）
- **中文**：本扩展仅有一个核心用途：为用户的网页浏览提供文本划词翻译、网页全文翻译及译文朗读功能。
- **English**：This extension has a single purpose: translating user-selected text and webpage content into the user's target language, along with optional text-to-speech playback of the translated text.

### 3. 权限用途逐项说明（Permission Justifications）

> 提示：Chrome 审核后台为英文界面时，直接粘贴下方 **English** 文案即可。

| 权限 / Permission | English Justification (可直接复制填表) | 中文说明 |
|---|---|---|
| `host_permissions: <all_urls>` | Required to inject the selection translation UI and full-page bilingual translation into any webpage the user visits, as well as to send translation requests to built-in translation engines and user-configured OpenAI-compatible API endpoints. | 用于在用户浏览的任意网页注入划词浮窗与全文双语译文，并允许向内置引擎及用户自定义的 OpenAI 兼容接口发起翻译请求。 |
| `storage` | Used to persist user preferences (target language, selected engines, UI theme, and custom OpenAI endpoint configurations) locally in `chrome.storage.local` and transient per-tab/window auto-translate state in `chrome.storage.session`. | 用于在本地保存用户翻译偏好、自定义接口配置及临时会话状态。 |
| `contextMenus` | Used to add right-click context menu items for translating selected text or translating the current webpage. | 用于在右键菜单提供“翻译选中文本”“全文翻译”等快捷入口。 |
| `clipboardWrite` | Required alongside `offscreen` (`Reason.CLIPBOARD`) to copy translated text to the clipboard when the user clicks the copy button or enables auto-copy. | 配合 `offscreen` 离屏文档，在用户点击复制译文或开启自动复制时写入剪贴板。 |
| `offscreen` | Used by the Manifest V3 service worker to create an offscreen document (`offscreen.html`) for clipboard writing and audio (TTS) playback, which are unavailable directly in service workers. | MV3 Service Worker 无法直接操作 DOM 剪贴板和 Audio 对象，因此通过 `offscreen.html` 完成复制与语音朗读。 |
| `declarativeNetRequestWithHostAccess` | Used with `net_request_rules.json` strictly to remove `Cross-Origin-Resource-Policy` on `translate.googleapis.com/translate_tts` so TTS audio playback works cleanly. | 通过静态规则移除谷歌 TTS 音频跨域限制头。 |
| **Remote Code** | **No, I am not using Remote code.** All JavaScript/CSS is bundled locally into the extension package via esbuild at build time. (Note: `google.js` fetches `translate_a/element.js` purely as plain text to extract a token via regex and `JSON.parse`; it never evaluates or executes any fetched script.) | **不使用远程代码**（所有脚本均由 esbuild 本地打包；`google.js` 仅以纯文本正则解析 token，不执行任何远程脚本）。 |

### 4. Chrome Web Store 数据使用声明（Data Usage）
在“Privacy practices -> Data usage”中：
- 勾选 **Website content**（说明仅在用户主动触发划词或全文翻译时，才将所选文本或可见页面段落发送至用户选定的翻译引擎，不会在后台收集浏览历史）。
- 勾选以下三项承诺声明：
  1. I do not sell or transfer user data to third parties, outside of the approved use cases.
  2. I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
  3. I do not use or transfer user data to determine creditworthiness or for lending purposes.

---

## 四、提审前最终操作步骤

1. **推送最新代码与隐私政策**：将本次修改提交并 `git push` 到 `origin/main`，确保 GitHub Pages（`https://wesele.github.io/ModernTranslator/privacy.html`）同步为最新版隐私政策。
2. **确认压缩包为最新**：执行 `npm run pack`，生成最新 `release/modern-translator-v1.0.0.zip`（本次已同步打包验证）。
3. **本地验收与截图**：打开 `chrome://extensions/`（和 `edge://extensions/`），将 `dist/` 加载为已解压扩展，验证图标、名称、划词翻译、全文翻译、设置页与朗读均正常工作，同时截取 `1280×800`（无透明通道）功能截图。
4. **上传提审**：
   - Chrome Web Store：上传 `release/modern-translator-v1.0.0.zip` + `store-assets/chrome-icon-128.png` + 截图 + 隐私政策 URL + `wh1018@gmail.com` + EU DSA `Non-Trader` + 上表英文权限说明。
   - Microsoft Edge Add-ons：上传同一份 `release/modern-translator-v1.0.0.zip` + `store-assets/edge-icon-300.png` + 截图 + 隐私政策 URL。
