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
          {/* 宽度（动态 runtime 值）保留 inline style；填充色通过 CSS 变量注入 */}
          <div
            className="stat-bar-fill"
            style={{ '--stat-bar-color': color || 'var(--rarity-uncommon)', width: `${pct}%` } as React.CSSProperties}
          />
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
  let color = 'var(--rarity-common)';
  if (value > 95) color = 'var(--color-gold)';
  else if (value > 80) color = 'var(--rarity-epic)';
  else if (value > 50) color = 'var(--rarity-rare)';
  else if (value > 20) color = 'var(--rarity-uncommon)';

  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <div className="stat-bar">
        {/* 宽度（动态 runtime 值）保留 inline style；填充色通过 CSS 变量注入 */}
        <div
          className="stat-bar-fill"
          style={{ '--stat-bar-color': color, width: `${value}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}
