import {
  getMoveRecordTarget,
  getUndoDepth,
  shouldResumeAutoAfterMove,
  shouldSideAutoMove,
} from '../src/game/interaction.js';
import { getRepetitionInfo } from '../src/game/repetition.js';
import { ENDGAME_PRESETS } from '../src/game/presets.js';
import { getPresetDisplayLabel, getPresetSearchText } from '../src/game/presetLabels.js';
import { applyMove, findLegalMove, parseFen } from '../src/game/xiangqi.js';

const cases = [
  {
    name: '人机模式下，AI 刚走完时一次悔棋回退双方各一步',
    input: {
      mode: 'human',
      humanSide: 'red',
      currentTurn: 'red',
      moveLog: [{ source: '玩家' }, { source: 'AI' }],
      historyLength: 2,
    },
    expected: 2,
  },
  {
    name: '人机模式下，玩家刚走完时只回退玩家这一步',
    input: {
      mode: 'human',
      humanSide: 'red',
      currentTurn: 'black',
      moveLog: [{ source: '玩家' }],
      historyLength: 1,
    },
    expected: 1,
  },
  {
    name: '自动对战仍按单步悔棋',
    input: {
      mode: 'auto',
      humanSide: 'red',
      currentTurn: 'red',
      moveLog: [{ source: 'AI' }, { source: 'AI' }],
      historyLength: 2,
    },
    expected: 1,
  },
  {
    name: '历史不足时不越界',
    input: {
      mode: 'human',
      humanSide: 'red',
      currentTurn: 'red',
      moveLog: [{ source: 'AI' }],
      historyLength: 1,
    },
    expected: 1,
  },
];

for (const item of cases) {
  const actual = getUndoDepth(item.input);
  if (actual !== item.expected) {
    throw new Error(`${item.name}：期望 ${item.expected}，实际 ${actual}`);
  }
}

const resumeCases = [
  {
    name: '残局研究中玩家走子后应自动恢复推演',
    input: { mode: 'analysis', source: '玩家', repeated: false },
    expected: true,
  },
  {
    name: '残局研究中重复局面不应自动恢复推演',
    input: { mode: 'analysis', source: '玩家', repeated: true },
    expected: false,
  },
  {
    name: '人机对弈中玩家走子仍交给原有回合逻辑处理',
    input: { mode: 'human', source: '玩家', repeated: false },
    expected: false,
  },
];

for (const item of resumeCases) {
  const actual = shouldResumeAutoAfterMove(item.input);
  if (actual !== item.expected) {
    throw new Error(`${item.name}：期望 ${item.expected}，实际 ${actual}`);
  }
}

const autoMoveCases = [
  {
    name: '人机模式电脑回合通常自动走',
    input: { mode: 'human', side: 'black', humanSide: 'red', autoPlaying: false, gameOver: false, reviewPaused: false },
    expected: true,
  },
  {
    name: '记录跳转后人机模式电脑回合应暂停',
    input: { mode: 'human', side: 'black', humanSide: 'red', autoPlaying: false, gameOver: false, reviewPaused: true },
    expected: false,
  },
  {
    name: '自动对战暂停时不自动走',
    input: { mode: 'auto', side: 'red', humanSide: 'red', autoPlaying: false, gameOver: false, reviewPaused: false },
    expected: false,
  },
];

for (const item of autoMoveCases) {
  const actual = shouldSideAutoMove(item.input);
  if (actual !== item.expected) {
    throw new Error(`${item.name}：期望 ${item.expected}，实际 ${actual}`);
  }
}

const timeline = {
  currentGame: { id: 'after-3' },
  moveLog: [{ label: 'm1' }, { label: 'm2' }, { label: 'm3' }],
  history: [
    { game: { id: 'start' }, moveLog: [] },
    { game: { id: 'after-1' }, moveLog: [{ label: 'm1' }] },
    { game: { id: 'after-2' }, moveLog: [{ label: 'm1' }, { label: 'm2' }] },
  ],
};

const stepOneTarget = getMoveRecordTarget({ ...timeline, step: 1 });
if (stepOneTarget?.game.id !== 'after-1' || stepOneTarget.moveLog.length !== 1 || stepOneTarget.history.length !== 1) {
  throw new Error(`跳转第 1 手快照异常：${JSON.stringify(stepOneTarget)}`);
}

const stepTwoTarget = getMoveRecordTarget({ ...timeline, step: 2 });
if (stepTwoTarget?.game.id !== 'after-2' || stepTwoTarget.moveLog.length !== 2 || stepTwoTarget.history.length !== 2) {
  throw new Error(`跳转第 2 手快照异常：${JSON.stringify(stepTwoTarget)}`);
}

const latestTarget = getMoveRecordTarget({ ...timeline, step: 3 });
if (latestTarget?.game.id !== 'after-3' || latestTarget.moveLog.length !== 3 || latestTarget.history.length !== 3) {
  throw new Error(`跳转最新手快照异常：${JSON.stringify(latestTarget)}`);
}

if (getMoveRecordTarget({ ...timeline, step: 0 }) !== null || getMoveRecordTarget({ ...timeline, step: 4 }) !== null) {
  throw new Error('非法步数不应返回跳转快照');
}

const tuqiangfurouIndex = ENDGAME_PRESETS.findIndex((preset) => preset.id === 'shiqingyaqu-551-020');
const tuqiangfurou = ENDGAME_PRESETS[tuqiangfurouIndex];
if (!tuqiangfurou) throw new Error('缺少第020局推强扶弱');

const tuqiangfurouLabel = getPresetDisplayLabel(tuqiangfurou, tuqiangfurouIndex);
if (tuqiangfurouLabel !== '020') {
  throw new Error(`第020局显示编号异常：${tuqiangfurouLabel}`);
}

const query020Matches = ENDGAME_PRESETS.filter((preset, index) =>
  getPresetSearchText(preset, index).includes('020'),
).map((preset) => preset.id);

if (!query020Matches.includes('shiqingyaqu-551-020')) {
  throw new Error('搜索 020 应匹配推强扶弱');
}

if (query020Matches.includes('shiqingyaqu-551-017')) {
  throw new Error('搜索 020 不应因全局序号误匹配第017局');
}

const repeatedState = createRepeatedState(tuqiangfurou.fen);
const repetitionInfo = getRepetitionInfo(repeatedState.next, repeatedState.history);
if (!repetitionInfo.repeated || repetitionInfo.count !== 2) {
  throw new Error(`重复局面检测异常：${JSON.stringify(repetitionInfo)}`);
}

console.log(`交互校验通过：${cases.length} 个悔棋场景，${resumeCases.length} 个自动推演场景，${autoMoveCases.length} 个自动行棋场景，记录跳转、残局编号和重复检测校验通过`);

function createRepeatedState(fen) {
  let state = parseFen(fen);
  const history = [];

  for (const [from, to] of [
    ['i8', 'i9'],
    ['e1', 'h1'],
    ['c7', 'e7'],
    ['h1', 'h0'],
    ['f0', 'f1'],
    ['h0', 'h1'],
    ['f1', 'f0'],
  ]) {
    const move = findLegalMove(state, coordToPos(from), coordToPos(to));
    if (!move) throw new Error(`重复检测测试存在非法着法：${from}-${to}`);
    history.push({ game: state });
    state = applyMove(state, move);
  }

  const repeatMove = findLegalMove(state, coordToPos('h1'), coordToPos('h0'));
  if (!repeatMove) throw new Error('重复检测测试缺少回到历史局面的着法');

  return {
    history,
    next: applyMove(state, repeatMove),
  };
}

function coordToPos(coord) {
  return {
    x: 'abcdefghi'.indexOf(coord[0]),
    y: 9 - Number(coord.slice(1)),
  };
}
