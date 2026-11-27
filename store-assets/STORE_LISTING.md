# 各大浏览器扩展商店上架清单与审核填报指南

> 适用版本：无登翻译 (Modern Translator / short_name: ModernTrans) **v1.1.0**（商店当前线上版本：1.0.0）  
> 联系邮箱：`wh1018@gmail.com`  
> 主页与源码：`https://github.com/wesele/ModernTranslator`  
> 欧盟 DSA 身份声明：**Non-Trader**（非商业个人开源开发者）  
> 打包命令：`npm run pack` -> 生成 `release/modern-translator-v1.1.0.zip`

---

## 一、快速检查清单

- [x] `npm run pack` 生成根目录包含 `manifest.json` 的 `.zip`（无 `.map` 源码映射文件，且自动校验所有 `_locales/*/messages.json` 的 `description` <= 132 字符）
- [x] `short_name` 已设为 `ModernTrans`（11 字符 <= 12 字符推荐上限）
- [x] 规范尺寸图标：`public/icons/icon16.png`、`icon48.png`、`icon128.png`
- [x] 商店图标物料：`store-assets/chrome-icon-128.png`（Chrome 128×128）、`store-assets/edge-icon-300.png`（Edge 300×300）
- [x] 多语言 Manifest 描述（均 <= 132 字符，已加入视频字幕学习 / 生词本）：`zh_CN`、`en`、`de`、`es`、`fr`、`ja`、`ko`
- [x] 隐私政策：`PRIVACY.md` 与 `docs/privacy.html` 已更新至 v1.1.0（覆盖视频字幕接口、生词本、`scripting` 权限）。**推送到 GitHub `main` 后**通过 `https://wesele.github.io/ModernTranslator/privacy.html` 访问
- [x] 合规截图（1280×800，24bpp RGB 无透明通道）：`store-assets/screenshots/`，已齐备中英双语各 5 张完整商店组合：
  - **中文（Chrome 上传前 5 张；Edge 可选传第 6 张）**：`cn-01-bilingual-layout.jpg`（新版双语排版引擎）、`cn-02-classroom.jpg`（语言课堂黑板卡片）、`cn-03-wordbook.jpg`（单词本 6 词条网格 + Anki TSV 导出）、`cn-04-sponsor-config.jpg`（友情赞助商公益大模型 + 流式批量配置）、`cn-05-translation-popup.jpg`（弹窗控制面板 + 新闻双语）、`cn-06-subtitle-repeat.jpg`（播放器字幕复读控件）
  - **English（5 张全英文界面）**：`en-01-bilingual-layout.jpg`、`en-02-wordbook-card.jpg`、`en-03-wordbook-grid.jpg`、`en-04-translation-popup.jpg`、`en-05-config.jpg`
  - **备选展示图**：`bonus-cn-ruby-buttons.jpg`（展示按钮 Ruby 双行叠放与原译相同跳过）
- [x] 小型宣传图（`440×280`，24bpp RGB 无透明通道，无第三方 Logo）：`store-assets/chrome-promo-small-zh-440x280.jpg`（中文）、`store-assets/chrome-promo-small-en-440x280.jpg`（英文）

### 权限变化（相对线上 1.0.0）

| 变化 | 权限 | 说明 |
|---|---|---|
| 移除 | `webRequest` | 不再需要 |
| 新增 | `scripting` | 无额外安装警告（`<all_urls>` 已授予），老用户升级不会被自动停用；需在后台补填用途说明（见下表） |

---

## 二、商店详情页文案（可直接复制）

### 中文（zh_CN）
- **名称**：无登翻译
- **一句话简介（Summary，132 字内，与 `_locales/zh_CN` 一致）**：
  免费开源无广告的划词与网页双语翻译，支持 YouTube/B站 字幕学外语、生词本、大模型流式批量翻译、微软/谷歌及自定义 OpenAI 接口。
- **详细介绍（Description）**：

```
🆕 v1.1.0 更新
• 新增「视频语言课堂」：在 YouTube / B站 播放器内一键按句跳转复读（快捷键 < / >），并可按章节智能提取视频难词生成黑板学习卡片（含音标、CEFR 难度、原句时间戳跳转与自测模式）
• 新增「单词本」：在语言课堂中一键收藏难词，随时在课堂或设置页复习，支持导出 TSV（可导入 Anki / Excel）
• 全新双语排版引擎：空间预算决策 + 导航栏/按钮智能双行叠放（Ruby 排版），译文不再挤乱网页；原文与译文相同时自动跳过
• 优化公益额度繁忙时的友好降级提示，并修复扩展更新后旧标签页报错等多项稳定性问题

为什么叫「无登」？市面上的翻译插件太「老登」了——界面复杂、配置复杂、还要登录。本插件的第一目标就是去除登味：
完全免费、纯公益、开源，无广告、无付费项目、无需登录。

✨ 核心功能
1. 划词翻译：选中即译，支持朗读与一键复制
2. 网页全文双语对照：双语 / 原文 / 译文一键切换，智能保护原网页排版
3. 视频语言课堂：YouTube / B站 字幕精听复读 + AI 课前难词预习卡片
4. 单词本：收藏难词、标记已掌握、导出 TSV（兼容 Anki / Excel）
5. 多引擎：微软翻译、谷歌翻译、友情赞助商大模型、任意 OpenAI 兼容接口

🚀 独家亮点
• 大模型超级流式批量调用：整页翻译更快、更省 token
• 开箱即用：友情赞助商提供免费大模型公益额度
• 现代极简界面，支持深色模式与多语言界面

🔒 隐私
仅在你主动翻译或使用语言课堂时处理当前页面/视频内容；设置、密钥与单词本全部只保存在本地。

说明：本扩展为独立开源项目，与 Google、Microsoft、OpenAI、YouTube、哔哩哔哩均无关联，也未获其背书。
```

### English（en）
- **Name**：Modern Translator
- **Summary（<= 132 字符，与 `_locales/en` 一致）**：
  Free bilingual page & selection translator: YouTube/Bilibili subtitle learning, wordbook, streaming LLM, Google/Microsoft/OpenAI.
- **Description**：

```
🆕 What's new in v1.1.0
• Language Classroom: sentence-by-sentence subtitle jump/replay (< / > shortcuts) inside YouTube & Bilibili players, plus AI pre-study flashcards for difficult vocabulary (IPA, CEFR level, timestamp jump, self-test mode)
• Wordbook: save difficult words from Language Classroom cards, review in-app or in Settings, and export to TSV (Anki / Excel compatible)
• New bilingual layout engine: spatial-budget placement + Ruby dual-line stacking for navbars/buttons so translations don't break page layouts; identical text is skipped automatically
• Friendly fallback hint when the free community quota is busy, plus many stability fixes (no more errors in tabs opened before an update)

A completely free, non-profit, open-source, ad-free translator with no login required.

✨ Features
1. Selection translation with text-to-speech and one-click copy
2. Full-page bilingual view: bilingual / original / translation toggle with layout-preserving rendering
3. Language Classroom for YouTube and Bilibili subtitle study & replay
4. Wordbook with mastery tracking and TSV export (Anki / Excel)
5. Engines: Microsoft Translator, Google Translate, a community-sponsored LLM API, and any OpenAI-compatible API

🚀 Highlights
• Super-streaming LLM batching — fast and token-efficient full-page translation
• Works out of the box with a community-sponsored free LLM quota
• Modern, minimalist UI with dark mode and 7 UI languages

🔒 Privacy
Text is sent only when you trigger a translation or open the Language Classroom. Settings, API keys, and your wordbook stay on your device.

This extension is an independent open-source project and is not affiliated with or endorsed by Google, Microsoft, OpenAI, YouTube, or Bilibili.
```

---

## 三、Chrome Web Store / Edge 审核填报模板

### 1. 账号与基础信息（Account / Store Listing）
- **Support Email / Contact Email**：`wh1018@gmail.com`
- **Homepage / Support URL**：`https://github.com/wesele/ModernTranslator`
- **Privacy Policy URL**：`https://wesele.github.io/ModernTranslator/privacy.html`
- **EU Digital Services Act (DSA)**：选择 **Non-Trader**（非商业个人开发者）

### 2. 单一用途声明（Single Purpose）
- **中文**：本扩展仅有一个核心用途：把用户正在浏览的网页文本和视频字幕翻译成用户的目标语言；语音朗读和本地生词本只是翻译结果的配套功能。
- **English**：This extension has a single purpose: translating webpage text and video subtitles the user is viewing into the user's target language. Optional text-to-speech playback and a local wordbook only operate on those translation results.

### 3. 权限用途逐项说明（Permission Justifications）

> 提示：Chrome 审核后台为英文界面时，直接粘贴下方 **English** 文案即可。

| 权限 / Permission | English Justification (可直接复制填表) | 中文说明 |
|---|---|---|
| `host_permissions: <all_urls>` | Required to inject the selection translation UI and full-page bilingual translation into any webpage the user visits, to send translation requests to built-in translation engines and user-configured OpenAI-compatible API endpoints, and to request subtitles of the currently watched video from YouTube/Bilibili when the user opens the Language Classroom. | 用于在任意网页注入划词浮窗与全文双语译文，向内置引擎及用户自定义接口发起翻译请求，并在用户打开语言课堂时向 YouTube / B站 请求当前视频字幕。 |
| `storage` | Used to persist user preferences (target language, selected engines, UI theme, custom OpenAI endpoint configurations) and the user's saved wordbook locally in `chrome.storage.local`, and transient per-tab/window auto-translate state in `chrome.storage.session`. | 本地保存翻译偏好、自定义接口配置、生词本及临时会话状态。 |
| `contextMenus` | Used to add right-click context menu items for translating selected text or translating the current webpage. | 右键菜单提供“翻译选中文本”“全文翻译”等入口。 |
| `clipboardWrite` | Required alongside `offscreen` (`Reason.CLIPBOARD`) to copy translated text to the clipboard when the user clicks the copy button or enables auto-copy. | 配合 `offscreen` 在用户复制译文时写入剪贴板。 |
| `offscreen` | Used by the Manifest V3 service worker to create an offscreen document (`offscreen.html`) for clipboard writing and audio (TTS) playback, which are unavailable directly in service workers. | 通过 `offscreen.html` 完成复制与语音朗读。 |
| `declarativeNetRequestWithHostAccess` | Used with `net_request_rules.json` strictly to remove `Cross-Origin-Resource-Policy` on `translate.googleapis.com/translate_tts` so TTS audio playback works cleanly. | 通过静态规则移除谷歌 TTS 音频跨域限制头。 |
| **`scripting`（新增）** | Used to (1) re-inject the extension's own bundled content scripts (`c.js` / `ca.js`) into tabs that were already open before the extension was installed or updated, so translation works without requiring a page reload; and (2) when the user opens the Language Classroom on YouTube, run a packaged function in the page's MAIN world to read the video player's subtitle track metadata, which is not accessible from the isolated content-script world. Only functions and files bundled in the extension package are executed; no remote code is ever injected. | (1) 向安装/更新前已打开的标签页重新注入扩展自带内容脚本，免刷新；(2) 用户打开 YouTube 语言课堂时，在页面主环境执行扩展自带函数读取播放器字幕轨道信息。只执行包内代码，不注入远程代码。 |
| **Remote Code** | **No, I am not using Remote code.** All JavaScript/CSS is bundled locally into the extension package via esbuild at build time. `scripting.executeScript` is only called with bundled files or bundled functions. (`google.js` fetches `translate_a/element.js` purely as plain text to extract a token via regex and `JSON.parse`; it never evaluates or executes any fetched script.) | **不使用远程代码**。 |

### 4. Chrome Web Store 数据使用声明（Data Usage）
在“Privacy practices -> Data usage”中：
- 勾选 **Website content**（说明：仅在用户主动触发划词、全文翻译或打开视频语言课堂时，才将所选文本、页面段落或当前视频字幕发送至用户选定的翻译引擎；不会在后台收集浏览历史）。
- 勾选以下三项承诺声明：
  1. I do not sell or transfer user data to third parties, outside of the approved use cases.
  2. I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
  3. I do not use or transfer user data to determine creditworthiness or for lending purposes.

### 5. 给审核员的测试说明（Notes for reviewers / Notes for certification）

```
No account is required. Test steps:
1. Select any text on a webpage -> a translation popover appears (Microsoft/Google engines work without configuration).
2. Click the toolbar icon -> "Translate page" to see the full-page bilingual view; toggle bilingual / original / translation.
3. Open any YouTube video that has captions (e.g. a TED talk) -> use the subtitle counter & prev/next controls in the player bar, or click the "Language Classroom" button to open the subtitle vocabulary study modal. Bilibili videos with CC subtitles work the same way.
4. Inside the Language Classroom study card, click "Add to Wordbook" to save a word; open Settings -> Wordbook to review or export (TSV).
5. LLM engines (Community Sponsor / custom OpenAI-compatible) are optional and require the user's own API key.
```

---

## 四、提审前最终操作步骤

1. **推送最新代码与隐私政策**：提交并 `git push` 到 `origin/main`，确认 `https://wesele.github.io/ModernTranslator/privacy.html` 已显示“适用于 v1.1.0”。
2. **生成发布包**：执行 `npm run pack`，得到 `release/modern-translator-v1.1.0.zip`。
3. **本地验收**：`chrome://extensions/` 与 `edge://extensions/` 加载 `dist/`；**先装 1.0.0 再覆盖升级**，确认设置与缓存保留、旧标签页可直接使用。
4. **上传提审（先 Edge、后 Chrome）**：
   - Microsoft Edge Add-ons：上传 zip + `store-assets/edge-icon-300.png` + `store-assets/screenshots/*` + 隐私政策 URL + 上方审核测试说明。
   - Chrome Web Store：上传 zip + `store-assets/chrome-icon-128.png` + `store-assets/screenshots/*` + 隐私政策 URL + 新增 `scripting` 权限说明 + 更新单一用途声明；**取消勾选“审核通过后自动发布”**，以便与 Edge 同日上线。
