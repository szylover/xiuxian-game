// ============================================================
// StatusBar.tsx — 顶部状态栏（常驻）
// ============================================================

import './StatusBar.css';
import { REALMS } from '../../game/data';
import { getNextRealm, formatAge } from '../../game/player';
import type { Player } from '../../game/player';
import { StatusItem } from '../shared';
import { UI_LABELS } from '../../data/texts/ui-labels';
import { getAscensionState } from '../../game/ascension';
import { ASCENSION_TEXTS } from '../../data/texts/ascension';

interface StatusBarProps {
  player: Player;
}

export default function StatusBar({ player }: StatusBarProps) {
  if (!player) return null;

  const realm = REALMS[player.realmIndex];
  const nextRealm = getNextRealm(player);
  const ascState = getAscensionState(player);
  const tierLabel = ASCENSION_TEXTS.tierLabel(ascState.currentTier);
  const expProgress = nextRealm
    ? Math.min(100, (player.exp / nextRealm.expReq) * 100)
    : 100;

  return (
    <div className="status-bar">
      <StatusItem icon="⛰️" text={`${player.name}【${tierLabel ? tierLabel + '·' : ''}${realm.name}】`} title="道号 & 境界" />
      <StatusItem icon="❤️" text={`${player.hp}/${player.maxHp}`} title={`HP ${player.hp}/${player.maxHp}`} />
      <StatusItem icon="🔮" text={`${player.mp}/${player.maxMp}`} title={`MP ${player.mp}/${player.maxMp}`} />
      <StatusItem icon="⚡" text={`${player.stamina}/${player.maxStamina}`} title={`精力 ${player.stamina}/${player.maxStamina}`} />
      <StatusItem icon="💰" text={`${player.gold}`} title="灵石" />
      <StatusItem icon="📅" text={`${formatAge(player.age)}/${player.lifespan === Infinity ? '∞' : Math.floor(player.lifespan / 12) + UI_LABELS.age}`} title="年龄/寿限" />
      <div className="exp-bar" title={`修为 ${player.exp}${nextRealm ? '/' + nextRealm.expReq : ' (MAX)'}`}>
        <div className="exp-bar-fill" style={{ '--exp-width': `${expProgress}%` } as React.CSSProperties} />
        <span className="exp-bar-text">
          修为 {player.exp}{nextRealm ? `/${nextRealm.expReq}` : ''}
        </span>
      </div>
    </div>
  );
}
