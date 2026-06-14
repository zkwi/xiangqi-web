# 开发说明

## 项目原则

这是个人项目，优先保持代码简单、功能直接、容易修改。除非能明显降低维护成本，否则不增加复杂抽象。

## 核心数据流

- `src/game/xiangqi.js` 负责规则、FEN、合法着法、胜负判断。
- `src/game/ai.worker.js` 在 Worker 中执行 AI 搜索，避免阻塞 UI。
- `src/App.jsx` 维护当前局面、着法记录、悔棋历史、模式、难度、主题和本地缓存。
- UI 组件只接收状态和回调，不直接修改棋局。

## AI 策略

- 入门、棋士、大师：使用本地 Negamax 搜索，响应快，适合交互。
- 宗师：优先使用 Fairy-Stockfish WASM，节点和深度更高，适合挑战。
- `npm run test:ai` 会验证基础杀棋、应将和残局搜索深度。

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

保存内容包括当前 FEN、着法记录、悔棋历史、模式、难度、主题、声音开关和重开目标。自动对战的“运行中”状态不会恢复，避免刷新后自动走棋。

如果将来修改缓存结构，提升 `STORAGE_VERSION` 并保留简单回退即可。

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
