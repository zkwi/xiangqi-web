import { getMoveFeedbackEvents, playMoveFeedback, playSound, preloadSounds, unlockAudio } from '../src/audio.js';

const api = { getMoveFeedbackEvents, playMoveFeedback, playSound, preloadSounds, unlockAudio };

for (const [name, value] of Object.entries(api)) {
  if (typeof value !== 'function') {
    throw new Error(`音频接口缺失：${name}`);
  }
}

const captureEvents = getMoveFeedbackEvents({ over: false, captured: true, check: false });
if (captureEvents.length !== 1 || captureEvents[0].name !== 'capture' || captureEvents[0].speechText !== '吃') {
  throw new Error(`吃子反馈异常：${JSON.stringify(captureEvents)}`);
}

const captureCheckEvents = getMoveFeedbackEvents({ over: false, captured: true, check: true });
if (
  captureCheckEvents.length !== 2 ||
  captureCheckEvents[0].name !== 'capture' ||
  captureCheckEvents[1].name !== 'check' ||
  captureCheckEvents[1].delay <= 0
) {
  throw new Error(`吃子将军反馈异常：${JSON.stringify(captureCheckEvents)}`);
}

const quietMove = playMoveFeedback({
  over: false,
  captured: true,
  check: true,
  soundOn: false,
  voiceOn: false,
});
if (quietMove !== undefined) throw new Error('静音走棋反馈不应返回结果');

console.log(`音频接口校验通过：${Object.keys(api).length} 个函数`);
