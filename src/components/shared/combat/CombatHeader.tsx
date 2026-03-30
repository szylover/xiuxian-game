// ============================================================
// combat/CombatHeader.tsx — 顶部对阵区：玩家 vs 怪物（带 HP/MP 条）
// ============================================================

import type { RoundSnapshot } from '../../../game/combat/types';
import HpBar from './HpBar';
import Avatar from '../../layout/Avatar';

interface CombatHeaderProps {
  playerName: string;
  playerAvatar: string;
  playerRealmIndex: number;
  playerMaxHp: number;
  playerMaxMp: number;
  monsterName: string;
  monsterEmoji: string;
  monsterMaxHp: number;
  snapshots: RoundSnapshot[];
  currentRound: number;       // 当前展示到第几回合（对应 snapshots 索引）
  winner?: 'player' | 'monster' | 'draw';
}

export default function CombatHeader({
  playerName,
  playerAvatar,
  playerRealmIndex,
  playerMaxHp,
  playerMaxMp,
  monsterName,
  monsterEmoji,
  monsterMaxHp,
  snapshots,
  currentRound,
  winner,
}: CombatHeaderProps) {
  // 从快照中取当前值；没有快照时使用最大值作为初始显示
  const snap = snapshots[currentRound] ?? snapshots[snapshots.length - 1];
  const playerHp = snap ? snap.playerHp : playerMaxHp;
  const playerMp = snap ? snap.playerMp : playerMaxMp;
  const monsterHp = snap ? snap.monsterHp : monsterMaxHp;

  const monsterDefeated = winner === 'player';
  const playerDefeated = winner === 'monster';

  return (
    <div className="combat-header">
      {/* 左侧：玩家 */}
      <div className="combat-header-side combat-header-player">
        <div className="combat-header-avatar">
          <Avatar avatarId={playerAvatar} realmIndex={playerRealmIndex} size={52} />
        </div>
        <div className="combat-header-info">
          <div className="combat-header-name">{playerName}</div>
          <div className="combat-header-bars">
            <HpBar
              current={playerHp}
              max={playerMaxHp}
              color={playerDefeated ? 'gray' : 'red'}
              label="❤️"
              animate
            />
            <HpBar
              current={playerMp}
              max={playerMaxMp}
              color="blue"
              label="🔮"
              animate
            />
          </div>
        </div>
      </div>

      {/* 中间 VS */}
      <div className="combat-header-vs">VS</div>

      {/* 右侧：怪物 */}
      <div className="combat-header-side combat-header-monster">
        <div className="combat-header-info combat-header-info-right">
          <div className="combat-header-name">{monsterName}</div>
          <div className="combat-header-bars">
            <HpBar
              current={monsterHp}
              max={monsterMaxHp}
              color={monsterDefeated ? 'gray' : 'red'}
              label="❤️"
              animate
            />
          </div>
        </div>
        <div className={`combat-header-emoji${monsterDefeated ? ' combat-header-emoji-dead' : ''}`}>
          {monsterEmoji}
        </div>
      </div>
    </div>
  );
}
