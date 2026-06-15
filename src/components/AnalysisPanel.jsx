import { useMemo, useRef, useState } from 'react';
import { ClipboardCopy, FileInput, Search, Shuffle, Upload } from 'lucide-react';
import { ENDGAME_PRESETS } from '../game/presets.js';
import { getPresetDisplayLabel, getPresetSearchText } from '../game/presetLabels.js';

const MAX_VISIBLE_PRESETS = 120;
const ALL_CATEGORIES = '全部';

export function AnalysisPanel({
  fen,
  fenInput,
  setFenInput,
  fenError,
  moveLog,
  searchInfo,
  repetitionNotice,
  onLoadFen,
  onLoadPreset,
  onMoveRecordSelect,
}) {
  const [presetQuery, setPresetQuery] = useState('');
  const [presetCategory, setPresetCategory] = useState(ALL_CATEGORIES);
  const [copyStatus, setCopyStatus] = useState('');
  const copyTimerRef = useRef(0);
  const normalizedQuery = presetQuery.trim().toLowerCase();
  const presetRows = useMemo(
    () =>
      ENDGAME_PRESETS.map((preset, index) => ({
        preset,
        displayLabel: getPresetDisplayLabel(preset, index),
        searchText: getPresetSearchText(preset, index),
      })),
    [],
  );
  const presetCategories = useMemo(
    () => [
      ALL_CATEGORIES,
      ...Array.from(new Set(ENDGAME_PRESETS.map((preset) => preset.category).filter(Boolean))),
    ],
    [],
  );
  const filteredPresets = useMemo(() => {
    return presetRows.filter(({ preset, searchText }) => {
      if (presetCategory !== ALL_CATEGORIES && preset.category !== presetCategory) return false;
      if (!normalizedQuery) return true;

      return searchText.includes(normalizedQuery);
    });
  }, [normalizedQuery, presetCategory, presetRows]);
  const visiblePresets = filteredPresets.slice(0, MAX_VISIBLE_PRESETS);
  const hiddenPresetCount = Math.max(0, filteredPresets.length - visiblePresets.length);
  const loadRandomPreset = () => {
    const pool = filteredPresets.length ? filteredPresets : presetRows;
    const row = pool[Math.floor(Math.random() * pool.length)];
    if (row) onLoadPreset(row.preset);
  };
  const copyCurrentFen = () => {
    copyText(fen)
      .then(() => showCopyStatus('已复制 FEN'))
      .catch(() => showCopyStatus('复制失败'));
  };
  const showCopyStatus = (message) => {
    setCopyStatus(message);
    window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopyStatus(''), 1800);
  };

  return (
    <aside className="panel analysis-panel">
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">记录和残局</p>
          <h2>本局记录</h2>
        </div>
        <div className="panel-heading-actions">
          <span className="panel-mini-stat">{ENDGAME_PRESETS.length} 局</span>
          <button className="icon-button" type="button" title="复制当前 FEN" onClick={copyCurrentFen}>
            <ClipboardCopy size={18} />
          </button>
        </div>
      </div>
      <div className={copyStatus ? 'copy-status visible' : 'copy-status'} role="status" aria-live="polite">
        {copyStatus}
      </div>

      <div className="move-list" aria-label="着法记录">
        {moveLog.length ? (
          moveLog.map((item, index) => (
            <button
              className={[
                'move-row',
                item.source === 'AI' ? 'ai' : 'player',
                index === moveLog.length - 1 ? 'latest' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={`${item.label}-${index}`}
              type="button"
              aria-label={`跳转到第 ${index + 1} 手：${item.label}`}
              onClick={() => onMoveRecordSelect(index + 1)}
            >
              <span>{index + 1}</span>
              <strong>{item.label}</strong>
              <em>{item.source}</em>
            </button>
          ))
        ) : (
          <div className="empty-state">还没有着法</div>
        )}
      </div>

      {searchInfo ? (
        <div className="search-info">
          <div>
            <span>引擎</span>
            <strong title={searchInfo.engine ?? ''}>{formatEngine(searchInfo)}</strong>
          </div>
          <div>
            <span>搜索深度</span>
            <strong>{searchInfo.depth ?? '-'}</strong>
          </div>
          <div>
            <span>节点</span>
            <strong>{searchInfo.nodes ? searchInfo.nodes.toLocaleString() : '-'}</strong>
          </div>
          <div>
            <span>耗时</span>
            <strong>{searchInfo.ms ? `${searchInfo.ms}ms` : '-'}</strong>
          </div>
        </div>
      ) : null}

      {searchInfo || repetitionNotice ? (
        <div className="engine-detail">
          {repetitionNotice ? (
            <div className="engine-warning">
              <span>对局提示</span>
              <strong>{repetitionNotice}</strong>
            </div>
          ) : null}
          {searchInfo?.fallbackReason ? (
            <div className="engine-warning">
              <span>回退原因</span>
              <strong>{searchInfo.fallbackReason}</strong>
            </div>
          ) : null}
          {searchInfo ? (
            <>
              <div>
                <span>推荐着法</span>
                <strong>{searchInfo.bestMoveLabel || '-'}</strong>
              </div>
              <div>
                <span>评分</span>
                <strong>{formatScore(searchInfo.score)}</strong>
              </div>
              <div>
                <span>{searchInfo.engineTimeLimit ? '引擎预算' : '置换命中'}</span>
                <strong>{formatSearchBudget(searchInfo)}</strong>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="preset-browser">
        <div className="section-title section-title-row">
          <span>
            <Search size={16} />
            残局库
          </span>
          <button className="mini-action" type="button" onClick={loadRandomPreset}>
            <Shuffle size={15} />
            随机一局
          </button>
        </div>
        <label className="preset-search">
          <Search size={15} />
          <input
            aria-label="搜索残局"
            placeholder={`搜索 ${ENDGAME_PRESETS.length} 局残局`}
            value={presetQuery}
            onChange={(event) => setPresetQuery(event.target.value)}
          />
          <span>{filteredPresets.length}</span>
        </label>
        <div className="preset-categories" aria-label="残局分类">
          {presetCategories.map((category) => (
            <button
              className={presetCategory === category ? 'active' : ''}
              aria-pressed={presetCategory === category}
              key={category}
              type="button"
              onClick={() => setPresetCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="preset-list">
          {visiblePresets.length ? (
            visiblePresets.map(({ preset, displayLabel }) => (
              <button key={preset.id ?? preset.name} type="button" onClick={() => onLoadPreset(preset)}>
                <span className="preset-index">{displayLabel}</span>
                <span className="preset-copy">
                  <strong>{preset.name}</strong>
                  <span>
                    {preset.category ? `${preset.category} · ` : ''}
                    {preset.note}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className="empty-state compact">没有匹配的残局</div>
          )}
          {hiddenPresetCount ? (
            <div className="preset-more">
              还有 {hiddenPresetCount} 局未显示，输入编号或局名可继续筛选。
            </div>
          ) : null}
        </div>
      </div>

      <details className="fen-loader advanced-panel">
        <summary>
          <FileInput size={16} />
          导入局面（FEN）
        </summary>
        <textarea
          value={fenInput}
          spellCheck="false"
          onChange={(event) => setFenInput(event.target.value)}
          rows={4}
        />
        {fenError ? <p className="form-error">{fenError}</p> : null}
        <button className="primary-action" type="button" onClick={onLoadFen}>
          <Upload size={17} />
          载入局面
        </button>
      </details>

      <details className="fen-current advanced-panel">
        <summary>当前 FEN</summary>
        <code>{fen}</code>
      </details>
    </aside>
  );
}

function formatScore(score) {
  if (score === undefined || score === null) return '-';
  if (Math.abs(score) >= 900_000) return score > 0 ? '杀棋' : '被杀';
  return score > 0 ? `+${score}` : String(score);
}

function formatEngine(searchInfo) {
  if (!searchInfo) return '-';
  if (searchInfo.fallbackReason) return '本地回退';
  if (searchInfo.engine?.includes('WASM')) {
    return searchInfo.engineSkill ? `WASM S${searchInfo.engineSkill}` : 'WASM';
  }
  return '本地';
}

function formatSearchBudget(searchInfo) {
  if (searchInfo.engineTimeLimit) return `${searchInfo.engineTimeLimit}ms`;
  return searchInfo.tableHits ? searchInfo.tableHits.toLocaleString() : '-';
}

async function copyText(value) {
  if (!navigator.clipboard) throw new Error('当前浏览器不支持剪贴板');
  await navigator.clipboard.writeText(value);
}
