// ============================================================
// data/core-body-config.ts — 体修核心数据（T0059）
// 体修境界 + 灵根体修加成，全部通过 registerDLC() 注册。
// 调数值只改此文件，不需要动系统代码。
// ============================================================

import type { BodyRealmDef, SpiritRootBodyBonus } from '../game/types';

// ── 7 阶体修境界定义 ──

export const CORE_BODY_REALMS: BodyRealmDef[] = [
  { id: 'core:body_mortal',   name: '凡躯', index: 0, maxPhysique: 50,    expReq: 0,      physiqueDmgReduce: 0,  hpBonus: 0,    atkBonus: 0,   defBonus: 0,   description: '凡人之躯，未经淬炼。' },
  { id: 'core:body_copper',   name: '铜皮', index: 1, maxPhysique: 150,   expReq: 100,    physiqueDmgReduce: 2,  hpBonus: 50,   atkBonus: 5,   defBonus: 5,   description: '皮肤坚韧如铜，初窥体修门径。' },
  { id: 'core:body_iron',     name: '铁骨', index: 2, maxPhysique: 400,   expReq: 500,    physiqueDmgReduce: 5,  hpBonus: 150,  atkBonus: 15,  defBonus: 15,  description: '骨骼坚硬如铁，拳力大增。' },
  { id: 'core:body_jade',     name: '玉髓', index: 3, maxPhysique: 1000,  expReq: 2000,   physiqueDmgReduce: 10, hpBonus: 400,  atkBonus: 40,  defBonus: 35,  description: '筋脉如玉，气血充盈，刀剑难伤。' },
  { id: 'core:body_diamond',  name: '金刚', index: 4, maxPhysique: 2500,  expReq: 8000,   physiqueDmgReduce: 18, hpBonus: 1000, atkBonus: 90,  defBonus: 80,  description: '金刚不坏之体，力可碎石。' },
  { id: 'core:body_dragon',   name: '龙象', index: 5, maxPhysique: 6000,  expReq: 30000,  physiqueDmgReduce: 28, hpBonus: 2500, atkBonus: 200, defBonus: 180, description: '龙象之力灌体，万夫不当。' },
  { id: 'core:body_immortal', name: '不灭', index: 6, maxPhysique: 15000, expReq: 100000, physiqueDmgReduce: 40, hpBonus: 6000, atkBonus: 450, defBonus: 400, description: '不灭真体，天地难毁。' },
];

// ── 灵根对体修的加成配置 ──
// 改这里就能调整灵根和体修的联动强度

export const CORE_SPIRIT_ROOT_BODY_BONUSES: SpiritRootBodyBonus[] = [
  {
    rootType: 'metal',
    bodyExpMultiplier: 1.3,        // 金灵根：金主锐利坚韧，体修修为 +30%
    physiqueRegenRate: 1.0,
  },
  {
    rootType: 'earth',
    bodyExpMultiplier: 1.1,
    physiqueRegenRate: 1.3,        // 土灵根：土主厚重，体魄恢复 +30%
    dmgReduceBonus: 2,             // 额外减伤 +2%
  },
  {
    rootType: 'fire',
    bodyExpMultiplier: 1.2,        // 火灵根：火锻肉身，体修修为 +20%
    physiqueRegenRate: 1.0,
  },
  {
    rootType: 'water',
    bodyExpMultiplier: 1.0,
    physiqueRegenRate: 1.2,        // 水灵根：水主生机，体魄恢复 +20%
    hpBonusRate: 0.05,             // HP 加成 +5%
  },
  {
    rootType: 'wood',
    bodyExpMultiplier: 1.0,
    physiqueRegenRate: 1.1,
    hpBonusRate: 0.15,             // 木灵根：木主生长，HP 加成 +15%
  },
];
