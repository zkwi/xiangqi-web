# 中国象棋 Web 对战

一个基于 React + Vite 的网页中国象棋项目，面向个人使用和快速迭代。项目支持人机对战、AI 自动对战、残局加载与残局推演，并内置《适情雅趣》残局库。

## 功能

- 我要下棋：玩家可选择红方或黑方，与电脑对弈。
- AI 对战：红黑双方由 AI 连续行棋。
- 残局研究：加载残局后可让 AI 双方继续推演。
- 难度设置：入门、棋士、大师、宗师四档；宗师档使用 Fairy-Stockfish WASM 引擎。
- 残局库：内置 556 个局面，其中包含《适情雅趣》551 局。
- 移动端适配：手机端优先显示棋盘，并提供快捷操作条。
- 本地状态恢复：刷新页面后恢复当前局面、着法记录、设置和重开目标。
- 提示音：落子、吃子、将军、胜负和 UI 操作均有短提示音。

## 快速开始

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://127.0.0.1:5173/
```

## 常用命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm test             # 运行 AI 与残局库校验
npm run check        # 构建并运行全部校验
npm run preview      # 预览构建结果
```

## 使用说明

- `我要下棋`：玩家对电脑。主按钮是 `电脑走一步`，用于让当前方由电脑走一步。
- `AI对战`：AI 同时控制红黑双方，适合观察不同难度对局。
- `残局研究`：加载残局后由 AI 自动延续局面，适合观察残局变化。
- `重开`：会先弹确认框。若当前来自残局或自定义 FEN，会回到该局面起点，而不是标准开局。
- 刷新页面：自动恢复上次局面，但不会恢复“正在自动对战”的运行状态，避免打开页面后 AI 自动走棋。

## 项目结构

```text
src/
  App.jsx                 # 顶层状态、AI 调度、本地持久化
  components/             # 棋盘、控制面板、分析面板
  game/                   # 象棋规则、AI、残局、引擎协议
  ui/                     # UI 配置
public/
  engine/                 # Fairy-Stockfish WASM 引擎文件
  sounds/                 # 本地合成提示音
scripts/
  ai-smoke.mjs            # AI 基础行为校验
  validate-library.mjs    # 残局库合法性校验
```

## 数据与授权

第三方来源和授权说明见：

- `ASSET_CREDITS.md`
- `THIRD_PARTY_NOTICES.md`

注意：`public/engine/stockfish.*` 来自 `fairy-stockfish-nnue.wasm`，涉及 GPL-3.0；公开分发时需要遵守对应许可证。
