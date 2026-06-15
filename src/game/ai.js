import {
  applyMove,
  countPieces,
  findKing,
  generateLegalMoves,
  isInCheck,
  moveKey,
  parseFen,
  positionKey,
  toFen,
} from './xiangqi.js';
import { AI_LEVEL_MAP, DEFAULT_LEVEL } from './levels.js';

const MATE = 1_000_000;
const INF = 9_999_999;

const PIECE_VALUE = {
  king: 20_000,
  rook: 900,
  cannon: 460,
  horse: 430,
  elephant: 210,
  advisor: 210,
  pawn: 120,
};

export function findBestMove(fen, levelId = DEFAULT_LEVEL, options = {}) {
  const state = parseFen(fen);
  const level = AI_LEVEL_MAP[levelId] ?? AI_LEVEL_MAP[DEFAULT_LEVEL];
  const legalMoves = generateLegalMoves(state, state.turn);
  const candidateMoves = filterRepeatingMoves(state, legalMoves, options.avoidPositionKeys);
  const start = Date.now();
  const pieceCount = countPieces(state);
  const maxDepth = chooseSearchDepth(level, pieceCount);
  const deadline = start + level.timeLimit;
  const stats = {
    nodes: 0,
    deadline,
    stopped: false,
    tableHits: 0,
    history: new Map(),
    killers: Array.from({ length: maxDepth + 16 }, () => []),
  };
  const table = new Map();

  if (legalMoves.length === 0) {
    return { move: null, score: -MATE, depth: 0, nodes: 0, ms: 0 };
  }

  const mateNow = findImmediateMate(state, legalMoves);
  if (mateNow) {
    return { move: mateNow, score: MATE, depth: 1, nodes: 1, ms: Date.now() - start };
  }

  let bestMove = orderMoves(state, candidateMoves, stats, 0)[0];
  let bestScore = -INF;
  let completedDepth = 0;
  let rootScores = [];

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    let currentBest = bestMove;
    let currentScore = -INF;
    const scored = [];
    let alpha = -INF;

    for (const move of orderMoves(state, prioritizeBest(candidateMoves, bestMove), stats, 0, bestMove)) {
      if (Date.now() >= deadline) {
        stats.stopped = true;
        break;
      }

      const next = applyMove(state, move);
      const score = -negamax(next, depth - 1, -INF, -alpha, 1, stats, table);

      scored.push({ move, score });

      if (score > currentScore) {
        currentScore = score;
        currentBest = move;
      }

      alpha = Math.max(alpha, score);
    }

    if (stats.stopped && depth > 1) break;
    if (!scored.length) break;

    completedDepth = depth;
    bestMove = currentBest;
    bestScore = currentScore;
    rootScores = scored.sort((a, b) => b.score - a.score);

    if (Math.abs(bestScore) > MATE - 200) break;
  }

  bestMove = chooseByDifficulty(rootScores, bestMove, bestScore, level);

  return {
    move: bestMove,
    score: Math.round(bestScore),
    depth: completedDepth,
    nodes: stats.nodes,
    tableHits: stats.tableHits,
    ms: Date.now() - start,
    avoidedRepetition: candidateMoves.length !== legalMoves.length || undefined,
  };
}

function filterRepeatingMoves(state, legalMoves, avoidPositionKeys = []) {
  if (!avoidPositionKeys.length) return legalMoves;

  const avoid = new Set(avoidPositionKeys);
  const filtered = legalMoves.filter((move) => !avoid.has(positionKey(applyMove(state, move))));
  return filtered.length ? filtered : legalMoves;
}

function negamax(state, depth, alpha, beta, ply, stats, table) {
  stats.nodes += 1;

  if (Date.now() >= stats.deadline) {
    stats.stopped = true;
    return evaluateForTurn(state);
  }

  if (!findKing(state, 'red')) return state.turn === 'black' ? MATE - ply : -MATE + ply;
  if (!findKing(state, 'black')) return state.turn === 'red' ? MATE - ply : -MATE + ply;

  const inCheck = isInCheck(state, state.turn);
  const searchDepth = inCheck ? depth + 1 : depth;
  const key = toFen(state).split(' ').slice(0, 2).join(' ');
  const cached = table.get(key);
  if (cached && cached.depth >= searchDepth) {
    stats.tableHits += 1;
    if (cached.flag === 'exact') return cached.score;
    if (cached.flag === 'lower') alpha = Math.max(alpha, cached.score);
    if (cached.flag === 'upper') beta = Math.min(beta, cached.score);
    if (alpha >= beta) return cached.score;
  }

  if (searchDepth <= 0) {
    return quiescence(state, alpha, beta, ply, stats, table, 0);
  }

  const originalAlpha = alpha;
  const legalMoves = orderMoves(state, generateLegalMoves(state, state.turn), stats, ply, cached?.bestMove);
  if (legalMoves.length === 0) {
    return -MATE + ply;
  }

  let best = -INF;
  let bestMove = legalMoves[0];
  let localAlpha = alpha;

  for (const move of legalMoves) {
    const next = applyMove(state, move);
    const score = -negamax(next, searchDepth - 1, -beta, -localAlpha, ply + 1, stats, table);

    if (score > best) {
      best = score;
      bestMove = move;
    }
    if (score > localAlpha) localAlpha = score;
    if (localAlpha >= beta) {
      rememberQuietMove(stats, move, ply, searchDepth);
      break;
    }
    if (stats.stopped) break;
  }

  let flag = 'exact';
  if (best <= originalAlpha) flag = 'upper';
  else if (best >= beta) flag = 'lower';
  table.set(key, { depth: searchDepth, score: best, flag, bestMove });
  return best;
}

function quiescence(state, alpha, beta, ply, stats, table, quietDepth) {
  if (!findKing(state, 'red')) return state.turn === 'black' ? MATE - ply : -MATE + ply;
  if (!findKing(state, 'black')) return state.turn === 'red' ? MATE - ply : -MATE + ply;

  const inCheck = isInCheck(state, state.turn);
  if (inCheck) {
    const evasions = orderMoves(state, generateLegalMoves(state, state.turn), stats, ply);
    if (evasions.length === 0) return -MATE + ply;

    let best = -INF;
    let localAlpha = alpha;
    for (const move of evasions) {
      const score = -quiescence(applyMove(state, move), -beta, -localAlpha, ply + 1, stats, table, quietDepth + 1);
      if (score > best) best = score;
      if (score > localAlpha) localAlpha = score;
      if (localAlpha >= beta) return beta;
      if (Date.now() >= stats.deadline || quietDepth >= 8) {
        stats.stopped = Date.now() >= stats.deadline;
        break;
      }
    }
    return best;
  }

  let standPat = evaluateForTurn(state);

  if (standPat >= beta) return beta;
  let localAlpha = Math.max(alpha, standPat);
  if (quietDepth >= 6) return localAlpha;

  const tacticalMoves = orderMoves(
    state,
    generateLegalMoves(state, state.turn).filter((move) => {
      if (move.captured) return true;
      if (quietDepth >= 2) return false;
      const next = applyMove(state, move);
      return isInCheck(next, next.turn);
    }),
    stats,
    ply,
  );

  for (const move of tacticalMoves) {
    const next = applyMove(state, move);
    const score = -quiescence(next, -beta, -localAlpha, ply + 1, stats, table, quietDepth + 1);
    if (score >= beta) return beta;
    if (score > localAlpha) localAlpha = score;
    if (Date.now() >= stats.deadline) {
      stats.stopped = true;
      break;
    }
  }

  return localAlpha;
}

function evaluateForTurn(state) {
  const score = evaluateRedScore(state);
  return state.turn === 'red' ? score : -score;
}

function evaluateRedScore(state) {
  let score = 0;

  for (let y = 0; y < state.board.length; y += 1) {
    for (let x = 0; x < state.board[y].length; x += 1) {
      const piece = state.board[y][x];
      if (!piece) continue;

      const sideFactor = piece.side === 'red' ? 1 : -1;
      score += sideFactor * (PIECE_VALUE[piece.type] + positionalBonus(piece, x, y));
    }
  }

  const redKing = findKing(state, 'red');
  const blackKing = findKing(state, 'black');
  if (!redKing) return -MATE;
  if (!blackKing) return MATE;

  score += kingZonePressure(state, 'red') * 24;
  score -= kingZonePressure(state, 'black') * 24;

  return score;
}

function positionalBonus(piece, x, y) {
  const advance = piece.side === 'red' ? 9 - y : y;
  const center = 4 - Math.abs(4 - x);

  if (piece.type === 'pawn') {
    const crossed = piece.side === 'red' ? y <= 4 : y >= 5;
    return advance * 15 + center * 4 + (crossed ? 55 : 0);
  }

  if (piece.type === 'horse') return center * 13 + Math.min(advance, 6) * 5;
  if (piece.type === 'cannon') return center * 9 + Math.min(advance, 5) * 4;
  if (piece.type === 'rook') return center * 5 + Math.min(advance, 6) * 4;
  if (piece.type === 'king') return -Math.abs(4 - x) * 10 - Math.abs((piece.side === 'red' ? 9 : 0) - y) * 6;

  return center * 3;
}

function orderMoves(state, moves, stats, ply = 0, ttMove = null) {
  return [...moves].sort((a, b) => moveScore(state, b, stats, ply, ttMove) - moveScore(state, a, stats, ply, ttMove));
}

function moveScore(state, move, stats, ply, ttMove) {
  if (ttMove && sameMove(move, ttMove)) return 1_000_000;

  let score = 0;

  if (move.captured) {
    score += 80_000 + PIECE_VALUE[move.captured.type] * 12 - PIECE_VALUE[move.piece.type];
  }

  if (ply <= 2 || move.captured) {
    const next = applyMove(state, move);
    if (!findKing(next, next.turn)) score += 900_000;
    if (ply <= 2 && isInCheck(next, next.turn)) score += 7_500;
  }

  if (!move.captured) {
    if (stats?.killers?.[ply]?.some((item) => sameMove(item, move))) score += 6_000;
    score += stats?.history?.get(moveKey(move)) ?? 0;
  }

  if (move.to.x >= 3 && move.to.x <= 5) score += 8;
  return score;
}

function prioritizeBest(moves, bestMove) {
  if (!bestMove) return moves;
  return [
    bestMove,
    ...moves.filter(
      (move) =>
        move.from.x !== bestMove.from.x ||
        move.from.y !== bestMove.from.y ||
        move.to.x !== bestMove.to.x ||
        move.to.y !== bestMove.to.y,
    ),
  ];
}

function chooseByDifficulty(rootScores, bestMove, bestScore, level) {
  if (!rootScores.length || level.randomness <= 0) return bestMove;
  if (Math.random() > level.randomness) return bestMove;

  const pool = rootScores
    .filter((item) => bestScore - item.score <= level.blunderMargin)
    .slice(0, 4);

  if (!pool.length) return bestMove;
  return pool[Math.floor(Math.random() * pool.length)].move;
}

export function getMoveScore(move) {
  return move.captured ? PIECE_VALUE[move.captured.type] : 0;
}

function chooseSearchDepth(level, pieceCount) {
  if (pieceCount <= 12) return level.endgameDepth;
  if (pieceCount <= 22) return Math.max(level.depth, level.endgameDepth - 1);
  return level.depth;
}

function findImmediateMate(state, legalMoves) {
  return legalMoves.find((move) => {
    const next = applyMove(state, move);
    if (!findKing(next, next.turn)) return true;
    return generateLegalMoves(next, next.turn).length === 0;
  });
}

function rememberQuietMove(stats, move, ply, depth) {
  if (!stats || move.captured) return;
  const key = moveKey(move);
  stats.history.set(key, (stats.history.get(key) ?? 0) + depth * depth);

  const killers = stats.killers[ply];
  if (!killers || killers.some((item) => sameMove(item, move))) return;
  killers.unshift(move);
  if (killers.length > 2) killers.pop();
}

function sameMove(a, b) {
  return (
    a &&
    b &&
    a.from.x === b.from.x &&
    a.from.y === b.from.y &&
    a.to.x === b.to.x &&
    a.to.y === b.to.y
  );
}

function kingZonePressure(state, defendingSide) {
  const king = findKing(state, defendingSide);
  if (!king) return 0;

  const attackingSide = defendingSide === 'red' ? 'black' : 'red';
  let pressure = 0;

  for (let y = 0; y < state.board.length; y += 1) {
    for (let x = 0; x < state.board[y].length; x += 1) {
      const piece = state.board[y][x];
      if (!piece || piece.side !== attackingSide) continue;

      if (attacksKingZone(state, piece, { x, y }, king)) {
        pressure += piece.type === 'rook' || piece.type === 'cannon' ? 3 : 1;
      }
    }
  }

  return pressure;
}

function attacksKingZone(state, piece, from, king) {
  const dx = king.x - from.x;
  const dy = king.y - from.y;
  const distance = Math.abs(dx) + Math.abs(dy);

  if (piece.type === 'rook') {
    return (from.x === king.x || from.y === king.y) && linePieces(state, from, king) === 0;
  }

  if (piece.type === 'cannon') {
    return (from.x === king.x || from.y === king.y) && linePieces(state, from, king) === 1;
  }

  if (piece.type === 'horse') {
    const horseHit =
      (Math.abs(dx) === 1 && Math.abs(dy) === 2) ||
      (Math.abs(dx) === 2 && Math.abs(dy) === 1);
    if (horseHit) {
      const leg = Math.abs(dx) === 2 ? { x: from.x + Math.sign(dx), y: from.y } : { x: from.x, y: from.y + Math.sign(dy) };
      return !state.board[leg.y]?.[leg.x];
    }
    return distance <= 3;
  }

  if (piece.type === 'pawn') {
    const forward = piece.side === 'red' ? -1 : 1;
    return (dx === 0 && dy === forward) || (Math.abs(dx) === 1 && dy === 0 && hasPawnCrossed(from, piece.side));
  }

  if (piece.type === 'king') {
    return from.x === king.x && linePieces(state, from, king) === 0;
  }

  return distance <= 2;
}

function linePieces(state, from, to) {
  if (from.x !== to.x && from.y !== to.y) return Infinity;
  const stepX = Math.sign(to.x - from.x);
  const stepY = Math.sign(to.y - from.y);
  let x = from.x + stepX;
  let y = from.y + stepY;
  let count = 0;

  while (x !== to.x || y !== to.y) {
    if (state.board[y][x]) count += 1;
    x += stepX;
    y += stepY;
  }

  return count;
}

function hasPawnCrossed(pos, side) {
  return side === 'red' ? pos.y <= 4 : pos.y >= 5;
}
