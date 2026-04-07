// ============================================================
// procedural/index.ts — barrel re-export
// ============================================================

export { createRNG, hashSeed, weightedPick, randomMasterSeed } from './seed';
export { interpolate } from './interpolate';
export {
  generateProceduralEvent,
  triggerProceduralEvent,
  createProceduralState,
  getProceduralState,
  resetProceduralSeed,
  getProceduralStats,
} from './event-generator';
export type { ProceduralEventState } from '../types';
export { rollRarity, getQualityTier, QUALITY_TIERS, rollRarityForced } from './rarity';
export type { ProceduralEquipQuality, QualityTier } from './rarity';
export {
  generateEquip,
  createProceduralItemState,
  getProceduralItemState,
  restoreGeneratedEquips,
  clearProceduralEquips,
} from './equip-generator';
export type { GenerateEquipOptions } from './equip-generator';
export {
  generateMonsterVariant,
  createProceduralMonsterState,
  getProceduralMonsterState,
} from './monster-generator';
export type { GenerateMonsterOptions } from './monster-generator';
export { loadMonsterTemplatesFromJson, loadMutationDefsFromJson } from './monster-loader';
export {
  generateTechniqueInstance,
  getTraitBonus,
  createProceduralTechniqueState,
  getProceduralTechniqueState,
  restoreTechniqueInstances,
  TECHNIQUE_QUALITY_CONFIG,
  getQualityConfig,
} from './technique-generator';
export type { GenerateTechniqueOptions } from './technique-generator';
