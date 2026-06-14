import { ENDGAME_PRESETS } from '../src/game/presets.js';
import { generateLegalMoves, getGameStatus, parseFen, toFen } from '../src/game/xiangqi.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const seen = new Set();
let terminal = 0;

for (const preset of ENDGAME_PRESETS) {
  assert(preset.name, '残局缺少名称');
  assert(preset.fen, `残局 ${preset.name} 缺少 FEN`);

  const state = parseFen(preset.fen);
  const normalizedFen = toFen(state).split(' ').slice(0, 2).join(' ');
  const status = getGameStatus(state);
  const legalMoves = generateLegalMoves(state, state.turn);

  if (status.over || legalMoves.length === 0) terminal += 1;
  seen.add(normalizedFen);
}

assert(ENDGAME_PRESETS.length >= 100, `残局数量不足：${ENDGAME_PRESETS.length}`);
assert(terminal === 0, `存在已终局或无合法着法残局：${terminal}`);

console.log(
  JSON.stringify(
    {
      total: ENDGAME_PRESETS.length,
      uniquePositions: seen.size,
      terminal,
    },
    null,
    2,
  ),
);
