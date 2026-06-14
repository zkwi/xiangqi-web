const SOUND_FILES = {
  move: '/sounds/move.wav',
  capture: '/sounds/capture.wav',
  check: '/sounds/check.wav',
  win: '/sounds/win.wav',
  ui: '/sounds/ui.wav',
};

const cache = new Map();

export function playSound(name, enabled) {
  if (!enabled) return;

  const src = SOUND_FILES[name] ?? SOUND_FILES.ui;
  const audio = cache.get(src) ?? new Audio(src);
  cache.set(src, audio);

  audio.currentTime = 0;
  audio.volume = name === 'win' ? 0.55 : 0.42;
  audio.play().catch(() => {
    // 浏览器可能在首次用户手势前禁止播放，忽略即可。
  });
}
