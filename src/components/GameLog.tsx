// ============================================================
// GameLog.tsx — 游戏日志面板（B-5: 分类颜色 + 筛选）
// ============================================================

import { useState } from 'react';
import type { LogEntry, LogCategory } from '../hooks/useGameLog';
import { LOG_COLORS } from '../hooks/useGameLog';

interface GameLogProps {
  logs: LogEntry[];
}

const FILTER_OPTIONS: { key: LogCategory | 'all'; label: string }[] = [
  { key: 'all',       label: '全部' },
  { key: 'combat',    label: '⚔️ 战斗' },
  { key: 'explore',   label: '🔍 探索' },
  { key: 'adventure', label: '✨ 奇遇' },
  { key: 'daily',     label: '📅 日常' },
  { key: 'system',    label: '⚙️ 系统' },
];

export default function GameLog({ logs }: GameLogProps) {
  const [filter, setFilter] = useState<LogCategory | 'all'>('all');

  const filtered = filter === 'all' ? logs : logs.filter(l => l.category === filter);

  return (
    <div className="game-log">
      <div className="log-header">
        <h3>📜 日志</h3>
        <div className="log-filters">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              className={`log-filter-btn ${filter === opt.key ? 'active' : ''}`}
              onClick={() => setFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="log-list">
        {filtered.length === 0 && <p className="log-empty">暂无日志…</p>}
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className="log-entry"
            style={{ color: LOG_COLORS[entry.category] || LOG_COLORS.default }}
          >
            {entry.text}
          </div>
        ))}
      </div>
    </div>
  );
}
