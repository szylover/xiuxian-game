// ============================================================
// registry/index.ts — 全局注册表 barrel re-export
// 所有外部模块通过 import from '../game/registry' 访问
// ============================================================

export type {
  ItemCategory, ItemRarity, ItemDef,
  RecipeQuality, EquipSlot, EquipStatBonus, EquipDef,
  RecipeDef, SmithingRecipeDef,
  BreakthroughItemCost, BreakthroughCondition, BreakthroughReqDef,
  TribulationWave, TribulationDef,
  TechniqueType, TechniqueRarity, TechniqueStatBonus, TechniqueDef, PassiveEffect,
  EventCategory, EventTone, GameEvent,
  DLCPack,
  DeathSeverity, DeathTriggerDef, DeathPenaltyDef, LifeSaverDef, RevivalMethodDef, DeathSystemState,
  MonsterDef,
} from '../types';
export type {
  AchievementCategory, AchievementDef, AchievementBonusStats,
  AchievementRecalcBonus, AchievementOnceBonus, AchievementSystemState,
} from '../achievement/types';

export { registerDLC, unregisterDLC, getDLC, getAllDLCs } from './dlc';
export {
  registerEvent, registerEvents, getEvent, getEventsByCategory,
  getItemDef, getItemDefsByCategory, getAllItemDefs,
  getRecipe, getAllRecipes,
  getEquipDef, getAllEquipDefs,
  getSmithingRecipe, getAllSmithingRecipes,
  getBreakthroughReq, getTribulationDef,
  getTechniqueDef, getAllTechniqueDefs,
  getDeathTrigger, getAllDeathTriggers,
  getLifeSaver, getAllLifeSavers,
  getRevivalMethod, getAllRevivalMethods,
  getMonster, getAllMonsters, getMonstersByRealm,
  getAchievement, getAllAchievementDefs,
} from './queries';
export {
  triggerEvent, resetRuntimeState, saveEventState, loadEventState,
} from './event-engine';
export type { EventResult, EventRuntimeState } from './event-engine';
