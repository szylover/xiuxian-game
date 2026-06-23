import './LearningPanel.css';
import type React from 'react';
import type { Player } from '../../game/player';
import { getInventoryEntries } from '../../game/inventory';
import { calcActualStudyMonths, getLearningState, getScrollTargetName } from '../../game/learning';
import { LEARNING_TEXTS } from '../../data/texts';
import { RARITY_COLORS } from '../shared';
import type { ItemRarity, ScrollStudyType } from '../../game/types';

interface LearningPanelProps {
  player: Player;
  onStartStudy: (scrollItemId: string) => void;
  onCancelStudy: () => void;
}

export default function LearningPanel({ player, onStartStudy, onCancelStudy }: LearningPanelProps) {
  const state = getLearningState(player);
  const scrolls = getInventoryEntries(player).filter(entry => entry.def.category === 'scroll');

  return (
    <div className="learning-panel">
      <section className="learning-section">
        <div className="learning-section-title">{LEARNING_TEXTS.panel.currentTitle}</div>
        {state.activeStudy ? (
          <ActiveStudyCard player={player} onCancelStudy={onCancelStudy} />
        ) : (
          <div className="learning-empty">{LEARNING_TEXTS.panel.noActiveStudy}</div>
        )}
      </section>

      <section className="learning-section">
        <div className="learning-section-title">{LEARNING_TEXTS.panel.scrollListTitle}</div>
        {scrolls.length === 0 ? (
          <div className="learning-empty">{LEARNING_TEXTS.panel.emptyScrolls}</div>
        ) : (
          <div className="learning-scroll-list">
            {scrolls.map(({ slot, def }) => (
              <ScrollCard
                key={slot.itemId}
                player={player}
                itemId={slot.itemId}
                count={slot.count}
                def={def}
                onStartStudy={onStartStudy}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ActiveStudyCard({ player, onCancelStudy }: { player: Player; onCancelStudy: () => void }) {
  const activeStudy = getLearningState(player).activeStudy;
  if (!activeStudy) return null;
  const pct = Math.min(100, (activeStudy.progressMonths / activeStudy.totalMonths) * 100);
  const remaining = Math.max(0, activeStudy.totalMonths - activeStudy.progressMonths);
  const multiplier = (1 + Math.max(0, player.comprehension) / 100).toFixed(1);

  return (
    <div className="learning-active-card">
      <div className="learning-active-name">《{activeStudy.targetName}》</div>
      <div className="learning-progress">
        <div
          className="learning-progress-fill"
          style={{ '--learning-progress': `${pct}%` } as React.CSSProperties}
        />
      </div>
      <div className="learning-meta-row">
        <span>{LEARNING_TEXTS.panel.progressLabel(activeStudy.progressMonths, activeStudy.totalMonths)}</span>
        <span>{LEARNING_TEXTS.panel.remaining(remaining)}</span>
      </div>
      <div className="learning-meta-row learning-meta-muted">
        <span>{LEARNING_TEXTS.panel.comprehensionBoost(multiplier)}</span>
      </div>
      <button
        className="btn btn-secondary learning-cancel-btn"
        onClick={() => window.confirm(LEARNING_TEXTS.panel.cancelConfirm) && onCancelStudy()}
      >
        {LEARNING_TEXTS.panel.cancelButton}
      </button>
    </div>
  );
}

function ScrollCard({
  player,
  itemId,
  count,
  def,
  onStartStudy,
}: {
  player: Player;
  itemId: string;
  count: number;
  def: import('../../game/types').ItemDef;
  onStartStudy: (scrollItemId: string) => void;
}) {
  const targetName = getScrollTargetName(def) ?? def.name;
  const baseMonths = def.scrollStudyMonths ?? 1;
  const actualMonths = calcActualStudyMonths(baseMonths, player.comprehension);
  const scrollType = def.scrollType ?? 'technique';
  const color = RARITY_COLORS[def.rarity as ItemRarity] ?? RARITY_COLORS.common;

  return (
    <div
      className="learning-scroll-card"
      style={{ '--learning-scroll-color': color } as React.CSSProperties}
    >
      <div className="learning-scroll-header">
        <span className="learning-scroll-name">{def.name}</span>
        <span className="learning-scroll-count">×{count}</span>
      </div>
      <div className="learning-scroll-meta">
        <span>{LEARNING_TEXTS.scrollTypes[scrollType as ScrollStudyType]}</span>
        <span>{LEARNING_TEXTS.rarity[def.rarity]}</span>
      </div>
      <div className="learning-scroll-target">《{targetName}》</div>
      <div className="learning-scroll-desc">{def.description}</div>
      <div className="learning-scroll-footer">
        <span>{LEARNING_TEXTS.panel.baseMonths(baseMonths)}</span>
        <span>{LEARNING_TEXTS.panel.actualMonths(actualMonths)}</span>
        <button className="btn btn-primary" onClick={() => onStartStudy(itemId)}>
          {LEARNING_TEXTS.panel.startButton}
        </button>
      </div>
    </div>
  );
}
