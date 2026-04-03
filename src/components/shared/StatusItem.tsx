// ============================================================
// shared/StatusItem.tsx — 状态栏单项
// 用于 StatusBar 中重复的 icon + value + tooltip 模式
// ============================================================

import './StatusItem.css';

interface StatusItemProps {
  icon: string;
  text: string;
  title: string;
}

export default function StatusItem({ icon, text, title }: StatusItemProps) {
  return (
    <span className="status-item" title={title}>
      {icon} {text}
    </span>
  );
}
