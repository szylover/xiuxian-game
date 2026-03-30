// ============================================================
// combat/CombatFooter.tsx — 底部按钮区
// ============================================================

interface CombatFooterProps {
  allRevealed: boolean;
  winner: 'player' | 'monster' | 'draw';
  onSkip: () => void;
  onNext: () => void;   // battle → loot（仅胜利时）
  onClose: () => void;  // 失败/平局直接关闭
}

export default function CombatFooter({ allRevealed, winner, onSkip, onNext, onClose }: CombatFooterProps) {
  if (!allRevealed) {
    return (
      <div className="combat-modal-footer">
        <button className="btn combat-modal-btn" onClick={onSkip}>跳过 ▶▶</button>
      </div>
    );
  }

  if (winner === 'player') {
    return (
      <div className="combat-modal-footer">
        <button className="btn combat-modal-btn" onClick={onNext}>查看战利品 ▶</button>
      </div>
    );
  }

  return (
    <div className="combat-modal-footer">
      <button className="btn combat-modal-btn" onClick={onClose}>确认</button>
    </div>
  );
}
