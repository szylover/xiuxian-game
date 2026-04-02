// ============================================================
// layout/GameLayout.tsx — 三栏布局骨架（CSS Grid）
// 左栏：头像+属性  中栏：操作+日志  右栏：功能面板
// ============================================================

import type { ReactNode } from 'react';

interface GameLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  topBar?: ReactNode;
  debug?: ReactNode;
  onExit?: () => void;
}

export default function GameLayout({ left, center, right, topBar, debug, onExit }: GameLayoutProps) {
  return (
    <div className="game-layout-wrapper">
      {topBar && <div className="top-message-bar">{topBar}</div>}
      <div className="game-layout">
        <aside className="left-panel">{left}</aside>
        <main className="center-panel">{center}</main>
        <aside className="right-panel">{right}</aside>
      </div>
      {onExit && (
        <button className="exit-toggle" onClick={onExit} title="返回主菜单">
          🏠 主菜单
        </button>
      )}
      {debug}
    </div>
  );
}
