import type { Player } from '../../game/player';
import { getAvailableSecretRealms, getSecretRealmCooldownAge, getSecretRealmLockReason, getSecretRealmState } from '../../game/secret-realm';
import { getRealmDef } from '../../game/registry';
import { SECRET_REALM_TEXTS } from '../../data/texts';
import './SecretRealmPanel.css';

interface SecretRealmPanelProps {
  player: Player;
  onStartRealm: (realmId: string) => void;
  onAdvanceRealm: () => void;
  onFinishRealm: () => void;
}

export default function SecretRealmPanel({ player, onStartRealm, onAdvanceRealm, onFinishRealm }: SecretRealmPanelProps) {
  const state = getSecretRealmState(player);
  const realms = getAvailableSecretRealms(player);
  const run = state.activeRun;
  return (
    <div className="secret-realm-panel">
      <div className="secret-realm-intro">{SECRET_REALM_TEXTS.intro}</div>
      {run && (
        <section className="secret-realm-run">
          <div className="secret-realm-section-title">{SECRET_REALM_TEXTS.runTitle}</div>
          <div className="secret-realm-run-card">
            <div>{SECRET_REALM_TEXTS.stage(run.stageIndex, realms.find(r => r.id === run.realmId)?.stages.length ?? run.stageIndex)}</div>
            <div className="secret-realm-run-log">
              {run.logs.slice(-4).map(line => <div key={line}>{line}</div>)}
            </div>
            {run.completed || run.failed ? (
              <button className="secret-realm-action" onClick={onFinishRealm}>{SECRET_REALM_TEXTS.finish}</button>
            ) : (
              <button className="secret-realm-action" onClick={onAdvanceRealm}>{SECRET_REALM_TEXTS.advance}</button>
            )}
          </div>
        </section>
      )}

      <section className="secret-realm-section">
        <div className="secret-realm-section-title">{SECRET_REALM_TEXTS.availableTitle}</div>
        <div className="secret-realm-list">
          {realms.map(realm => {
            const lock = getSecretRealmLockReason(player, realm.id);
            const cooldown = getSecretRealmCooldownAge(player, realm.id);
            return (
              <article key={realm.id} className="secret-realm-card">
                <div className="secret-realm-card-title">{realm.icon} {realm.name}</div>
                <div className="secret-realm-desc">{realm.description}</div>
                <div className="secret-realm-meta">{SECRET_REALM_TEXTS.minRealm(getRealmDef(realm.minRealm)?.name ?? String(realm.minRealm))}</div>
                <div className="secret-realm-meta">{SECRET_REALM_TEXTS.entryCost(realm.entryCost.stamina, realm.entryCost.gold)}</div>
                {cooldown > player.age && <div className="secret-realm-lock">{SECRET_REALM_TEXTS.cooldown(ageToYear(cooldown), ageToMonth(cooldown))}</div>}
                {lock && <div className="secret-realm-lock">{lock}</div>}
                <button className="secret-realm-action" disabled={!!lock || !!run} onClick={() => onStartRealm(realm.id)}>
                  {SECRET_REALM_TEXTS.enter}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="secret-realm-section">
        <div className="secret-realm-section-title">{SECRET_REALM_TEXTS.historyTitle}</div>
        <div className="secret-realm-history">
          {realms.map(realm => <span key={realm.id}>{realm.name}：{SECRET_REALM_TEXTS.completedRuns(state.completedRuns[realm.id] ?? 0)}</span>)}
        </div>
      </section>
    </div>
  );
}

function ageToYear(age: number): number {
  return Math.floor(age / 12) - 15;
}

function ageToMonth(age: number): number {
  return ((age - 1) % 12) + 1;
}
