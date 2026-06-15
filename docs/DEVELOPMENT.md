# 开发说明

## 项目原则

这是个人项目，优先保持代码简单、功能直接、容易修改。除非能明显降低维护成本，否则不增加复杂抽象。

## 核心数据流

- `src/game/xiangqi.js` 负责规则、FEN、合法着法、胜负判断。
- `src/game/ai.worker.js` 在 Worker 中执行 AI 搜索，避免阻塞 UI。
- `src/App.jsx` 维护当前局面、着法记录、悔棋历史、玩法、难度、主题和本地缓存。
- UI 组件只接收状态和回调，不直接修改棋局。
- 棋盘和棋子由 `src/components/Board.jsx` 与 `src/style.css` 绘制，避免依赖额外图片素材。

## AI 策略

- 入门、棋士：使用本地 Negamax 搜索，响应快，适合入门练习。
- 大师、宗师：统一使用 Fairy-Stockfish WASM 引擎，避免高阶难度出现算法断层。
- 大师通过较短搜索预算和较低 `Skill Level` 保留可乘之机；宗师使用最高 `Skill Level`，残局会自动增加搜索时间。
- WASM 引擎超时、忙碌或返回非法着法时，会回退到本地 Negamax，并在分析面板显示回退原因。
- `npm run test:ai` 会验证基础杀棋、应将、残局搜索深度和高阶难度配置。

## 残局库

残局入口在 `src/game/presets.js`，大规模数据在 `src/game/endgameLibrary.js`。

`npm run test:library` 会检查：

- 残局总数
- FEN 是否可解析
- 是否有重复局面
- 是否存在已终局局面

## 本地状态恢复

浏览器状态存储在 `localStorage`：

```text
xiangqi-web-state-v1
```

保存内容包括当前 FEN、着法记录、悔棋历史、玩法、难度、主题、声音开关和重开目标。AI 对战/残局研究的“运行中”状态不会恢复，避免刷新后自动走棋。

如果将来修改缓存结构，提升 `STORAGE_VERSION` 并保留简单回退即可。

## 素材

- 提示音来自 Kenney UI Audio，CC0 1.0，文件放在 `public/sounds/`。
- 棋子视觉使用 CSS 分层绘制，字体优先使用本机楷体类中文字体，缺失时回退到 serif。

## Git 建议

提交前执行：

```bash
npm run check
```

仓库应提交源码、文档、锁文件、引擎文件和声音素材；不要提交：

- `node_modules/`
- `dist/`
- `.playwright-mcp/`
- 本地截图 `xiangqi-*.png`
- 临时日志
