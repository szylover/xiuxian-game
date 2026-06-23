import type React from 'react';
import type { Player } from '../../game/player';
import { getDestinyDef, getTalentDef } from '../../game/registry';
import { describeEffect, ensureDestinyTalentState, getActiveTalentDefs, getDestinyTalentState, getSortedTalentTreeNodes, getTalentNodeStatus } from '../../game/destiny';
import { DESTINY_TEXTS } from '../../data/texts';
import './TalentPanel.css';

interface TalentPanelProps {
  player: Player;
  onUnlockNode: (nodeId: string) => void;
}

export default function TalentPanel({ player, onUnlockNode }: TalentPanelProps) {
  const normalized = ensureDestinyTalentState(player);
  const state = getDestinyTalentState(normalized);
  const destiny = normalized.destinyId ? getDestinyDef(normalized.destinyId) : undefined;
  const talents = getActiveTalentDefs(normalized);
  const nodes = getSortedTalentTreeNodes();

  return (
    <div className="talent-panel">
      <div className="talent-intro">{DESTINY_TEXTS.panel.intro}</div>
      <section className="talent-section">
        <div className="talent-section-title">{DESTINY_TEXTS.panel.destinyTitle}</div>
        {destiny ? <DestinyCard destiny={destiny} /> : <div className="talent-empty">{DESTINY_TEXTS.panel.noDestiny}</div>}
      </section>

      <section className="talent-section">
        <div className="talent-section-head">
          <div className="talent-section-title">{DESTINY_TEXTS.panel.talentTitle}</div>
          <div className="talent-points">{DESTINY_TEXTS.panel.points(state.talentPoints)}</div>
        </div>
        {talents.length > 0 ? (
          <div className="talent-list">
            {talents.map(talent => <TalentCard key={talent.id} talent={talent} />)}
          </div>
        ) : <div className="talent-empty">{DESTINY_TEXTS.panel.noTalents}</div>}
      </section>

      <section className="talent-section">
        <div className="talent-section-title">{DESTINY_TEXTS.panel.treeTitle}</div>
        <div className="talent-tree">
          {nodes.map(node => {
            const talent = getTalentDef(node.talentId);
            if (!talent) return null;
            const status = getTalentNodeStatus(normalized, node);
            const prereqNames = node.prereqNodeIds
              .map(id => nodes.find(n => n.id === id))
              .map(n => n ? getTalentDef(n.talentId)?.name : null)
              .filter((name): name is string => !!name)
              .join('、');
            return (
              <div
                key={node.id}
                className={`talent-node talent-node--${status}`}
                style={{ '--talent-x': `${node.position.x}%`, '--talent-y': `${node.position.y}%` } as React.CSSProperties}
              >
                <div className="talent-node-tier">{DESTINY_TEXTS.panel.tier(node.tier)}</div>
                <div className="talent-node-name">{talent.name}</div>
                <div className="talent-node-desc">{talent.description}</div>
                <EffectList effect={talent.effect} />
                <div className="talent-node-meta">
                  <span>{DESTINY_TEXTS.panel.cost(node.cost)}</span>
                  <span>{prereqNames ? DESTINY_TEXTS.panel.prereq(prereqNames) : DESTINY_TEXTS.panel.noPrereq}</span>
                </div>
                <button
                  className="talent-node-button"
                  disabled={status !== 'available'}
                  onClick={() => onUnlockNode(node.id)}
                >
                  {status === 'unlocked' ? DESTINY_TEXTS.panel.unlocked : status === 'available' ? DESTINY_TEXTS.panel.unlock : DESTINY_TEXTS.panel.locked}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DestinyCard({ destiny }: { destiny: NonNullable<ReturnType<typeof getDestinyDef>> }) {
  return (
    <div className={`talent-card talent-card--${destiny.rarity}`}>
      <div className="talent-card-head">
        <span className="talent-card-name">{destiny.name}</span>
        <span className="talent-rarity">{DESTINY_TEXTS.rarity[destiny.rarity]}</span>
      </div>
      <div className="talent-card-desc">{destiny.description}</div>
      <EffectList effect={destiny.effect} />
    </div>
  );
}

function TalentCard({ talent }: { talent: NonNullable<ReturnType<typeof getTalentDef>> }) {
  return (
    <div className={`talent-card talent-card--${talent.rarity}`}>
      <div className="talent-card-head">
        <span className="talent-card-name">{talent.name}</span>
        <span className="talent-rarity">{DESTINY_TEXTS.rarity[talent.rarity]}</span>
      </div>
      <div className="talent-card-desc">{talent.description}</div>
      <EffectList effect={talent.effect} />
    </div>
  );
}

function EffectList({ effect }: { effect: Parameters<typeof describeEffect>[0] }) {
  const lines = describeEffect(effect);
  return (
    <div className="talent-effects">
      <div className="talent-effects-title">{DESTINY_TEXTS.panel.effectTitle}</div>
      <div className="talent-effect-tags">
        {lines.map(line => <span key={line} className="talent-effect-tag">{line}</span>)}
      </div>
    </div>
  );
}
