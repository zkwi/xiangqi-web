import {
  Bot,
  Brain,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  Undo2,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AI_LEVELS, AI_LEVEL_MAP } from '../game/levels.js';
import { BOARD_THEMES } from '../ui/boardThemes.js';

export function ControlPanel({
  mode,
  setMode,
  humanSide,
  setHumanSide,
  redLevel,
  blackLevel,
  setRedLevel,
  setBlackLevel,
  autoPlaying,
  setAutoPlaying,
  aiThinking,
  soundOn,
  setSoundOn,
  boardTheme,
  setBoardTheme,
  canUndo,
  gameStatus,
  resetTargetLabel,
  onUndo,
  onReset,
  onStepAi,
}) {
  const statusText = gameStatus.over
    ? `${gameStatus.winner === 'red' ? '红方' : '黑方'}胜：${gameStatus.reason}`
    : gameStatus.check
      ? '被将军'
      : '行棋';
  const turnSide = gameStatus.over ? 'finished' : gameStatus.turnName === '红方' ? 'red' : 'black';
  const statusClass = ['status-card', gameStatus.check ? 'warning' : '', aiThinking ? 'thinking' : '']
    .filter(Boolean)
    .join(' ');
  const autoActionLabel =
    mode === 'analysis'
      ? autoPlaying
        ? '暂停残局推演'
        : '开始残局推演'
      : autoPlaying
        ? '暂停自动对战'
        : '开始自动对战';

  return (
    <aside className="panel control-panel">
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">对局控制</p>
          <h2>中国象棋</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          title={soundOn ? '关闭提示音' : '开启提示音'}
          onClick={() => setSoundOn(!soundOn)}
        >
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      <div className={statusClass} aria-live="polite">
        <div className="status-main">
          <span className={`turn-pill ${turnSide}`}>{gameStatus.over ? '终局' : gameStatus.turnName}</span>
          <span>{statusText}</span>
        </div>
        <strong>{aiThinking ? `${aiThinking}思考中` : '就绪'}</strong>
      </div>

      <div className="field-group">
        <label>模式</label>
        <div className="segmented mode-tabs">
          <button className={mode === 'human' ? 'active' : ''} type="button" onClick={() => setMode('human')}>
            <span className="button-icon">
              <User size={16} />
            </span>
            <span>人机</span>
          </button>
          <button className={mode === 'auto' ? 'active' : ''} type="button" onClick={() => setMode('auto')}>
            <span className="button-icon">
              <Bot size={16} />
            </span>
            <span>自动对战</span>
          </button>
          <button className={mode === 'analysis' ? 'active' : ''} type="button" onClick={() => setMode('analysis')}>
            <span className="button-icon">
              <Brain size={16} />
            </span>
            <span>残局推演</span>
          </button>
        </div>
      </div>

      {mode === 'human' ? (
        <div className="field-group">
          <label>执棋</label>
          <div className="segmented two">
            <button
              className={humanSide === 'red' ? 'active red' : ''}
              type="button"
              onClick={() => setHumanSide('red')}
            >
              红方
            </button>
            <button
              className={humanSide === 'black' ? 'active black' : ''}
              type="button"
              onClick={() => setHumanSide('black')}
            >
              黑方
            </button>
          </div>
        </div>
      ) : null}

      <div className="level-grid">
        <LevelSelect label="红方难度" value={redLevel} onChange={setRedLevel} />
        <LevelSelect label="黑方难度" value={blackLevel} onChange={setBlackLevel} />
      </div>

      <div className="field-group">
        <label>棋盘主题</label>
        <div className="theme-picker">
          {BOARD_THEMES.map((theme) => (
            <button
              className={boardTheme === theme.id ? 'active' : ''}
              key={theme.id}
              type="button"
              onClick={() => setBoardTheme(theme.id)}
            >
              <span className={`theme-swatch ${theme.id}`} />
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      <div className="action-grid">
        {mode === 'human' ? (
          <button
            className="primary-action"
            type="button"
            disabled={Boolean(aiThinking || gameStatus.over)}
            onClick={onStepAi}
          >
            <StepForward size={17} />
            AI走一步
          </button>
        ) : (
          <button className="primary-action" type="button" onClick={() => setAutoPlaying(!autoPlaying)}>
            {autoPlaying ? <Pause size={18} /> : <Play size={18} />}
            {autoActionLabel}
          </button>
        )}
        {mode !== 'human' ? (
          <button type="button" disabled={Boolean(aiThinking || gameStatus.over)} onClick={onStepAi}>
            <StepForward size={17} />
            AI走一步
          </button>
        ) : null}
        <button type="button" disabled={!canUndo} onClick={onUndo}>
          <Undo2 size={17} />
          悔棋
        </button>
        <button type="button" title={`重开到${resetTargetLabel}`} onClick={onReset}>
          <RotateCcw size={17} />
          重开
        </button>
      </div>

      <div className="level-note">
        <strong>引擎策略</strong>
        <span>宗师：WASM 强引擎限时搜索。</span>
        <span>其他档：本地搜索，响应更快。</span>
        <span>自动对战/残局推演：红黑双方由 AI 连续行棋。</span>
        <span>刷新页面会恢复上次棋局。</span>
      </div>
    </aside>
  );
}

function LevelSelect({ label, value, onChange }) {
  const selectedLevel = AI_LEVEL_MAP[value];

  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {AI_LEVELS.map((level) => (
          <option key={level.id} value={level.id}>
            {level.label}
          </option>
        ))}
      </select>
      <em>{selectedLevel.note}</em>
    </label>
  );
}
