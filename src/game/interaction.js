export function getUndoDepth({ mode, humanSide, currentTurn, moveLog, historyLength }) {
  if (!historyLength) return 0;

  const lastMove = moveLog.at(-1);
  const shouldUndoPair =
    mode === 'human' &&
    lastMove?.source === 'AI' &&
    currentTurn === humanSide &&
    historyLength >= 2;

  return shouldUndoPair ? 2 : 1;
}

export function shouldResumeAutoAfterMove({ mode, source, repeated }) {
  return mode === 'analysis' && source === '玩家' && !repeated;
}

export function shouldSideAutoMove({ mode, side, humanSide, autoPlaying, gameOver, reviewPaused }) {
  if (gameOver || reviewPaused) return false;
  if (mode === 'auto') return autoPlaying;
  if (mode === 'analysis') return autoPlaying;
  return side !== humanSide;
}

export function getMoveRecordTarget({ step, history, currentGame, moveLog }) {
  if (!Number.isInteger(step) || step < 1 || step > moveLog.length) return null;

  if (step === moveLog.length) {
    return {
      game: currentGame,
      moveLog,
      history,
    };
  }

  const snapshot = history[step];
  if (!snapshot?.game || !Array.isArray(snapshot.moveLog)) return null;

  return {
    game: snapshot.game,
    moveLog: snapshot.moveLog,
    history: history.slice(0, step),
  };
}
