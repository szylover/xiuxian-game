// ============================================================
// shared/CapacityBar.tsx — 容量/进度条
// 用于背包容量、念力条等场景
// ============================================================

import './CapacityBar.css';

interface CapacityBarProps {
  current: number;
  max: number;
  label?: string;
  color?: string;
  warningColor?: string;
  warnOnFull?: boolean;
}

export default function CapacityBar({
  current,
  max,
  label,
  color = '#4CAF50',
  warningColor = '#F44336',
  warnOnFull = false,
}: CapacityBarProps) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const isFull = current >= max;
  // 动态填充色通过 CSS 变量注入，宽度必须保留 inline style
  const fillColor = warnOnFull && isFull ? warningColor : color;

  return (
    <div className="capacity-bar-wrapper">
      {label && (
        <span className="capacity-text">{label} {current}/{max}</span>
      )}
      <div className="capacity-bar">
        <div
          className="capacity-bar-fill"
          style={{ '--capacity-fill-color': fillColor, width: `${pct}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}
