// ============================================================
// registry/queries.ts — 注册表查询 API
// ============================================================

import type { ItemCategory, GameEvent, EventCategory, MonsterDef, ElementType, DivineArtDef, BodyRealmDef, SpiritRootBodyBonus } from '../types';
import type { SpiritRootType } from '../spirit-root';
import type { AchievementDef } from '../achievement/types';
import {
  eventRegistry, itemDefRegistry, recipeRegistry,
  equipRegistry, smithingRecipeRegistry, breakthroughReqRegistry, tribulationRegistry,
  techniqueRegistry, deathTriggerRegistry, lifeSaverRegistry, revivalRegistry,
  monsterRegistry, divineArtRegistry, achievementRegistry,
  bodyRealmRegistry, spiritRootBodyBonusRegistry,
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

// ── 死亡系统 ──

export function getDeathTrigger(id: string) { return deathTriggerRegistry.get(id); }
export function getAllDeathTriggers() { return Array.from(deathTriggerRegistry.values()); }
export function getLifeSaver(id: string) { return lifeSaverRegistry.get(id); }
export function getAllLifeSavers() { return Array.from(lifeSaverRegistry.values()); }
export function getRevivalMethod(id: string) { return revivalRegistry.get(id); }
export function getAllRevivalMethods() { return Array.from(revivalRegistry.values()); }

// ── 妖兽 ──

export function getMonster(id: string): MonsterDef | undefined { return monsterRegistry.get(id); }
export function getAllMonsters(): MonsterDef[] { return Array.from(monsterRegistry.values()); }
export function getMonstersByRealm(realmIndex: number): MonsterDef[] {
  return Array.from(monsterRegistry.values()).filter(m => m.realmIndex === realmIndex);
}

// ── 神通 ──

export function getDivineArtDef(id: string): DivineArtDef | undefined { return divineArtRegistry.get(id); }
export function getAllDivineArtDefs(): DivineArtDef[] { return Array.from(divineArtRegistry.values()); }
export function getDivineArtsByElement(element: ElementType): DivineArtDef[] {
  return Array.from(divineArtRegistry.values()).filter(a => a.element === element);
}

// ── 成就 ──

export function getAchievement(id: string): AchievementDef | undefined { return achievementRegistry.get(id); }
export function getAllAchievementDefs(): AchievementDef[] { return Array.from(achievementRegistry.values()); }

// ── 体修境界（T0059）──

export function getBodyRealmDef(index: number): BodyRealmDef | undefined { return bodyRealmRegistry.get(index); }
export function getAllBodyRealmDefs(): BodyRealmDef[] { return Array.from(bodyRealmRegistry.values()).sort((a, b) => a.index - b.index); }

// ── 灵根体修加成（T0059）──

export function getSpiritRootBodyBonus(rootType: SpiritRootType): SpiritRootBodyBonus | undefined { return spiritRootBodyBonusRegistry.get(rootType); }
export function getAllSpiritRootBodyBonuses(): SpiritRootBodyBonus[] { return Array.from(spiritRootBodyBonusRegistry.values()); }
