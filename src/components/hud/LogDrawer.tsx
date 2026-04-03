// ============================================================
// LogDrawer.tsx — 日志侧边抽屉（T0069）
// 从右侧滑出的日志面板，内嵌 GameLog
// ============================================================

import './LogDrawer.css';
import { useEffect, useCallback } from 'react';
import GameLog from './GameLog';
import type { LogEntry } from '../../hooks/useGameLog';

interface LogDrawerProps {
  open: boolean;
  onClose: () => void;
  logs: LogEntry[];
  currentYear?: number;
  currentMonth?: number;
}

export default function LogDrawer({ open, onClose, logs, currentYear, currentMonth }: LogDrawerProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) onClose();
  }, [open, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {open && <div className="log-drawer-overlay" onClick={onClose} />}
      <div className={`log-drawer ${open ? 'log-drawer-open' : ''}`}>
        <div className="log-drawer-header">
          <span className="log-drawer-title">📜 日志</span>
          <button className="log-drawer-close" onClick={onClose} title="关闭日志">✕</button>
        </div>
        <div className="log-drawer-body">
          <GameLog logs={logs} currentYear={currentYear} currentMonth={currentMonth} />
        </div>
      </div>
    </>
  );
}
