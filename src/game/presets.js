import { SHIQINGYAQU_ENDGAMES } from './endgameLibrary.js';

export const SHIQINGYAQU_RED_WIN_LIMIT = 468;

export function getShiqingyaquNumber(preset) {
  const match = preset.id?.match(/^shiqingyaqu-\d+-(\d{3})$/);
  return match ? Number(match[1]) : null;
}

export const RED_WIN_SHIQINGYAQU_ENDGAMES = SHIQINGYAQU_ENDGAMES.filter((preset) => {
  const number = getShiqingyaquNumber(preset);
  return number !== null && number <= SHIQINGYAQU_RED_WIN_LIMIT;
});

export const ENDGAME_PRESETS = [
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
  ...RED_WIN_SHIQINGYAQU_ENDGAMES,
];
