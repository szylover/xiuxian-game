// ============================================================
// shared/FloatingPanel.tsx — 可拖拽浮动窗口
// 支持拖拽标题栏移动、关闭按钮
// ============================================================

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';

interface FloatingPanelProps {
  title: string;
  icon: string;
  onClose: () => void;
  children: ReactNode;
  defaultX?: number;
  defaultY?: number;
  width?: number;
}

export default function FloatingPanel({
  title, icon, onClose, children,
  defaultX, defaultY, width = 340,
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: defaultX ?? -1, y: defaultY ?? -1 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // 初始化居中
  useEffect(() => {
    if (pos.x === -1 && pos.y === -1) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPos({
        x: Math.max(0, (vw - width) / 2),
        y: Math.max(40, (vh - 400) / 2),
      });
    }
  }, [pos.x, pos.y, width]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffset.current.y));
    setPos({ x: newX, y: newY });
  }, [dragging]);

  const onPointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div
      ref={panelRef}
      className="floating-panel"
      style={{
        left: pos.x,
        top: pos.y,
        width,
      }}
    >
      <div
        className="floating-panel-header"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="floating-panel-title">{icon} {title}</span>
        <button className="floating-panel-close" onClick={onClose}>✕</button>
      </div>
      <div className="floating-panel-body">
        {children}
      </div>
    </div>
  );
}
