// ============================================================
// procedural/monster-loader.ts — JSON 妖兽模板/变异加载器（T0072）
// ============================================================

import type { MonsterTemplate, MutationDef, ElementType, MutationType } from '../types';

interface JsonMonsterTemplate {
  id: string;
  baseName: string;
  emoji: string;
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    speed: number;
    moveSpeed: number;
    critRate: number;
    critResist: number;
    critDmgMultiplier?: number;
  };
  baseExpReward: number;
  baseGoldReward: number;
  element?: string;
  elementResists?: Record<string, number>;
  regionTags?: string[];
  minRealm?: number;
  maxRealm?: number;
  allowedMutations?: string[];
  lootChance?: number;
  description?: string;
}

interface JsonMutationDef {
  id: string;
  type: string;
  name: string;
  weight: number;
  statModifiers: Record<string, number>;
  expBonus?: number;
  goldBonus?: number;
  element?: string;
  elementResists?: Record<string, number>;
  emojiOverride?: string;
  namePrefix?: string;
  nameSuffix?: string;
  minRealm?: number;
  maxRealm?: number;
  regionTags?: string[];
  exclusive?: boolean;
  lootBonus?: number;
}

export function loadMonsterTemplatesFromJson(json: JsonMonsterTemplate[]): MonsterTemplate[] {
  return json.map(j => ({
    id: j.id,
    baseName: j.baseName,
    emoji: j.emoji,
    baseStats: { ...j.baseStats },
    baseExpReward: j.baseExpReward,
    baseGoldReward: j.baseGoldReward,
    element: j.element as ElementType | undefined,
    elementResists: j.elementResists as Partial<Record<ElementType, number>> | undefined,
    regionTags: j.regionTags,
    minRealm: j.minRealm,
    maxRealm: j.maxRealm,
    allowedMutations: j.allowedMutations,
    lootChance: j.lootChance,
    description: j.description,
  }));
}

export function loadMutationDefsFromJson(json: JsonMutationDef[]): MutationDef[] {
  return json.map(j => ({
    id: j.id,
    type: j.type as MutationType,
    name: j.name,
    weight: j.weight,
    statModifiers: j.statModifiers as MutationDef['statModifiers'],
    expBonus: j.expBonus,
    goldBonus: j.goldBonus,
    element: j.element as ElementType | undefined,
    elementResists: j.elementResists as Partial<Record<ElementType, number>> | undefined,
    emojiOverride: j.emojiOverride,
    namePrefix: j.namePrefix,
    nameSuffix: j.nameSuffix,
    minRealm: j.minRealm,
    maxRealm: j.maxRealm,
    regionTags: j.regionTags,
    exclusive: j.exclusive,
    lootBonus: j.lootBonus,
  }));
}
