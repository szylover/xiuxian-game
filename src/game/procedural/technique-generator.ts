// ============================================================
// procedural/technique-generator.ts — 程序化功法词条生成引擎（T0073）
//
// 为功法实例附加随机被动词条。品质越高，词条越多、数值越高。
// 同一功法的不同实例可拥有不同词条组合。
// ============================================================

import type { Player } from '../player';
import type {
  TechniqueTraitDef, TechniqueInstance, TechniqueTraitSlot,
  TechniqueRarity, TechniqueType, TechniqueStatBonus,
  TechniqueQualityConfig, TechniqueTraitTier,
  ProceduralTechniqueState,
} from '../types';
import {
  getAllTechniqueTraitDefs,
  registerTechniqueInstance,
  getTechniqueInstance,
} from '../registry';
import { createRNG, hashSeed, weightedPick, randomMasterSeed } from './seed';

// ── 品质配置表 ──

export const TECHNIQUE_QUALITY_CONFIG: TechniqueQualityConfig[] = [
  { rarity: 'common',    displayName: '凡品', traitSlots: { minor: 1, major: 0, legendary: 0 }, valueMultiplier: 1.0, dropWeight: 40 },
  { rarity: 'uncommon',  displayName: '灵品', traitSlots: { minor: 2, major: 1, legendary: 0 }, valueMultiplier: 1.3, dropWeight: 30 },
  { rarity: 'rare',      displayName: '地品', traitSlots: { minor: 2, major: 1, legendary: 1 }, valueMultiplier: 1.8, dropWeight: 18 },
  { rarity: 'epic',      displayName: '天品', traitSlots: { minor: 3, major: 2, legendary: 1 }, valueMultiplier: 2.5, dropWeight: 9  },
  { rarity: 'legendary', displayName: '仙品', traitSlots: { minor: 3, major: 2, legendary: 2 }, valueMultiplier: 4.0, dropWeight: 3  },
];

const QUALITY_INDEX: Record<TechniqueRarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
};

const LUCK_SCALING = [0, 0.005, 0.01, 0.015, 0.02];

export function getQualityConfig(rarity: TechniqueRarity): TechniqueQualityConfig {
  return TECHNIQUE_QUALITY_CONFIG[QUALITY_INDEX[rarity]];
}

// ── 品质抽取（功法专用，基于 TechniqueRarity）──

function rollTechniqueQuality(rng: () => number, luck: number = 0): TechniqueQualityConfig {
  const adjusted = TECHNIQUE_QUALITY_CONFIG.map((cfg, i) => ({
    ...cfg,
    weight: cfg.dropWeight * (1 + luck * LUCK_SCALING[i]),
  }));
  const total = adjusted.reduce((s, c) => s + c.weight, 0);
  let roll = rng() * total;
  for (const cfg of adjusted) {
    roll -= cfg.weight;
    if (roll <= 0) return cfg;
  }
  return TECHNIQUE_QUALITY_CONFIG[0];
}

// ── 初始化 / 获取程序化功法状态 ──

export function createProceduralTechniqueState(): ProceduralTechniqueState {
  return {
    masterSeed: randomMasterSeed(),
    techniqueCounter: 0,
    instances: [],
  };
}

export function getProceduralTechniqueState(player: Player): ProceduralTechniqueState {
  return (player.systems?.proceduralTechniqueState as ProceduralTechniqueState) ?? createProceduralTechniqueState();
}

function saveProceduralTechniqueState(player: Player, state: ProceduralTechniqueState): Player {
  return {
    ...player,
    systems: { ...player.systems, proceduralTechniqueState: state },
  };
}

// ── 辅助：筛选可用词条 ──

function filterTraits(
  allTraits: TechniqueTraitDef[],
  tier: TechniqueTraitTier,
  techniqueType: TechniqueType,
  realmIndex: number,
  selectedIds: Set<string>,
): TechniqueTraitDef[] {
  return allTraits.filter(t => {
    if (t.tier !== tier) return false;
    if (selectedIds.has(t.id)) return false;
    if (t.minRealm !== undefined && realmIndex < t.minRealm) return false;
    if (t.maxRealm !== undefined && realmIndex > t.maxRealm) return false;
    if (t.typeRestriction?.length && !t.typeRestriction.includes(techniqueType)) return false;
    if (t.excludeTraits?.some(ex => selectedIds.has(ex))) return false;
    return true;
  });
}

// ── 核心：生成功法词条实例 ──

export interface GenerateTechniqueOptions {
  forcedQuality?: TechniqueRarity;
  seed?: number;
}

export function generateTechniqueInstance(
  player: Player,
  baseTechniqueId: string,
  techniqueType: TechniqueType,
  options: GenerateTechniqueOptions = {},
): { player: Player; instance: TechniqueInstance } {
  const state = getProceduralTechniqueState(player);
  const subSeed = options.seed ?? hashSeed(state.masterSeed, state.techniqueCounter);
  const rng = createRNG(subSeed);

  // 1. 确定品质
  const qualityCfg = options.forcedQuality
    ? getQualityConfig(options.forcedQuality)
    : rollTechniqueQuality(rng, player.luck);

  // 2. 抽取词条
  const allTraits = getAllTechniqueTraitDefs();
  const selectedIds = new Set<string>();
  const traits: TechniqueTraitSlot[] = [];

  const tiers: TechniqueTraitTier[] = ['minor', 'major', 'legendary'];
  for (const tierName of tiers) {
    const count = qualityCfg.traitSlots[tierName];
    for (let i = 0; i < count; i++) {
      const pool = filterTraits(allTraits, tierName, techniqueType, player.realmIndex, selectedIds);
      if (pool.length === 0) break;
      const picked = weightedPick(pool, rng);
      selectedIds.add(picked.id);

      // 3. 计算数值：baseValue × valueMultiplier × qualityScaling × jitter(0.8, 1.2)
      const jitter = 0.8 + rng() * 0.4;
      const rawValue = picked.baseValue * qualityCfg.valueMultiplier * picked.qualityScaling * jitter;
      const finalValue = picked.stat === 'critDmgMultiplier'
        ? +rawValue.toFixed(2)
        : Math.floor(rawValue);

      traits.push({
        traitId: picked.id,
        tier: tierName,
        finalValue,
        stat: picked.stat,
      });
    }
  }

  // 4. 创建实例
  const instance: TechniqueInstance = {
    instanceId: `proc-tech:${subSeed.toString(16)}`,
    baseTechniqueId,
    qualityOverride: qualityCfg.rarity,
    traits,
    seed: subSeed,
  };

  // 5. 注册到查询表
  registerTechniqueInstance(instance);

  // 6. 更新 player 状态
  const newState: ProceduralTechniqueState = {
    ...state,
    techniqueCounter: state.techniqueCounter + 1,
    instances: [...state.instances, instance],
  };
  const newPlayer = saveProceduralTechniqueState(player, newState);

  return { player: newPlayer, instance };
}

// ── 获取功法实例的词条属性加成 ──

export function getTraitBonus(instanceId: string | undefined): TechniqueStatBonus {
  if (!instanceId) return {};
  const instance = getTechniqueInstance(instanceId);
  if (!instance) return {};

  const bonus: TechniqueStatBonus = {};
  for (const slot of instance.traits) {
    if (slot.stat === 'critDmgMultiplier') {
      bonus.critDmgMultiplier = +((bonus.critDmgMultiplier ?? 0) + slot.finalValue).toFixed(2);
    } else {
      (bonus[slot.stat] as number) = ((bonus[slot.stat] as number) ?? 0) + slot.finalValue;
    }
  }
  return bonus;
}

// ── 读档恢复：将存档中的所有功法实例重新注册到查询表 ──

export function restoreTechniqueInstances(player: Player): void {
  const state = getProceduralTechniqueState(player);
  for (const inst of state.instances) {
    registerTechniqueInstance(inst);
  }
}
