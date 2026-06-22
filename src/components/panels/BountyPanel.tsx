import type { Player } from '../../game/player';
import { describeBountyObjective, ensureBountyBoard, getBountyState } from '../../game/bounty';
import { BOUNTY_TEXTS } from '../../data/texts';
import './BountyPanel.css';

interface BountyPanelProps {
  player: Player;
  onAcceptBounty: (bountyId: string) => void;
  onClaimBounty: (bountyId: string) => void;
  onRefreshBounties: () => void;
}

export default function BountyPanel({ player, onAcceptBounty, onClaimBounty, onRefreshBounties }: BountyPanelProps) {
  const normalized = ensureBountyBoard(player);
  const state = getBountyState(normalized);
  return (
    <div className="bounty-panel">
      <div className="bounty-intro">{BOUNTY_TEXTS.boardIntro}</div>
      <div className="bounty-reputation">{BOUNTY_TEXTS.reputation(state.reputation)}</div>
      <button className="bounty-refresh" onClick={onRefreshBounties}>{BOUNTY_TEXTS.refresh}</button>

      <section className="bounty-section">
        <div className="bounty-section-title">{BOUNTY_TEXTS.activeTitle}</div>
        {Object.values(state.active).length === 0 ? <div className="bounty-empty">{BOUNTY_TEXTS.emptyActive}</div> : (
          <div className="bounty-list">
            {Object.values(state.active).map(bounty => (
              <article key={bounty.id} className={`bounty-card ${bounty.completed ? 'bounty-card--done' : ''}`}>
                <BountyHeader icon={bounty.icon} title={bounty.title} issuer={bounty.issuer} />
                <div className="bounty-desc">{bounty.description}</div>
                <div className="bounty-objective">{describeBountyObjective(bounty.objective)}</div>
                <div className="bounty-progress">{BOUNTY_TEXTS.progress(bounty.progress, bounty.objective.count)}</div>
                <button className="bounty-action" disabled={!bounty.completed} onClick={() => onClaimBounty(bounty.id)}>
                  {bounty.completed ? BOUNTY_TEXTS.claim : BOUNTY_TEXTS.completed}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bounty-section">
        <div className="bounty-section-title">{BOUNTY_TEXTS.availableTitle}</div>
        {state.available.length === 0 ? <div className="bounty-empty">{BOUNTY_TEXTS.emptyAvailable}</div> : (
          <div className="bounty-list">
            {state.available.map(bounty => (
              <article key={bounty.id} className="bounty-card">
                <BountyHeader icon={bounty.icon} title={bounty.title} issuer={bounty.issuer} />
                <div className="bounty-desc">{bounty.description}</div>
                <div className="bounty-objective">{describeBountyObjective(bounty.objective)}</div>
                <div className="bounty-expire">{BOUNTY_TEXTS.expiresAt(ageToYear(bounty.expiresAt), ageToMonth(bounty.expiresAt))}</div>
                <button className="bounty-action" onClick={() => onAcceptBounty(bounty.id)}>{BOUNTY_TEXTS.accept}</button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BountyHeader({ icon, title, issuer }: { icon: string; title: string; issuer: string }) {
  return (
    <div className="bounty-card-head">
      <div className="bounty-card-title">{icon} {title}</div>
      <div className="bounty-card-issuer">{BOUNTY_TEXTS.issuer(issuer)}</div>
    </div>
  );
}

function ageToYear(age: number): number {
  return Math.floor(age / 12) - 15;
}

function ageToMonth(age: number): number {
  return ((age - 1) % 12) + 1;
}
