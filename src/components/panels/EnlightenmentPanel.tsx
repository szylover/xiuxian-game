import type React from 'react';
import type { Player } from '../../game/player';
import { describeEnlightenmentEffect, ENLIGHTENMENT_POINT_EXP, getEnlightenmentState } from '../../game/enlightenment';
import { getAllEnlightenmentInsightDefs } from '../../game/registry';
import { getAlignment } from '../../game/karma';
import { ENLIGHTENMENT_TEXTS } from '../../data/texts';
import './EnlightenmentPanel.css';

interface EnlightenmentPanelProps {
  player: Player;
  onContemplate: () => void;
  onTrigger: () => void;
}

export default function EnlightenmentPanel({ player, onContemplate, onTrigger }: EnlightenmentPanelProps) {
  const state = getEnlightenmentState(player);
  const progressPct = `${Math.min(100, (state.comprehensionExp / ENLIGHTENMENT_POINT_EXP) * 100)}%`;
  const alignment = getAlignment(player.karma ?? 0);
  const insights = getAllEnlightenmentInsightDefs();

  return (
    <div className="enlightenment-panel">
      <div className="enlightenment-intro">{ENLIGHTENMENT_TEXTS.panel.intro}</div>
      <section className="enlightenment-section">
        <div className="enlightenment-section-title">{ENLIGHTENMENT_TEXTS.panel.progressTitle}</div>
        <div className="enlightenment-route">{ENLIGHTENMENT_TEXTS.routes[alignment]}</div>
        <div className="enlightenment-progress-text">
          {ENLIGHTENMENT_TEXTS.panel.comprehensionExp(state.comprehensionExp, ENLIGHTENMENT_POINT_EXP)}
        </div>
        <div className="enlightenment-progress">
          <div className="enlightenment-progress-fill" style={{ '--enlightenment-progress': progressPct } as React.CSSProperties} />
        </div>
        <div className="enlightenment-points">{ENLIGHTENMENT_TEXTS.panel.insightPoints(state.insightPoints)}</div>
        <div className="enlightenment-actions">
          <button className="enlightenment-button" onClick={onContemplate}>{ENLIGHTENMENT_TEXTS.panel.contemplate}</button>
          <button className="enlightenment-button enlightenment-button--secondary" onClick={onTrigger}>{ENLIGHTENMENT_TEXTS.debug.trigger}</button>
        </div>
      </section>

      <section className="enlightenment-section">
        <div className="enlightenment-section-title">{ENLIGHTENMENT_TEXTS.panel.activeBuffs}</div>
        {state.activeBuffs.length === 0 ? <div className="enlightenment-empty">{ENLIGHTENMENT_TEXTS.panel.noBuffs}</div> : (
          <div className="enlightenment-card-list">
            {state.activeBuffs.map(buff => (
              <article key={buff.id} className="enlightenment-card">
                <div className="enlightenment-card-title">{buff.name}</div>
                <div className="enlightenment-card-meta">{ENLIGHTENMENT_TEXTS.effects.buffRemaining(buff.remainingMonths)}</div>
                <EffectTags lines={describeEnlightenmentEffect(buff.effect)} />
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="enlightenment-section">
        <div className="enlightenment-section-title">{ENLIGHTENMENT_TEXTS.panel.insights}</div>
        <div className="enlightenment-card-list">
          {insights.map(def => {
            const unlocked = state.unlockedInsightIds.includes(def.id);
            return (
              <article key={def.id} className={`enlightenment-card ${unlocked ? 'enlightenment-card--unlocked' : 'enlightenment-card--locked'}`}>
                <div className="enlightenment-card-title">
                  {def.name}
                  <span className="enlightenment-badge">{unlocked ? ENLIGHTENMENT_TEXTS.panel.unlocked : ENLIGHTENMENT_TEXTS.panel.locked}</span>
                </div>
                <div className="enlightenment-card-meta">{ENLIGHTENMENT_TEXTS.routes[def.route]}</div>
                <div className="enlightenment-card-desc">{def.description}</div>
                <EffectTags lines={describeEnlightenmentEffect(def.effect)} />
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function EffectTags({ lines }: { lines: string[] }) {
  return (
    <div className="enlightenment-effects">
      {lines.map(line => <span key={line} className="enlightenment-effect-tag">{line}</span>)}
    </div>
  );
}
