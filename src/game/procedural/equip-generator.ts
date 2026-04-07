// ============================================================
// procedural/equip-generator.ts — 程序化装备生成引擎（T0071）
//
// 根据 player 状态 + 可选 seed，从注册表中的 EquipBaseTemplate
// + AffixDef 组合生成随机装备实例。
// ============================================================

import type { Player } from '../player';
import type {
  EquipBaseTemplate, AffixDef, EquipStatBonus, EquipSlot,
  GeneratedEquipInstance, ProceduralItemState, ProceduralEquipQuality,
} from '../types';
import {
  getAllEquipTemplates, getAllAffixDefs, getEquipTemplate,
  registerGeneratedEquip, getAffixDef, removeGeneratedEquip as removeFromRegistry,
} from '../registry';
import { createRNG, hashSeed, weightedPick, randomMasterSeed } from './seed';
import { rollRarity, getQualityTier, type QualityTier } from './rarity';

// ── 初始化 / 获取程序化物品状态 ──

export function createProceduralItemState(): ProceduralItemState {
  return {
    masterSeed: randomMasterSeed(),
    equipCounter: 0,
    generatedEquips: [],
  };
}

export function getProceduralItemState(player: Player): ProceduralItemState {
  return (player.systems?.proceduralItemState as ProceduralItemState) ?? createProceduralItemState();
}

function saveProceduralItemState(player: Player, state: ProceduralItemState): Player {
  return {
    ...player,
    systems: { ...player.systems, proceduralItemState: state },
  };
}

// ── 辅助：合并属性 ──

function mergeStats(a: EquipStatBonus, b: EquipStatBonus): EquipStatBonus {
  const result: EquipStatBonus = { ...a };
  for (const key of Object.keys(b) as (keyof EquipStatBonus)[]) {
    const bVal = b[key];
    if (bVal !== undefined) {
      result[key] = ((result[key] ?? 0) as number) + (bVal as number);
    }
  }
  return result;
}

function scaleStats(stats: EquipStatBonus, multiplier: number): EquipStatBonus {
  const result: EquipStatBonus = {};
  for (const key of Object.keys(stats) as (keyof EquipStatBonus)[]) {
    const val = stats[key];
    if (val !== undefined) {
      result[key] = Math.floor((val as number) * multiplier) as never;
    }
  }
  return result;
}

// ── 辅助：筛选可用模板 ──

function filterTemplates(
  templates: EquipBaseTemplate[],
  realmIndex: number,
  slotFilter?: EquipSlot,
): EquipBaseTemplate[] {
  return templates.filter(t => {
    if (t.minRealm > realmIndex) return false;
    if (slotFilter && t.slot !== slotFilter) return false;
    return true;
  });
}

// ── 辅助：筛选可用词缀 ──

function filterAffixes(
  affixes: AffixDef[],
  position: 'prefix' | 'suffix',
  slot: EquipSlot,
  realmIndex: number,
  selectedIds: Set<string>,
  template: EquipBaseTemplate,
): AffixDef[] {
  const allowed = position === 'prefix' ? template.allowedPrefixes : template.allowedSuffixes;
  return affixes.filter(a => {
    if (a.position !== position) return false;
    if (selectedIds.has(a.id)) return false;
    if (a.minRealm !== undefined && realmIndex < a.minRealm) return false;
    if (a.maxRealm !== undefined && realmIndex > a.maxRealm) return false;
    if (a.slotRestriction?.length && !a.slotRestriction.includes(slot)) return false;
    if (a.excludeAffixes?.some(ex => selectedIds.has(ex))) return false;
    if (allowed?.length && !allowed.includes(a.id)) return false;
    return true;
  });
}

// ── 组装名称 ──

function buildName(
  template: EquipBaseTemplate,
  prefixes: AffixDef[],
  suffixes: AffixDef[],
  tier: QualityTier,
): string {
  const parts: string[] = [];
  for (const p of prefixes) parts.push(p.name);
  parts.push(template.baseName);
  for (const s of suffixes) parts.push(s.name);
  const nameBody = parts.join('·');
  if (tier.quality === 'mortal') return nameBody;
  return `[${tier.displayName}] ${nameBody}`;
}

// ── 组装描述 ──

function buildDescription(
  template: EquipBaseTemplate,
  prefixes: AffixDef[],
  suffixes: AffixDef[],
  tier: QualityTier,
): string {
  const prefixDesc = prefixes.map(p => p.description).join('，') || '普通';
  const suffixDesc = suffixes.map(s => s.description).join('，') || '无特殊附魔';
  return template.descriptionPattern
    .replace('{prefix_desc}', prefixDesc)
    .replace('{quality_adj}', tier.displayName)
    .replace('{baseName}', template.baseName)
    .replace('{suffix_desc}', suffixDesc);
}

// ── 核心生成函数 ──

export interface GenerateEquipOptions {
  slotFilter?: EquipSlot;
  forcedQuality?: ProceduralEquipQuality;
  seed?: number;
}

export function generateEquip(
  player: Player,
  options: GenerateEquipOptions = {},
): { player: Player; instance: GeneratedEquipInstance } | null {
  const state = getProceduralItemState(player);
  const subSeed = options.seed ?? hashSeed(state.masterSeed, state.equipCounter);
  const rng = createRNG(subSeed);

  // 1. 确定品质
  const tier = options.forcedQuality
    ? getQualityTier(options.forcedQuality)
    : rollRarity(rng, player.luck);

  // 2. 选基础模板
  const allTemplates = getAllEquipTemplates();
  const eligible = filterTemplates(allTemplates, player.realmIndex, options.slotFilter);
  if (eligible.length === 0) return null;

  const template = eligible[Math.floor(rng() * eligible.length)];

  // 3. 抽词缀
  const allAffixes = getAllAffixDefs();
  const selectedIds = new Set<string>();
  const prefixes: AffixDef[] = [];
  const suffixes: AffixDef[] = [];

  // 前缀
  for (let i = 0; i < tier.affixSlots.prefix; i++) {
    const pool = filterAffixes(allAffixes, 'prefix', template.slot, player.realmIndex, selectedIds, template);
    if (pool.length === 0) break;
    const picked = weightedPick(pool, rng);
    prefixes.push(picked);
    selectedIds.add(picked.id);
  }

  // 后缀
  for (let i = 0; i < tier.affixSlots.suffix; i++) {
    const pool = filterAffixes(allAffixes, 'suffix', template.slot, player.realmIndex, selectedIds, template);
    if (pool.length === 0) break;
    const picked = weightedPick(pool, rng);
    suffixes.push(picked);
    selectedIds.add(picked.id);
  }

  // 4. 计算属性
  let finalStats = scaleStats(template.baseStats, tier.statMultiplier);
  for (const affix of [...prefixes, ...suffixes]) {
    finalStats = mergeStats(finalStats, affix.statBonus);
  }

  const affixCount = prefixes.length + suffixes.length;
  const finalSellPrice = Math.floor(
    template.baseSellPrice * tier.priceMultiplier * (1 + affixCount * 0.3),
  );

  // 5. 组装名称和描述
  const finalName = buildName(template, prefixes, suffixes, tier);
  const description = buildDescription(template, prefixes, suffixes, tier);

  // 6. 创建实例
  const instance: GeneratedEquipInstance = {
    instanceId: `proc-equip:${subSeed.toString(16)}`,
    baseTemplateId: template.id,
    quality: tier.quality,
    prefixIds: prefixes.map(p => p.id),
    suffixIds: suffixes.map(s => s.id),
    seed: subSeed,
    finalName,
    finalStats,
    finalSellPrice,
    description,
  };

  // 7. 注册到全局查询表（让 getEquipDef 能找到它）
  registerGeneratedEquip(instance);

  // 8. 更新 player 中的程序化物品状态
  const newState: ProceduralItemState = {
    ...state,
    equipCounter: state.equipCounter + 1,
    generatedEquips: [...state.generatedEquips, instance],
  };
  const newPlayer = saveProceduralItemState(player, newState);

  return { player: newPlayer, instance };
}

// ── 读档恢复：将存档中的所有生成装备实例重新注册到查询表 ──

export function restoreGeneratedEquips(player: Player): void {
  const state = getProceduralItemState(player);
  for (const inst of state.generatedEquips) {
    registerGeneratedEquip(inst);
  }
}

// ── 清空所有程序化装备（调试用）──

export function clearProceduralEquips(player: Player): Player {
  const state = getProceduralItemState(player);
  for (const inst of state.generatedEquips) {
    removeFromRegistry(inst.instanceId);
  }
  return saveProceduralItemState(player, {
    ...state,
    generatedEquips: [],
    equipCounter: 0,
  });
}
