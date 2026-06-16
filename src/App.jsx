import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, StepForward, Undo2 } from 'lucide-react';
import { AnalysisPanel } from './components/AnalysisPanel.jsx';
import { Board } from './components/Board.jsx';
import { ControlPanel } from './components/ControlPanel.jsx';
import { playMoveFeedback, playSound, preloadSounds, unlockAudio } from './audio.js';
import { AI_LEVELS, DEFAULT_LEVEL } from './game/levels.js';
import {
  getMoveRecordTarget,
  getUndoDepth,
  shouldResumeAutoAfterMove,
  shouldSideAutoMove,
} from './game/interaction.js';
import { getRepetitionInfo } from './game/repetition.js';
import { BOARD_THEMES } from './ui/boardThemes.js';
import {
  applyMove,
  createGame,
  findLegalMove,
  generateLegalMoves,
  getGameStatus,
  moveToLabel,
  parseFen,
  pieceAt,
  positionKey,
  samePos,
  SIDE_NAMES,
  START_FEN,
  toFen,
} from './game/xiangqi.js';
import './style.css';

const STORAGE_KEY = 'xiangqi-web-state-v1';
const STORAGE_VERSION = 1;
const DEFAULT_POSITION_START = { fen: START_FEN, label: '标准开局' };
const MODE_IDS = new Set(['human', 'auto', 'analysis']);
const SIDE_IDS = new Set(['red', 'black']);
const LEVEL_IDS = new Set(AI_LEVELS.map((level) => level.id));
const THEME_IDS = new Set(BOARD_THEMES.map((theme) => theme.id));

export default function App() {
  const initialAppState = useMemo(loadStoredAppState, []);
  const [game, setGame] = useState(initialAppState.game);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(initialAppState.history);
  const [moveLog, setMoveLog] = useState(initialAppState.moveLog);
  const [mode, setMode] = useState(initialAppState.mode);
  const [humanSide, setHumanSide] = useState(initialAppState.humanSide);
  const [redLevel, setRedLevel] = useState(initialAppState.redLevel);
  const [blackLevel, setBlackLevel] = useState(initialAppState.blackLevel);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [aiThinking, setAiThinking] = useState('');
  const [searchInfo, setSearchInfo] = useState(initialAppState.searchInfo);
  const [soundOn, setSoundOn] = useState(initialAppState.soundOn);
  const [voiceOn, setVoiceOn] = useState(initialAppState.voiceOn);
  const [boardTheme, setBoardTheme] = useState(initialAppState.boardTheme);
  const [fenInput, setFenInput] = useState(initialAppState.fenInput);
  const [fenError, setFenError] = useState('');
  const [repetitionNotice, setRepetitionNotice] = useState('');
  const [positionStart, setPositionStart] = useState(initialAppState.positionStart);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [pendingRecordJump, setPendingRecordJump] = useState(null);
  const [recordReviewPaused, setRecordReviewPaused] = useState(false);

  const workerRef = useRef(null);
  const requestRef = useRef(0);
  const pendingFenRef = useRef('');
  const gameRef = useRef(game);
  const historyRef = useRef(history);
  const moveLogRef = useRef(moveLog);
  const toFenRef = useRef('');

  const fen = useMemo(() => toFen(game), [game]);
  const status = useMemo(() => getGameStatus(game), [game]);
  const legalMoves = useMemo(() => generateLegalMoves(game, game.turn), [game]);
  const selectedMoves = useMemo(
    () => (selected ? legalMoves.filter((move) => samePos(move.from, selected)) : []),
    [legalMoves, selected],
  );

  const gameStatus = {
    ...status,
    turnName: SIDE_NAMES[game.turn],
  };
  const endgameResult = useMemo(
    () => createEndgameResult(gameStatus, mode, humanSide, fen),
    [fen, gameStatus.over, gameStatus.reason, gameStatus.winner, humanSide, mode],
  );
  const isHumanMode = mode === 'human';
  const isHumanTurn = isHumanMode && game.turn === humanSide;
  const mobileStatusText = gameStatus.over
    ? gameStatus.winner
      ? `${SIDE_NAMES[gameStatus.winner]}胜`
      : '对局结束'
    : gameStatus.check
      ? '被将军'
      : isHumanMode
        ? isHumanTurn
          ? '玩家回合'
          : '电脑回合'
        : autoPlaying
          ? '运行中'
          : '已暂停';
  const mobileDetailText = gameStatus.over
    ? gameStatus.reason || '已结束'
    : repetitionNotice
      ? '已暂停'
    : aiThinking
      ? `${aiThinking}思考中`
      : isHumanMode
        ? isHumanTurn
          ? '轮到你'
          : '等待电脑'
        : autoPlaying
          ? '自动行棋'
          : '就绪';
  const humanStepLabel = isHumanTurn ? 'AI代走' : '电脑应手';
  const mobileTurnSide = gameStatus.over ? 'finished' : game.turn;

  const lastMove = moveLog.at(-1)?.move ?? null;

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    moveLogRef.current = moveLog;
  }, [moveLog]);

  useEffect(() => {
    toFenRef.current = fen;
  }, [fen]);

  useEffect(() => {
    preloadSounds();
  }, []);

  useEffect(() => {
    saveStoredAppState({
      fen,
      history,
      moveLog,
      mode,
      humanSide,
      redLevel,
      blackLevel,
      searchInfo,
      soundOn,
      voiceOn,
      boardTheme,
      fenInput,
      positionStart,
    });
  }, [
    blackLevel,
    boardTheme,
    fen,
    fenInput,
    history,
    humanSide,
    mode,
    moveLog,
    positionStart,
    redLevel,
    searchInfo,
    soundOn,
    voiceOn,
  ]);

  const cancelPendingAi = useCallback(() => {
    requestRef.current += 1;
    pendingFenRef.current = '';
    workerRef.current?.postMessage({ type: 'cancel' });
    setAiThinking('');
  }, []);

  const commitMove = useCallback(
    (move, source) => {
      const current = gameRef.current;
      const legalMove = findLegalMove(current, move.from, move.to);
      if (!legalMove) return;

      const next = applyMove(current, legalMove);
      const nextFen = toFen(next);
      const nextStatus = getGameStatus(next);
      const repetitionInfo = getRepetitionInfo(next, historyRef.current);
      const nextLog = [
        ...moveLogRef.current,
        {
          label: moveToLabel(legalMove),
          source,
          move: legalMove,
        },
      ];

      gameRef.current = next;
      moveLogRef.current = nextLog;
      toFenRef.current = nextFen;

      const nextHistory = [...historyRef.current, { game: current, moveLog: moveLogRef.current.slice(0, -1) }];
      historyRef.current = nextHistory;

      setHistory(nextHistory);
      setMoveLog(nextLog);
      setGame(next);
      setFenInput(nextFen);
      setSelected(null);
      setRecordReviewPaused(false);

      if (repetitionInfo.repeated) {
        const repeatText = repetitionInfo.threefold ? '检测到三次重复局面，已暂停自动行棋。' : '检测到重复局面，已暂停自动行棋。';
        setRepetitionNotice(repeatText);
        setAutoPlaying(false);
      } else {
        setRepetitionNotice('');
        if (shouldResumeAutoAfterMove({ mode, source, repeated: false })) setAutoPlaying(true);
      }

      playMoveFeedback({
        over: nextStatus.over,
        captured: Boolean(legalMove.captured),
        check: nextStatus.check,
        endText: nextStatus.winner ? `${SIDE_NAMES[nextStatus.winner]}胜` : '游戏结束',
        soundOn,
        voiceOn,
      });
    },
    [mode, soundOn, voiceOn],
  );

  useEffect(() => {
    const worker = new Worker(new URL('./game/ai.worker.js', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const { id, ok, move, error, ...info } = event.data;
      if (id !== requestRef.current) return;

      setAiThinking('');
      setSearchInfo(ok ? info : null);

      if (!ok) {
        setFenError(error);
        return;
      }

      if (!move || pendingFenRef.current !== toFenRef.current) return;
      commitMove(move, 'AI');
    };

    return () => worker.terminate();
  }, [commitMove]);

  const requestAiMove = useCallback(() => {
    if (!workerRef.current || status.over || aiThinking) return;

    const level = game.turn === 'red' ? redLevel : blackLevel;
    const id = requestRef.current + 1;
    const avoidPositionKeys = Array.from(new Set(history.map((item) => positionKey(item.game))));
    requestRef.current = id;
    pendingFenRef.current = fen;
    setSearchInfo(null);
    setFenError('');
    setRepetitionNotice('');
    setRecordReviewPaused(false);
    setAiThinking(SIDE_NAMES[game.turn]);
    workerRef.current.postMessage({ id, fen, level, avoidPositionKeys });
  }, [aiThinking, blackLevel, fen, game.turn, history, redLevel, status.over]);

  const changeSoundOn = useCallback((value) => {
    setSoundOn(value);
    if (value) {
      unlockAudio(true);
      playSound('ui', true);
    }
  }, []);

  const changeVoiceOn = useCallback(
    (value) => {
      setVoiceOn(value);
      if (value) playSound('ui', soundOn, '语音已开启', true);
      else playSound('ui', soundOn);
    },
    [soundOn],
  );

  useEffect(() => {
    if (!soundOn && !voiceOn) return undefined;

    const unlock = () => unlockAudio(true);
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, [soundOn, voiceOn]);

  const changeAutoPlaying = useCallback(
    (value) => {
      if (!value) cancelPendingAi();
      setAutoPlaying(value);
      setRecordReviewPaused(false);
    },
    [cancelPendingAi],
  );

  const changeMode = useCallback(
    (value) => {
      cancelPendingAi();
      setMode(value);
      setAutoPlaying(false);
      setSelected(null);
      setRecordReviewPaused(false);
    },
    [cancelPendingAi],
  );

  const changeHumanSide = useCallback(
    (value) => {
      cancelPendingAi();
      setHumanSide(value);
      setAutoPlaying(false);
      setSelected(null);
      setRecordReviewPaused(false);
    },
    [cancelPendingAi],
  );

  const sideIsAi = useCallback(
    (side) =>
      shouldSideAutoMove({
        mode,
        side,
        humanSide,
        autoPlaying,
        gameOver: status.over,
        reviewPaused: recordReviewPaused,
      }),
    [autoPlaying, humanSide, mode, recordReviewPaused, status.over],
  );

  useEffect(() => {
    if (sideIsAi(game.turn)) {
      const delay = mode === 'human' ? 260 : 520;
      const timer = window.setTimeout(requestAiMove, delay);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [game.turn, mode, requestAiMove, sideIsAi]);

  useEffect(() => {
    if (status.over && autoPlaying) {
      setAutoPlaying(false);
    }
  }, [autoPlaying, status.over]);

  const boardInteractionDisabled = Boolean(
    aiThinking || sideIsAi(game.turn) || (recordReviewPaused && isHumanMode && !isHumanTurn),
  );

  const handlePoint = (point) => {
    if (boardInteractionDisabled) return;

    const piece = pieceAt(game, point);

    if (!selected) {
      if (piece?.side === game.turn) {
        setSelected(point);
        playSound('ui', soundOn);
      }
      return;
    }

    const selectedPiece = pieceAt(game, selected);
    if (piece?.side === game.turn) {
      setSelected(point);
      playSound('ui', soundOn);
      return;
    }

    if (!selectedPiece) {
      setSelected(null);
      return;
    }

    const move = selectedMoves.find((item) => samePos(item.to, point));
    if (move) {
      commitMove(move, '玩家');
    } else {
      setSelected(null);
    }
  };

  const undo = () => {
    const depth = getUndoDepth({
      mode,
      humanSide,
      currentTurn: game.turn,
      moveLog,
      historyLength: history.length,
    });
    const previous = history.at(-depth);
    if (!previous) return;

    cancelPendingAi();
    gameRef.current = previous.game;
    moveLogRef.current = previous.moveLog;
    toFenRef.current = toFen(previous.game);
    setGame(previous.game);
    setMoveLog(previous.moveLog);
    setHistory((items) => items.slice(0, -depth));
    historyRef.current = history.slice(0, -depth);
    setSelected(null);
    setAutoPlaying(false);
    setRecordReviewPaused(false);
    setFenInput(toFen(previous.game));
    setRepetitionNotice('');
    playSound('ui', soundOn);
  };

  const requestReset = () => {
    cancelPendingAi();
    setAutoPlaying(false);
    setPendingRecordJump(null);
    setRecordReviewPaused(false);
    setResetConfirmOpen(true);
    playSound('ui', soundOn);
  };

  const resetToPositionStart = () => {
    const next = createGame(positionStart.fen);
    const nextFen = toFen(next);
    cancelPendingAi();
    gameRef.current = next;
    moveLogRef.current = [];
    toFenRef.current = nextFen;
    setGame(next);
    setMoveLog([]);
    setHistory([]);
    historyRef.current = [];
    setSelected(null);
    setAutoPlaying(false);
    setRecordReviewPaused(false);
    setAiThinking('');
    setSearchInfo(null);
    setRepetitionNotice('');
    setFenInput(nextFen);
    setFenError('');
    setResetConfirmOpen(false);
    playSound('ui', soundOn);
  };

  const cancelReset = () => {
    setResetConfirmOpen(false);
    playSound('ui', soundOn);
  };

  const requestMoveRecordJump = (step) => {
    const item = moveLogRef.current[step - 1];
    if (!item) return;

    setResetConfirmOpen(false);
    setPendingRecordJump({ step, label: item.label });
    playSound('ui', soundOn);
  };

  const confirmMoveRecordJump = () => {
    if (!pendingRecordJump) return;

    const target = getMoveRecordTarget({
      step: pendingRecordJump.step,
      history: historyRef.current,
      currentGame: gameRef.current,
      moveLog: moveLogRef.current,
    });
    setPendingRecordJump(null);
    if (!target) return;

    const nextFen = toFen(target.game);
    cancelPendingAi();
    gameRef.current = target.game;
    moveLogRef.current = target.moveLog;
    historyRef.current = target.history;
    toFenRef.current = nextFen;
    setGame(target.game);
    setMoveLog(target.moveLog);
    setHistory(target.history);
    setSelected(null);
    setAutoPlaying(false);
    setRecordReviewPaused(true);
    setAiThinking('');
    setSearchInfo(null);
    setRepetitionNotice('');
    setFenInput(nextFen);
    setFenError('');
    playSound('ui', soundOn);
  };

  const cancelMoveRecordJump = () => {
    setPendingRecordJump(null);
    playSound('ui', soundOn);
  };

  const loadFen = () => {
    try {
      const next = parseFen(fenInput);
      const loadedFen = toFen(next);
      cancelPendingAi();
      gameRef.current = next;
      moveLogRef.current = [];
      toFenRef.current = loadedFen;
      setGame(next);
      setMoveLog([]);
      setHistory([]);
      historyRef.current = [];
      setSelected(null);
      setAutoPlaying(false);
      setRecordReviewPaused(false);
      setAiThinking('');
      setSearchInfo(null);
      setFenError('');
      setRepetitionNotice('');
      setFenInput(loadedFen);
      setPositionStart({ fen: loadedFen, label: '自定义局面' });
      playSound('ui', soundOn);
    } catch (error) {
      setFenError(error instanceof Error ? error.message : String(error));
    }
  };

  const loadPreset = (preset) => {
    const next = parseFen(preset.fen);
    const loadedFen = toFen(next);
    cancelPendingAi();
    gameRef.current = next;
    moveLogRef.current = [];
    toFenRef.current = loadedFen;
    setGame(next);
    setMoveLog([]);
    setHistory([]);
    historyRef.current = [];
    setSelected(null);
    setAutoPlaying(false);
    setRecordReviewPaused(false);
    setAiThinking('');
    setSearchInfo(null);
    setFenError('');
    setRepetitionNotice('');
    setFenInput(loadedFen);
    setPositionStart({ fen: preset.fen, label: preset.name });
    playSound('ui', soundOn);
  };

  return (
    <main className="app-shell">
      <div className="workspace">
        <ControlPanel
          mode={mode}
          setMode={changeMode}
          humanSide={humanSide}
          setHumanSide={changeHumanSide}
          redLevel={redLevel}
          blackLevel={blackLevel}
          setRedLevel={setRedLevel}
          setBlackLevel={setBlackLevel}
          autoPlaying={autoPlaying}
          setAutoPlaying={changeAutoPlaying}
          aiThinking={aiThinking}
          soundOn={soundOn}
          setSoundOn={changeSoundOn}
          voiceOn={voiceOn}
          setVoiceOn={changeVoiceOn}
          boardTheme={boardTheme}
          setBoardTheme={setBoardTheme}
          canUndo={history.length > 0}
          gameStatus={gameStatus}
          legalMoveCount={legalMoves.length}
          repetitionNotice={repetitionNotice}
          resetTargetLabel={positionStart.label}
          onUndo={undo}
          onReset={requestReset}
          onStepAi={requestAiMove}
        />

        <Board
          state={game}
          legalMoves={selectedMoves}
          selected={selected}
          lastMove={lastMove}
          result={endgameResult}
          theme={boardTheme}
          disabled={boardInteractionDisabled}
          checkedSide={status.check ? game.turn : null}
          onPoint={handlePoint}
        />

        <div className="mobile-action-bar" aria-label="手机快捷控制">
          <div className="mobile-action-status">
            <span className={`turn-pill ${mobileTurnSide}`}>
              {gameStatus.over ? '终局' : gameStatus.turnName}
            </span>
            <div>
              <span>{repetitionNotice || mobileStatusText}</span>
              <strong>{mobileDetailText}</strong>
            </div>
          </div>
          <div className={`mobile-action-buttons ${isHumanMode ? 'human' : ''}`}>
            <button
              className="primary-action"
              type="button"
              disabled={isHumanMode ? Boolean(aiThinking || gameStatus.over) : gameStatus.over}
              onClick={isHumanMode ? requestAiMove : () => changeAutoPlaying(!autoPlaying)}
            >
              {isHumanMode ? <StepForward size={17} /> : autoPlaying ? <Pause size={17} /> : <Play size={17} />}
              {isHumanMode ? humanStepLabel : autoPlaying ? '暂停' : mode === 'analysis' ? '研究' : '对战'}
            </button>
            {!isHumanMode ? (
              <button type="button" disabled={Boolean(aiThinking || gameStatus.over)} onClick={requestAiMove}>
                <StepForward size={16} />
                AI
              </button>
            ) : null}
            <button type="button" disabled={history.length === 0} onClick={undo} title="悔棋">
              <Undo2 size={17} />
            </button>
            <button type="button" onClick={requestReset} title={`重开到${positionStart.label}`}>
              <RotateCcw size={17} />
            </button>
          </div>
        </div>

        <AnalysisPanel
          fen={fen}
          fenInput={fenInput}
          setFenInput={setFenInput}
          fenError={fenError}
          moveLog={moveLog}
          searchInfo={searchInfo}
          repetitionNotice={repetitionNotice}
          onLoadFen={loadFen}
          onLoadPreset={loadPreset}
          onMoveRecordSelect={requestMoveRecordJump}
        />
      </div>

      {resetConfirmOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={cancelReset}>
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="panel-kicker">确认重开</p>
            <h2 id="reset-confirm-title">重开当前局面？</h2>
            <p>
              将回到「{positionStart.label}」，当前着法记录和搜索结果会被清空。
            </p>
            <div className="confirm-actions">
              <button type="button" onClick={cancelReset}>
                取消
              </button>
              <button className="danger-action" type="button" onClick={resetToPositionStart}>
                确认重开
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingRecordJump ? (
        <div className="modal-backdrop" role="presentation" onClick={cancelMoveRecordJump}>
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-jump-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="panel-kicker">确认跳转</p>
            <h2 id="record-jump-confirm-title">跳转到第 {pendingRecordJump.step} 手？</h2>
            <p>
              将回到「{pendingRecordJump.label}」之后的局面，后续着法记录会被截断，自动行棋会暂停。
            </p>
            <div className="confirm-actions">
              <button type="button" onClick={cancelMoveRecordJump}>
                取消
              </button>
              <button className="danger-action" type="button" onClick={confirmMoveRecordJump}>
                确认跳转
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function createDefaultAppState() {
  return {
    game: createGame(START_FEN),
    history: [],
    moveLog: [],
    mode: 'human',
    humanSide: 'red',
    redLevel: DEFAULT_LEVEL,
    blackLevel: DEFAULT_LEVEL,
    searchInfo: null,
    soundOn: true,
    voiceOn: true,
    boardTheme: BOARD_THEMES[0].id,
    fenInput: START_FEN,
    positionStart: DEFAULT_POSITION_START,
  };
}

function createEndgameResult(gameStatus, mode, humanSide, fen) {
  if (!gameStatus.over) return null;

  const winnerName = gameStatus.winner ? SIDE_NAMES[gameStatus.winner] : '双方';
  const playerSideName = SIDE_NAMES[humanSide];
  const isHumanMode = mode === 'human';
  const humanWon = isHumanMode && gameStatus.winner === humanSide;

  if (!gameStatus.winner) {
    return {
      key: `${fen}-draw-${gameStatus.reason}`,
      badge: '终',
      eyebrow: '对局结束',
      title: '终局',
      subtitle: gameStatus.reason || '无合法着法',
      tone: 'neutral',
      winner: 'neutral',
    };
  }

  return {
    key: `${fen}-${gameStatus.winner}-${gameStatus.reason}`,
    badge: isHumanMode ? (humanWon ? '胜' : '负') : '胜',
    eyebrow: isHumanMode ? `${playerSideName}执棋` : '对局结束',
    title: isHumanMode ? (humanWon ? '胜利' : '惜败') : `${winnerName}胜`,
    subtitle: `${winnerName}获胜 · ${gameStatus.reason}`,
    tone: isHumanMode ? (humanWon ? 'win' : 'loss') : 'neutral',
    winner: gameStatus.winner,
  };
}

function loadStoredAppState() {
  const fallback = createDefaultAppState();
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const saved = JSON.parse(raw);
    if (saved?.version !== STORAGE_VERSION) return fallback;

    const game = createGame(saved.fen || START_FEN);
    const currentFen = toFen(game);
    const positionStart = readStoredPositionStart(saved.positionStart);

    return {
      ...fallback,
      game,
      history: readStoredHistory(saved.history),
      moveLog: readStoredMoveLog(saved.moveLog),
      mode: MODE_IDS.has(saved.mode) ? saved.mode : fallback.mode,
      humanSide: SIDE_IDS.has(saved.humanSide) ? saved.humanSide : fallback.humanSide,
      redLevel: LEVEL_IDS.has(saved.redLevel) ? saved.redLevel : fallback.redLevel,
      blackLevel: LEVEL_IDS.has(saved.blackLevel) ? saved.blackLevel : fallback.blackLevel,
      searchInfo: saved.searchInfo && typeof saved.searchInfo === 'object' ? saved.searchInfo : null,
      soundOn: typeof saved.soundOn === 'boolean' ? saved.soundOn : fallback.soundOn,
      voiceOn: typeof saved.voiceOn === 'boolean' ? saved.voiceOn : fallback.voiceOn,
      boardTheme: THEME_IDS.has(saved.boardTheme) ? saved.boardTheme : fallback.boardTheme,
      fenInput: typeof saved.fenInput === 'string' ? saved.fenInput : currentFen,
      positionStart,
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return fallback;
  }
}

function saveStoredAppState(state) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        savedAt: Date.now(),
        fen: state.fen,
        history: state.history.map((item) => ({
          fen: toFen(item.game),
          moveLog: compactMoveLog(item.moveLog),
        })),
        moveLog: compactMoveLog(state.moveLog),
        mode: state.mode,
        humanSide: state.humanSide,
        redLevel: state.redLevel,
        blackLevel: state.blackLevel,
        searchInfo: state.searchInfo,
        soundOn: state.soundOn,
        voiceOn: state.voiceOn,
        boardTheme: state.boardTheme,
        fenInput: state.fenInput,
        positionStart: state.positionStart,
      }),
    );
  } catch {
    // 浏览器可能禁用存储或空间已满，不影响正常下棋。
  }
}

function readStoredHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .map((item) => {
      try {
        return {
          game: createGame(item.fen),
          moveLog: readStoredMoveLog(item.moveLog),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function readStoredMoveLog(moveLog) {
  if (!Array.isArray(moveLog)) return [];
  return compactMoveLog(moveLog);
}

function compactMoveLog(moveLog) {
  if (!Array.isArray(moveLog)) return [];

  return moveLog
    .map((item) => {
      const move = readStoredMove(item?.move);
      if (!item?.label || !item?.source || !move) return null;
      return {
        label: String(item.label),
        source: String(item.source),
        move,
      };
    })
    .filter(Boolean);
}

function readStoredMove(move) {
  const from = readStoredPoint(move?.from);
  const to = readStoredPoint(move?.to);
  if (!from || !to) return null;

  return {
    from,
    to,
    piece: readStoredPiece(move.piece),
    captured: readStoredPiece(move.captured),
  };
}

function readStoredPoint(point) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 8 || y < 0 || y > 9) {
    return null;
  }
  return { x, y };
}

function readStoredPiece(piece) {
  if (!piece || !SIDE_IDS.has(piece.side) || typeof piece.type !== 'string') return null;
  return { side: piece.side, type: piece.type };
}

function readStoredPositionStart(positionStart) {
  if (!positionStart?.fen || !positionStart?.label) return DEFAULT_POSITION_START;

  try {
    return {
      fen: toFen(createGame(positionStart.fen)),
      label: String(positionStart.label),
    };
  } catch {
    return DEFAULT_POSITION_START;
  }
}
