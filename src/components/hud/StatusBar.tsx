// ============================================================
// StatusBar.tsx — 顶部状态栏（常驻）
// ============================================================

import { REALMS } from '../../game/data';
import { getNextRealm } from '../../game/player';
import type { Player } from '../../game/player';
import { StatusItem } from '../shared';

interface StatusBarProps {
  player: Player;
}

export default function StatusBar({ player }: StatusBarProps) {
  if (!player) return null;

  const realm = REALMS[player.realmIndex];
  const nextRealm = getNextRealm(player);
  const expProgress = nextRealm
    ? Math.min(100, (player.exp / nextRealm.expReq) * 100)
    : 100;

  return (
    <div className="status-bar">
      <StatusItem icon="⛰️" text={`${player.name}【${realm.name}】`} title="道号 & 境界" />
      <StatusItem icon="❤️" text={`${player.hp}/${player.maxHp}`} title={`HP ${player.hp}/${player.maxHp}`} />
      <StatusItem icon="🔮" text={`${player.mp}/${player.maxMp}`} title={`MP ${player.mp}/${player.maxMp}`} />
      <StatusItem icon="⚡" text={`${player.stamina}/${player.maxStamina}`} title={`精力 ${player.stamina}/${player.maxStamina}`} />
      <StatusItem icon="💰" text={`${player.gold}`} title="灵石" />
      <StatusItem icon="📅" text={`${player.age.toFixed(1)}/${player.lifespan === Infinity ? '∞' : player.lifespan}`} title="年龄/寿限" />
      <div className="exp-bar" title={`修为 ${player.exp}${nextRealm ? '/' + nextRealm.expReq : ' (MAX)'}`}>
        <div className="exp-bar-fill" style={{ width: `${expProgress}%` }} />
        <span className="exp-bar-text">
          修为 {player.exp}{nextRealm ? `/${nextRealm.expReq}` : ''}
        </span>
      </div>
    </div>
  );
}
