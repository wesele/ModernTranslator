# 隐私政策 / Privacy Policy — 无登翻译 (Modern Translator)

最近更新 / Last Updated: 2026-11-22

---

## 中文说明

**无登翻译（Modern Translator）** 是一款完全免费、公益性质的浏览器扩展，无任何商业收费、内购或广告。本扩展尊重并保护您的隐私，仅用于提供网页划词翻译、网页全文翻译与语音朗读功能。

### 1. 我们处理哪些数据
- **待翻译文本与语言配置**：仅当您主动触发划词翻译、快捷键翻译、右键菜单翻译或网页全文翻译时，扩展会将您选中的文本或当前页面需要翻译的段落文本发送至您所选用的翻译服务。
- **扩展配置与 API 密钥**：您的语言偏好、界面样式、自定义 OpenAI 兼容接口地址及 API Key 仅保存在您本地浏览器的 `chrome.storage.local` 中，不会上传到任何与翻译请求无关的服务器。
- **本地翻译缓存**：为了减少重复请求并加快短语响应速度，短词与短句的翻译结果会缓存在您本地浏览器的 IndexedDB（`ndt_translation_cache`）中，您可随时在扩展设置页清空缓存。

### 2. 数据发送到哪里
本扩展不会在后台自动采集您的浏览历史或网页内容。仅在您触发翻译或朗读时，文本才会按您配置的引擎发送至对应服务端点：
- **微软翻译（Microsoft Translator）**
- **谷歌翻译（Google Translate）**
- **友情赞助商服务（`https://api.19781018.xyz`）**（公益赞助接口，仅在您启用该服务或查询额度时连接）
- **您自行配置的 OpenAI 兼容接口**：仅发送至您填写的 Base URL

### 3. 我们不收集或从事的行为
- 不收集个人身份信息（姓名、邮箱、手机号等）。
- 不植入第三方广告、行为分析或埋点追踪 SDK。
- 不向任何第三方出售、出租或共享用户数据。

### 4. 权限说明
- **`<all_urls>`（所有网站访问权限）**：用于在您浏览的网页中注入划词浮窗与双语对照译文，并向您配置的翻译接口发起网络请求。
- **`storage`**：保存本地设置、引擎配置与翻译状态。
- **`contextMenus`**：提供右键“翻译选中文本 / 翻译当前网页”等菜单项。
- **`clipboardWrite` 与 `offscreen`**：用于点击复制译文时后台写入剪贴板及播放语音朗读（TTS）。
- **`webRequest` 与 `declarativeNetRequestWithHostAccess`**：仅用于在用户使用谷歌翻译相关功能时适配其接口请求头与语音资源跨域头，不会读取或修改其他无关网站的流量。

---

## English Version

**Modern Translator** is a completely free, non-profit (public-interest) browser extension with no paid tiers, in-app purchases, or ads. It respects and protects your privacy and is solely designed for text selection translation, full-page bilingual translation, and text-to-speech playback.

### 1. Data We Process
- **Text to Translate**: Only when you explicitly trigger a selection translation, context menu action, shortcut, or full-page translation does the extension send the selected text or visible page paragraphs to your chosen translation provider.
- **Settings & API Keys**: Your preferences, custom OpenAI-compatible endpoints, and API keys are stored locally in your browser via `chrome.storage.local` and are never uploaded to unrelated servers.
- **Local Translation Cache**: Short phrases and single-word lookups are cached locally in IndexedDB (`ndt_translation_cache`) to reduce redundant API calls. You can clear this cache at any time from the extension settings page.

### 2. Third-Party & External Endpoints
The extension does not collect browsing history in the background. Translation or TTS requests are only sent to the provider you choose:
- **Microsoft Translator**
- **Google Translate**
- **Community Sponsor LLM Service (`https://api.19781018.xyz`)** (only when enabled or checking token quota)
- **User-configured OpenAI-compatible APIs** (sent strictly to the Base URL you configured)

### 3. What We Do Not Do
- We do not collect personally identifiable information (PII).
- We do not include third-party advertising or analytics trackers.
- We do not sell, rent, or transfer user data for unrelated purposes.

### 4. Contact
If you have any questions about this privacy policy, please contact the developer via the support channel listed on the extension's store page.
