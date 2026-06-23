// ============================================================
// PrimordialEndgameModal.tsx — 洪荒终局弹窗（#104）
// ============================================================

import type { Player } from '../../game/player';
import { getPrimordialEndgameStatus } from '../../game/primordial-endgame';
import { PRIMORDIAL_ENDGAME_TEXTS } from '../../data/texts';
import './PrimordialEndgameModal.css';

interface PrimordialEndgameModalProps {
  player: Player;
  onChallenge: () => void;
  onClose: () => void;
}

export default function PrimordialEndgameModal({ player, onChallenge, onClose }: PrimordialEndgameModalProps) {
  const status = getPrimordialEndgameStatus(player);
  const def = status.selectedDef;

  return (
    <div className="primordial-endgame-overlay">
      <div className="primordial-endgame-modal">
        <div className="primordial-endgame-header">🌌 {PRIMORDIAL_ENDGAME_TEXTS.modalTitle}</div>
        <div className="primordial-endgame-body">
          {status.completed ? (
            <section className="primordial-endgame-section">
              <h3>{PRIMORDIAL_ENDGAME_TEXTS.completedTitle}</h3>
              <p>{status.state.endingText}</p>
              <p>{PRIMORDIAL_ENDGAME_TEXTS.completedBody}</p>
            </section>
          ) : def ? (
            <>
              <section className="primordial-endgame-section">
                <h3>{def.name}</h3>
                <p>{def.description}</p>
              </section>
              <section className="primordial-endgame-section">
                <h3>{PRIMORDIAL_ENDGAME_TEXTS.requirementTitle}</h3>
                {status.missing.length === 0 ? <p>{PRIMORDIAL_ENDGAME_TEXTS.endingReached}</p> : status.missing.map(item => <p key={item}>{item}</p>)}
              </section>
              <section className="primordial-endgame-section">
                <h3>{PRIMORDIAL_ENDGAME_TEXTS.bossTitle}</h3>
                <p>{def.boss.emoji} {def.boss.name}</p>
              </section>
              <section className="primordial-endgame-section">
                <h3>{PRIMORDIAL_ENDGAME_TEXTS.rewardTitle}</h3>
                <p>{def.rewards.title}</p>
              </section>
            </>
          ) : (
            <section className="primordial-endgame-section"><p>{PRIMORDIAL_ENDGAME_TEXTS.notReady}</p></section>
          )}
        </div>
        <div className="primordial-endgame-footer">
          {!status.completed && (
            <button className="btn btn-primary" disabled={!status.canChallenge} onClick={onChallenge}>
              {PRIMORDIAL_ENDGAME_TEXTS.startChallenge}
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>{PRIMORDIAL_ENDGAME_TEXTS.close}</button>
        </div>
      </div>
    </div>
  );
}
