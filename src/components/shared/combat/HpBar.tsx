// ============================================================
// combat/HpBar.tsx — 通用 HP/MP 条组件（带动画过渡）
// ============================================================

import './HpBar.css';

interface HpBarProps {
  current: number;
  max: number;
  color: 'red' | 'blue' | 'gray';
  label?: string;
  showText?: boolean;
  animate?: boolean;
}

export default function HpBar({ current, max, color, label, showText = true, animate = true }: HpBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <div className="hpbar-wrap">
      {label && <span className="hpbar-label">{label}</span>}
      <div className="hpbar-track">
        <div
          className={`hpbar-fill hpbar-${color}${animate ? ' hpbar-animate' : ''}`}
          style={{ '--hp-width': `${pct}%` } as React.CSSProperties}
        />
        {showText && <span className="hpbar-text">{current}/{max}</span>}
      </div>
    </div>
  );
}
