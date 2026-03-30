// ============================================================
// data/core-divine-arts.ts — 六系神通数据（DLC 核心包）
// ============================================================

import type { DivineArtDef } from '../game/types';

export const CORE_DIVINE_ARTS: DivineArtDef[] = [
  // ── 🔥 火系：烈焰斩 ──
  {
    id: 'core:divine_fire_blast',
    name: '烈焰斩',
    element: 'fire',
    description: '凝聚火系灵力一刀斩出赤红火焰，高爆发伤害并附带持续灼烧效果。',
    minRealm: 1,
    minAptitude: 30,
    mpCost: 40,
    dmgMultiplier: 2.5,
    hitCount: 1,
    cooldown: 3,
    triggerRate: 0.4,
    aptitudeScaling: 1.0,
    effects: [
      { type: 'dot', value: 15, duration: 3 },
    ],
  },

  // ── 💧 水系：寒冰波 ──
  {
    id: 'core:divine_water_wave',
    name: '寒冰波',
    element: 'water',
    description: '驱动水系灵力凝成冰锋，两段连击，同时恢复气血并削弱敌方攻击。',
    minRealm: 1,
    minAptitude: 30,
    mpCost: 35,
    dmgMultiplier: 1.4,
    hitCount: 2,
    cooldown: 3,
    triggerRate: 0.4,
    aptitudeScaling: 1.0,
    effects: [
      { type: 'heal_self', value: 25, duration: 1 },
      { type: 'debuff_atk', value: 12, duration: 2 },
    ],
  },

  // ── ⚡ 雷系：雷霆击 ──
  {
    id: 'core:divine_thunder_strike',
    name: '雷霆击',
    element: 'thunder',
    description: '召唤雷霆贯穿防御，高穿透伤害并削弱敌方攻击，克制水系妖兽。',
    minRealm: 2,
    minAptitude: 40,
    mpCost: 50,
    dmgMultiplier: 2.8,
    hitCount: 1,
    cooldown: 3,
    triggerRate: 0.4,
    defPenetration: 0.5,
    aptitudeScaling: 1.0,
    effects: [
      { type: 'debuff_atk', value: 15, duration: 2 },
    ],
  },

  // ── 🌪️ 风系：疾风连斩 ──
  {
    id: 'core:divine_wind_slash',
    name: '疾风连斩',
    element: 'wind',
    description: '风系灵力化为五道剑气，连续攻击，每段独立判定暴击，总伤害可观。',
    minRealm: 1,
    minAptitude: 30,
    mpCost: 40,
    dmgMultiplier: 0.7,
    hitCount: 5,
    cooldown: 2,
    triggerRate: 0.45,
    aptitudeScaling: 1.0,
  },

  // ── 🪨 土系：磐石护身 ──
  {
    id: 'core:divine_earth_shield',
    name: '磐石护身',
    element: 'earth',
    description: '以土系灵力凝成护盾减免伤害，同时借势破甲，攻守兼备。',
    minRealm: 2,
    minAptitude: 35,
    mpCost: 30,
    dmgMultiplier: 1.2,
    hitCount: 1,
    cooldown: 4,
    triggerRate: 0.35,
    aptitudeScaling: 1.0,
    effects: [
      { type: 'shield_self', value: 25, duration: 3 },
      { type: 'debuff_def', value: 10, duration: 2 },
    ],
  },

  // ── 🌿 木系：藤蔓束缚 ──
  {
    id: 'core:divine_wood_bind',
    name: '藤蔓束缚',
    element: 'wood',
    description: '木系灵力化为藤蔓缠绕敌身，持续造成腐蚀伤害，5回合总伤害极高。',
    minRealm: 1,
    minAptitude: 30,
    mpCost: 30,
    dmgMultiplier: 1.0,
    hitCount: 1,
    cooldown: 2,
    triggerRate: 0.45,
    aptitudeScaling: 1.0,
    effects: [
      { type: 'dot', value: 28, duration: 5 },
    ],
  },
];
