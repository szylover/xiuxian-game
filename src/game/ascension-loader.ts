// ============================================================
// game/ascension-loader.ts — JSON 飞升定义 Loader（T0033）
//
// 将 JSON 纯数据中的声明式条件编译为谓词函数。
// 模式同 breakthrough-loader.ts。
// ============================================================

import type { Player } from './player';
import type { AscensionDef, AscensionCondition } from './types';

// ── JSON 数据格式 ──

export type ConditionOp = '>=' | '<=' | '==' | '!=' | '>' | '<';

export interface JsonAscensionCondition {
  id: string;
  description: string;
  field: string;
  op: string;
  value: number | boolean;
}

export interface JsonAscensionItemCost {
  itemId: string;
  count: number;
}

export interface JsonAscensionDef {
  id: string;
  name: string;
  description: string;
  fromTier: 'mortal' | 'immortal' | 'primordial';
  toTier: 'mortal' | 'immortal' | 'primordial';
  fromRealmIndex: number;
  toRealmIndex: number;
  minExp: number;
  itemCosts: JsonAscensionItemCost[];
  conditions: JsonAscensionCondition[];
  tribulationId?: string;
  rewards: {
    bonusExp: number;
    lifespanBonus: number;
    items: { itemId: string; count: number }[];
  };
  statReset?: {
    hpMultiplier?: number;
    mpMultiplier?: number;
    expReset?: boolean;
  };
}

// ── 条件谓词编译 ──

function getFieldValue(player: Player, field: string): unknown {
  const parts = field.split('.');
  let value: unknown = player;
  for (const part of parts) {
    if (value == null || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

function compileCondition(json: JsonAscensionCondition): AscensionCondition {
  const { field, op, value } = json;
  const check = (p: Player): boolean => {
    const actual = getFieldValue(p, field);
    if (actual === undefined) return false;
    switch (op) {
      case '>=':
      case '<=':
      case '>':
      case '<':
        if (typeof actual !== 'number' || typeof value !== 'number') return false;
        if (op === '>=') return actual >= value;
        if (op === '<=') return actual <= value;
        if (op === '>')  return actual > value;
        return actual < value;
      case '==': return actual === value;
      case '!=': return actual !== value;
      default:   return false;
    }
  };
  return { id: json.id, description: json.description, check };
}

// ── 批量加载 ──

export function loadAscensionDefsFromJson(json: JsonAscensionDef[]): AscensionDef[] {
  return json.map((raw) => ({
    id: raw.id,
    name: raw.name,
    description: raw.description,
    fromTier: raw.fromTier,
    toTier: raw.toTier,
    fromRealmIndex: raw.fromRealmIndex,
    toRealmIndex: raw.toRealmIndex,
    minExp: raw.minExp,
    itemCosts: raw.itemCosts,
    conditions: raw.conditions.map(compileCondition),
    tribulationId: raw.tribulationId,
    rewards: raw.rewards,
    statReset: raw.statReset,
  }));
}
