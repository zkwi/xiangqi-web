import { useMemo, useState } from 'react';
import { ClipboardCopy, FileInput, Search, Upload } from 'lucide-react';
import { ENDGAME_PRESETS } from '../game/presets.js';

const MAX_VISIBLE_PRESETS = 120;
const ALL_CATEGORIES = '全部';

export function AnalysisPanel({
  fen,
  fenInput,
  setFenInput,
  fenError,
  moveLog,
  searchInfo,
  onLoadFen,
  onLoadPreset,
}) {
  const [presetQuery, setPresetQuery] = useState('');
  const [presetCategory, setPresetCategory] = useState(ALL_CATEGORIES);
  const normalizedQuery = presetQuery.trim().toLowerCase();
  const presetRows = useMemo(
    () => ENDGAME_PRESETS.map((preset, index) => ({ preset, displayIndex: index + 1 })),
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
    return presetRows.filter(({ preset, displayIndex }) => {
      if (presetCategory !== ALL_CATEGORIES && preset.category !== presetCategory) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        preset.id,
        preset.name,
        preset.category,
        preset.note,
        preset.source,
        String(displayIndex),
        String(displayIndex).padStart(3, '0'),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [normalizedQuery, presetCategory, presetRows]);
  const visiblePresets = filteredPresets.slice(0, MAX_VISIBLE_PRESETS);
  const hiddenPresetCount = Math.max(0, filteredPresets.length - visiblePresets.length);

  return (
    <aside className="panel analysis-panel">
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">残局解析</p>
          <h2>着法记录</h2>
        </div>
        <button className="icon-button" type="button" title="复制当前 FEN" onClick={() => copyText(fen)}>
          <ClipboardCopy size={18} />
        </button>
      </div>

      <div className="move-list" aria-label="着法记录">
        {moveLog.length ? (
          moveLog.map((item, index) => (
            <div
              className={[
                'move-row',
                item.source === 'AI' ? 'ai' : 'player',
                index === moveLog.length - 1 ? 'latest' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={`${item.label}-${index}`}
            >
              <span>{index + 1}</span>
              <strong>{item.label}</strong>
              <em>{item.source}</em>
            </div>
          ))
        ) : (
          <div className="empty-state">等待落子</div>
        )}
      </div>

      <div className="search-info">
        <div>
          <span>引擎</span>
          <strong>{formatEngine(searchInfo)}</strong>
        </div>
        <div>
          <span>搜索深度</span>
          <strong>{searchInfo?.depth ?? '-'}</strong>
        </div>
        <div>
          <span>节点</span>
          <strong>{searchInfo?.nodes ? searchInfo.nodes.toLocaleString() : '-'}</strong>
        </div>
        <div>
          <span>耗时</span>
          <strong>{searchInfo?.ms ? `${searchInfo.ms}ms` : '-'}</strong>
        </div>
      </div>

      {searchInfo ? (
        <div className="engine-detail">
          <div>
            <span>推荐着法</span>
            <strong>{searchInfo.bestMoveLabel || '-'}</strong>
          </div>
          <div>
            <span>评分</span>
            <strong>{formatScore(searchInfo.score)}</strong>
          </div>
          <div>
            <span>置换命中</span>
            <strong>{searchInfo.tableHits ? searchInfo.tableHits.toLocaleString() : '-'}</strong>
          </div>
        </div>
      ) : null}

      <div className="fen-loader">
        <div className="section-title">
          <FileInput size={16} />
          载入残局 FEN
        </div>
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
      </div>

      <div className="preset-browser">
        <div className="section-title">
          <Search size={16} />
          内置残局库
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
            visiblePresets.map(({ preset, displayIndex }) => (
              <button key={preset.id ?? preset.name} type="button" onClick={() => onLoadPreset(preset)}>
                <span className="preset-index">{String(displayIndex).padStart(3, '0')}</span>
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

      <div className="fen-current">
        <span>当前 FEN</span>
        <code>{fen}</code>
      </div>
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
  return searchInfo.engine?.includes('WASM') ? 'WASM' : '本地';
}

function copyText(value) {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(value).catch(() => {});
}
