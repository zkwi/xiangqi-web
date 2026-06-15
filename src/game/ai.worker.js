import { findBestMove } from './ai.js';
import { engineMoveToLegalMove } from './fairyProtocol.js';
import { AI_LEVEL_MAP, DEFAULT_LEVEL } from './levels.js';
import { countPieces, moveToLabel, parseFen } from './xiangqi.js';

let fairyWorker = null;
let fairyBusy = false;
let fairyRequestId = 0;

self.onmessage = async (event) => {
  const { id, fen, level } = event.data;

  try {
    const levelConfig = AI_LEVEL_MAP[level] ?? AI_LEVEL_MAP[DEFAULT_LEVEL];
    if (levelConfig.useEngine) {
      const result = await findFairyMove(fen, level);
      if (result?.move) {
        self.postMessage({ id, ok: true, ...withMoveLabel(result) });
        return;
      }

      const fallback = findBestMove(fen, level);
      self.postMessage({
        id,
        ok: true,
        ...withMoveLabel(fallback),
        engine: '本地 Negamax',
        fallbackReason: result?.fallbackReason ?? 'WASM 引擎暂不可用',
      });
      return;
    }

    const result = findBestMove(fen, level);
    self.postMessage({ id, ok: true, ...withMoveLabel(result), engine: '本地 Negamax' });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

async function findFairyMove(fen, levelId) {
  if (fairyBusy) return { fallbackReason: 'WASM 引擎正在计算上一手' };

  const level = AI_LEVEL_MAP[levelId] ?? AI_LEVEL_MAP[DEFAULT_LEVEL];
  const state = parseFen(fen);
  const pieceCount = countPieces(state);
  const worker = getFairyEngine();
  const movetime = chooseEngineTime(level, pieceCount);

  fairyBusy = true;
  const start = Date.now();
  const requestId = ++fairyRequestId;

  try {
    const engineResult = await requestFairySearch(worker, {
      id: requestId,
      fen,
      movetime,
      skillLevel: level.engineSkill ?? 20,
    });

    if (!engineResult?.ok) {
      return { fallbackReason: engineResult?.error ?? 'WASM 引擎没有完成搜索' };
    }

    if (!engineResult.bestmove || engineResult.bestmove === '0000') {
      return { fallbackReason: 'WASM 引擎没有返回可用着法' };
    }

    const move = engineMoveToLegalMove(state, engineResult.bestmove);
    if (!move) return { fallbackReason: `WASM 返回非法着法 ${engineResult.bestmove}` };

    return {
      move,
      score: engineResult.score ?? 0,
      depth: engineResult.depth ?? 0,
      nodes: engineResult.nodes ?? 0,
      ms: engineResult.ms ?? Date.now() - start,
      engine: 'Fairy-Stockfish WASM',
      engineSkill: level.engineSkill ?? 20,
      engineTimeLimit: movetime,
    };
  } catch (error) {
    return {
      fallbackReason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    fairyBusy = false;
  }
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
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({ type: 'search', ...payload });
  });
}
