// ============================================================
// game/breakthrough-loader.ts — 突破条件 DSL 编译器
//
// 声明式条件格式：
//   { "field": "tracking.killCount", "op": ">=", "value": 50 }
//   { "field": "tracking.defeatedHigherRealm", "op": "==", "value": true }
//
// 支持的 op：">=" | "<=" | "==" | "!=" | ">" | "<"
// field 支持两层路径（如 "tracking.killCount"）
// ============================================================

import type { Player } from './player';
import type { BreakthroughReqDef, BreakthroughCondition } from './types';

// ── JSON 数据格式 ──

export type ConditionOp = '>=' | '<=' | '==' | '!=' | '>' | '<';

export interface JsonBreakthroughCondition {
  id: string;
  description: string;
  field: string;
  op: string;
  value: number | boolean;
}

export interface JsonBreakthroughItemCost {
  itemId: string;
  count: number;
}

export interface JsonBreakthroughReq {
  id: string;
  fromRealmIndex: number;
  toRealmIndex: number;
  itemCosts: JsonBreakthroughItemCost[];
  conditions: JsonBreakthroughCondition[];
  requiresTribulation: boolean;
  baseSuccessRate?: number;
  description?: string;
}

export interface JsonTribulationWave {
  name: string;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  specialEffect?: {
    type: string;
    value: number;
    description: string;
  };
}

export interface JsonTribulationRewards {
  bonusExp: number;
  items: { itemId: string; count: number }[];
}

export interface JsonTribulation {
  id: string;
  name: string;
  description: string;
  forRealmIndex: number;
  waves: JsonTribulationWave[];
  rewards: JsonTribulationRewards;
  failureType: string;
  failureDescription: string;
}

export interface JsonBreakthroughData {
  breakthroughReqs: JsonBreakthroughReq[];
  tribulations: JsonTribulation[];
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

function compileCondition(json: JsonBreakthroughCondition): BreakthroughCondition {
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

export function loadBreakthroughReqsFromJson(json: JsonBreakthroughReq[]): BreakthroughReqDef[] {
  return json.map((raw) => ({
    id: raw.id,
    fromRealmIndex: raw.fromRealmIndex,
    toRealmIndex: raw.toRealmIndex,
    itemCosts: raw.itemCosts,
    conditions: raw.conditions.map(compileCondition),
    requiresTribulation: raw.requiresTribulation,
    baseSuccessRate: raw.baseSuccessRate,
    description: raw.description,
  }));
}
