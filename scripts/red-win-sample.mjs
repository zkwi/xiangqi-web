import { findBestMove } from '../src/game/ai.js';
import { ENDGAME_PRESETS } from '../src/game/presets.js';
import {
  applyMove,
  getGameStatus,
  moveToLabel,
  parseFen,
  positionKey,
  toFen,
} from '../src/game/xiangqi.js';

const args = readArgs();
const samples = pickSamples(args.samples, args.seed);
const results = [];

for (const preset of samples) {
  results.push(runProbe(preset, args));
}

const failures = results.filter((item) => item.status === 'failed');
const redWins = results.filter((item) => item.winner === 'red').length;
const ongoing = results.filter((item) => item.status === 'ongoing').length;
const safe = results.length - failures.length;

console.log(
  JSON.stringify(
    {
      goal: '排除抽样局面中的黑胜和重复局面；短线未终局记为 ongoing',
      level: args.level,
      samples: samples.length,
      plies: args.plies,
      safe,
      redWins,
      ongoing,
      failures: failures.map(({ id, name, reason }) => ({ id, name, reason })),
      probes: results.map(({ id, label, status, winner, plies, lastMove }) => ({
        id,
        label,
        status,
        winner,
        plies,
        lastMove,
      })),
    },
    null,
    2,
  ),
);

if (failures.length) {
  throw new Error(`红方胜势抽样发现 ${failures.length} 个失败局面`);
}

function runProbe(preset, options) {
  let state = parseFen(preset.fen);
  const seen = new Set([positionKey(state)]);
  const moves = [];

  if (state.turn !== 'red') {
    return failed(preset, '不是红方先行');
  }

  for (let ply = 0; ply < options.plies; ply += 1) {
    const status = getGameStatus(state);
    if (status.over) {
      return status.winner === 'black'
        ? failed(preset, `黑方胜：${status.reason}`, moves)
        : passed(preset, status.winner ?? null, moves, status.winner === 'red' ? 'red-win' : 'ongoing');
    }

    const avoidPositionKeys = Array.from(seen);
    const result = findBestMove(toFen(state), options.level, { avoidPositionKeys });
    if (!result.move) return failed(preset, 'AI 未返回合法着法', moves);

    const next = applyMove(state, result.move);
    const key = positionKey(next);
    const label = moveToLabel(result.move);
    moves.push(label);

    if (seen.has(key)) {
      return failed(preset, `出现重复局面：${label}`, moves);
    }

    seen.add(key);
    state = next;
  }

  const finalStatus = getGameStatus(state);
  if (finalStatus.over && finalStatus.winner === 'black') {
    return failed(preset, `黑方胜：${finalStatus.reason}`, moves);
  }

  return passed(
    preset,
    finalStatus.over ? finalStatus.winner : null,
    moves,
    finalStatus.winner === 'red' ? 'red-win' : 'ongoing',
  );
}

function passed(preset, winner, moves, status) {
  return {
    id: preset.id,
    label: preset.name,
    name: preset.name,
    status,
    winner,
    plies: moves.length,
    lastMove: moves.at(-1) ?? '',
  };
}

function failed(preset, reason, moves = []) {
  return {
    id: preset.id,
    label: preset.name,
    name: preset.name,
    status: 'failed',
    winner: 'black',
    reason,
    plies: moves.length,
    lastMove: moves.at(-1) ?? '',
  };
}

function pickSamples(count, seed) {
  const fixedIds = [
    'double-pawns',
    'shiqingyaqu-551-001',
    'shiqingyaqu-551-020',
    'shiqingyaqu-551-120',
  ];
  const fixed = fixedIds
    .map((id) => ENDGAME_PRESETS.find((preset) => preset.id === id))
    .filter(Boolean);

  const pool = ENDGAME_PRESETS.filter(
    (preset) => preset.category === '适情雅趣' && !fixedIds.includes(preset.id),
  );
  let state = seed;
  const output = [...fixed];

  while (output.length < count && pool.length) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const preset = pool[state % pool.length];
    if (!output.some((item) => item.id === preset.id)) output.push(preset);
  }

  return output.slice(0, count);
}

function readArgs() {
  const options = {
    samples: 12,
    plies: 1,
    level: 'club',
    seed: 20260615,
  };

  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key === 'samples') options.samples = Number(value) || options.samples;
    if (key === 'plies') options.plies = Number(value) || options.plies;
    if (key === 'level') options.level = value || options.level;
    if (key === 'seed') options.seed = Number(value) || options.seed;
  }

  return options;
}
