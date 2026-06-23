import type { Player } from '../../game/player';
import { getAvailableMiningSites, getFengShuiGrade, getMiningLockReason, getMiningState } from '../../game/feng-shui-mining';
import { getRealmDef } from '../../game/registry';
import { MINING_TEXTS } from '../../data/texts';
import './MiningPanel.css';

interface MiningPanelProps {
  player: Player;
  onMine: (siteId: string) => void;
}

export default function MiningPanel({ player, onMine }: MiningPanelProps) {
  const sites = getAvailableMiningSites(player);
  const state = getMiningState(player);
  return (
    <div className="mining-panel">
      <div className="mining-intro">{MINING_TEXTS.panel.intro}</div>
      <div className="mining-summary">{MINING_TEXTS.labels.total(state.minedCount, state.totalFengShui)}</div>
      <section className="mining-section">
        <div className="mining-section-title">{MINING_TEXTS.panel.availableTitle}</div>
        {sites.length === 0 ? <div className="mining-empty">{MINING_TEXTS.panel.emptySites}</div> : (
          <div className="mining-list">
            {sites.map(site => {
              const lock = getMiningLockReason(player, site.id);
              return (
                <article key={site.id} className="mining-card">
                  <div className="mining-card-title">{site.icon} {site.name}</div>
                  <div className="mining-desc">{site.description}</div>
                  <div className="mining-meta">{MINING_TEXTS.labels.fengShui(site.fengShui, getFengShuiGrade(site.fengShui))}</div>
                  <div className="mining-meta">{MINING_TEXTS.labels.minRealm(getRealmDef(site.minRealm)?.name ?? String(site.minRealm))}</div>
                  <div className="mining-meta">{MINING_TEXTS.labels.cost(site.staminaCost, site.months)}</div>
                  {lock && <div className="mining-lock">{lock}</div>}
                  <button className="mining-action" disabled={!!lock} onClick={() => onMine(site.id)}>{MINING_TEXTS.panel.mine}</button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
