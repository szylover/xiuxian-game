// ============================================================
// GameLog.tsx — 游戏日志面板（B-5: 分类颜色 + 筛选）
// ============================================================

import { useState } from 'react';
import type { LogEntry, LogCategory } from '../../hooks/useGameLog';
import { LOG_COLORS } from '../../hooks/useGameLog';
import { TabBar } from '../shared';

interface GameLogProps {
  logs: LogEntry[];
}

const FILTER_TABS: { key: LogCategory | 'all'; label: string; icon?: string }[] = [
  { key: 'all',       label: '全部' },
  { key: 'combat',    label: '战斗', icon: '⚔️' },
  { key: 'explore',   label: '探索', icon: '🔍' },
  { key: 'adventure', label: '奇遇', icon: '✨' },
  { key: 'daily',     label: '日常', icon: '📅' },
  { key: 'system',    label: '系统', icon: '⚙️' },
];

export default function GameLog({ logs }: GameLogProps) {
  const [filter, setFilter] = useState<LogCategory | 'all'>('all');

  const filtered = filter === 'all' ? logs : logs.filter(l => l.category === filter);

  return (
    <div className="game-log">
      <div className="log-header">
        <h3>📜 日志</h3>
        <TabBar
          tabs={FILTER_TABS}
          activeKey={filter}
          onChange={setFilter}
          className="log-filters"
          tabClassName="log-filter-btn"
        />
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
