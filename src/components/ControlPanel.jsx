import {
  Bot,
  Brain,
  Pause,
  Play,
  RotateCcw,
  Settings,
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
  voiceOn,
  setVoiceOn,
  boardTheme,
  setBoardTheme,
  canUndo,
  gameStatus,
  legalMoveCount,
  repetitionNotice,
  resetTargetLabel,
  onUndo,
  onReset,
  onStepAi,
}) {
  const humanTurnName = humanSide === 'red' ? '红方' : '黑方';
  const isHumanTurn = mode === 'human' && gameStatus.turnName === humanTurnName;
  const baseStatusText = mode === 'human' ? (isHumanTurn ? '玩家回合' : '电脑回合') : autoPlaying ? '运行中' : '已暂停';
  const resultText =
    gameStatus.winner === 'red' ? '红方胜' : gameStatus.winner === 'black' ? '黑方胜' : '终局';
  const statusText = gameStatus.over
    ? `${resultText}：${gameStatus.reason}`
    : repetitionNotice || `${baseStatusText}${gameStatus.check ? ' · 被将军' : ''}`;
  const statusLabel = gameStatus.over
    ? '已结束'
    : repetitionNotice
      ? '已暂停'
    : aiThinking
      ? `${aiThinking}思考中`
      : mode === 'human'
        ? isHumanTurn
          ? '轮到你'
          : '等待电脑'
        : autoPlaying
          ? '自动行棋'
          : '就绪';
  const turnSide = gameStatus.over ? 'finished' : gameStatus.turnName === '红方' ? 'red' : 'black';
  const statusClass = ['status-card', gameStatus.check || repetitionNotice ? 'warning' : '', aiThinking ? 'thinking' : '']
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
  const humanAiLevel = humanSide === 'red' ? blackLevel : redLevel;
  const setHumanAiLevel = humanSide === 'red' ? setBlackLevel : setRedLevel;
  const humanStepLabel = isHumanTurn ? 'AI代走一步' : '电脑应手';

  return (
    <aside className="panel control-panel">
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">中国象棋 · 当前对局</p>
          <h2>对局控制</h2>
        </div>
        <div className="panel-heading-actions">
          <span className="panel-mini-stat">{legalMoveCount} 着法</span>
          <button
            className="icon-button"
            type="button"
            aria-label={soundOn ? '音效已开启，点击关闭' : '音效已关闭，点击开启'}
            title={soundOn ? '音效已开启，点击关闭' : '音效已关闭，点击开启'}
            onClick={() => setSoundOn(!soundOn)}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      <div className={statusClass} aria-live="polite">
        <div className="status-main">
          <span className={`turn-pill ${turnSide}`}>{gameStatus.over ? '终局' : gameStatus.turnName}</span>
          <span>{statusText}</span>
        </div>
        <strong>{statusLabel}</strong>
      </div>

      <div className="field-group">
        <label>玩法</label>
        <div className="segmented mode-tabs">
          <button
            className={mode === 'human' ? 'active' : ''}
            aria-pressed={mode === 'human'}
            type="button"
            onClick={() => setMode('human')}
          >
            <span className="button-icon">
              <User size={16} />
            </span>
            <span>我要下棋</span>
          </button>
          <button
            className={mode === 'auto' ? 'active' : ''}
            aria-pressed={mode === 'auto'}
            type="button"
            onClick={() => setMode('auto')}
          >
            <span className="button-icon">
              <Bot size={16} />
            </span>
            <span>AI对战</span>
          </button>
          <button
            className={mode === 'analysis' ? 'active' : ''}
            aria-pressed={mode === 'analysis'}
            type="button"
            onClick={() => setMode('analysis')}
          >
            <span className="button-icon">
              <Brain size={16} />
            </span>
            <span>残局研究</span>
          </button>
        </div>
      </div>

      {mode === 'human' ? (
        <div className="field-group">
          <label>执棋</label>
          <div className="segmented two">
            <button
              className={humanSide === 'red' ? 'active red' : ''}
              aria-pressed={humanSide === 'red'}
              type="button"
              onClick={() => setHumanSide('red')}
            >
              红方
            </button>
            <button
              className={humanSide === 'black' ? 'active black' : ''}
              aria-pressed={humanSide === 'black'}
              type="button"
              onClick={() => setHumanSide('black')}
            >
              黑方
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'human' ? (
        <LevelSelect label="电脑强度" value={humanAiLevel} onChange={setHumanAiLevel} />
      ) : (
        <div className="level-grid">
          <LevelSelect label="红方 AI" value={redLevel} onChange={setRedLevel} />
          <LevelSelect label="黑方 AI" value={blackLevel} onChange={setBlackLevel} />
        </div>
      )}

      <div className="action-grid">
        {mode === 'human' ? (
          <button
            className="primary-action"
            type="button"
            disabled={Boolean(aiThinking || gameStatus.over)}
            onClick={onStepAi}
          >
            <StepForward size={17} />
            {humanStepLabel}
          </button>
        ) : (
          <button
            className="primary-action"
            type="button"
            disabled={gameStatus.over}
            onClick={() => setAutoPlaying(!autoPlaying)}
          >
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

      <details className="settings-panel">
        <summary>
          <Settings size={16} />
          外观和引擎
        </summary>

        <div className="settings-content">
          <div className="field-group">
            <label>棋盘主题</label>
            <div className="theme-picker">
              {BOARD_THEMES.map((theme) => (
                <button
                  className={boardTheme === theme.id ? 'active' : ''}
                  aria-pressed={boardTheme === theme.id}
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

          <div className="field-group">
            <label>声音</label>
            <div className="toggle-grid">
              <button
                className={soundOn ? 'active' : ''}
                aria-pressed={soundOn}
                type="button"
                onClick={() => setSoundOn(!soundOn)}
              >
                提示音
              </button>
              <button
                className={voiceOn ? 'active' : ''}
                aria-pressed={voiceOn}
                type="button"
                onClick={() => setVoiceOn(!voiceOn)}
              >
                中文播报
              </button>
            </div>
          </div>

          <div className="level-note">
            <strong>引擎策略</strong>
            <span>大师/宗师：WASM 强引擎限时搜索。</span>
            <span>入门/棋士：本地搜索，响应更快。</span>
            <span>AI对战/残局研究：红黑双方由 AI 连续行棋。</span>
            <span>刷新页面会恢复上次棋局。</span>
          </div>
        </div>
      </details>
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
