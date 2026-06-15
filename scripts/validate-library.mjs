import {
  ENDGAME_PRESETS,
  RED_WIN_SHIQINGYAQU_ENDGAMES,
  SHIQINGYAQU_RED_WIN_LIMIT,
  getShiqingyaquNumber,
} from '../src/game/presets.js';
import { engineMoveToLegalMove } from '../src/game/fairyProtocol.js';
import { applyMove, generateLegalMoves, getGameStatus, parseFen, toFen } from '../src/game/xiangqi.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const seen = new Set();
let terminal = 0;

for (const preset of ENDGAME_PRESETS) {
  assert(preset.name, '残局缺少名称');
  assert(preset.fen, `残局 ${preset.name} 缺少 FEN`);
  assert(preset.id !== 'standard-start', '标准开局不属于红先必胜残局，不能进入残局库');

  const state = parseFen(preset.fen);
  const normalizedFen = toFen(state).split(' ').slice(0, 2).join(' ');
  const status = getGameStatus(state);
  const legalMoves = generateLegalMoves(state, state.turn);
  const shiqingyaquNumber = getShiqingyaquNumber(preset);

  assert(state.turn === 'red', `残局 ${preset.name} 必须红方先行`);
  assert(
    shiqingyaquNumber === null || shiqingyaquNumber <= SHIQINGYAQU_RED_WIN_LIMIT,
    `残局 ${preset.name} 属于和棋/难胜段，不应进入红胜残局库`,
  );
  assert(
    !/[（(][^）)]*(?:和|难胜|守和|巧和|保和)[^）)]*[）)]/.test(preset.name),
    `残局 ${preset.name} 题名显示不是红方必胜，应移出残局库`,
  );
  if (status.over || legalMoves.length === 0) terminal += 1;
  seen.add(normalizedFen);
}

assert(ENDGAME_PRESETS.length >= 100, `残局数量不足：${ENDGAME_PRESETS.length}`);
assert(
  RED_WIN_SHIQINGYAQU_ENDGAMES.length === SHIQINGYAQU_RED_WIN_LIMIT,
  `适情雅趣红胜段数量异常：${RED_WIN_SHIQINGYAQU_ENDGAMES.length}`,
);
for (let number = 1; number <= SHIQINGYAQU_RED_WIN_LIMIT; number += 1) {
  const id = `shiqingyaqu-551-${String(number).padStart(3, '0')}`;
  assert(
    RED_WIN_SHIQINGYAQU_ENDGAMES.some((preset) => preset.id === id),
    `适情雅趣红胜段缺少第 ${String(number).padStart(3, '0')} 局`,
  );
}
assert(terminal === 0, `存在已终局或无合法着法残局：${terminal}`);

const tuqiangfurou = ENDGAME_PRESETS.find((preset) => preset.id === 'shiqingyaqu-551-020');
assert(tuqiangfurou, '缺少第020局推强扶弱');
assert(
  toFen(parseFen(tuqiangfurou.fen)).startsWith(
    '2eak2r1/4aP2R/2R1e4/6p1p/1Hp6/P1C6/8P/9/3pr4/5K2c',
  ),
  '第020局应包含右侧红兵，避免炮9进9反杀线',
);

let tuqiangfurouState = parseFen(tuqiangfurou.fen);
for (const coord of [
  'i9i10',
  'h10i10',
  'c8e8',
  'c10e8',
  'b6a8',
  'e2f2',
  'f1f2',
  'd2e2',
  'f2e2',
  'i1d1',
  'e2d2',
  'c6c5',
  'a8c9',
]) {
  const move = engineMoveToLegalMove(tuqiangfurouState, coord);
  assert(move, `第020局流传解法存在非法着法：${coord}`);
  tuqiangfurouState = applyMove(tuqiangfurouState, move);
}

const tuqiangfurouStatus = getGameStatus(tuqiangfurouState);
assert(
  tuqiangfurouStatus.over && tuqiangfurouStatus.winner === 'red',
  '第020局流传解法最终应为红胜',
);

console.log(
  JSON.stringify(
    {
      total: ENDGAME_PRESETS.length,
      shiqingyaquRedWin: RED_WIN_SHIQINGYAQU_ENDGAMES.length,
      uniquePositions: seen.size,
      terminal,
    },
    null,
    2,
  ),
);
