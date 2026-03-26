// ============================================================
// StatusBar.jsx — 顶部状态栏（常驻）
// ============================================================

import { REALMS } from '../game/data.js';
import { getNextRealm } from '../game/player.js';

export default function StatusBar({ player }) {
  if (!player) return null;

  const realm = REALMS[player.realmIndex];
  const nextRealm = getNextRealm(player);
  const expProgress = nextRealm
    ? Math.min(100, (player.exp / nextRealm.expReq) * 100)
    : 100;

  return (
    <div className="status-bar">
      <span className="status-item" title="道号 & 境界">
        ⛰️ {player.name}【{realm.name}】
      </span>
      <span className="status-item" title={`HP ${player.hp}/${player.maxHp}`}>
        ❤️ {player.hp}/{player.maxHp}
      </span>
      <span className="status-item" title={`MP ${player.mp}/${player.maxMp}`}>
        🔮 {player.mp}/{player.maxMp}
      </span>
      <span className="status-item" title={`精力 ${player.stamina}/${player.maxStamina}`}>
        ⚡ {player.stamina}/{player.maxStamina}
      </span>
      <span className="status-item" title="灵石">
        💎 {player.gold}
      </span>
      <span className="status-item" title={`年龄/寿限`}>
        📅 {player.age.toFixed(1)}/{player.lifespan === Infinity ? '∞' : player.lifespan}
      </span>
      <div className="exp-bar" title={`修为 ${player.exp}${nextRealm ? '/' + nextRealm.expReq : ' (MAX)'}`}>
        <div className="exp-bar-fill" style={{ width: `${expProgress}%` }} />
        <span className="exp-bar-text">
          修为 {player.exp}{nextRealm ? `/${nextRealm.expReq}` : ''}
        </span>
      </div>
    </div>
  );
}
