// ============================================================
// item-loader.ts — JSON 物品加载器
// 将纯数据 JSON 转换为 ItemDef 对象（含 effect 函数）
// 复用 event-loader 的效果值格式
// ============================================================

import type { Player } from './player';
import type { ItemDef, ItemCategory, ItemRarity } from './registry';
import type { EffectValue } from './event-loader';

// ── JSON 物品数据格式 ──

export interface JsonItem {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  description: string;
  stackable: boolean;
  maxStack: number;
  usable: boolean;
  effects?: Record<string, EffectValue>;
  effectMessage?: string;
  sellPrice: number;
  scrollType?: 'technique' | 'divineArt' | 'recipe' | 'smithingRecipe';
  scrollTargetId?: string;
  scrollStudyMonths?: number;
  scrollMinRealm?: number;
}

// ── 效果值解析（与 event-loader 相同逻辑）──

const CLAMP_MAX_FIELDS: Record<string, keyof Player> = {
  hp: 'maxHp',
  mp: 'maxMp',
  stamina: 'maxStamina',
  mentalPower: 'maxMentalPower',
};

const CLAMP_100_FIELDS = new Set(['mood', 'health']);
const MIN_1_FIELDS = new Set(['hp']);

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type PlayerNumericKey = 'hp' | 'mp' | 'stamina' | 'exp' | 'gold' | 'mood' | 'health' | 'mentalPower' | 'lifespan';

function resolveValue(current: number, maxValue: number | undefined, spec: EffectValue): number {
  if (typeof spec === 'number') return current + spec;
  if (Array.isArray(spec)) return current + randInt(spec[0], spec[1]);
  if (typeof spec === 'string') {
    if (spec === 'max') return maxValue ?? current;
    if (spec.startsWith('=')) return parseFloat(spec.slice(1));
    if (spec.startsWith('*')) return Math.floor(current * parseFloat(spec.slice(1)));
  }
  return current;
}

function buildEffect(effects: Record<string, EffectValue>): (p: Player) => Player {
  return (p: Player): Player => {
    const result = { ...p };
    for (const [field, spec] of Object.entries(effects)) {
      const key = field as PlayerNumericKey;
      const current = result[key] as number;
      const maxField = CLAMP_MAX_FIELDS[key];
      const maxValue = maxField ? (result[maxField] as number) : undefined;

      let value = resolveValue(current, maxValue, spec);
      if (maxField && maxValue !== undefined) value = Math.min(value, maxValue);
      if (CLAMP_100_FIELDS.has(key)) value = Math.min(value, 100);
      if (MIN_1_FIELDS.has(key)) value = Math.max(1, value);
      else if (key !== 'lifespan') value = Math.max(0, value);

      (result as Record<string, unknown>)[key] = value;
    }
    return result;
  };
}

// ── 单个 JSON → ItemDef ──

function jsonToItemDef(json: JsonItem): ItemDef {
  return {
    id: json.id,
    name: json.name,
    category: json.category,
    rarity: json.rarity,
    description: json.description,
    stackable: json.stackable,
    maxStack: json.maxStack,
    usable: json.usable,
    effect: json.effects ? buildEffect(json.effects) : undefined,
    effectMessage: json.effectMessage,
    sellPrice: json.sellPrice,
    scrollType: json.scrollType,
    scrollTargetId: json.scrollTargetId,
    scrollStudyMonths: json.scrollStudyMonths,
    scrollMinRealm: json.scrollMinRealm,
  };
}

// ── 批量加载 ──

export function loadItemsFromJson(json: JsonItem[]): ItemDef[] {
  return json.map(jsonToItemDef);
}
