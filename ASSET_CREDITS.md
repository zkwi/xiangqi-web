# 素材说明

- `public/sounds/ui.wav`、`public/sounds/move.wav`、`public/sounds/win.wav`：来自 Kenney UI Audio（CC0 1.0），用于按钮、普通落子和胜负反馈。
  - `ui.wav` <- `click4.wav`
  - `move.wav` <- `click2.wav`
  - `win.wav` <- `switch7.wav`
- `public/sounds/capture.mp3`、`public/sounds/check.wav`：来自 Checkora/Checkora 的棋类音效资源；其音效需求说明将吃子定义为较重的反馈、将军定义为醒目的提示音，并说明可使用 CC0 来源素材。
- 棋盘与棋子：当前版本使用本地 CSS 绘制，没有复制第三方棋子图片或字体文件。
- `public/engine/stockfish.*`：来自 `fairy-stockfish-nnue.wasm`，GPL-3.0，用于宗师难度的 Fairy-Stockfish WASM 引擎。
- `src/game/endgameLibrary.js`：残局 FEN 数据来自 `kuiba1949/xiangqi-tools` 的 `fen/shiqingyaqu551.fen`，BSD-3-Clause；已导入《适情雅趣》李浭 551 局新版。
- `MeldrumJon/Xiangqi`：调研其 SVG 棋子、木纹与提示音来源说明；本项目未复制该仓库代码或素材，只据此增加了本地 CSS 棋盘主题切换。
