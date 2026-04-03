// ============================================================
// quest/QuestObjectiveRow.tsx — 单条目标进度行
// ============================================================

import './QuestObjectiveRow.css';

interface QuestObjectiveRowProps {
  description: string;
  current: number;
  target: number;
  completed: boolean;
}

export default function QuestObjectiveRow({ description, current, target, completed }: QuestObjectiveRowProps) {
  const pct = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : (completed ? 100 : 0);

  return (
    <div className="quest-objective-row">
      <span className="quest-objective-check">{completed ? '✅' : '▸'}</span>
      <span className="quest-objective-desc">{description}</span>
      {target > 1 && (
        <>
          <span className="quest-objective-count">({current}/{target})</span>
          <div className="quest-progress-bar">
            <div
              className="quest-progress-fill"
              style={{
                '--fill-width': `${pct}%`,
                '--fill-color': completed ? '#59b300' : '#4a9eff',
              } as React.CSSProperties}
            />
          </div>
          <span className="quest-objective-pct">{pct}%</span>
        </>
      )}
    </div>
  );
}
