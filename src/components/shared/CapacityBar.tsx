// ============================================================
// shared/CapacityBar.tsx — 容量/进度条
// 用于背包容量、念力条等场景
// ============================================================

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

  return (
    <div className="capacity-bar-wrapper">
      {label && (
        <span className="capacity-text">{label} {current}/{max}</span>
      )}
      <div className="capacity-bar">
        <div
          className="capacity-bar-fill"
          style={{
            width: `${pct}%`,
            background: warnOnFull && isFull ? warningColor : color,
          }}
        />
      </div>
    </div>
  );
}
