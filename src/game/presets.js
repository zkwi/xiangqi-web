import { START_FEN } from './xiangqi.js';
import { SHIQINGYAQU_ENDGAMES } from './endgameLibrary.js';

export const ENDGAME_PRESETS = [
  {
    id: 'standard-start',
    name: '标准开局',
    fen: START_FEN,
    category: '精选',
    note: '完整初始局面，适合人机对弈。',
  },
  {
    id: 'rook-basic-win',
    name: '单车例胜',
    fen: '4k4/9/4R4/9/9/9/9/9/9/4K4 w - - 0 1',
    category: '精选',
    note: '红车控线，适合观察机器收官。',
  },
  {
    id: 'horse-cannon-attack',
    name: '马炮攻杀',
    fen: '3ak4/4a4/4b4/9/4C4/3H5/9/9/9/4K4 w - - 0 1',
    category: '精选',
    note: '红方马炮配合，黑方有士象防守。',
  },
  {
    id: 'double-pawns',
    name: '双兵压境',
    fen: '3ak4/4a4/9/3P1P3/9/9/9/9/9/4K4 w - - 0 1',
    category: '精选',
    note: '少子残局，宗师档会自动加深。',
  },
  {
    id: 'black-counterplay',
    name: '黑方反先',
    fen: '4k4/9/9/9/9/9/4p4/9/4c4/4K4 b - - 0 1',
    category: '精选',
    note: '黑炮卒先行，可测试黑方 AI 行棋。',
  },
  ...SHIQINGYAQU_ENDGAMES,
];
