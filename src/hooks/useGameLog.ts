// ============================================================
// useGameLog.ts — 日志管理 Hook（B-5: 分类日志 + 颜色）
// ============================================================

import { useState, useCallback } from 'react';

const MAX_LOGS = 200;

export type LogCategory = 'system' | 'combat' | 'explore' | 'adventure' | 'daily' | 'default';

export interface LogEntry {
  id: number;
  text: string;
  time: string;
  category: LogCategory;
}

export const LOG_COLORS: Record<LogCategory, string> = {
  system:    '#aaa',
  combat:    '#ef5350',
  explore:   '#4CAF50',
  adventure: '#FFD700',
  daily:     '#64B5F6',
  default:   '#d4d4d4',
};

export function useGameLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((msg: string, category: LogCategory = 'default') => {
    const entry: LogEntry = {
      id: Date.now() + Math.random(),
      text: msg,
      time: new Date().toLocaleTimeString(),
      category,
    };
    setLogs(prev => [entry, ...prev].slice(0, MAX_LOGS));
  }, []);

  const addLogs = useCallback((msgs: string[], category: LogCategory = 'default') => {
    const entries = msgs.map((msg, i) => ({
      id: Date.now() + i + Math.random(),
      text: msg,
      time: new Date().toLocaleTimeString(),
      category,
    }));
    setLogs(prev => [...entries, ...prev].slice(0, MAX_LOGS));
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { logs, addLog, addLogs, clearLogs };
}
