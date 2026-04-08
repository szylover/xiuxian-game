// ============================================================
// registry/stores.ts — 全局注册表存储（所有 Map 实例集中管理）
// ============================================================

import type {
  GameEvent, ItemDef, RecipeDef, EquipDef,
  SmithingRecipeDef, BreakthroughReqDef, TribulationDef, DLCPack, TechniqueDef,
  DeathTriggerDef, LifeSaverDef, RevivalMethodDef, MonsterDef, DivineArtDef,
  BodyRealmDef, SpiritRootBodyBonus, RealmDef, RegionDef, BottleneckDef,
  NpcDef, QuestChainDef, DialogueChainDef, IdleChatPool,
  EventTemplate, VariablePool,
  EquipBaseTemplate, AffixDef, GeneratedEquipInstance,
  MonsterTemplate, MutationDef,
  TechniqueTraitDef, TechniqueInstance,
  AscensionDef,
} from '../types';
import type { AchievementDef } from '../achievement/types';

export const dlcRegistry = new Map<string, DLCPack>();
export const eventRegistry = new Map<string, GameEvent>();
export const itemDefRegistry = new Map<string, ItemDef>();
export const recipeRegistry = new Map<string, RecipeDef>();
export const equipRegistry = new Map<string, EquipDef>();
export const smithingRecipeRegistry = new Map<string, SmithingRecipeDef>();
export const breakthroughReqRegistry = new Map<number, BreakthroughReqDef>();
export const tribulationRegistry = new Map<number, TribulationDef>();
export const techniqueRegistry = new Map<string, TechniqueDef>();
export const deathTriggerRegistry = new Map<string, DeathTriggerDef>();
export const lifeSaverRegistry = new Map<string, LifeSaverDef>();
export const revivalRegistry = new Map<string, RevivalMethodDef>();
export const monsterRegistry = new Map<string, MonsterDef>();
export const divineArtRegistry = new Map<string, DivineArtDef>();
export const achievementRegistry = new Map<string, AchievementDef>();
export const bodyRealmRegistry = new Map<number, BodyRealmDef>();
export const spiritRootBodyBonusRegistry = new Map<string, SpiritRootBodyBonus>();
export const realmRegistry = new Map<number, RealmDef>();
export const regionRegistry = new Map<string, RegionDef>();
export const bottleneckRegistry = new Map<string, BottleneckDef>();
export const npcRegistry = new Map<string, NpcDef>();
export const questChainRegistry = new Map<string, QuestChainDef>();
export const dialogueRegistry = new Map<string, DialogueChainDef>();
export const idleChatRegistry: IdleChatPool = {};
export const triggeredOnce = new Set<string>();
export const cooldowns = new Map<string, number>();
export const eventTemplateRegistry = new Map<string, EventTemplate>();
export const variablePoolRegistry = new Map<string, VariablePool>();
export const equipTemplateRegistry = new Map<string, EquipBaseTemplate>();
export const affixDefRegistry = new Map<string, AffixDef>();
export const generatedEquipRegistry = new Map<string, GeneratedEquipInstance>();
export const monsterTemplateRegistry = new Map<string, MonsterTemplate>();
export const mutationDefRegistry = new Map<string, MutationDef>();
export const techniqueTraitRegistry = new Map<string, TechniqueTraitDef>();
export const techniqueInstanceRegistry = new Map<string, TechniqueInstance>();
export const ascensionRegistry = new Map<string, AscensionDef>();

/** 清空所有注册表（切换 DLC 前调用） */
export function clearAllRegistries(): void {
  dlcRegistry.clear();
  eventRegistry.clear();
  itemDefRegistry.clear();
  recipeRegistry.clear();
  equipRegistry.clear();
  smithingRecipeRegistry.clear();
  breakthroughReqRegistry.clear();
  tribulationRegistry.clear();
  techniqueRegistry.clear();
  deathTriggerRegistry.clear();
  lifeSaverRegistry.clear();
  revivalRegistry.clear();
  monsterRegistry.clear();
  divineArtRegistry.clear();
  achievementRegistry.clear();
  bodyRealmRegistry.clear();
  spiritRootBodyBonusRegistry.clear();
  realmRegistry.clear();
  regionRegistry.clear();
  bottleneckRegistry.clear();
  npcRegistry.clear();
  questChainRegistry.clear();
  dialogueRegistry.clear();
  // idleChatRegistry is a plain object — clear all keys
  for (const key of Object.keys(idleChatRegistry)) {
    delete idleChatRegistry[key];
  }
  triggeredOnce.clear();
  cooldowns.clear();
  eventTemplateRegistry.clear();
  variablePoolRegistry.clear();
  equipTemplateRegistry.clear();
  affixDefRegistry.clear();
  generatedEquipRegistry.clear();
  monsterTemplateRegistry.clear();
  mutationDefRegistry.clear();
  techniqueTraitRegistry.clear();
  techniqueInstanceRegistry.clear();
  ascensionRegistry.clear();
}
