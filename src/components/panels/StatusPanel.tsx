// ============================================================
// StatusPanel.tsx — 角色详细状态面板
// 数据驱动渲染：主修属性优先，折叠"更多"展示全部属性
// ============================================================

import { useState } from 'react';
import { getSpiritRootGrade, getSpiritRootDisplay, formatAge } from '../../game/player';
import type { Player } from '../../game/player';
import { getBodyRealmDef } from '../../game/registry';
import { getNextBodyRealm } from '../../game/body-cultivation';
import { getCurrentRegion, getMapState } from '../../game/map';
import { StatRow, AptitudeBar, STAT_COLORS } from '../shared';
import { SPIRIT_ROOT_CN, SPIRIT_ROOT_COLORS, SPIRIT_ROOT_ICONS } from '../shared/constants';
import { REALMS } from '../../game/data';
import './StatusPanel.css';

interface StatusPanelProps {
  player: Player;
}

// ── 可折叠分区 ──
function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel-section">
      <h3 onClick={() => setOpen(!open)}>
        <span className="panel-section-arrow">{open ? '▼' : '▶'}</span>
        {title}
      </h3>
      {open && children}
    </div>
  );
}

// ── 资质分类 ──
const APTITUDE_GROUPS = [
  {
    label: '🔥 元素资质',
    primary: true,
    fields: [
      { key: 'fire', label: '🔥 火' },
      { key: 'water', label: '💧 水' },
      { key: 'thunder', label: '⚡ 雷' },
      { key: 'wind', label: '🌪️ 风' },
      { key: 'earth', label: '🪨 土' },
      { key: 'wood', label: '🌿 木' },
      { key: 'metal', label: '⚔️ 金' },
    ],
  },
  {
    label: '🗡️ 武技资质',
    primary: false,
    fields: [
      { key: 'sword', label: '🗡️ 剑' },
      { key: 'blade', label: '🔪 刀' },
      { key: 'spear', label: '🔱 枪' },
      { key: 'fist', label: '👊 拳' },
      { key: 'palm', label: '🤚 掌' },
      { key: 'finger', label: '☝️ 指' },
    ],
  },
  {
    label: '🛠️ 生活资质',
    primary: false,
    fields: [
      { key: 'alchemy', label: '🧪 炼丹' },
      { key: 'smithing', label: '🔨 炼器' },
      { key: 'fengshui', label: '🧭 风水' },
      { key: 'mining', label: '⛏️ 采矿' },
    ],
  },
];

export default function StatusPanel({ player }: StatusPanelProps) {
  if (!player) return null;

  const rootGrade = player.spiritRoots
    ? getSpiritRootDisplay(player.spiritRoots)
    : getSpiritRootGrade(player.aptitudes);

  const bodyRealm = getBodyRealmDef(player.bodyRealmIndex);
  const nextBodyRealm = getNextBodyRealm(player);
  const region = getCurrentRegion(player);
  const mapState = getMapState(player);
  const apt = player.aptitudes as unknown as Record<string, number>;

  return (
    <div className="status-panel-content">
      <div className="panel-content">
        <Section title="🏔️ 修炼境界" defaultOpen>
          <StatRow icon="☁️" label="气修境界" value={`【${REALMS[player.realmIndex]?.name ?? '???'}】`} />
          <StatRow icon="📈" label="气修修为" value={player.exp} max={REALMS[player.realmIndex + 1]?.expReq} />
          <StatRow icon="🔮" label="灵力" value={player.mp} max={player.maxMp} color={STAT_COLORS.mp} />
          <StatRow icon="🧠" label="念力" value={player.mentalPower} max={player.maxMentalPower} color={STAT_COLORS.mental} />
          <div className="section-divider" />
          <StatRow icon="💪" label="体修境界" value={`【${bodyRealm?.name ?? '凡躯'}】`} />
          <StatRow icon="📈" label="体修修为" value={player.bodyRealmExp} max={nextBodyRealm?.expReq} />
          <StatRow icon="💪" label="体魄" value={player.physique} max={player.maxPhysique} color={STAT_COLORS.physique} />
          {player.physiqueDmgReduce > 0 && (
            <StatRow icon="🛡️" label="体魄减伤" value={`${player.physiqueDmgReduce.toFixed(1)}%`} />
          )}
          <StatRow icon="🔥" label="淬体次数" value={player.bodyTempering} />
        </Section>

        <Section title="📦 基础属性" defaultOpen>
          <StatRow icon="📍" label="位置" value={region ? `${region.emoji} ${region.name}` : '未知'} />
          <StatRow icon="📅" label="寿命" value={`${formatAge(player.age)} / ${player.lifespan === Infinity ? '∞' : Math.floor(player.lifespan / 12) + '岁'}`} color={STAT_COLORS.lifespan} />
          <StatRow icon="😊" label="心情" value={player.mood} max={100} color={STAT_COLORS.mood} />
          <StatRow icon="💚" label="健康" value={player.health} max={100} color={player.health < 30 ? '#F44336' : STAT_COLORS.health} />
          <StatRow icon="⚡" label="精力" value={player.stamina} max={player.maxStamina} color={STAT_COLORS.stamina} />
          <StatRow icon="❤️" label="体力" value={player.hp} max={player.maxHp} color={STAT_COLORS.hp} />
          <StatRow icon="💰" label="灵石" value={player.gold} />
          <StatRow icon="🎒" label="背包" value={`${player.inventory.length}/${player.inventoryCapacity}`} />
        </Section>

        <Section title="⚔️ 战斗属性">
          <StatRow icon="🗡️" label="攻击" value={player.atk} />
          <StatRow icon="🛡️" label="防御" value={player.def} />
          <StatRow icon="👟" label="脚力" value={player.speed} />
          <StatRow icon="💨" label="移速" value={player.moveSpeed} />
          <StatRow icon="💥" label="会心率" value={`${player.critRate}%`} />
          <StatRow icon="💥" label="会心伤害" value={`×${player.critDmgMultiplier.toFixed(1)}`} />
          <StatRow icon="🛑" label="护心" value={`${player.critResist}%`} />
          <StatRow icon="🔰" label="功法抗性" value={`${player.skillResist}%`} />
          <StatRow icon="✨" label="神通抗性" value={`${player.spellResist}%`} />
        </Section>

        <Section title="🌟 先天属性">
          <StatRow icon="🍀" label="幸运" value={player.luck} max={100} color={STAT_COLORS.luck} />
          <StatRow icon="🧠" label="悟性" value={player.comprehension} max={100} color={STAT_COLORS.comprehension} />
          <StatRow icon="💫" label="魅力" value={player.charisma} max={100} color={STAT_COLORS.charisma} />
        </Section>

        <Section title={`🔥 灵根资质 【${rootGrade.grade} ×${rootGrade.multiplier}】`}>
          {player.spiritRoots && (
            <div className="spirit-roots-info">
              {player.spiritRoots.roots.length === 0 ? (
                <div className="root-tag">无灵根之体</div>
              ) : (
                player.spiritRoots.roots.map(root => (
                  <div key={root.type} className="root-tag" style={{ '--root-color': SPIRIT_ROOT_COLORS[root.type] } as React.CSSProperties}>
                    {SPIRIT_ROOT_ICONS[root.type]} {SPIRIT_ROOT_CN[root.type]}灵根 {root.affinity}
                  </div>
                ))
              )}
            </div>
          )}
          {APTITUDE_GROUPS[0].fields.map(f => (
            <AptitudeBar key={f.key} label={f.label} value={apt[f.key] ?? 0} />
          ))}
        </Section>

        <Section title="🛠️ 生活资质">
          {APTITUDE_GROUPS.find(g => g.label.includes('生活'))!.fields.map(f => (
            <AptitudeBar key={f.key} label={f.label} value={apt[f.key] ?? 0} />
          ))}
        </Section>

        <Section title="🗡️ 武技资质">
          {APTITUDE_GROUPS.find(g => g.label.includes('武技'))!.fields.map(f => (
            <AptitudeBar key={f.key} label={f.label} value={apt[f.key] ?? 0} />
          ))}
        </Section>

        <Section title="📊 追踪数据">
          <StatRow icon="💀" label="击杀数" value={player.tracking.killCount} />
          <StatRow icon="👑" label="Boss击杀" value={player.tracking.bossKillCount} />
          <StatRow icon="🗺️" label="旅行次数" value={mapState.travelCount} />
        </Section>
      </div>
    </div>
  );
}
