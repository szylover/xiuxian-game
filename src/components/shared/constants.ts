// ============================================================
// shared/constants.ts — 全局共享常量
// 品质颜色、属性中文名、槽位信息等
// ============================================================

import type { ItemRarity, ItemCategory, EquipSlot } from '../../game/registry';

// ── 品质颜色映射 ──
export const RARITY_COLORS: Record<ItemRarity, string> = {
  common:    '#9E9E9E',
  uncommon:  '#4CAF50',
  rare:      '#2196F3',
  epic:      '#9C27B0',
  legendary: '#FFD700',
};

// ── 品质中文标签 ──
export const RARITY_LABELS: Record<ItemRarity, string> = {
  common:    '白',
  uncommon:  '绿',
  rare:      '蓝',
  epic:      '紫',
  legendary: '橙',
};

// ── 战斗属性中文名 ──
export const STAT_CN: Record<string, string> = {
  atk: '攻击', def: '防御', speed: '速度', hp: '体力', mp: '灵力',
  critRate: '暴击', critResist: '护心', moveSpeed: '移速',
};

// ── 装备槽位图标 ──
export const SLOT_ICONS: Record<EquipSlot, string> = {
  weapon:     '🗡️',
  helmet:     '⛑️',
  armor:      '🛡️',
  boots:      '👢',
  accessory1: '💎',
  accessory2: '💍',
};

// ── 背包分类标签 ──
export const CATEGORY_TABS: { key: 'all' | ItemCategory; label: string; icon: string }[] = [
  { key: 'all',        label: '全部', icon: '📦' },
  { key: 'weapon',     label: '武器', icon: '🗡️' },
  { key: 'armor',      label: '防具', icon: '🛡️' },
  { key: 'accessory',  label: '饰品', icon: '💎' },
  { key: 'consumable', label: '丹药', icon: '💊' },
  { key: 'material',   label: '材料', icon: '🪨' },
  { key: 'technique',  label: '功法', icon: '📖' },
  { key: 'misc',       label: '杂物', icon: '📜' },
];

// ── 属性颜色映射（体力/灵力/精力等统一颜色） ──
export const STAT_COLORS = {
  hp:       '#F44336',  // 体力 — 红
  mp:       '#2196F3',  // 灵力 — 蓝
  stamina:  '#FFC107',  // 精力 — 黄
  mental:   '#9C27B0',  // 念力 — 紫
  lifespan: '#FF9800',  // 寿命 — 橙
  mood:     '#E91E63',  // 心情 — 粉
  health:   '#4CAF50',  // 健康 — 绿
  luck:     '#4CAF50',  // 幸运 — 绿
  comprehension: '#2196F3', // 悟性 — 蓝
  charisma: '#FF9800',  // 魅力 — 橙
  exp:      '#00BCD4',  // 修为 — 青
} as const;

// ── 属性统计转中文字符串 ──
export function statsCN(stats: Record<string, number | undefined>): string {
  return Object.entries(stats)
    .filter(([, v]) => v)
    .map(([k, v]) => `${STAT_CN[k] || k}+${v}`)
    .join(' ');
}

// ── 灵根五行常量 (T0056) ──
export const SPIRIT_ROOT_CN: Record<string, string> = {
  metal: '金', wood: '木', water: '水', fire: '火', earth: '土',
};

export const SPIRIT_ROOT_COLORS: Record<string, string> = {
  metal: '#C0C0C0',  // 银色
  wood:  '#4CAF50',  // 绿色
  water: '#2196F3',  // 蓝色
  fire:  '#F44336',  // 红色
  earth: '#FF9800',  // 橙色
};

export const SPIRIT_ROOT_ICONS: Record<string, string> = {
  metal: '⚔️', wood: '🌿', water: '💧', fire: '🔥', earth: '🪨',
};

export const COMBO_CN: Record<string, string> = {
  none: '无灵根', single: '单灵根', dual: '双灵根',
  triple: '三灵根', quad: '四灵根', penta: '五灵根',
};

// ── 资质中文名 ──
export const APTITUDE_CN: Record<string, string> = {
  alchemy: '炼丹', smithing: '炼器', fengshui: '风水', mining: '采矿',
  blade: '刀法', spear: '枪法', sword: '剑法', fist: '拳法', palm: '掌法', finger: '指法',
  fire: '火系', water: '水系', thunder: '雷系', wind: '风系', earth: '土系', wood: '木系',
};
