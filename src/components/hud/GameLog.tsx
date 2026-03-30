// ============================================================
// GameLog.tsx — 时间线日志面板（T0043: 按年/月分组）
// ============================================================

import { useState, useMemo } from 'react';
import type { LogEntry, LogCategory } from '../../hooks/useGameLog';
import { LOG_COLORS, groupLogsByTime } from '../../hooks/useGameLog';
import { MONTH_NAMES } from '../../game/data';
import { TabBar } from '../shared';

interface GameLogProps {
  logs: LogEntry[];
  currentYear?: number;
  currentMonth?: number;
}

const FILTER_TABS: { key: LogCategory | 'all'; label: string; icon?: string }[] = [
  { key: 'all',       label: '全部' },
  { key: 'combat',    label: '战斗', icon: '⚔️' },
  { key: 'explore',   label: '探索', icon: '🔍' },
  { key: 'adventure', label: '奇遇', icon: '✨' },
  { key: 'daily',     label: '日常', icon: '📅' },
  { key: 'system',    label: '系统', icon: '⚙️' },
];

export default function GameLog({ logs, currentYear = 1, currentMonth = 1 }: GameLogProps) {
  const [filter, setFilter] = useState<LogCategory | 'all'>('all');
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => new Set([currentYear]));
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => new Set([`${currentYear}-${currentMonth}`]));

  const grouped = useMemo(() => groupLogsByTime(logs, filter), [logs, filter]);

  // 当前年月变化时自动展开
  useMemo(() => {
    setExpandedYears(prev => new Set(prev).add(currentYear));
    setExpandedMonths(prev => new Set(prev).add(`${currentYear}-${currentMonth}`));
  }, [currentYear, currentMonth]);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year); else next.add(year);
      return next;
    });
  };

  const toggleMonth = (year: number, month: number) => {
    const key = `${year}-${month}`;
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const [allExpanded, setAllExpanded] = useState(true);

  const expandAll = () => {
    const allYears = new Set(grouped.keys());
    const allMonths = new Set<string>();
    for (const [year, monthMap] of grouped) {
      for (const month of monthMap.keys()) {
        allMonths.add(`${year}-${month}`);
      }
    }
    setExpandedYears(allYears);
    setExpandedMonths(allMonths);
    setAllExpanded(true);
  };

  const collapseAll = () => {
    setExpandedYears(new Set());
    setExpandedMonths(new Set());
    setAllExpanded(false);
  };

  const toggleAll = () => {
    if (allExpanded) collapseAll(); else expandAll();
  };

  // 按年降序排列
  const years = Array.from(grouped.keys()).sort((a, b) => b - a);

  return (
    <div className="game-log">
      <div className="log-header">
        <h3>📜 日志 <button className="log-toggle-btn" onClick={toggleAll} title={allExpanded ? '折叠全部' : '展开全部'}>{allExpanded ? '▾' : '▸'}</button></h3>
        <TabBar
          tabs={FILTER_TABS}
          activeKey={filter}
          onChange={setFilter}
          className="log-filters"
          tabClassName="log-filter-btn"
        />
      </div>
      <div className="log-list">
        {years.length === 0 && <p className="log-empty">暂无日志…</p>}
        {years.map(year => {
          const yearOpen = expandedYears.has(year);
          const monthMap = grouped.get(year)!;
          const totalCount = Array.from(monthMap.values()).reduce((s, arr) => s + arr.length, 0);
          const months = Array.from(monthMap.keys()).sort((a, b) => b - a);

          return (
            <div key={year} className="log-timeline">
              <div
                className={`log-year-header ${yearOpen ? 'expanded' : ''}`}
                onClick={() => toggleYear(year)}
              >
                <span className="log-arrow">{yearOpen ? '▼' : '▶'}</span>
                第{year}年
                <span className="log-count">({totalCount})</span>
              </div>
              {yearOpen && months.map(month => {
                const monthKey = `${year}-${month}`;
                const monthOpen = expandedMonths.has(monthKey);
                const entries = monthMap.get(month)!;
                const isCurrent = year === currentYear && month === currentMonth;

                return (
                  <div key={monthKey} className="log-month-group">
                    <div
                      className={`log-month-header ${monthOpen ? 'expanded' : ''} ${isCurrent ? 'log-month-current' : ''}`}
                      onClick={() => toggleMonth(year, month)}
                    >
                      <span className="log-arrow">{monthOpen ? '▼' : '▶'}</span>
                      {MONTH_NAMES[month - 1]}
                      <span className="log-count">({entries.length})</span>
                      {isCurrent && <span className="log-current-badge">当前</span>}
                    </div>
                    {monthOpen && (
                      <div className="log-month-entries">
                        {entries.map(entry => (
                          <div
                            key={entry.id}
                            className="log-entry"
                            style={{ color: LOG_COLORS[entry.category] || LOG_COLORS.default }}
                          >
                            {entry.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
