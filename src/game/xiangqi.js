export const BOARD_WIDTH = 9;
export const BOARD_HEIGHT = 10;

export const START_FEN =
  'rheakaehr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RHEAKAEHR w - - 0 1';

export const SIDE_NAMES = {
  red: '红方',
  black: '黑方',
};

export const PIECE_TEXT = {
  red: {
    king: '帅',
    advisor: '仕',
    elephant: '相',
    horse: '马',
    rook: '车',
    cannon: '炮',
    pawn: '兵',
  },
  black: {
    king: '将',
    advisor: '士',
    elephant: '象',
    horse: '马',
    rook: '车',
    cannon: '炮',
    pawn: '卒',
  },
};

const FEN_TO_TYPE = {
  k: 'king',
  a: 'advisor',
  e: 'elephant',
  b: 'elephant',
  h: 'horse',
  n: 'horse',
  r: 'rook',
  c: 'cannon',
  p: 'pawn',
};

const TYPE_TO_FEN = {
  king: 'k',
  advisor: 'a',
  elephant: 'e',
  horse: 'h',
  rook: 'r',
  cannon: 'c',
  pawn: 'p',
};

const ORTHOGONAL = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

const HORSE_STEPS = [
  { dx: 1, dy: 2, leg: [0, 1] },
  { dx: -1, dy: 2, leg: [0, 1] },
  { dx: 1, dy: -2, leg: [0, -1] },
  { dx: -1, dy: -2, leg: [0, -1] },
  { dx: 2, dy: 1, leg: [1, 0] },
  { dx: 2, dy: -1, leg: [1, 0] },
  { dx: -2, dy: 1, leg: [-1, 0] },
  { dx: -2, dy: -1, leg: [-1, 0] },
];

export function otherSide(side) {
  return side === 'red' ? 'black' : 'red';
}

export function emptyBoard() {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
}

export function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

export function cloneState(state) {
  return {
    board: cloneBoard(state.board),
    turn: state.turn,
    halfmove: state.halfmove,
    fullmove: state.fullmove,
  };
}

export function parseFen(fen) {
  const parts = fen.trim().split(/\s+/);
  const rows = parts[0]?.split('/');

  if (!rows || rows.length !== BOARD_HEIGHT) {
    throw new Error('FEN 必须包含 10 行棋盘');
  }

  const board = emptyBoard();

  rows.forEach((row, y) => {
    let x = 0;
    for (const char of row) {
      if (/\d/.test(char)) {
        x += Number(char);
        continue;
      }

      const type = FEN_TO_TYPE[char.toLowerCase()];
      if (!type) {
        throw new Error(`无法识别的棋子：${char}`);
      }

      if (x >= BOARD_WIDTH) {
        throw new Error('FEN 行宽超过 9 列');
      }

      board[y][x] = {
        side: char === char.toUpperCase() ? 'red' : 'black',
        type,
      };
      x += 1;
    }

    if (x !== BOARD_WIDTH) {
      throw new Error('FEN 每行必须正好 9 列');
    }
  });

  return {
    board,
    turn: parseFenSide(parts[1]),
    halfmove: Number(parts[4] ?? 0) || 0,
    fullmove: Number(parts[5] ?? 1) || 1,
  };
}

export function toFen(state) {
  const boardPart = state.board
    .map((row) => {
      let output = '';
      let empty = 0;

      row.forEach((piece) => {
        if (!piece) {
          empty += 1;
          return;
        }

        if (empty) {
          output += String(empty);
          empty = 0;
        }

        const char = TYPE_TO_FEN[piece.type];
        output += piece.side === 'red' ? char.toUpperCase() : char;
      });

      return output + (empty ? String(empty) : '');
    })
    .join('/');

  const side = state.turn === 'red' ? 'w' : 'b';
  return `${boardPart} ${side} - - ${state.halfmove ?? 0} ${state.fullmove ?? 1}`;
}

function parseFenSide(value = 'w') {
  const normalized = value.toLowerCase();
  if (normalized === 'b' || normalized === 'black') return 'black';
  return 'red';
}

export function createGame(fen = START_FEN) {
  return parseFen(fen);
}

export function inBounds(pos) {
  return (
    pos.x >= 0 &&
    pos.x < BOARD_WIDTH &&
    pos.y >= 0 &&
    pos.y < BOARD_HEIGHT
  );
}

export function samePos(a, b) {
  return Boolean(a && b && a.x === b.x && a.y === b.y);
}

export function pieceAt(state, pos) {
  if (!inBounds(pos)) return null;
  return state.board[pos.y][pos.x];
}

export function findKing(state, side) {
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const piece = state.board[y][x];
      if (piece?.side === side && piece.type === 'king') {
        return { x, y };
      }
    }
  }
  return null;
}

export function countPieces(state) {
  let count = 0;
  state.board.forEach((row) => {
    row.forEach((piece) => {
      if (piece) count += 1;
    });
  });
  return count;
}

export function generateLegalMoves(state, side = state.turn) {
  if (!findKing(state, side)) return [];

  return generatePseudoMoves(state, side).filter((move) => {
    const next = applyMove(state, move);
    return !isInCheck(next, side);
  });
}

export function generatePseudoMoves(state, side = state.turn) {
  const moves = [];

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const piece = state.board[y][x];
      if (!piece || piece.side !== side) continue;

      const from = { x, y };
      if (piece.type === 'king') addKingMoves(state, moves, from, piece);
      if (piece.type === 'advisor') addAdvisorMoves(state, moves, from, piece);
      if (piece.type === 'elephant') addElephantMoves(state, moves, from, piece);
      if (piece.type === 'horse') addHorseMoves(state, moves, from, piece);
      if (piece.type === 'rook') addRookMoves(state, moves, from, piece);
      if (piece.type === 'cannon') addCannonMoves(state, moves, from, piece);
      if (piece.type === 'pawn') addPawnMoves(state, moves, from, piece);
    }
  }

  return moves;
}

function addMove(state, moves, from, to, piece) {
  if (!inBounds(to)) return;
  const captured = pieceAt(state, to);
  if (captured?.side === piece.side) return;
  moves.push({ from, to, piece, captured });
}

function addKingMoves(state, moves, from, piece) {
  ORTHOGONAL.forEach(([dx, dy]) => {
    const to = { x: from.x + dx, y: from.y + dy };
    if (inPalace(to, piece.side)) addMove(state, moves, from, to, piece);
  });

  // 将帅照面是残局里很常见的战术，直接纳入伪合法走法便于 AI 识别。
  [-1, 1].forEach((dy) => {
    let y = from.y + dy;
    while (y >= 0 && y < BOARD_HEIGHT) {
      const target = state.board[y][from.x];
      if (target) {
        if (target.side !== piece.side && target.type === 'king') {
          moves.push({
            from,
            to: { x: from.x, y },
            piece,
            captured: target,
          });
        }
        break;
      }
      y += dy;
    }
  });
}

function addAdvisorMoves(state, moves, from, piece) {
  [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ].forEach(([dx, dy]) => {
    const to = { x: from.x + dx, y: from.y + dy };
    if (inPalace(to, piece.side)) addMove(state, moves, from, to, piece);
  });
}

function addElephantMoves(state, moves, from, piece) {
  [
    [2, 2],
    [2, -2],
    [-2, 2],
    [-2, -2],
  ].forEach(([dx, dy]) => {
    const eye = { x: from.x + dx / 2, y: from.y + dy / 2 };
    const to = { x: from.x + dx, y: from.y + dy };

    if (!inBounds(to) || pieceAt(state, eye)) return;
    if (piece.side === 'red' && to.y < 5) return;
    if (piece.side === 'black' && to.y > 4) return;

    addMove(state, moves, from, to, piece);
  });
}

function addHorseMoves(state, moves, from, piece) {
  HORSE_STEPS.forEach(({ dx, dy, leg }) => {
    const legPos = { x: from.x + leg[0], y: from.y + leg[1] };
    const to = { x: from.x + dx, y: from.y + dy };
    if (!pieceAt(state, legPos)) addMove(state, moves, from, to, piece);
  });
}

function addRookMoves(state, moves, from, piece) {
  ORTHOGONAL.forEach(([dx, dy]) => {
    let x = from.x + dx;
    let y = from.y + dy;

    while (inBounds({ x, y })) {
      const target = state.board[y][x];
      if (!target) {
        moves.push({ from, to: { x, y }, piece, captured: null });
      } else {
        if (target.side !== piece.side) {
          moves.push({ from, to: { x, y }, piece, captured: target });
        }
        break;
      }
      x += dx;
      y += dy;
    }
  });
}

function addCannonMoves(state, moves, from, piece) {
  ORTHOGONAL.forEach(([dx, dy]) => {
    let x = from.x + dx;
    let y = from.y + dy;
    let hasScreen = false;

    while (inBounds({ x, y })) {
      const target = state.board[y][x];

      if (!hasScreen) {
        if (!target) {
          moves.push({ from, to: { x, y }, piece, captured: null });
        } else {
          hasScreen = true;
        }
      } else if (target) {
        if (target.side !== piece.side) {
          moves.push({ from, to: { x, y }, piece, captured: target });
        }
        break;
      }

      x += dx;
      y += dy;
    }
  });
}

function addPawnMoves(state, moves, from, piece) {
  const forward = piece.side === 'red' ? -1 : 1;
  addMove(state, moves, from, { x: from.x, y: from.y + forward }, piece);

  if (hasCrossedRiver(from, piece.side)) {
    addMove(state, moves, from, { x: from.x - 1, y: from.y }, piece);
    addMove(state, moves, from, { x: from.x + 1, y: from.y }, piece);
  }
}

function inPalace(pos, side) {
  const palaceY = side === 'red' ? pos.y >= 7 && pos.y <= 9 : pos.y >= 0 && pos.y <= 2;
  return pos.x >= 3 && pos.x <= 5 && palaceY;
}

function hasCrossedRiver(pos, side) {
  return side === 'red' ? pos.y <= 4 : pos.y >= 5;
}

export function applyMove(state, move) {
  const board = cloneBoard(state.board);
  const piece = board[move.from.y][move.from.x];
  const captured = board[move.to.y][move.to.x];

  board[move.to.y][move.to.x] = piece;
  board[move.from.y][move.from.x] = null;

  return {
    board,
    turn: otherSide(state.turn),
    halfmove: captured || piece?.type === 'pawn' ? 0 : (state.halfmove ?? 0) + 1,
    fullmove: state.turn === 'black' ? (state.fullmove ?? 1) + 1 : state.fullmove ?? 1,
  };
}

export function isInCheck(state, side = state.turn) {
  const king = findKing(state, side);
  if (!king) return true;

  return generatePseudoMoves(state, otherSide(side)).some((move) => samePos(move.to, king));
}

export function getGameStatus(state) {
  const redKing = findKing(state, 'red');
  const blackKing = findKing(state, 'black');

  if (!redKing) {
    return { over: true, winner: 'black', reason: '红帅被擒', check: false, legalMoves: 0 };
  }

  if (!blackKing) {
    return { over: true, winner: 'red', reason: '黑将被擒', check: false, legalMoves: 0 };
  }

  const legalMoves = generateLegalMoves(state, state.turn);
  const check = isInCheck(state, state.turn);

  if (legalMoves.length === 0) {
    return {
      over: true,
      winner: otherSide(state.turn),
      reason: check ? '将死' : '困毙',
      check,
      legalMoves: 0,
    };
  }

  return { over: false, winner: null, reason: '', check, legalMoves: legalMoves.length };
}

export function findLegalMove(state, from, to) {
  return generateLegalMoves(state, state.turn).find(
    (move) => samePos(move.from, from) && samePos(move.to, to),
  );
}

export function moveKey(move) {
  return `${move.from.x},${move.from.y}-${move.to.x},${move.to.y}`;
}

export function posKey(pos) {
  return `${pos.x},${pos.y}`;
}

export function posToCoord(pos) {
  return `${'abcdefghi'[pos.x]}${9 - pos.y}`;
}

export function moveToLabel(move) {
  const side = SIDE_NAMES[move.piece.side];
  const piece = PIECE_TEXT[move.piece.side][move.piece.type];
  const separator = move.captured ? 'x' : '-';
  return `${side} ${piece} ${posToCoord(move.from)}${separator}${posToCoord(move.to)}`;
}
