// ============================================================
// registry/stores.ts — 全局注册表存储（所有 Map 实例集中管理）
// ============================================================

import type {
  GameEvent, ItemDef, RecipeDef, EquipDef,
  SmithingRecipeDef, BreakthroughReqDef, TribulationDef, DLCPack,
} from '../types';

export const dlcRegistry = new Map<string, DLCPack>();
export const eventRegistry = new Map<string, GameEvent>();
export const itemDefRegistry = new Map<string, ItemDef>();
export const recipeRegistry = new Map<string, RecipeDef>();
export const equipRegistry = new Map<string, EquipDef>();
export const smithingRecipeRegistry = new Map<string, SmithingRecipeDef>();
export const breakthroughReqRegistry = new Map<number, BreakthroughReqDef>();
export const tribulationRegistry = new Map<number, TribulationDef>();
export const triggeredOnce = new Set<string>();
export const cooldowns = new Map<string, number>();
