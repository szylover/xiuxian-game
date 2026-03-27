// ============================================================
// useGameLog.ts — 日志管理 Hook（T0043: 时间线日志）
// ============================================================

import { useState, useCallback } from 'react';

const MAX_LOGS = 2000;

export type LogCategory = 'system' | 'combat' | 'explore' | 'adventure' | 'daily' | 'default';

export interface LogEntry {
  id: number;
  text: string;
  category: LogCategory;
  gameYear: number;
  gameMonth: number;
}

export const LOG_COLORS: Record<LogCategory, string> = {
  system:    '#aaa',
  combat:    '#ef5350',
  explore:   '#4CAF50',
  adventure: '#FFD700',
  daily:     '#64B5F6',
  default:   '#d4d4d4',
};

// 按年→月分组
export type GroupedLogs = Map<number, Map<number, LogEntry[]>>;

export function groupLogsByTime(logs: LogEntry[], filter: LogCategory | 'all'): GroupedLogs {
  const filtered = filter === 'all' ? logs : logs.filter(l => l.category === filter);
  const grouped: GroupedLogs = new Map();
  for (const entry of filtered) {
    if (!grouped.has(entry.gameYear)) grouped.set(entry.gameYear, new Map());
    const yearMap = grouped.get(entry.gameYear)!;
    if (!yearMap.has(entry.gameMonth)) yearMap.set(entry.gameMonth, []);
    yearMap.get(entry.gameMonth)!.push(entry);
  }
  return grouped;
}

export function useGameLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // gameYear/gameMonth 由外部（useGameEngine）通过闭包注入
  const addLog = useCallback((msg: string, category: LogCategory = 'default', gameYear = 1, gameMonth = 1) => {
    const entry: LogEntry = {
      id: Date.now() + Math.random(),
      text: msg,
      category,
      gameYear,
      gameMonth,
    };
    setLogs(prev => [entry, ...prev].slice(0, MAX_LOGS));
  }, []);

  const addLogs = useCallback((msgs: string[], category: LogCategory = 'default', gameYear = 1, gameMonth = 1) => {
    const entries = msgs.map((msg, i) => ({
      id: Date.now() + i + Math.random(),
      text: msg,
      category,
      gameYear,
      gameMonth,
    }));
    setLogs(prev => [...entries, ...prev].slice(0, MAX_LOGS));
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { logs, addLog, addLogs, clearLogs };
}
