import { findLegalMove } from './xiangqi.js';

const FILES = 'abcdefghi';

export function engineMoveToCoords(value) {
  const match = /^([a-i])(10|[1-9])([a-i])(10|[1-9])/.exec(value);
  if (!match) return null;

  return {
    from: engineSquareToPos(match[1], match[2]),
    to: engineSquareToPos(match[3], match[4]),
  };
}

export function engineMoveToLegalMove(state, value) {
  const coords = engineMoveToCoords(value);
  if (!coords) return null;
  return findLegalMove(state, coords.from, coords.to) ?? null;
}

export function localMoveToEngineMove(move) {
  return `${posToEngineSquare(move.from)}${posToEngineSquare(move.to)}`;
}

function engineSquareToPos(file, rankText) {
  const rank = Number(rankText);
  return {
    x: FILES.indexOf(file),
    y: 10 - rank,
  };
}

function posToEngineSquare(pos) {
  return `${FILES[pos.x]}${10 - pos.y}`;
}
