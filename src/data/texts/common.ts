// ============================================================
// data/texts/common.ts — 通用中文文案映射（T0065 Phase 1）
// 集中管理所有常见的中文名称映射，避免散落在各组件中
// ============================================================

// ── 战斗属性中文名 ──
export const ATTR_NAMES: Record<string, string> = {
  atk: '攻击', def: '防御', speed: '速度', hp: '体力', mp: '灵力',
  critRate: '暴击', critResist: '护心', moveSpeed: '移速',
};

// ── 品质中文名 ──
export const QUALITY_NAMES: Record<string, string> = {
  common: '白', uncommon: '绿', rare: '蓝', epic: '紫', legendary: '橙',
};

// ── 灵根五行中文名 ──
export const SPIRIT_ROOT_NAMES: Record<string, string> = {
  metal: '金', wood: '木', water: '水', fire: '火', earth: '土',
};

// ── 元素中文名 ──
export const ELEMENT_NAMES: Record<string, string> = {
  fire: '火', water: '水', thunder: '雷', wind: '风', earth: '土', wood: '木', metal: '金',
};

// ── 境界名数组（按 realmIndex 索引）──
export const REALM_NAMES: string[] = [
  '凡人', '炼气', '筑基', '金丹', '元婴', '化神', '渡劫', '大乘',
];

// ── 装备槽位中文名 ──
export const SLOT_NAMES: Record<string, string> = {
  weapon: '武器', helmet: '头盔', armor: '衣甲',
  boots: '靴子', accessory1: '饰品一', accessory2: '饰品二',
};

// ── 功法类型中文名 ──
export const TECHNIQUE_TYPE_NAMES: Record<string, string> = {
  sword: '剑法', blade: '刀法', fist: '拳法',
  palm: '掌法', finger: '指法', spear: '枪法',
};

// ── 资质中文名 ──
export const APTITUDE_NAMES: Record<string, string> = {
  // 制作资质
  alchemy: '炼丹', smithing: '炼器', fengshui: '风水', mining: '采矿',
  // 武器功法资质（与 TECHNIQUE_TYPE_NAMES 保持一致）
  ...TECHNIQUE_TYPE_NAMES,
  // 元素资质
  fire: '火系', water: '水系', thunder: '雷系', wind: '风系', earth: '土系', wood: '木系',
};
