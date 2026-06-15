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
    useEngine: true,
    engineSkill: 16,
    engineTimeLimit: 1800,
    engineEndgameTimeLimit: 3000,
    randomness: 0.05,
    blunderMargin: 28,
    note: '使用强引擎快搜，保留少量可乘之机。',
  },
  {
    id: 'grandmaster',
    label: '宗师',
    depth: 6,
    endgameDepth: 8,
    timeLimit: 9000,
    useEngine: true,
    engineSkill: 20,
    engineTimeLimit: 7000,
    engineEndgameTimeLimit: 12000,
    randomness: 0,
    blunderMargin: 0,
    note: '强引擎长时搜索，残局会自动加时。',
  },
];

export const AI_LEVEL_MAP = Object.fromEntries(AI_LEVELS.map((level) => [level.id, level]));

export const DEFAULT_LEVEL = 'master';
