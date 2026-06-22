// ============================================================
// ReincarnationModal.tsx — 转世确认弹窗（#101）
// ============================================================

import { useMemo, useState } from 'react';
import type { Player } from '../../game/player';
import type { ReincarnationContext, ReincarnationLegacy } from '../../game/types';
import { checkReincarnation, getRealmName } from '../../game/reincarnation';
import { REINCARNATION_TEXTS } from '../../data/texts';
import './ReincarnationModal.css';

interface ReincarnationModalProps {
  player: Player;
  context: ReincarnationContext;
  onConfirm: (options: { name: string; gender: 'male' | 'female'; appearance: number }) => void;
  onClose: () => void;
}

export default function ReincarnationModal({ player, context, onConfirm, onClose }: ReincarnationModalProps) {
  const check = useMemo(() => checkReincarnation(player, context), [player, context]);
  const [name, setName] = useState(player.name);
  const [gender, setGender] = useState<'male' | 'female'>(player.gender);
  const [appearance, setAppearance] = useState(player.appearance);
  const outcome = context === 'ascension'
    ? REINCARNATION_TEXTS.outcomeAscended
    : context === 'death'
      ? REINCARNATION_TEXTS.outcomeDied
      : REINCARNATION_TEXTS.outcomeVoluntary;

  return (
    <div className="reincarnation-overlay">
      <div className="reincarnation-modal">
        <div className="reincarnation-header">♻️ {REINCARNATION_TEXTS.modalTitle}</div>
        <div className="reincarnation-body">
          {context === 'death' && <div className="reincarnation-warning">{REINCARNATION_TEXTS.deathHalfLegacy}</div>}
          {!check.canReincarnate && <div className="reincarnation-warning">{check.reason}</div>}

          <section className="reincarnation-section">
            <h3>{REINCARNATION_TEXTS.previousLife}</h3>
            <p>{REINCARNATION_TEXTS.previousLifeSummary(player.name, getRealmName(player.realmIndex), Math.floor(player.age / 12), outcome)}</p>
          </section>

          <section className="reincarnation-section">
            <h3>{REINCARNATION_TEXTS.legacyTitle}</h3>
            <div className="reincarnation-legacy-grid">
              {renderLegacy(check.legacyPreview).map(item => <span key={item}>{item}</span>)}
            </div>
          </section>

          <section className="reincarnation-section">
            <h3>{REINCARNATION_TEXTS.newLife}</h3>
            <label className="reincarnation-field">
              <span>{REINCARNATION_TEXTS.nameLabel}</span>
              <input value={name} onChange={e => setName(e.target.value)} />
            </label>
            <label className="reincarnation-field">
              <span>{REINCARNATION_TEXTS.genderLabel}</span>
              <select value={gender} onChange={e => setGender(e.target.value as 'male' | 'female')}>
                <option value="male">{REINCARNATION_TEXTS.male}</option>
                <option value="female">{REINCARNATION_TEXTS.female}</option>
              </select>
            </label>
            <label className="reincarnation-field">
              <span>{REINCARNATION_TEXTS.appearanceLabel}</span>
              <input type="number" min={1} max={6} value={appearance} onChange={e => setAppearance(Number(e.target.value) || 1)} />
            </label>
          </section>
        </div>
        <div className="reincarnation-footer">
          <button className="btn btn-primary" disabled={!check.canReincarnate} onClick={() => onConfirm({ name, gender, appearance })}>
            {REINCARNATION_TEXTS.confirmButton}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>{REINCARNATION_TEXTS.cancelButton}</button>
        </div>
      </div>
    </div>
  );
}

function renderLegacy(legacy: ReincarnationLegacy): string[] {
  const rows = [
    legacy.cultivationSpeedBonus > 0 ? REINCARNATION_TEXTS.legacyCultivationSpeed(legacy.cultivationSpeedBonus) : '',
    legacy.bodyExpBonus > 0 ? REINCARNATION_TEXTS.legacyBodySpeed(legacy.bodyExpBonus) : '',
    legacy.atkBonus > 0 ? REINCARNATION_TEXTS.legacyAtk(legacy.atkBonus) : '',
    legacy.defBonus > 0 ? REINCARNATION_TEXTS.legacyDef(legacy.defBonus) : '',
    legacy.hpBonus > 0 ? REINCARNATION_TEXTS.legacyHp(legacy.hpBonus) : '',
    legacy.mpBonus > 0 ? REINCARNATION_TEXTS.legacyMp(legacy.mpBonus) : '',
    legacy.speedBonus > 0 ? REINCARNATION_TEXTS.legacySpeed(legacy.speedBonus) : '',
    legacy.luckBonus > 0 ? REINCARNATION_TEXTS.legacyLuck(legacy.luckBonus) : '',
    legacy.comprehensionBonus > 0 ? REINCARNATION_TEXTS.legacyComprehension(legacy.comprehensionBonus) : '',
    legacy.charismaBonus > 0 ? REINCARNATION_TEXTS.legacyCharisma(legacy.charismaBonus) : '',
    legacy.aptitudeBonus > 0 ? REINCARNATION_TEXTS.legacyAptitude(legacy.aptitudeBonus) : '',
    legacy.spiritRootFloor > 0 ? REINCARNATION_TEXTS.legacySpiritRootFloor(legacy.spiritRootFloor) : '',
    legacy.inventoryCapacityBonus > 0 ? REINCARNATION_TEXTS.legacyInventory(legacy.inventoryCapacityBonus) : '',
    legacy.lifespanBonus > 0 ? REINCARNATION_TEXTS.legacyLifespan(legacy.lifespanBonus) : '',
  ].filter(Boolean);
  return rows.length ? rows : [REINCARNATION_TEXTS.noLegacy];
}
