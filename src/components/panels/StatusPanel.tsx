// ============================================================
// StatusPanel.tsx — 角色详细状态面板 (A-6)
// 四栏展示：基础 / 战斗 / 先天 / 灵根资质
// ============================================================

import { getSpiritRootGrade } from '../../game/player';
import type { Player } from '../../game/player';
import { StatRow, AptitudeBar, STAT_COLORS } from '../shared';

interface StatusPanelProps {
  player: Player;
}

export default function StatusPanel({ player }: StatusPanelProps) {
  if (!player) return null;

  const rootGrade = getSpiritRootGrade(player.aptitudes);

  return (
    <div className="status-panel-content">
      <div className="panel-content">
        {/* ── 基础属性 ── */}
        <div className="panel-section">
          <h3>📦 基础属性</h3>
          <StatRow icon="📅" label="寿命" value={player.age.toFixed(1)} max={player.lifespan === Infinity ? undefined : player.lifespan} color={STAT_COLORS.lifespan} />
          <StatRow icon="😊" label="心情" value={player.mood} max={100} color={STAT_COLORS.mood} />
          <StatRow icon="💚" label="健康" value={player.health} max={100} color={player.health < 30 ? '#F44336' : STAT_COLORS.health} />
          <StatRow icon="⚡" label="精力" value={player.stamina} max={player.maxStamina} color={STAT_COLORS.stamina} />
          <StatRow icon="❤️" label="体力" value={player.hp} max={player.maxHp} color={STAT_COLORS.hp} />
          <StatRow icon="🔮" label="灵力" value={player.mp} max={player.maxMp} color={STAT_COLORS.mp} />
          <StatRow icon="🧠" label="念力" value={player.mentalPower} max={player.maxMentalPower} color={STAT_COLORS.mental} />
        </div>

        {/* ── 战斗属性 ── */}
        <div className="panel-section">
          <h3>⚔️ 战斗属性</h3>
          <StatRow icon="🗡️" label="攻击" value={player.atk} />
          <StatRow icon="🛡️" label="防御" value={player.def} />
          <StatRow icon="👟" label="脚力" value={player.speed} />
          <StatRow icon="💨" label="移速" value={player.moveSpeed} />
          <StatRow icon="💥" label="会心" value={`${player.critRate}%`} />
          <StatRow icon="🛑" label="护心" value={`${player.critResist}%`} />
          <StatRow icon="🔰" label="功法抗性" value={`${player.skillResist}%`} />
          <StatRow icon="✨" label="神通抗性" value={`${player.spellResist}%`} />
        </div>

        {/* ── 先天属性 ── */}
        <div className="panel-section">
          <h3>🌟 先天属性</h3>
          <StatRow icon="🍀" label="幸运" value={player.luck} max={100} color={STAT_COLORS.luck} />
          <StatRow icon="🧠" label="悟性" value={player.comprehension} max={100} color={STAT_COLORS.comprehension} />
          <StatRow icon="💫" label="魅力" value={player.charisma} max={100} color={STAT_COLORS.charisma} />
        </div>

        {/* ── 灵根资质 ── */}
        <div className="panel-section">
          <h3>🔥 灵根资质 <span style={{ color: rootGrade.color, fontSize: '0.9em' }}>【{rootGrade.grade} ×{rootGrade.multiplier}】</span></h3>
          <AptitudeBar label="🔥 火" value={player.aptitudes.fire} />
          <AptitudeBar label="💧 水" value={player.aptitudes.water} />
          <AptitudeBar label="⚡ 雷" value={player.aptitudes.thunder} />
          <AptitudeBar label="🌪️ 风" value={player.aptitudes.wind} />
          <AptitudeBar label="🪨 土" value={player.aptitudes.earth} />
          <AptitudeBar label="🌿 木" value={player.aptitudes.wood} />
        </div>
      </div>
    </div>
  );
}
