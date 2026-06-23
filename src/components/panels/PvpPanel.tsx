import type { Player } from '../../game/player';
import { getPvpCandidates, getPvpState } from '../../game/pvp';
import { getRealmDef } from '../../game/registry';
import { PVP_TEXTS } from '../../data/texts';
import './PvpPanel.css';

interface PvpPanelProps {
  player: Player;
  onChallenge: (opponentId: string) => void;
}

export default function PvpPanel({ player, onChallenge }: PvpPanelProps) {
  const state = getPvpState(player);
  const candidates = getPvpCandidates(player);
  const cooldown = Math.max(0, state.cooldownUntilAge - player.age);

  return (
    <div className="pvp-panel">
      <div className="pvp-intro">{PVP_TEXTS.panel.intro}</div>
      <section className="pvp-section">
        <div className="pvp-section-title">{PVP_TEXTS.panel.title}</div>
        <div className="pvp-summary">
          <span>{PVP_TEXTS.panel.rating(state.rating)}</span>
          <span>{PVP_TEXTS.panel.record(state.wins, state.losses)}</span>
          <span>{cooldown > 0 ? PVP_TEXTS.panel.cooldown(cooldown) : PVP_TEXTS.panel.ready}</span>
        </div>
      </section>
      <section className="pvp-section">
        <div className="pvp-section-title">{PVP_TEXTS.panel.opponentTitle}</div>
        {candidates.length === 0 ? <div className="pvp-empty">{PVP_TEXTS.panel.noOpponents}</div> : (
          <div className="pvp-list">
            {candidates.map(entry => (
              <article key={entry.id} className="pvp-card">
                <div className="pvp-card-main">
                  <span className="pvp-avatar">{entry.emoji}</span>
                  <div>
                    <div className="pvp-name">{entry.name}</div>
                    <div className="pvp-meta">
                      <span>{PVP_TEXTS.panel.rank(entry.rank)}</span>
                      <span>{getRealmDef(entry.realmIndex)?.name}</span>
                      <span>{PVP_TEXTS.panel.power(entry.score)}</span>
                    </div>
                  </div>
                </div>
                <button className="pvp-button" disabled={cooldown > 0} onClick={() => onChallenge(entry.id)}>{PVP_TEXTS.panel.challenge}</button>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="pvp-section">
        <div className="pvp-section-title">{PVP_TEXTS.panel.historyTitle}</div>
        {state.records.length === 0 ? <div className="pvp-empty">{PVP_TEXTS.panel.noHistory}</div> : (
          <div className="pvp-list">
            {state.records.map(record => (
              <div key={record.id} className="pvp-record">
                <div>{PVP_TEXTS.panel.lastResult(record.opponentName, record.playerWon ? PVP_TEXTS.resultWin : PVP_TEXTS.resultLoss)}</div>
                <div>{PVP_TEXTS.panel.reward(record.rewardExp, record.rewardGold)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

