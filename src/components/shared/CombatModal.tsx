// ============================================================
// CombatModal.tsx — 两阶段战斗结果弹窗（T0044）
// Phase 1: 回合日志 → Phase 2: 战利品展示
// ============================================================

import type { CombatModalState } from '../../hooks/useGameEngine';

interface CombatModalProps {
  state: CombatModalState;
  onNext: () => void;   // battle → loot
  onClose: () => void;  // 关闭弹窗
}

export default function CombatModal({ state, onNext, onClose }: CombatModalProps) {
  const { phase, monsterName, result, loot } = state;

  if (phase === 'battle') {
    return (
      <div className="combat-modal-overlay">
        <div className="combat-modal">
          <div className="combat-modal-header">⚔️ 战斗 — {monsterName}</div>
          <div className="combat-modal-body">
            {result.logs.map((log, i) => (
              <div key={i} className="combat-modal-log-line">{log}</div>
            ))}
          </div>
          <div className="combat-modal-footer">
            {result.winner === 'monster' ? (
              <button className="btn combat-modal-btn" onClick={onClose}>确认</button>
            ) : (
              <button className="btn combat-modal-btn" onClick={onNext}>查看战利品 ▶</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Phase 2: loot
  return (
    <div className="combat-modal-overlay">
      <div className="combat-modal">
        <div className="combat-modal-header">
          {result.winner === 'player' ? '🎉 胜利！' : '⚔️ 脱战'}
        </div>
        <div className="combat-modal-body combat-modal-loot">
          <div className="combat-modal-loot-row">
            <span className="combat-modal-loot-icon">📖</span>
            <span>修为</span>
            <span className="combat-modal-loot-amount">+{result.expGained}</span>
          </div>
          <div className="combat-modal-loot-row">
            <span className="combat-modal-loot-icon">💰</span>
            <span>灵石</span>
            <span className="combat-modal-loot-amount">+{result.goldGained}</span>
          </div>
          {loot.length > 0 ? (
            loot.map((item, i) => (
              <div key={i} className="combat-modal-loot-row" style={{ animationDelay: `${(i + 2) * 0.05}s` }}>
                <span className="combat-modal-loot-icon">{item.icon}</span>
                <span>{item.name}</span>
                <span className="combat-modal-loot-amount">×{item.amount}</span>
              </div>
            ))
          ) : (
            <div className="combat-modal-no-loot">无额外掉落</div>
          )}
        </div>
        <div className="combat-modal-footer">
          <button className="btn combat-modal-btn" onClick={onClose}>确认</button>
        </div>
      </div>
    </div>
  );
}
