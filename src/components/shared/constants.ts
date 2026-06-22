// ============================================================
// shared/constants.ts — 全局共享常量
// 品质颜色、属性中文名、槽位信息等
// ============================================================

import type { ItemRarity, ItemCategory, EquipSlot } from '../../game/registry';

// ── 品质颜色映射 ──
// ⚠️ 这里的颜色值必须与 App.css :root 中的 CSS 变量保持一致：
//   common → --rarity-common: #9E9E9E
//   uncommon → --rarity-uncommon: #4CAF50
//   rare → --rarity-rare: #2196F3
//   epic → --rarity-epic: #9C27B0
//   legendary → --rarity-legendary: #FF9800
export const RARITY_COLORS: Record<ItemRarity, string> = {
  common:    '#9E9E9E',
  uncommon:  '#4CAF50',
  rare:      '#2196F3',
  epic:      '#9C27B0',
  legendary: '#FF9800',  // 橙色（与 --rarity-legendary 一致）
};

// ── 品质中文标签 ──
export const RARITY_LABELS: Record<ItemRarity, string> = {
  common:    '白',
  uncommon:  '绿',
  rare:      '蓝',
  epic:      '紫',
  legendary: '橙',
};

// ── 战斗属性中文名（re-export from texts/common）──
import { ATTR_NAMES as STAT_CN } from '../../data/texts/common';
export { STAT_CN };

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
  { key: 'scroll',     label: '秘籍', icon: '📜' },
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
  physique: '#FF6D00',  // 体魄 — 橙
} as const;

// ── 属性统计转中文字符串 ──
export function statsCN(stats: Record<string, number | undefined>): string {
  return Object.entries(stats)
    .filter(([, v]) => v)
    .map(([k, v]) => `${STAT_CN[k] || k}+${v}`)
    .join(' ');
}

// ── 灵根五行常量 (re-export from texts/common) ──
import { SPIRIT_ROOT_CN } from '../../data/texts/common';
export { SPIRIT_ROOT_CN };

// ⚠️ 这里的颜色值必须与 App.css :root 中的 CSS 变量保持一致：
//   metal → --spirit-metal: #C0C0C0
//   wood  → --spirit-wood:  #4CAF50
//   water → --spirit-water: #2196F3
//   fire  → --spirit-fire:  #F44336
//   earth → --spirit-earth: #FF9800
export const SPIRIT_ROOT_COLORS: Record<string, string> = {
  metal: '#C0C0C0',  // 银色 (--spirit-metal)
  wood:  '#4CAF50',  // 绿色 (--spirit-wood)
  water: '#2196F3',  // 蓝色 (--spirit-water)
  fire:  '#F44336',  // 红色 (--spirit-fire)
  earth: '#FF9800',  // 橙色 (--spirit-earth)
};

export const SPIRIT_ROOT_ICONS: Record<string, string> = {
  metal: '⚔️', wood: '🌿', water: '💧', fire: '🔥', earth: '🪨',
};

import { COMBO_CN } from '../../data/texts/common';
export { COMBO_CN };

import { APTITUDE_CN } from '../../data/texts/common';
export { APTITUDE_CN };

// ── NPC 关系等级常量（T0025）──

import type { NpcRelationLevel } from '../../game/types';

export const NPC_RELATION_CN: Record<NpcRelationLevel, string> = {
  hostile:      '敌对',
  cold:         '冷淡',
  stranger:     '陌生',
  acquaintance: '相识',
  friend:       '友好',
  close_friend: '至交',
  soulmate:     '知己',
};

export const NPC_RELATION_COLORS: Record<NpcRelationLevel, string> = {
  hostile:      '#F44336',
  cold:         '#9E9E9E',
  stranger:     '#FFFFFF',
  acquaintance: '#FFEB3B',
  friend:       '#4CAF50',
  close_friend: '#2196F3',
  soulmate:     '#E91E63',
};

export const NPC_RELATION_EMOJI: Record<NpcRelationLevel, string> = {
  hostile:      '💢',
  cold:         '🥶',
  stranger:     '🤍',
  acquaintance: '💛',
  friend:       '💚',
  close_friend: '💙',
  soulmate:     '❤️',
};

export const NPC_PERSONALITY_CN: Record<string, string> = {
  gentle:       '温和',
  cold:         '冷漠',
  hot_tempered: '暴躁',
  cunning:      '狡猾',
  righteous:    '正义',
  mysterious:   '神秘',
};
