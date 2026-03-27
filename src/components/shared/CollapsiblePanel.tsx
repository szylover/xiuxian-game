// ============================================================
// shared/CollapsiblePanel.tsx — 可折叠面板
// 封装 toggle 按钮 + 内容区域的通用模式
// ============================================================

import type { ReactNode } from 'react';

interface CollapsiblePanelProps {
  className: string;
  isOpen: boolean;
  onToggle: () => void;
  openLabel: string;
  closedLabel: string;
  toggleClass?: string;
  children: ReactNode;
}

export default function CollapsiblePanel({
  className,
  isOpen,
  onToggle,
  openLabel,
  closedLabel,
  toggleClass = 'panel-toggle',
  children,
}: CollapsiblePanelProps) {
  return (
    <div className={className}>
      <button className={toggleClass} onClick={onToggle}>
        {isOpen ? openLabel : closedLabel}
      </button>
      {isOpen && children}
    </div>
  );
}
