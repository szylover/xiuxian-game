// ============================================================
// hooks/useToast.ts — Toast 即时反馈管理
// ============================================================

import { useState, useCallback, useRef } from 'react';
import type { LogCategory } from './useGameLog';

export interface ToastMessage {
  id: number;
  text: string;
  category: LogCategory;
  fading?: boolean;
}

const MAX_TOASTS = 5;
const DEFAULT_DURATION = 3000;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    // 先标记 fading 触发退出动画
    setToasts(prev => prev.map(t => t.id === id ? { ...t, fading: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  const showToast = useCallback((text: string, category: LogCategory = 'default', duration = DEFAULT_DURATION) => {
    const id = Date.now() + Math.random();
    const toast: ToastMessage = { id, text, category };
    setToasts(prev => [...prev, toast].slice(-MAX_TOASTS));
    const timer = window.setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  return { toasts, showToast, dismiss };
}
