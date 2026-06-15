const SOUND_FILES = {
  move: '/sounds/move.wav',
  capture: '/sounds/capture.mp3',
  check: '/sounds/check.wav',
  win: '/sounds/win.wav',
  ui: '/sounds/ui.wav',
};

const SOUND_VOLUME = {
  move: 0.32,
  capture: 0.46,
  check: 0.5,
  win: 0.56,
  ui: 0.28,
};

const SPEECH_TEXT = {
  capture: '吃',
  check: '将军',
  win: '胜利',
};

const MOVE_FEEDBACK_GAP = 180;

const cache = new Map();
const bufferCache = new Map();

let audioContext = null;
let audioUnlocked = false;
let speechTimer = 0;

function getAudio(name) {
  const src = SOUND_FILES[name] ?? SOUND_FILES.ui;
  const audio = cache.get(src) ?? new Audio(src);
  audio.preload = 'auto';
  cache.set(src, audio);
  return audio;
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  audioContext ??= new AudioContextClass();
  return audioContext;
}

function soundName(name) {
  return SOUND_FILES[name] ? name : 'ui';
}

async function loadBuffer(name) {
  const normalized = soundName(name);
  const context = getAudioContext();
  if (!context) throw new Error('Web Audio 不可用');

  if (!bufferCache.has(normalized)) {
    const src = SOUND_FILES[normalized];
    const promise = fetch(src)
      .then((response) => {
        if (!response.ok) throw new Error(`音效资源加载失败：${src}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data));
    bufferCache.set(normalized, promise);
  }

  return bufferCache.get(normalized);
}

async function playWithAudioContext(name) {
  const normalized = soundName(name);
  const context = getAudioContext();
  if (!context) throw new Error('Web Audio 不可用');
  if (context.state === 'suspended') await context.resume();

  const buffer = await loadBuffer(normalized);
  const source = context.createBufferSource();
  const gain = context.createGain();
  gain.gain.value = SOUND_VOLUME[normalized] ?? SOUND_VOLUME.ui;
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
  audioUnlocked = true;
}

function playWithAudioElement(name) {
  const normalized = soundName(name);
  const audio = getAudio(normalized);
  audio.currentTime = 0;
  audio.volume = SOUND_VOLUME[normalized] ?? SOUND_VOLUME.ui;
  audio.play().catch((error) => {
    if (import.meta.env.DEV) {
      console.warn('音效播放被浏览器拦截，点击页面或开启音效后会自动解锁。', error);
    }
  });
}

function getChineseVoice(synth) {
  return synth
    .getVoices()
    .find((voice) => {
      const text = `${voice.lang} ${voice.name}`;
      return /zh|Chinese|Mandarin|中文|普通话/i.test(text);
    });
}

function speakChinese(name, enabled, text = SPEECH_TEXT[name]) {
  if (!enabled || !text || typeof window === 'undefined') return;

  const synth = window.speechSynthesis;
  const Utterance = window.SpeechSynthesisUtterance;
  if (!synth || !Utterance) return;

  window.clearTimeout(speechTimer);
  speechTimer = window.setTimeout(() => {
    const utterance = new Utterance(text);
    const voice = getChineseVoice(synth);

    utterance.lang = voice?.lang || 'zh-CN';
    utterance.voice = voice || null;
    utterance.rate = 1.02;
    utterance.pitch = 1.05;
    utterance.volume = 0.78;

    synth.cancel();
    synth.speak(utterance);
  }, 35);
}

export function preloadSounds(names = Object.keys(SOUND_FILES)) {
  names.forEach((name) => {
    const audio = getAudio(name);
    try {
      audio.load();
    } catch {
      // 少数浏览器可能限制预加载，真正播放时再重试即可。
    }

    if (getAudioContext()) {
      loadBuffer(name).catch(() => {
        // 解码失败时保留 HTMLAudioElement 兜底。
      });
    }
  });
}

export function unlockAudio(enabled) {
  if (!enabled) return;

  const context = getAudioContext();
  preloadSounds();
  if (!context) return;

  audioUnlocked = true;
  context
    .resume()
    .then(() => {
      audioUnlocked = true;
    })
    .catch(() => {
      audioUnlocked = false;
    });
}

export function playSound(name, audioEnabled, speechText, speechEnabled = audioEnabled) {
  if (!audioEnabled && !speechEnabled) return;
  const normalized = soundName(name);

  if (audioEnabled) {
    const context = getAudioContext();
    if (context && (audioUnlocked || context.state === 'running')) {
      playWithAudioContext(normalized).catch(() => playWithAudioElement(normalized));
    } else {
      playWithAudioElement(normalized);
    }
  }

  speakChinese(normalized, speechEnabled, speechText);
}

export function getMoveFeedbackEvents({ over, captured, check, endText }) {
  if (over) return [{ name: 'win', speechText: endText || SPEECH_TEXT.win, delay: 0 }];

  if (captured && check) {
    return [
      { name: 'capture', speechText: SPEECH_TEXT.capture, delay: 0 },
      { name: 'check', speechText: SPEECH_TEXT.check, delay: MOVE_FEEDBACK_GAP },
    ];
  }

  if (captured) return [{ name: 'capture', speechText: SPEECH_TEXT.capture, delay: 0 }];
  if (check) return [{ name: 'check', speechText: SPEECH_TEXT.check, delay: 0 }];
  return [{ name: 'move', speechText: undefined, delay: 0 }];
}

export function playMoveFeedback({ over, captured, check, endText, soundOn, voiceOn }) {
  const events = getMoveFeedbackEvents({ over, captured, check, endText });

  for (const event of events) {
    const play = () => playSound(event.name, soundOn, event.speechText, voiceOn);
    if (event.delay && typeof window !== 'undefined') window.setTimeout(play, event.delay);
    else play();
  }
}
