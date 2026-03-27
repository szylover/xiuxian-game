// ============================================================
// registry/queries.ts — 注册表查询 API
// ============================================================

import type { ItemCategory, GameEvent, EventCategory } from '../types';
import {
  eventRegistry, itemDefRegistry, recipeRegistry,
  equipRegistry, smithingRecipeRegistry, breakthroughReqRegistry, tribulationRegistry,
  techniqueRegistry,
} from './stores';

// ── 事件 ──

export function registerEvent(event: GameEvent): void { eventRegistry.set(event.id, event); }
export function registerEvents(events: GameEvent[]): void { for (const e of events) eventRegistry.set(e.id, e); }
export function getEvent(id: string): GameEvent | undefined { return eventRegistry.get(id); }
export function getEventsByCategory(category: EventCategory): GameEvent[] {
  return Array.from(eventRegistry.values()).filter(e => e.category === category);
}

// ── 物品 ──

export function getItemDef(id: string) { return itemDefRegistry.get(id); }
export function getItemDefsByCategory(category: ItemCategory) {
  return Array.from(itemDefRegistry.values()).filter(i => i.category === category);
}
export function getAllItemDefs() { return Array.from(itemDefRegistry.values()); }

// ── 配方 ──

export function getRecipe(id: string) { return recipeRegistry.get(id); }
export function getAllRecipes() { return Array.from(recipeRegistry.values()); }

// ── 装备 ──

export function getEquipDef(id: string) { return equipRegistry.get(id); }
export function getAllEquipDefs() { return Array.from(equipRegistry.values()); }

// ── 炼器配方 ──

export function getSmithingRecipe(id: string) { return smithingRecipeRegistry.get(id); }
export function getAllSmithingRecipes() { return Array.from(smithingRecipeRegistry.values()); }

// ── 突破 + 天劫 ──

export function getBreakthroughReq(fromRealmIndex: number) { return breakthroughReqRegistry.get(fromRealmIndex); }
export function getTribulationDef(forRealmIndex: number) { return tribulationRegistry.get(forRealmIndex); }

// ── 功法 ──

export function getTechniqueDef(id: string) { return techniqueRegistry.get(id); }
export function getAllTechniqueDefs() { return Array.from(techniqueRegistry.values()); }
