import type { ItemRarity } from './common';
import type { TechniqueType } from './cultivation';

// ── 装备定义 ──

export type EquipSlot = 'weapon' | 'helmet' | 'armor' | 'boots' | 'accessory1' | 'accessory2';

export interface EquipStatBonus {
  atk?: number;
  def?: number;
  speed?: number;
  hp?: number;
  mp?: number;
  critRate?: number;
  critDmgMultiplier?: number;     // 暴击伤害倍率加成（如 +0.1 = 暴击伤害×10%）
  critResist?: number;
  moveSpeed?: number;
  // ─── T0059 体修装备加成 ───
  physique?: number;              // 装备提供的体魄上限加成
  physiqueDmgReduce?: number;     // 装备提供的减伤%
}

export interface EquipDef {
  id: string;                              // 命名空间 ID，如 core:iron_sword
  name: string;                            // 显示名称
  slot: EquipSlot;                         // 装备槽位
  rarity: ItemRarity;                      // 品质
  description: string;                     // 描述
  stats: EquipStatBonus;                   // 属性加成
  minRealm: number;                        // 最低佩戴境界
  sellPrice: number;                       // 售卖价格
  // ─── T0059 体修武器 ───
  techType?: TechniqueType[];              // 武器兼容的功法类型
  physiqueBonusRate?: number;              // 体魄值按此比例追加攻击
}
