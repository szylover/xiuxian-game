// ============================================================
// DeathModal.tsx — 重度死亡弹窗（T0040）
// 展示死因、角色信息、可用复活选项
// ============================================================

import { REALMS } from '../../game/data';
import type { DeathModalState } from '../../hooks/useGameEngine';
import type { RevivalMethodDef } from '../../game/types';

interface DeathModalProps {
  state: DeathModalState;
  onRevival: (method: RevivalMethodDef) => void;
  onClose: () => void; // 无复活 → 游戏结束
}

export default function DeathModal({ state, onRevival, onClose }: DeathModalProps) {
  const { triggerDef, availableRevivals, playerSnapshot } = state;
  const realmName = REALMS[playerSnapshot.realmIndex]?.name ?? '未知';

  return (
    <div className="combat-modal-overlay">
      <div className="combat-modal death-modal">
        <div className="combat-modal-header death-modal-header">
          💀 {triggerDef.name}
        </div>
        <div className="combat-modal-body">
          <div className="death-modal-cause">{triggerDef.description}</div>
          <div className="death-modal-info">
            <div>🏷️ {playerSnapshot.name}</div>
            <div>🔮 {realmName}</div>
            <div>📅 {playerSnapshot.age} 岁</div>
            <div>⚔️ 击杀 {playerSnapshot.killCount} · 死亡 {playerSnapshot.deathCount}</div>
          </div>

          {availableRevivals.length > 0 ? (
            <div className="death-modal-revivals">
              <div className="death-modal-section-title">可用的复活方式：</div>
              {availableRevivals.map(method => (
                <button
                  key={method.id}
                  className="btn death-modal-revival-btn"
                  onClick={() => onRevival(method)}
                >
                  <span className="death-modal-revival-name">{method.name}</span>
                  <span className="death-modal-revival-desc">{method.description}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="death-modal-no-revival">
              无可用的复活手段…
            </div>
          )}
        </div>
        <div className="combat-modal-footer">
          {availableRevivals.length === 0 && (
            <button className="btn combat-modal-btn" onClick={onClose}>
              结束修仙之旅
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
