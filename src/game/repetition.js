import { positionKey } from './xiangqi.js';

export function getRepetitionInfo(state, history = []) {
  const key = positionKey(state);
  const previousCount = history.reduce((count, item) => {
    if (!item?.game) return count;
    return positionKey(item.game) === key ? count + 1 : count;
  }, 0);

  return {
    key,
    previousCount,
    count: previousCount + 1,
    repeated: previousCount > 0,
    threefold: previousCount >= 2,
  };
}
