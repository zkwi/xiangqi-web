# 素材说明

- `public/sounds/*.wav`：来自 Kenney UI Audio（CC0 1.0），用于按钮、落子、吃子、将军和胜负反馈。
  - `ui.wav` <- `click4.wav`
  - `move.wav` <- `click2.wav`
  - `capture.wav` <- `click3.wav`
  - `check.wav` <- `switch12.wav`
  - `win.wav` <- `switch7.wav`
- 棋盘与棋子：当前版本使用本地 CSS 绘制，没有复制第三方棋子图片或字体文件。
- `public/engine/stockfish.*`：来自 `fairy-stockfish-nnue.wasm`，GPL-3.0，用于宗师难度的 Fairy-Stockfish WASM 引擎。
- `src/game/endgameLibrary.js`：残局 FEN 数据来自 `kuiba1949/xiangqi-tools` 的 `fen/shiqingyaqu551.fen`，BSD-3-Clause；已导入《适情雅趣》李浭 551 局新版。
- `MeldrumJon/Xiangqi`：调研其 SVG 棋子、木纹与提示音来源说明；本项目未复制该仓库代码或素材，只据此增加了本地 CSS 棋盘主题切换。
