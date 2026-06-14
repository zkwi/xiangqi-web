export const AI_LEVELS = [
  {
    id: 'beginner',
    label: '入门',
    depth: 1,
    endgameDepth: 2,
    timeLimit: 220,
    randomness: 0.42,
    blunderMargin: 220,
    note: '走法快，偶尔会漏看吃子。',
  },
  {
    id: 'club',
    label: '棋士',
    depth: 2,
    endgameDepth: 3,
    timeLimit: 650,
    randomness: 0.18,
    blunderMargin: 95,
    note: '能看到直接攻防，适合练习。',
  },
  {
    id: 'master',
    label: '大师',
    depth: 4,
    endgameDepth: 6,
    timeLimit: 2400,
    randomness: 0.05,
    blunderMargin: 28,
    note: '优先争先、兑子和将军手段。',
  },
  {
    id: 'grandmaster',
    label: '宗师',
    depth: 6,
    endgameDepth: 8,
    timeLimit: 9000,
    engineTimeLimit: 4500,
    randomness: 0,
    blunderMargin: 0,
    note: '最深搜索，残棋会更难缠。',
  },
];

export const AI_LEVEL_MAP = Object.fromEntries(AI_LEVELS.map((level) => [level.id, level]));

export const DEFAULT_LEVEL = 'master';
