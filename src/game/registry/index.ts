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
  ElementType, DivineArtDef, DivineArtSkillEffect,
  BodyRealmDef, SpiritRootBodyBonus,
  RealmDef,
  RegionDef, MapSystemState,
  BottleneckDef, BottleneckUnlockMethod, BottleneckState,
  NpcDef, NpcDisposition, NpcRole, NpcPersonality, NpcRelation, NpcRelationLevel, NpcSystemState,
  QuestObjectiveType, QuestObjective, QuestReward, QuestStep, QuestChainCondition,
  QuestChainCategory, QuestChainDef, QuestObjectiveProgress, QuestChainProgress,
  QuestStatus, QuestSystemState, QuestTrigger,
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
  getDivineArtDef, getAllDivineArtDefs, getDivineArtsByElement,
  getAchievement, getAllAchievementDefs,
  getBodyRealmDef, getAllBodyRealmDefs,
  getSpiritRootBodyBonus, getAllSpiritRootBodyBonuses,
  getRealmDef, getAllRealmDefs, getMaxRealmIndex,
  getRegion, getAllRegions,
  getBottleneckDef, getAllBottleneckDefs, getBottlenecksForRealm, getBottlenecksForBodyRealm, getBottlenecksForTechnique,
  getNpcDef, getAllNpcDefs, getNpcsByRegionTags, getNpcsByRole, getNpcsByDisposition,
  getQuestChainDef, getAllQuestChainDefs, getQuestChainsByCategory,
} from './queries';
export {
  triggerEvent, resetRuntimeState, saveEventState, loadEventState,
} from './event-engine';
export type { EventResult, EventRuntimeState } from './event-engine';
