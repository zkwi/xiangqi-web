import { findBestMove } from '../src/game/ai.js';
import {
  applyMove,
  generateLegalMoves,
  getGameStatus,
  moveToLabel,
  parseFen,
  toFen,
} from '../src/game/xiangqi.js';
import { ENDGAME_PRESETS } from '../src/game/presets.js';
import { engineMoveToLegalMove } from '../src/game/fairyProtocol.js';
import { AI_LEVEL_MAP } from '../src/game/levels.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const screenshotMate =
  '3k1ae1r/2H6/3Re4/6p1p/p8/4C4/P3H1P1P/r8/9/3AKAER1 b - - 0 23';
const mateState = parseFen(screenshotMate);
assert(getGameStatus(mateState).over, '截图里的局面应识别为已将死');
assert(generateLegalMoves(mateState).length === 0, '将死局面不能再有合法着法');

const blackMateInOne = '4k4/9/9/9/9/9/9/4r4/9/4K4 b - - 0 1';
const mateMove = findBestMove(blackMateInOne, 'grandmaster');
assert(mateMove.move, '一步杀局面必须返回走法');
assert(moveToLabel(mateMove.move) === '黑方 车 e2xe0', `一步杀应走车吃帅，实际：${moveToLabel(mateMove.move)}`);

const inCheckButAlive = '4k4/9/4R4/9/9/9/9/9/9/4K4 b - - 0 1';
const evasion = findBestMove(inCheckButAlive, 'grandmaster');
assert(evasion.move, '被将军但未死时必须返回应将走法');
const evasionState = applyMove(parseFen(inCheckButAlive), evasion.move);
assert(!getGameStatus(evasionState).winner, '应将走法不能直接输棋');

for (const preset of ENDGAME_PRESETS) {
  const state = parseFen(preset.fen);
  generateLegalMoves(state);
  toFen(state);
}

const startState = parseFen(ENDGAME_PRESETS[0].fen);
const fairyOpeningMove = engineMoveToLegalMove(startState, 'b1c3');
assert(fairyOpeningMove, 'Fairy-Stockfish 坐标 b1c3 应转换为本地合法走法');
assert(moveToLabel(fairyOpeningMove) === '红方 马 b0-c2', `坐标转换异常：${moveToLabel(fairyOpeningMove)}`);

assert(AI_LEVEL_MAP.master.useEngine, '大师应与宗师统一使用 WASM 引擎通道');
assert(AI_LEVEL_MAP.grandmaster.useEngine, '宗师应使用 WASM 引擎通道');
assert(
  AI_LEVEL_MAP.grandmaster.engineTimeLimit > AI_LEVEL_MAP.master.engineTimeLimit,
  '宗师常规搜索预算应高于大师',
);
assert(
  AI_LEVEL_MAP.grandmaster.engineEndgameTimeLimit > AI_LEVEL_MAP.grandmaster.engineTimeLimit,
  '宗师残局搜索应自动加时',
);

const endgame = findBestMove(ENDGAME_PRESETS[3].fen, 'grandmaster');
assert(endgame.depth >= 6, `宗师残局至少应完成 6 层，实际 ${endgame.depth}`);

console.log(
  JSON.stringify(
    {
      mateMove: moveToLabel(mateMove.move),
      evasion: moveToLabel(evasion.move),
      endgameDepth: endgame.depth,
      endgameNodes: endgame.nodes,
    },
    null,
    2,
  ),
);
