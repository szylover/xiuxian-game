// ============================================================
// event-loader.ts — JSON 事件加载器
// 将纯数据 JSON 转换为 GameEvent 对象（含 effect/condition 函数）
//
// 效果值格式：
//   number        → 加减 delta（如 20 表示 +20）
//   "max"         → 设为对应上限（hp→maxHp 等）
//   "=N"          → 设为固定值 N（如 "=100"）
//   "*N"          → 乘以倍率 N（如 "*0.5" 表示减半）
//   [min, max]    → 随机 delta，取 [min, max] 之间整数
// ============================================================

import type { Player } from './player';
import type { GameEvent, EventCategory, EventTone, DLCPack } from './registry';
import type { Alignment } from './types';
import { changeKarma, getAlignment } from './karma';
import { KARMA_TEXTS } from '../data/texts';

// ── JSON 事件数据格式 ──

export interface JsonEventCondition {
  minRealm?: number;
  maxRealm?: number;
  minLuck?: number;
  maxLuck?: number;
  minComprehension?: number;
  minCharisma?: number;
  minGold?: number;
  maxMood?: number;
  minMood?: number;
  minHealth?: number;
  maxHealth?: number;
  requiredAlignment?: Alignment;
  minKarma?: number;
  maxKarma?: number;
}

export type EffectValue = number | string | [number, number];

export interface JsonEvent {
  id: string;
  category: EventCategory;
  tone: EventTone;
  name: string;
  weight: number;
  effects: Record<string, EffectValue>;
  message: string;
  condition?: JsonEventCondition | null;
  once?: boolean;
  cooldown?: number;
  regionTags?: string[];
}

// ── 条件谓词构建 ──

function buildCondition(cond?: JsonEventCondition | null): ((p: Player) => boolean) | undefined {
  if (!cond) return undefined;

  return (p: Player): boolean => {
    if (cond.minRealm !== undefined && p.realmIndex < cond.minRealm) return false;
    if (cond.maxRealm !== undefined && p.realmIndex > cond.maxRealm) return false;
    if (cond.minLuck !== undefined && p.luck < cond.minLuck) return false;
    if (cond.maxLuck !== undefined && p.luck > cond.maxLuck) return false;
    if (cond.minComprehension !== undefined && p.comprehension < cond.minComprehension) return false;
    if (cond.minCharisma !== undefined && p.charisma < cond.minCharisma) return false;
    if (cond.minGold !== undefined && p.gold < cond.minGold) return false;
    if (cond.maxMood !== undefined && p.mood > cond.maxMood) return false;
    if (cond.minMood !== undefined && p.mood < cond.minMood) return false;
    if (cond.minHealth !== undefined && p.health < cond.minHealth) return false;
    if (cond.maxHealth !== undefined && p.health > cond.maxHealth) return false;
    if (cond.requiredAlignment && getAlignment(p.karma ?? 0) !== cond.requiredAlignment) return false;
    if (cond.minKarma !== undefined && (p.karma ?? 0) < cond.minKarma) return false;
    if (cond.maxKarma !== undefined && (p.karma ?? 0) > cond.maxKarma) return false;
    return true;
  };
}

// ── 效果函数构建 ──

type PlayerNumericKey = 'hp' | 'mp' | 'stamina' | 'exp' | 'gold' | 'mood' | 'health' | 'mentalPower' | 'lifespan';

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

function resolveValue(current: number, maxValue: number | undefined, spec: EffectValue): number {
  if (typeof spec === 'number') {
    // delta
    return current + spec;
  }
  if (Array.isArray(spec)) {
    // random delta [min, max]
    return current + randInt(spec[0], spec[1]);
  }
  if (typeof spec === 'string') {
    if (spec === 'max') {
      return maxValue ?? current;
    }
    if (spec.startsWith('=')) {
      return parseFloat(spec.slice(1));
    }
    if (spec.startsWith('*')) {
      return Math.floor(current * parseFloat(spec.slice(1)));
    }
  }
  return current;
}

function buildEffect(effects: Record<string, EffectValue>): (p: Player) => Player {
  return (p: Player): Player => {
    const result = { ...p };
    for (const [field, spec] of Object.entries(effects)) {
      if (field === 'karmaChange') {
        Object.assign(result, changeKarma(result, resolveValue(0, undefined, spec), KARMA_TEXTS.reasons.eventChoice).player);
        continue;
      }
      const key = field as PlayerNumericKey;
      const current = result[key] as number;
      const maxField = CLAMP_MAX_FIELDS[key];
      const maxValue = maxField ? (result[maxField] as number) : undefined;

      let value = resolveValue(current, maxValue, spec);

      // 上限 clamp
      if (maxField && maxValue !== undefined) {
        value = Math.min(value, maxValue);
      }
      if (CLAMP_100_FIELDS.has(key)) {
        value = Math.min(value, 100);
      }

      // 下限 clamp
      if (MIN_1_FIELDS.has(key)) {
        value = Math.max(1, value);
      } else if (key !== 'lifespan') {
        value = Math.max(0, value);
      }

      (result as Record<string, unknown>)[key] = value;
    }
    return result;
  };
}

// ── 单个 JSON 事件 → GameEvent ──

function jsonToGameEvent(json: JsonEvent): GameEvent {
  return {
    id: json.id,
    category: json.category,
    tone: json.tone,
    name: json.name,
    weight: json.weight,
    effect: buildEffect(json.effects),
    message: () => json.message,
    condition: buildCondition(json.condition),
    once: json.once || false,
    cooldown: json.cooldown || undefined,
    regionTags: json.regionTags,
  };
}

// ── 批量加载 → DLCPack ──

export function loadEventsFromJson(
  json: JsonEvent[],
  packInfo: { id: string; name: string; description: string; version: string },
): DLCPack {
  const events = json.map(jsonToGameEvent);
  return {
    ...packInfo,
    events,
  };
}
