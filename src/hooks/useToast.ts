// ============================================================
// hooks/useToast.ts — Toast 消息条（单条最新消息，3s 淡出）
// ============================================================

import { useState, useCallback, useRef } from 'react';
import type { LogCategory } from './useGameLog';

export interface ToastMessage {
  id: number;
  text: string;
  category: LogCategory;
  fading?: boolean;
}

const DEFAULT_DURATION = 3000;

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    setToast(prev => prev ? { ...prev, fading: true } : null);
    setTimeout(() => setToast(null), 300);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const showToast = useCallback((text: string, category: LogCategory = 'default', duration = DEFAULT_DURATION) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const id = Date.now() + Math.random();
    setToast({ id, text, category, fading: false });
    timerRef.current = window.setTimeout(() => dismiss(), duration);
  }, [dismiss]);

  return { toast, showToast, dismiss };
}
