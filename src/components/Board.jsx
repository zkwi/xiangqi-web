import { PIECE_TEXT, posKey, samePos } from '../game/xiangqi.js';

const files = Array.from({ length: 9 }, (_, x) => x);
const ranks = Array.from({ length: 10 }, (_, y) => y);
const points = ranks.flatMap((y) => files.map((x) => ({ x, y })));

export function Board({ state, legalMoves, selected, lastMove, theme, disabled, onPoint }) {
  const legalTargets = new Set(legalMoves.map((move) => posKey(move.to)));

  return (
    <section className={`board-shell theme-${theme}`} aria-label="中国象棋棋盘">
      <div className="board-topline">
        <div className={`board-player black ${state.turn === 'black' ? 'active' : ''}`}>
          <span className="side-dot black" />
          黑方
        </div>
        <div className={`board-player red ${state.turn === 'red' ? 'active' : ''}`}>
          <span className="side-dot red" />
          红方
        </div>
      </div>

      <div className="board-surface">
        <div className="grid-layer">
          <BoardLines />
          <BoardCoordinates />
          <div className="river-label river-left">楚河</div>
          <div className="river-label river-right">汉界</div>
        </div>

        <div className="piece-layer">
          {points.map((point) => {
            const piece = state.board[point.y][point.x];
            const isSelected = samePos(selected, point);
            const isLegal = legalTargets.has(posKey(point));
            const isLast =
              lastMove && (samePos(lastMove.from, point) || samePos(lastMove.to, point));

            return (
              <button
                className={[
                  'board-point',
                  piece ? 'has-piece' : '',
                  piece?.side ?? '',
                  isSelected ? 'selected' : '',
                  isLegal ? 'legal' : '',
                  isLast ? 'last' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={disabled}
                key={posKey(point)}
                style={{ left: `${(point.x / 8) * 100}%`, top: `${(point.y / 9) * 100}%` }}
                type="button"
                aria-label={pointLabel(point, piece)}
                onClick={() => onPoint(point)}
              >
                {piece ? (
                  <span className="piece-face">{PIECE_TEXT[piece.side][piece.type]}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BoardCoordinates() {
  return (
    <div className="coordinate-layer" aria-hidden="true">
      {files.map((x) => (
        <span className="coord-file top" key={`top-${x}`} style={{ left: `${(x / 8) * 100}%` }}>
          {'abcdefghi'[x]}
        </span>
      ))}
      {files.map((x) => (
        <span className="coord-file bottom" key={`bottom-${x}`} style={{ left: `${(x / 8) * 100}%` }}>
          {'abcdefghi'[x]}
        </span>
      ))}
      {ranks.map((y) => (
        <span className="coord-rank left" key={`left-${y}`} style={{ top: `${(y / 9) * 100}%` }}>
          {9 - y}
        </span>
      ))}
      {ranks.map((y) => (
        <span className="coord-rank right" key={`right-${y}`} style={{ top: `${(y / 9) * 100}%` }}>
          {9 - y}
        </span>
      ))}
    </div>
  );
}

function BoardLines() {
  const horizontal = ranks.map((y) => (
    <line key={`h-${y}`} x1="0" x2="8" y1={y} y2={y} />
  ));

  const vertical = files.flatMap((x) => [
    <line key={`v-${x}-top`} x1={x} x2={x} y1="0" y2="4" />,
    <line key={`v-${x}-bottom`} x1={x} x2={x} y1="5" y2="9" />,
  ]);

  return (
    <svg className="board-lines" viewBox="0 0 8 9" preserveAspectRatio="none" aria-hidden="true">
      <g className="line-major">
        {horizontal}
        {vertical}
      </g>
      <g className="palace-lines">
        <line x1="3" y1="0" x2="5" y2="2" />
        <line x1="5" y1="0" x2="3" y2="2" />
        <line x1="3" y1="7" x2="5" y2="9" />
        <line x1="5" y1="7" x2="3" y2="9" />
      </g>
    </svg>
  );
}

function pointLabel(point, piece) {
  const coord = `${'abcdefghi'[point.x]}${9 - point.y}`;
  if (!piece) return coord;
  return `${coord} ${piece.side === 'red' ? '红' : '黑'}${PIECE_TEXT[piece.side][piece.type]}`;
}
