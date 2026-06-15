let enginePromise = null;
let engine = null;
let activeSearch = null;
let nextSearchId = 1;
const lines = [];

self.onmessage = async (event) => {
  const { id, type, fen, movetime = 3500, skillLevel = 20 } = event.data ?? {};
  if (type !== 'search') return;

  try {
    const result = await search(fen, movetime, skillLevel);
    self.postMessage({ id, ok: true, ...result });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

async function search(fen, movetime, skillLevel) {
  if (!fen) throw new Error('缺少 FEN');

  const currentEngine = await getEngine();
  const startedAt = Date.now();
  const searchId = nextSearchId++;
  activeSearch = searchId;

  await configureStrength(currentEngine, skillLevel);
  send(currentEngine, 'stop');
  send(currentEngine, 'ucinewgame');
  send(currentEngine, `position fen ${fen}`);
  send(currentEngine, `go movetime ${movetime}`);

  const startIndex = lines.length;
  const searchLines = await waitForLine(
    (line) => line.startsWith('bestmove ') && activeSearch === searchId,
    movetime + 3000,
    startIndex,
  );

  const bestLine = searchLines.find((line) => line.startsWith('bestmove '));
  const bestmove = bestLine?.split(/\s+/)[1] ?? '';
  const lastInfo = [...searchLines].reverse().find((line) => line.startsWith('info depth '));
  activeSearch = null;

  return {
    bestmove,
    score: parseScore(lastInfo),
    depth: parseNumberAfter(lastInfo, 'depth') ?? 0,
    nodes: parseNumberAfter(lastInfo, 'nodes') ?? 0,
    ms: Date.now() - startedAt,
  };
}

async function getEngine() {
  if (!enginePromise) {
    enginePromise = initEngine();
  }
  return enginePromise;
}

async function initEngine() {
  importScripts('/engine/stockfish.js');
  if (typeof Stockfish !== 'function') throw new Error('Fairy-Stockfish 加载失败');

  engine = await Stockfish({
    mainScriptUrlOrBlob: '/engine/stockfish.js',
    locateFile: (file) => `/engine/${file}`,
  });

  engine.addMessageListener((line) => {
    if (typeof line === 'string') {
      lines.push(line);
    }
  });

  send(engine, 'uci');
  await waitForLine((line) => line === 'uciok', 5000, 0);
  send(engine, 'setoption name UCI_Variant value xiangqi');
  send(engine, 'setoption name Hash value 128');
  send(engine, 'setoption name Threads value 2');
  send(engine, 'setoption name Skill Level value 20');
  send(engine, 'isready');
  await waitForLine((line) => line === 'readyok', 5000, 0);
  return engine;
}

async function configureStrength(target, skillLevel) {
  const safeSkill = Math.max(0, Math.min(20, Number(skillLevel) || 20));
  const startIndex = lines.length;
  send(target, `setoption name Skill Level value ${safeSkill}`);
  send(target, 'isready');
  await waitForLine((line) => line === 'readyok', 3000, startIndex);
}

function send(target, command) {
  target.postMessage(command);
}

function waitForLine(predicate, timeout, startIndex) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const timer = setInterval(() => {
      const currentLines = lines.slice(startIndex);
      if (currentLines.some(predicate)) {
        clearInterval(timer);
        resolve(currentLines);
        return;
      }

      if (Date.now() - startedAt > timeout) {
        clearInterval(timer);
        reject(new Error('WASM 引擎响应超时'));
      }
    }, 20);
  });
}

function parseNumberAfter(line, token) {
  if (!line) return null;
  const parts = line.split(/\s+/);
  const index = parts.indexOf(token);
  if (index === -1) return null;
  const value = Number(parts[index + 1]);
  return Number.isFinite(value) ? value : null;
}

function parseScore(line) {
  if (!line) return 0;
  const parts = line.split(/\s+/);
  const scoreIndex = parts.indexOf('score');
  if (scoreIndex === -1) return 0;
  const type = parts[scoreIndex + 1];
  const value = Number(parts[scoreIndex + 2]);
  if (!Number.isFinite(value)) return 0;
  return type === 'mate' ? Math.sign(value) * 1_000_000 : value;
}
