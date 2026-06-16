# 中国象棋 Web 对战

一个面向个人使用和残局研究的网页中国象棋项目，基于 React + Vite 构建，支持玩家对电脑、AI 自动对战、残局推演、局面导入，以及《适情雅趣》残局库检索。界面简单直接、运行成本低，残局库只保留“红方先行且红方理论必胜”的局面。

## 🎮 在线体验

> ### 点开即玩 👉 https://xiangqi-web.zkwi2010.workers.dev/
>
> 手机 / 电脑均可，推荐使用 Chrome 或 Edge。支持棋盘操作、残局库、AI 对战、着法记录、音效与移动端布局。

> ℹ️ 大师 / 宗师档会尝试加载 Fairy-Stockfish WASM 强引擎；若浏览器或部署环境不满足 WASM 条件，会自动回退到本地搜索。需要稳定强引擎时，建议[本地运行](#本地运行)，或配置跨源隔离响应头（见[部署说明](#部署说明)）。

## 主要功能

- **我要下棋**：玩家可选择红方或黑方，与电脑对弈。
- **AI 对战**：红黑双方都由 AI 行棋，适合观察局面演化。
- **残局研究**：加载残局后让 AI 连续推演，也可以手动介入。
- **四档强度**：入门、棋士、大师、宗师；大师和宗师使用 Fairy-Stockfish WASM 引擎，宗师搜索预算更高。
- **残局库检索**：内置 471 个局面，包含《适情雅趣》第 001-468 局红胜段，以及 3 个精选练习局。
- **本局记录跳转**：点击着法记录前会弹窗确认，确认后可回到对应步数并截断后续记录。
- **重复局面保护**：AI 自动行棋走回历史局面时会暂停，避免来回重复走棋。
- **音效反馈**：落子、吃子、将军、胜负和 UI 操作均有提示音；吃子和将军支持中文发音反馈。
- **移动端适配**：手机端优先展示棋盘，并提供快捷操作条。
- **本地状态恢复**：刷新页面后恢复上次局面、记录、设置和重开目标。

## 本地运行

本地运行适合开发、调试和验证强引擎行为。

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://127.0.0.1:5173/
```

生产构建：

```bash
npm run build
npm run preview
```

## 部署说明

当前在线 Demo 部署在 Cloudflare Workers：

```text
https://xiangqi-web.zkwi2010.workers.dev/
```

静态部署的基本流程：

```bash
npm ci
npm run check
npm run build
```

构建产物目录为：

```text
dist
```

为了让 Fairy-Stockfish WASM 强引擎更稳定，线上环境建议为所有静态资源配置以下响应头：

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

配置完成后，可以在浏览器控制台检查：

```js
window.crossOriginIsolated
```

若返回 `true`，说明页面已进入跨源隔离环境，更适合运行 WASM 强引擎。

## 常用命令

```bash
npm run dev                  # 启动开发服务器
npm run build                # 生产构建
npm test                     # 运行全部测试脚本
npm run check                # 构建并运行全部校验
npm run test:ai              # AI 基础行为校验
npm run test:library         # 残局库合法性校验
npm run test:interaction     # 悔棋、记录跳转、重复局面等交互逻辑校验
npm run test:red-win         # 抽样验证红胜库不会走出黑胜或重复局面
npm run test:red-win:grandmaster # 宗师档抽样验证
npm run test:audio           # 音频接口校验
```

## 使用说明

- **我要下棋**：玩家对电脑。主按钮在玩家回合显示 `AI代走一步`，在电脑回合显示 `电脑应手`。
- **AI对战**：AI 同时控制红黑双方，适合对比不同强度设置。
- **残局研究**：适合加载残局后观察机器推演，也可以手动走一步再继续自动推演。
- **大师/宗师**：两档使用 WASM 强引擎；若浏览器无法加载 WASM，分析面板会显示本地回退原因。
- **重开**：会回到当前局面的起点。如果当前来自残局或自定义 FEN，不会误回标准开局。
- **着法记录跳转**：点击记录时会先要求确认；确认后自动暂停 AI，避免跳转后马上继续走棋。
- **刷新页面**：会恢复上次棋局，但不会恢复自动对战运行状态，避免打开页面后 AI 自动行棋。

## 残局库说明

本项目的数据口径以“红方先行且红方必胜”为核心。

- 本地保留《适情雅趣》李浭 551 局原始 FEN 来源数据。
- 应用入口只加载第 001-468 局红胜段。
- 第 469 局以后包含“和”“难胜”等结果描述，不符合本项目当前目标，因此不展示、不抽样。
- `scripts/validate-library.mjs` 会校验残局 FEN 合法性、去重和红胜库范围。
- `scripts/red-win-sample.mjs` 会随机抽样残局，验证短线推演中不会出现黑胜或重复局面。

## 项目结构

```text
src/
  App.jsx                 # 顶层状态、AI 调度、本地持久化
  audio.js                # 提示音和中文发音反馈
  components/             # 棋盘、控制面板、分析面板
  game/                   # 象棋规则、AI、残局、引擎协议、重复检测
  ui/                     # 棋盘主题等 UI 配置

public/
  engine/                 # Fairy-Stockfish WASM 引擎文件
  sounds/                 # 棋类音效素材

scripts/
  ai-smoke.mjs            # AI 基础行为校验
  audio-smoke.mjs         # 音频接口校验
  interaction-smoke.mjs   # 交互逻辑校验
  red-win-sample.mjs      # 红胜残局抽样推演
  validate-assets.mjs     # 素材文件校验
  validate-library.mjs    # 残局库校验
```

## 技术栈

- React
- Vite
- Fairy-Stockfish WASM
- Lucide React 图标
- 本地 CSS 棋盘与棋子绘制

## 第三方资源

第三方来源和授权说明见：

- [ASSET_CREDITS.md](./ASSET_CREDITS.md)
- [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)

主要来源包括：

- Fairy-Stockfish WASM：用于大师/宗师强度搜索。
- Kenney UI Audio：用于 UI、落子和胜负反馈。
- Checkora chess sounds：用于吃子和将军反馈。
- kuiba1949/xiangqi-tools：用于《适情雅趣》残局 FEN 数据。

## 许可证

本项目以 **GPL-3.0-or-later** 授权发布，详见 [LICENSE](./LICENSE)。

由于项目包含 Fairy-Stockfish WASM 等 GPL-3.0 相关资源，公开分发和二次开发时请同时遵守对应第三方许可证要求。

## 贡献

这是一个个人项目，优先保持简单、实用、易维护。欢迎提交 issue 或 PR，比较适合的改进方向包括：

- 修正残局数据或补充可靠来源。
- 优化 AI 搜索速度和重复局面处理。
- 改进移动端布局和无障碍体验。
- 补充更合适的开源音效素材。
- 增加针对残局库的自动化校验。
