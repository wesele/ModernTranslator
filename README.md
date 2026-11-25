# 无登翻译 / Modern Translator (v1.0.0) — 浏览器翻译扩展工程

为什么叫无登？市面上的翻译软件太老登了，界面复杂，配置复杂，本插件的第一目标就是去除登味！本插件完全免费、纯公益性质（无广告、无任何付费项目）。此外独家功能：大模型超级流式调用，高速节流！还有友情赞助商提供的免费大模型公益额度！欢迎使用，欢迎评论，必将一一改进！

## 目录结构

- `src/background/` — Manifest V3 Service Worker 后台逻辑（`b.js`）、大模型批量流式调度（`llmBatchStream.js`）与全局翻译缓存（`translationCache.js`）
- `src/entries/` — 各页面与脚本入口：
  - `content.jsx` (`c.js`) — 主内容脚本（网页划词浮窗与网页全文翻译）
  - `contentAllFrames.js` (`ca.js`) — 全 iframe 内容脚本（跨 iframe 选区同步）
  - `popup.jsx` (`p.js`) — 扩展弹出页（网页全文翻译控制面板）
  - `settings.jsx` (`s.js`) — 选项设置页（友情赞助商、微软翻译、谷歌翻译、自定义 OpenAI 兼容服务、缓存与主题）
  - `offscreen.js` (`o.js`) — Offscreen 文档（剪贴板写入与语音朗读）
- `src/components/` — React + BlueprintJS v6 公共 UI 组件
- `src/content/` — 划词选区、网页全文分段翻译与主内容根组件
- `src/services/` — 翻译引擎（Google、Microsoft、OfficialLLM）
- `src/shared/` — 常量配置、消息通信、存储监听、错误类型、批量流式协议与工具函数
- `src/styles/` — Shadow DOM 内联样式模块
- `public/` — 静态资源、`manifest.json`、`_locales`、CSS 与页面 HTML
- `scripts/build.mjs` — 基于 `esbuild` 的打包脚本，输出至 `dist/`

## 构建与加载

```bash
npm install
npm run build          # 输出 Chrome/Edge MV3 扩展至 dist/
npm run build:firefox  # 输出 Firefox MV3 扩展至 dist-firefox/
npm run build:all      # 同时构建 Chrome 与 Firefox 版本
npm run watch          # Chrome 开发监听模式
npm run watch:firefox  # Firefox 开发监听模式
npm run pack           # 打包 Chrome 发布包 -> release/modern-translator-v<version>.zip
npm run pack:firefox   # 打包 Firefox 发布包 -> release/modern-translator-firefox-v<version>.zip
npm run pack:all       # 同时打包 Chrome 与 Firefox 发布包
```

- **Chrome / Edge**：打开 `chrome://extensions/`，开启“开发者模式”，选择“加载已解压的扩展程序”并指向 `dist/` 目录。
- **Firefox（140+）**：打开 `about:debugging#/runtime/this-firefox`，点击“临时载入附加组件...”，选择 `dist-firefox/manifest.json` 即可。
