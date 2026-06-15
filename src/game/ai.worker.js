import { findBestMove } from './ai.js';
import { engineMoveToLegalMove, localMoveToEngineMove } from './fairyProtocol.js';
import { AI_LEVEL_MAP, DEFAULT_LEVEL } from './levels.js';
import { applyMove, countPieces, generateLegalMoves, moveToLabel, parseFen, positionKey } from './xiangqi.js';

let fairyWorker = null;
let fairyBusy = false;
let fairyRequestId = 0;
let fairyBusyRequestId = 0;
let cancelVersion = 0;
let activeFairySearch = null;

self.onmessage = async (event) => {
  if (event.data?.type === 'cancel') {
    cancelCurrentSearch();
    return;
  }

  const { id, fen, level, avoidPositionKeys = [] } = event.data;
  const requestVersion = cancelVersion;

  try {
    const levelConfig = AI_LEVEL_MAP[level] ?? AI_LEVEL_MAP[DEFAULT_LEVEL];
    if (levelConfig.useEngine) {
      const result = await findFairyMove(fen, level, avoidPositionKeys);
      if (requestVersion !== cancelVersion || result?.cancelled) return;

      if (result?.move) {
        self.postMessage({ id, ok: true, ...withMoveLabel(result) });
        return;
      }

      const fallback = findBestMove(fen, level, { avoidPositionKeys });
      self.postMessage({
        id,
        ok: true,
        ...withMoveLabel(fallback),
        engine: '本地 Negamax',
        fallbackReason: result?.fallbackReason ?? 'WASM 引擎暂不可用',
      });
      return;
    }

    const result = findBestMove(fen, level, { avoidPositionKeys });
    if (requestVersion !== cancelVersion) return;
    self.postMessage({ id, ok: true, ...withMoveLabel(result), engine: '本地 Negamax' });
  } catch (error) {
    if (requestVersion !== cancelVersion) return;
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

async function findFairyMove(fen, levelId, avoidPositionKeys = []) {
  if (fairyBusy) return { fallbackReason: 'WASM 引擎正在计算上一手' };

  const level = AI_LEVEL_MAP[levelId] ?? AI_LEVEL_MAP[DEFAULT_LEVEL];
  const state = parseFen(fen);
  const pieceCount = countPieces(state);
  const worker = getFairyEngine();
  const movetime = chooseEngineTime(level, pieceCount);
  const searchMoves = buildNonRepeatingSearchMoves(state, avoidPositionKeys);

  fairyBusy = true;
  const start = Date.now();
  const requestId = ++fairyRequestId;
  fairyBusyRequestId = requestId;

  try {
    const engineResult = await requestFairySearch(worker, {
      id: requestId,
      fen,
      movetime,
      skillLevel: level.engineSkill ?? 20,
      searchMoves,
    });

    if (!engineResult?.ok) {
      return { fallbackReason: engineResult?.error ?? 'WASM 引擎没有完成搜索' };
    }

    if (!engineResult.bestmove || engineResult.bestmove === '0000') {
      return { fallbackReason: 'WASM 引擎没有返回可用着法' };
    }

    const move = engineMoveToLegalMove(state, engineResult.bestmove);
    if (!move) return { fallbackReason: `WASM 返回非法着法 ${engineResult.bestmove}` };
    if (moveRepeatsPosition(state, move, avoidPositionKeys)) {
      return { fallbackReason: `WASM 返回重复局面着法 ${engineResult.bestmove}` };
    }

    return {
      move,
      score: engineResult.score ?? 0,
      depth: engineResult.depth ?? 0,
      nodes: engineResult.nodes ?? 0,
      ms: engineResult.ms ?? Date.now() - start,
      engine: 'Fairy-Stockfish WASM',
      engineSkill: level.engineSkill ?? 20,
      engineTimeLimit: movetime,
      avoidedRepetition: Boolean(searchMoves?.length) || undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('已取消')) {
      return {
        cancelled: true,
        fallbackReason: error.message,
      };
    }

    return {
      fallbackReason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (fairyBusyRequestId === requestId) {
      fairyBusy = false;
      fairyBusyRequestId = 0;
    }
  }
}

function moveRepeatsPosition(state, move, avoidPositionKeys = []) {
  if (!avoidPositionKeys.length) return false;
  return new Set(avoidPositionKeys).has(positionKey(applyMove(state, move)));
}

function buildNonRepeatingSearchMoves(state, avoidPositionKeys = []) {
  if (!avoidPositionKeys.length) return null;

  const avoid = new Set(avoidPositionKeys);
  const legalMoves = generateLegalMoves(state, state.turn);
  const allowed = legalMoves.filter((move) => !avoid.has(positionKey(applyMove(state, move))));

  if (!allowed.length || allowed.length === legalMoves.length) return null;
  return allowed.map(localMoveToEngineMove);
}

function chooseEngineTime(level, pieceCount) {
  if (pieceCount <= 12) {
    return level.engineEndgameTimeLimit ?? level.engineTimeLimit ?? 3500;
  }
  return level.engineTimeLimit ?? 3500;
}

function withMoveLabel(result) {
  return {
    ...result,
    bestMoveLabel: result.move ? moveToLabel(result.move) : '',
  };
}

function cancelCurrentSearch() {
  cancelVersion += 1;

  if (activeFairySearch) {
    activeFairySearch.cancel();
    activeFairySearch = null;
  }

  if (fairyWorker) {
    fairyWorker.terminate();
    fairyWorker = null;
  }

  fairyBusy = false;
  fairyBusyRequestId = 0;
  fairyRequestId += 1;
}

function getFairyEngine() {
  if (!fairyWorker) {
    fairyWorker = new Worker('/engine/fairy-wrapper.js');
  }
  return fairyWorker;
}

function requestFairySearch(worker, payload) {
  return new Promise((resolve, reject) => {
    const timeout = payload.movetime + 4500;
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('WASM 引擎响应超时'));
    }, timeout);

    const handleMessage = (event) => {
      if (event.data?.id !== payload.id) return;
      cleanup();
      resolve(event.data);
    };

    const handleError = (error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timer);
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      if (activeFairySearch?.id === payload.id) activeFairySearch = null;
    };

    activeFairySearch = {
      id: payload.id,
      cancel: () => {
        cleanup();
        reject(new Error('WASM 引擎搜索已取消'));
      },
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({ type: 'search', ...payload });
  });
}
