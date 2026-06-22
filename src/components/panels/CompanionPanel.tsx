import type { Player } from '../../game/player';
import { getAllNpcDefs, getRegion, getRealmDef } from '../../game/registry';
import { canFormDaoCompanion, getDualCultivationBonus, getDualCultivationState, getNpcDynamicState, getRelation } from '../../game/npc';
import { DUAL_CULTIVATION_TEXTS, NPC_WORLD_TEXTS } from '../../data/texts';
import './CompanionPanel.css';

interface CompanionPanelProps {
  player: Player;
  onFormDaoCompanion: (npcId: string) => void;
  onPerformDualCultivation: () => void;
  onDissolveDaoCompanion: () => void;
}

export default function CompanionPanel({ player, onFormDaoCompanion, onPerformDualCultivation, onDissolveDaoCompanion }: CompanionPanelProps) {
  const state = getDualCultivationState(player);
  const companion = state.companionNpcId ? getAllNpcDefs().find(npc => npc.id === state.companionNpcId) : undefined;
  const candidates = getAllNpcDefs().filter(npc => canFormDaoCompanion(player, npc.id));
  const remaining = state.lastDualCultivationAge === null ? 0 : Math.max(0, state.lastDualCultivationAge + 12 - player.age);
  const buffMonths = state.activeBuffUntilAge === null ? 0 : Math.max(0, state.activeBuffUntilAge - player.age);
  const statBond = Math.max(1, state.bondLevel);
  const expPreview = Math.max(80, Math.floor((player.realmIndex + 1) * 120 * (1 + state.bondLevel * 0.15)));

  return (
    <div className="companion-panel">
      <div className="companion-intro">{DUAL_CULTIVATION_TEXTS.panel.intro}</div>

      <section className="companion-section">
        <div className="companion-section-title">{DUAL_CULTIVATION_TEXTS.panel.currentTitle}</div>
        {!companion ? (
          <div className="companion-empty">{DUAL_CULTIVATION_TEXTS.panel.noCompanion}</div>
        ) : (
          <article className="companion-card companion-card-active">
            <CompanionSummary player={player} npcId={companion.id} />
            <div className="companion-meta">{DUAL_CULTIVATION_TEXTS.panel.bondLevel(state.bondLevel)}</div>
            <div className="companion-meta">{DUAL_CULTIVATION_TEXTS.panel.totalSessions(state.totalSessions)}</div>
            <div className="companion-meta">{remaining > 0 ? DUAL_CULTIVATION_TEXTS.panel.cooldown(remaining) : DUAL_CULTIVATION_TEXTS.panel.cooldownReady}</div>
            {buffMonths > 0 && <div className="companion-buff">{DUAL_CULTIVATION_TEXTS.panel.activeBuff(buffMonths)}</div>}
            <div className="companion-effect">
              {DUAL_CULTIVATION_TEXTS.panel.effects(expPreview, statBond * 2, statBond * 2)}
              {getDualCultivationBonus(player) > 0 && `｜${DUAL_CULTIVATION_TEXTS.panel.cultivationSpeed(Math.round(getDualCultivationBonus(player) * 100))}`}
            </div>
            <div className="companion-actions">
              <button className="companion-action" disabled={remaining > 0} onClick={onPerformDualCultivation}>
                {DUAL_CULTIVATION_TEXTS.panel.dualCultivate}
              </button>
              <button className="companion-action companion-action-secondary" onClick={onDissolveDaoCompanion}>
                {DUAL_CULTIVATION_TEXTS.panel.dissolve}
              </button>
            </div>
          </article>
        )}
      </section>

      <section className="companion-section">
        <div className="companion-section-title">{DUAL_CULTIVATION_TEXTS.panel.candidatesTitle}</div>
        <div className="companion-hint">{DUAL_CULTIVATION_TEXTS.panel.requirement}</div>
        <div className="companion-card-list">
          {candidates.length === 0 ? <div className="companion-empty">{DUAL_CULTIVATION_TEXTS.panel.noCandidates}</div> : candidates.map(npc => (
            <article key={npc.id} className="companion-card">
              <CompanionSummary player={player} npcId={npc.id} />
              <button className="companion-action" onClick={() => onFormDaoCompanion(npc.id)}>
                {DUAL_CULTIVATION_TEXTS.panel.propose}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CompanionSummary({ player, npcId }: { player: Player; npcId: string }) {
  const npc = getAllNpcDefs().find(def => def.id === npcId);
  if (!npc) return null;
  const rel = getRelation(player, npcId);
  const dynamic = getNpcDynamicState(player, npcId);
  const realm = getRealmDef(dynamic.realmIndex)?.name ?? String(dynamic.realmIndex);
  const region = dynamic.regionId ? getRegion(dynamic.regionId)?.name ?? NPC_WORLD_TEXTS.fallbackRegion : NPC_WORLD_TEXTS.fallbackRegion;
  return (
    <div className="companion-summary">
      <div className="companion-name">{npc.emoji} {npc.name}</div>
      <div className="companion-meta">{NPC_WORLD_TEXTS.panel.realm(realm)}</div>
      <div className="companion-meta">{NPC_WORLD_TEXTS.panel.location(region)}</div>
      <div className="companion-meta">{DUAL_CULTIVATION_TEXTS.panel.affinity(rel.affinity)}</div>
    </div>
  );
}
