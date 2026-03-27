// ============================================================
// useGameLog.ts — 日志管理 Hook
// ============================================================

import { useState, useCallback } from 'react';

const MAX_LOGS = 200;

export interface LogEntry {
  id: number;
  text: string;
  time: string;
}

export function useGameLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((msg: string) => {
    const entry: LogEntry = {
      id: Date.now() + Math.random(),
      text: msg,
      time: new Date().toLocaleTimeString(),
    };
    setLogs(prev => [entry, ...prev].slice(0, MAX_LOGS));
  }, []);

  const addLogs = useCallback((msgs: string[]) => {
    const entries = msgs.map((msg, i) => ({
      id: Date.now() + i + Math.random(),
      text: msg,
      time: new Date().toLocaleTimeString(),
    }));
    setLogs(prev => [...entries, ...prev].slice(0, MAX_LOGS));
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { logs, addLog, addLogs, clearLogs };
}
