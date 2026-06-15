import { PIECE_TEXT, posKey, samePos } from '../game/xiangqi.js';

const files = Array.from({ length: 9 }, (_, x) => x);
const ranks = Array.from({ length: 10 }, (_, y) => y);
const points = ranks.flatMap((y) => files.map((x) => ({ x, y })));

export function Board({ state, legalMoves, selected, lastMove, result, theme, disabled, onPoint }) {
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
            const isCaptureTarget = isLegal && piece && piece.side !== state.turn;
            const isLastFrom = lastMove && samePos(lastMove.from, point);
            const isLastTo = lastMove && samePos(lastMove.to, point);

            return (
              <button
                className={[
                  'board-point',
                  piece ? 'has-piece' : '',
                  piece?.side ?? '',
                  isSelected ? 'selected' : '',
                  isLegal ? 'legal' : '',
                  isCaptureTarget ? 'capture-target' : '',
                  isLastFrom ? 'last-from' : '',
                  isLastTo ? 'last-to' : '',
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
                  <span className="piece-face">
                    <span className="piece-glyph">{PIECE_TEXT[piece.side][piece.type]}</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {result ? <EndgameOverlay key={result.key} result={result} /> : null}
      </div>
    </section>
  );
}

function EndgameOverlay({ result }) {
  return (
    <div
      className={['endgame-overlay', `winner-${result.winner}`, result.tone].filter(Boolean).join(' ')}
      role="status"
      aria-live="assertive"
    >
      <span className="endgame-ring" aria-hidden="true" />
      <div className="endgame-message">
        <span className="endgame-kicker">{result.eyebrow}</span>
        <span className="endgame-medal" aria-hidden="true">
          {result.badge}
        </span>
        <strong>{result.title}</strong>
        <em>{result.subtitle}</em>
      </div>
    </div>
  );
}

function BoardCoordinates() {
  return (
    <div className="coordinate-layer" aria-hidden="true">
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
      <g className="point-marks">
        {MARK_POINTS.map((point) => (
          <MarkPoint key={`mark-${point.x}-${point.y}`} point={point} />
        ))}
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

const MARK_POINTS = [
  { x: 1, y: 2 },
  { x: 7, y: 2 },
  { x: 0, y: 3 },
  { x: 2, y: 3 },
  { x: 4, y: 3 },
  { x: 6, y: 3 },
  { x: 8, y: 3 },
  { x: 0, y: 6 },
  { x: 2, y: 6 },
  { x: 4, y: 6 },
  { x: 6, y: 6 },
  { x: 8, y: 6 },
  { x: 1, y: 7 },
  { x: 7, y: 7 },
];

function MarkPoint({ point }) {
  const gap = 0.085;
  const len = 0.13;
  const paths = [];

  if (point.x > 0) {
    paths.push(`M ${point.x - gap - len} ${point.y - gap} H ${point.x - gap} V ${point.y - gap - len}`);
    paths.push(`M ${point.x - gap - len} ${point.y + gap} H ${point.x - gap} V ${point.y + gap + len}`);
  }

  if (point.x < 8) {
    paths.push(`M ${point.x + gap + len} ${point.y - gap} H ${point.x + gap} V ${point.y - gap - len}`);
    paths.push(`M ${point.x + gap + len} ${point.y + gap} H ${point.x + gap} V ${point.y + gap + len}`);
  }

  return <path d={paths.join(' ')} />;
}

function pointLabel(point, piece) {
  const coord = `${'abcdefghi'[point.x]}${9 - point.y}`;
  if (!piece) return coord;
  return `${coord} ${piece.side === 'red' ? '红' : '黑'}${PIECE_TEXT[piece.side][piece.type]}`;
}
