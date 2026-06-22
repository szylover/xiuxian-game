// ── 元素类型 ──

export type ElementType = 'fire' | 'water' | 'thunder' | 'wind' | 'earth' | 'wood' | 'metal';

/** 元素克制表：攻击元素 → 可克制的防御元素列表（伤害 ×1.3） */
export const ELEMENT_COUNTER_TABLE: Record<ElementType, ElementType[]> = {
  water:   ['fire'],     // 水克火
  fire:    ['wood'],     // 火克木
  wood:    ['earth'],    // 木克土
  earth:   ['water'],    // 土克水
  thunder: ['water'],    // 雷克水
  wind:    ['fire'],     // 风克火（辅助克制）
  metal:   ['wood'],     // 金克木（对应五行相克，与 T0056 灵根系统对齐）
};

export const ELEMENT_COUNTER_MULTIPLIER = 1.3;

// ── 物品/品质枚举 ──

export type ItemCategory = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'technique' | 'misc' | 'scroll';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// ── 炼丹品质 ──

export type RecipeQuality = 'normal' | 'good' | 'excellent';
