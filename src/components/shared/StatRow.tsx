// ============================================================
// shared/StatRow.tsx — 属性行（带可选进度条）
// 用于 StatusPanel 基础属性 / 战斗属性 / 先天属性展示
// ============================================================

import './StatRow.css';

interface StatRowProps {
  icon: string;
  label: string;
  value: number | string;
  max?: number;
  color?: string;
}

export function StatRow({ icon, label, value, max, color }: StatRowProps) {
  const pct = max ? Math.min(100, (Number(value) / max) * 100) : null;
  return (
    <div className="stat-row">
      <span className="stat-label">{icon} {label}</span>
      <span className="stat-value">{value}{max ? `/${max}` : ''}</span>
      {pct !== null && (
        <div className="stat-bar">
          <div className="stat-bar-fill" style={{ '--bar-width': `${pct}%`, '--bar-color': color || '#4CAF50' } as React.CSSProperties} />
        </div>
      )}
    </div>
  );
}

// ── 灵根资质条 ──

interface AptitudeBarProps {
  label: string;
  value: number;
}

export function AptitudeBar({ label, value }: AptitudeBarProps) {
  let color = '#9E9E9E';
  if (value > 95) color = '#FFD700';
  else if (value > 80) color = '#9C27B0';
  else if (value > 50) color = '#2196F3';
  else if (value > 20) color = '#4CAF50';

  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <div className="stat-bar">
        <div className="stat-bar-fill" style={{ '--bar-width': `${value}%`, '--bar-color': color } as React.CSSProperties} />
      </div>
    </div>
  );
}
