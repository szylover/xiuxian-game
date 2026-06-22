import type React from 'react';
import type { Player } from '../../game/player';
import { getHeartDemonEffects, getHeartDemonState, getHeartDemonSuppressCost } from '../../game/heart-demon';
import { HEART_DEMON_TEXTS } from '../../data/texts';
import './HeartDemonPanel.css';

interface HeartDemonPanelProps {
  player: Player;
  onSuppress: () => void;
  onConfront: () => void;
}

export default function HeartDemonPanel({ player, onSuppress, onConfront }: HeartDemonPanelProps) {
  const state = getHeartDemonState(player);
  const effects = getHeartDemonEffects(player);
  const progress = `${Math.min(100, (state.value / state.maxValue) * 100)}%`;
  const stateText = state.value >= 90
    ? HEART_DEMON_TEXTS.panel.stateTribulation
    : state.value >= 70
      ? HEART_DEMON_TEXTS.panel.stateDanger
      : state.value >= 40
        ? HEART_DEMON_TEXTS.panel.stateStirring
        : HEART_DEMON_TEXTS.panel.stateCalm;

  return (
    <div className="heart-demon-panel">
      <div className="heart-demon-intro">{HEART_DEMON_TEXTS.panel.intro}</div>
      <section className="heart-demon-section">
        <div className="heart-demon-section-title">{HEART_DEMON_TEXTS.panel.valueTitle}</div>
        <div className="heart-demon-state">{stateText}</div>
        <div className="heart-demon-value">{HEART_DEMON_TEXTS.panel.valueLine(state.value, state.maxValue)}</div>
        <div className="heart-demon-bar">
          <div className="heart-demon-bar-fill" style={{ '--heart-demon-progress': progress } as React.CSSProperties} />
        </div>
        <div className="heart-demon-actions">
          <button className="heart-demon-button" onClick={onSuppress}>{HEART_DEMON_TEXTS.panel.suppress}</button>
          <button className="heart-demon-button heart-demon-button--danger" onClick={onConfront}>{HEART_DEMON_TEXTS.panel.confront}</button>
        </div>
        <div className="heart-demon-hint">{HEART_DEMON_TEXTS.panel.suppressCost(getHeartDemonSuppressCost())}</div>
      </section>

      <section className="heart-demon-section">
        <div className="heart-demon-section-title">{HEART_DEMON_TEXTS.panel.effectsTitle}</div>
        <div className="heart-demon-tags">
          <span className="heart-demon-tag">{HEART_DEMON_TEXTS.panel.conquered(state.conqueredCount)}</span>
          <span className="heart-demon-tag">{HEART_DEMON_TEXTS.panel.failed(state.failedCount)}</span>
          {effects.cultivationSpeedMultiplier < 1 && (
            <span className="heart-demon-tag">{HEART_DEMON_TEXTS.panel.effectCultivation(Math.round((1 - effects.cultivationSpeedMultiplier) * 100))}</span>
          )}
          {effects.breakthroughRatePenalty > 0 && (
            <span className="heart-demon-tag">{HEART_DEMON_TEXTS.panel.effectBreakthrough(Math.round(effects.breakthroughRatePenalty * 100))}</span>
          )}
        </div>
        {state.activeDebuffs.length === 0 ? <div className="heart-demon-empty">{HEART_DEMON_TEXTS.panel.noDebuff}</div> : (
          <div className="heart-demon-list">
            {state.activeDebuffs.map(buff => (
              <div key={buff.id} className="heart-demon-card">{HEART_DEMON_TEXTS.panel.debuffLine(buff.name, buff.remainingMonths)}</div>
            ))}
          </div>
        )}
      </section>

      <section className="heart-demon-section">
        <div className="heart-demon-section-title">{HEART_DEMON_TEXTS.panel.historyTitle}</div>
        {state.history.length === 0 ? <div className="heart-demon-empty">{HEART_DEMON_TEXTS.panel.noHistory}</div> : (
          <div className="heart-demon-list">
            {state.history.map(item => <div key={item} className="heart-demon-card">{item}</div>)}
          </div>
        )}
      </section>
    </div>
  );
}

