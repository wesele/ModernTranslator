# 隐私政策 / Privacy Policy — 无登翻译 (Modern Translator)

最近更新 / Last Updated: 2026-11-22

---

## 中文说明

**无登翻译（Modern Translator，简称 ModernTrans）** 是一款由个人非营利开发者（EU DSA 下的 Non-Trader 非商业主体）维护的完全免费、公益性质的开源浏览器扩展，无任何商业收费、内购或广告。本扩展尊重并保护您的隐私，仅用于提供网页划词翻译、网页全文双语对照翻译与语音朗读功能。

### 1. 我们处理哪些数据
- **待翻译文本与语言配置**：仅当您主动触发划词翻译、快捷键翻译、右键菜单翻译或网页全文翻译时，扩展会将您选中的文本或当前页面需要翻译的段落文本发送至您所选用的翻译服务。
- **扩展配置与 API 密钥**：您的语言偏好、界面样式、自定义 OpenAI 兼容接口地址及 API Key 仅保存在您本地浏览器的 `chrome.storage.local` 中，不会上传到任何与翻译请求无关的服务器。
- **临时会话状态**：整页自动翻译的标签页/窗口状态仅保存在本地浏览器的 `chrome.storage.session` 中，随浏览器会话结束自动清除。
- **本地翻译缓存**：为了减少重复请求并加快短语响应速度，短词与短句的翻译结果会缓存在您本地浏览器的 IndexedDB（`ndt_translation_cache`）中，您可随时在扩展设置页清空缓存。

### 2. 数据发送到哪里
本扩展不会在后台自动采集您的浏览历史或网页内容。仅在您触发翻译或朗读时，文本才会按您配置的引擎发送至对应服务端点：
- **微软翻译（Microsoft Translator）**：默认调用微软 Edge 翻译接口（`edge.microsoft.com`），或在配置对应凭据时调用 `api.cognitive.microsofttranslator.com`。
- **谷歌翻译（Google Translate）**：发送至 `translate.googleapis.com`（含 `translate_tts` 语音朗读）、`clients5.google.com` 或您自定义的镜像地址。
- **友情赞助商服务（`https://api.19781018.xyz`）**：外部可选的第三方大模型 API 服务（扩展自身无需登录或付费；仅在您主动填入该服务 API Key 并启用该引擎或查询剩余额度时才会连接）。
- **您自行配置的 OpenAI 兼容接口**：仅发送至您填写的 Base URL。

### 3. 我们不收集或从事的行为
- 不收集个人身份信息（姓名、邮箱、手机号等）。
- 不植入第三方广告、行为分析或埋点追踪 SDK。
- 不向任何第三方出售、出租或共享用户数据。

### 4. 权限说明
- **`<all_urls>`（所有网站访问权限）**：用于在您浏览的网页中注入划词浮窗与双语对照译文，并向您配置的翻译接口（含自定义 OpenAI 兼容端点）发起网络请求。
- **`storage`**：在 `chrome.storage.local` 保存本地设置、引擎配置与翻译偏好，并在 `chrome.storage.session` 保存临时标签页翻译状态。
- **`contextMenus`**：提供右键“翻译选中文本 / 翻译当前网页”等菜单项。
- **`clipboardWrite` 与 `offscreen`**：用于通过后台离屏文档（`offscreen.html`）完成点击/自动复制译文写入剪贴板，以及播放语音朗读（TTS）。
- **`declarativeNetRequestWithHostAccess`**：仅用于在用户使用谷歌语音朗读（`translate.googleapis.com/translate_tts`）时移除音频响应跨域限制头，不会读取或修改其他无关网站的流量。

### 5. 联系方式
如有任何隐私相关问题、数据咨询或反馈，请通过以下方式联系开发者：
- 电子邮箱：[wh1018@gmail.com](mailto:wh1018@gmail.com)
- 项目主页：<https://github.com/wesele/ModernTranslator>

---

## English Version

**Modern Translator** (`ModernTrans`) is a completely free, non-profit, open-source browser extension maintained by an independent individual developer (**Non-Trader** status under the EU Digital Services Act), with no paid tiers, in-app purchases, or ads. It respects and protects your privacy and is solely designed for text selection translation, full-page bilingual translation, and text-to-speech playback.

### 1. Data We Process
- **Text to Translate**: Only when you explicitly trigger a selection translation, context menu action, shortcut, or full-page translation does the extension send the selected text or visible page paragraphs to your chosen translation provider.
- **Settings & API Keys**: Your preferences, custom OpenAI-compatible endpoints, and API keys are stored locally in your browser via `chrome.storage.local` and are never transmitted to unrelated servers.
- **Transient Session State**: Active tab/window auto-translation states are held locally in `chrome.storage.session` and cleared automatically when the browser session ends.
- **Local Translation Cache**: Short phrases and single-word lookups are cached locally in IndexedDB (`ndt_translation_cache`) to reduce redundant API calls. You can clear this cache at any time from the extension settings page.

### 2. Third-Party & External Endpoints
The extension does not collect browsing history in the background. Translation or TTS requests are only sent to the provider you choose:
- **Microsoft Translator**: Connects to `edge.microsoft.com` (or `api.cognitive.microsofttranslator.com` when configured).
- **Google Translate**: Connects to `translate.googleapis.com` (including `translate_tts` for audio playback), `clients5.google.com`, or a user-configured mirror URL.
- **Community Sponsor LLM Service (`https://api.19781018.xyz`)**: An optional external third-party API endpoint. The extension itself requires no account login or payment; requests to this host are only made if you enable it with an API key or check its quota.
- **User-configured OpenAI-compatible APIs**: Sent strictly to the Base URL you configured.

### 3. What We Do Not Do
- We do not collect personally identifiable information (PII).
- We do not include third-party advertising or analytics trackers.
- We do not sell, rent, or transfer user data for unrelated purposes.

### 4. Permission Disclosures
- **`<all_urls>` (Host Permissions & Content Scripts)**: Required to render the selection translation popover and bilingual full-page translations on webpages you visit, and to dispatch translation requests to built-in or user-configured API endpoints.
- **`storage`**: Persists settings and API configurations locally in `chrome.storage.local` and transient tab auto-translate states in `chrome.storage.session`.
- **`contextMenus`**: Adds right-click menu entries to translate selected text or the current webpage.
- **`clipboardWrite` & `offscreen`**: Allows the Manifest V3 service worker to use an offscreen document (`offscreen.html`) for clipboard copying and audio/TTS playback.
- **`declarativeNetRequestWithHostAccess`**: Used strictly with `net_request_rules.json` to remove `Cross-Origin-Resource-Policy` on `translate.googleapis.com/translate_tts` so TTS audio playback works cleanly. Unrelated traffic is never inspected or modified.

### 5. Contact
If you have any questions about this privacy policy or your data, please contact the developer:
- Email: [wh1018@gmail.com](mailto:wh1018@gmail.com)
- GitHub Repository: <https://github.com/wesele/ModernTranslator>
