# 隐私政策 / Privacy Policy — 无登翻译 (Modern Translator)

最近更新 / Last Updated: 2026-11-27（适用于 v1.1.0 / Applies to v1.1.0）

---

## 中文说明

**无登翻译（Modern Translator，简称 ModernTrans）** 是一款由个人非营利开发者（EU DSA 下的 Non-Trader 非商业主体）维护的完全免费、公益性质的开源浏览器扩展，无任何商业收费、内购或广告。本扩展尊重并保护您的隐私，仅用于提供网页与视频字幕翻译（划词翻译、网页全文双语对照、视频双语字幕），以及与翻译结果配套的语音朗读和本地生词本功能。

### 1. 我们处理哪些数据
- **待翻译文本与语言配置**：仅当您主动触发划词翻译、快捷键翻译、右键菜单翻译或网页全文翻译时，扩展会将您选中的文本或当前页面需要翻译的段落文本发送至您所选用的翻译服务。
- **视频字幕（视频语言课堂）**：仅当您在 YouTube 或哔哩哔哩（B站）视频页主动打开“语言课堂”或使用播放器字幕跳转/复读时，扩展才会获取**当前视频**的标题与字幕轨道；点击生成课前预习时，会把字幕文本发送至您选定的大模型，用于提取难词与生成学习卡片。扩展不会获取您的观看历史、账号信息或其他视频的数据。
- **单词本**：您在语言课堂中主动收藏的单词、短语及其译文、例句，仅保存在本地浏览器的 `chrome.storage.local`（`ndtVocabularyBook`）中，不会上传到任何服务器；您可在扩展内随时删除、清空或导出（TSV）。
- **扩展配置与 API 密钥**：您的语言偏好、界面样式、自定义 OpenAI 兼容接口地址及 API Key 仅保存在您本地浏览器的 `chrome.storage.local` 中，不会上传到任何与翻译请求无关的服务器。
- **临时会话状态**：整页自动翻译的标签页/窗口状态仅保存在本地浏览器的 `chrome.storage.session` 中，随浏览器会话结束自动清除。
- **本地翻译缓存**：为了减少重复请求并加快短语响应速度，短词与短句的翻译结果会缓存在您本地浏览器的 IndexedDB（`ndt_translation_cache`）中，您可随时在扩展设置页清空缓存。

### 2. 数据发送到哪里
本扩展不会在后台自动采集您的浏览历史或网页内容。仅在您触发翻译、朗读或打开视频语言课堂时，数据才会按您的配置发送至对应服务端点：
- **微软翻译（Microsoft Translator）**：默认调用微软 Edge 翻译接口（`edge.microsoft.com`），或在配置对应凭据时调用 `api.cognitive.microsofttranslator.com`。
- **谷歌翻译（Google Translate）**：发送至 `translate.googleapis.com`（含 `translate_tts` 语音朗读）、`clients5.google.com` 或您自定义的镜像地址。
- **友情赞助商服务（`https://api.19781018.xyz`）**：外部可选的第三方大模型 API 服务（扩展自身无需登录或付费；仅在您主动填入该服务 API Key 并启用该引擎或查询剩余额度时才会连接）。
- **您自行配置的 OpenAI 兼容接口**：仅发送至您填写的 Base URL。
- **视频平台字幕接口**：打开语言课堂时，扩展会以您当前的浏览器会话，向视频所在平台请求当前视频的字幕：YouTube（`www.youtube.com/youtubei/v1/*` 及字幕文件地址）、哔哩哔哩（`api.bilibili.com/x/player/*`、`api.bilibili.com/x/web-interface/*`）。这些请求只发往视频平台本身，扩展不会保存或转发您的平台 Cookie。

### 3. 我们不收集或从事的行为
- 不收集个人身份信息（姓名、邮箱、手机号等）。
- 不植入第三方广告、行为分析或埋点追踪 SDK。
- 不向任何第三方出售、出租或共享用户数据。
- 不执行任何远程代码；所有脚本均随扩展安装包一起分发。

### 4. 权限说明
- **`<all_urls>`（所有网站访问权限）**：用于在您浏览的网页中注入划词浮窗与双语对照译文，并向您配置的翻译接口（含自定义 OpenAI 兼容端点）及视频平台字幕接口发起网络请求。
- **`storage`**：在 `chrome.storage.local` 保存本地设置、引擎配置、翻译偏好与生词本，并在 `chrome.storage.session` 保存临时标签页翻译状态。
- **`contextMenus`**：提供右键“翻译选中文本 / 翻译当前网页”等菜单项。
- **`clipboardWrite` 与 `offscreen`**：用于通过后台离屏文档（`offscreen.html`）完成点击/自动复制译文写入剪贴板，以及播放语音朗读（TTS）。
- **`declarativeNetRequestWithHostAccess`**：仅用于在用户使用谷歌语音朗读（`translate.googleapis.com/translate_tts`）时移除音频响应跨域限制头，不会读取或修改其他无关网站的流量。
- **`scripting`**：(1) 扩展安装或更新后，向此前已打开的标签页重新注入扩展**自带**的内容脚本（`c.js` / `ca.js`），避免必须刷新页面才能使用；(2) 您打开 YouTube 语言课堂时，在当前视频页面中运行扩展自带的函数读取播放器的字幕轨道信息。只执行安装包内的代码，不执行任何远程代码。

### 5. 联系方式
如有任何隐私相关问题、数据咨询或反馈，请通过以下方式联系开发者：
- 电子邮箱：[wh1018@gmail.com](mailto:wh1018@gmail.com)
- 项目主页：<https://github.com/wesele/ModernTranslator>

---

## English Version

**Modern Translator** (`ModernTrans`) is a completely free, non-profit, open-source browser extension maintained by an independent individual developer (**Non-Trader** status under the EU Digital Services Act), with no paid tiers, in-app purchases, or ads. It respects and protects your privacy and is solely designed for translating webpages and video subtitles (selection translation, full-page bilingual translation, bilingual video subtitles), with text-to-speech playback and a local wordbook for saved translations.

### 1. Data We Process
- **Text to Translate**: Only when you explicitly trigger a selection translation, context menu action, shortcut, or full-page translation does the extension send the selected text or visible page paragraphs to your chosen translation provider.
- **Video Subtitles (Language Classroom)**: Only when you use the player subtitle repeat controls or explicitly open the Language Classroom on a YouTube or Bilibili video page does the extension retrieve the title and subtitle tracks of **the current video**; when you generate pre-study cards, the subtitle text is sent to your chosen LLM to extract difficult vocabulary and study notes. Your watch history, account data, and other videos are never accessed.
- **Wordbook**: Words, phrases, translations, and example sentences you explicitly save from the Language Classroom are stored only locally in `chrome.storage.local` (`ndtVocabularyBook`) and are never uploaded. You can delete, clear, or export them (TSV) at any time.
- **Settings & API Keys**: Your preferences, custom OpenAI-compatible endpoints, and API keys are stored locally in your browser via `chrome.storage.local` and are never transmitted to unrelated servers.
- **Transient Session State**: Active tab/window auto-translation states are held locally in `chrome.storage.session` and cleared automatically when the browser session ends.
- **Local Translation Cache**: Short phrases and single-word lookups are cached locally in IndexedDB (`ndt_translation_cache`) to reduce redundant API calls. You can clear this cache at any time from the extension settings page.

### 2. Third-Party & External Endpoints
The extension does not collect browsing history in the background. Requests are only sent when you trigger a translation, TTS playback, or open the Language Classroom, and only to the following endpoints:
- **Microsoft Translator**: Connects to `edge.microsoft.com` (or `api.cognitive.microsofttranslator.com` when configured).
- **Google Translate**: Connects to `translate.googleapis.com` (including `translate_tts` for audio playback), `clients5.google.com`, or a user-configured mirror URL.
- **Community Sponsor LLM Service (`https://api.19781018.xyz`)**: An optional external third-party API endpoint. The extension itself requires no account login or payment; requests to this host are only made if you enable it with an API key or check its quota.
- **User-configured OpenAI-compatible APIs**: Sent strictly to the Base URL you configured.
- **Video platform subtitle endpoints**: When the Language Classroom is opened, subtitles of the current video are requested from the video platform itself using your existing browser session: YouTube (`www.youtube.com/youtubei/v1/*` and caption file URLs) and Bilibili (`api.bilibili.com/x/player/*`, `api.bilibili.com/x/web-interface/*`). Platform cookies are never stored or forwarded elsewhere.

### 3. What We Do Not Do
- We do not collect personally identifiable information (PII).
- We do not include third-party advertising or analytics trackers.
- We do not sell, rent, or transfer user data for unrelated purposes.
- We do not execute remote code; all scripts ship inside the extension package.

### 4. Permission Disclosures
- **`<all_urls>` (Host Permissions & Content Scripts)**: Required to render the selection translation popover and bilingual full-page translations on webpages you visit, and to dispatch requests to built-in or user-configured translation endpoints and video platform subtitle endpoints.
- **`storage`**: Persists settings, API configurations, and the wordbook locally in `chrome.storage.local`, and transient tab auto-translate states in `chrome.storage.session`.
- **`contextMenus`**: Adds right-click menu entries to translate selected text or the current webpage.
- **`clipboardWrite` & `offscreen`**: Allows the Manifest V3 service worker to use an offscreen document (`offscreen.html`) for clipboard copying and audio/TTS playback.
- **`declarativeNetRequestWithHostAccess`**: Used strictly with `net_request_rules.json` to remove `Cross-Origin-Resource-Policy` on `translate.googleapis.com/translate_tts` so TTS audio playback works cleanly. Unrelated traffic is never inspected or modified.
- **`scripting`**: (1) Re-injects the extension's own bundled content scripts (`c.js` / `ca.js`) into tabs that were already open before install/update, so pages work without a manual reload; (2) when you open the YouTube Language Classroom, runs a packaged function in the current video page to read the player's subtitle track metadata. Only code bundled in the package is executed; no remote code.

### 5. Contact
If you have any questions about this privacy policy or your data, please contact the developer:
- Email: [wh1018@gmail.com](mailto:wh1018@gmail.com)
- GitHub Repository: <https://github.com/wesele/ModernTranslator>
