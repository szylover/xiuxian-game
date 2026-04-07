// ============================================================
// procedural/monster-generator.ts — 程序化妖兽生成引擎（T0072）
//
// 根据 player 状态 + 可选 seed，从注册表中的 MonsterTemplate
// + MutationDef 组合生成随机妖兽变体。兼容现有 MonsterDef 接口。
// ============================================================

import type { Player } from '../player';
import type {
  MonsterDef, MonsterTemplate, MutationDef, ProceduralMonsterState,
  ElementType,
} from '../types';
import {
  getAllMonsterTemplates, getAllMutationDefs,
} from '../registry';
import { createRNG, hashSeed, weightedPick, randomMasterSeed } from './seed';

// ── 境界缩放公式 ──

function statMultiplier(realmIndex: number): number {
  return Math.pow(1.8, realmIndex);
}

function expMultiplier(realmIndex: number): number {
  return Math.pow(2.0, realmIndex);
}

function goldMultiplier(realmIndex: number): number {
  return Math.pow(1.5, realmIndex);
}

// ── 初始化 / 获取程序化妖兽状态 ──

export function createProceduralMonsterState(): ProceduralMonsterState {
  return {
    masterSeed: randomMasterSeed(),
    monsterCounter: 0,
  };
}

export function getProceduralMonsterState(player: Player): ProceduralMonsterState {
  return (player.systems?.proceduralMonsterState as ProceduralMonsterState) ?? createProceduralMonsterState();
}

function saveProceduralMonsterState(player: Player, state: ProceduralMonsterState): Player {
  return {
    ...player,
    systems: { ...player.systems, proceduralMonsterState: state },
  };
}

// ── 辅助：筛选可用模板 ──

function filterTemplates(
  templates: MonsterTemplate[],
  realmIndex: number,
  regionTags?: string[],
): MonsterTemplate[] {
  return templates.filter(t => {
    if (t.minRealm !== undefined && realmIndex < t.minRealm) return false;
    if (t.maxRealm !== undefined && realmIndex > t.maxRealm) return false;
    if (regionTags && regionTags.length > 0 && t.regionTags && t.regionTags.length > 0) {
      if (!t.regionTags.some(rt => regionTags.includes(rt))) return false;
    }
    return true;
  });
}

// ── 辅助：筛选可用变异 ──

function filterMutations(
  mutations: MutationDef[],
  realmIndex: number,
  regionTags?: string[],
  template?: MonsterTemplate,
): MutationDef[] {
  return mutations.filter(m => {
    if (m.weight <= 0) return false;
    if (m.minRealm !== undefined && realmIndex < m.minRealm) return false;
    if (m.maxRealm !== undefined && realmIndex > m.maxRealm) return false;
    if (regionTags && regionTags.length > 0 && m.regionTags && m.regionTags.length > 0) {
      if (!m.regionTags.some(rt => regionTags.includes(rt))) return false;
    }
    if (template?.allowedMutations && template.allowedMutations.length > 0) {
      if (!template.allowedMutations.includes(m.id)) return false;
    }
    return true;
  });
}

// ── 核心生成器 ──

export interface GenerateMonsterOptions {
  regionTags?: string[];
  forceElite?: boolean;
  forceBoss?: boolean;
  seed?: number;
}

/**
 * 生成一个程序化妖兽变体。
 * 改变 player 的 proceduralMonsterState（递增计数器），返回 { player, monster }。
 * 如果没有可用模板则返回 null。
 */
export function generateMonsterVariant(
  player: Player,
  options: GenerateMonsterOptions = {},
): { player: Player; monster: MonsterDef } | null {
  const allTemplates = getAllMonsterTemplates();
  if (allTemplates.length === 0) return null;

  const realmIndex = player.realmIndex;
  const eligible = filterTemplates(allTemplates, realmIndex, options.regionTags);
  if (eligible.length === 0) return null;

  // 状态管理
  let state = getProceduralMonsterState(player);
  const counter = state.monsterCounter;
  const seed = options.seed ?? hashSeed(state.masterSeed, counter);
  state = { ...state, monsterCounter: counter + 1 };

  const rng = createRNG(seed);

  // 1. 选模板
  const templateWeights = eligible.map(t => ({ ...t, weight: 1 }));
  const template = weightedPick(templateWeights, rng);

  // 2. 境界缩放
  const statScale = statMultiplier(realmIndex);
  const expScale = expMultiplier(realmIndex);
  const goldScale = goldMultiplier(realmIndex);

  // 3. 精英/Boss 判定
  const luck = player.luck ?? 0;
  const bossChance = options.forceBoss ? 1 : 0.01 + luck * 0.0005;
  const eliteChance = options.forceElite ? 1 : 0.05 + luck * 0.001;

  const allMutations = getAllMutationDefs();
  const appliedMutations: MutationDef[] = [];

  let isBoss = false;
  let isElite = false;

  if (rng() < bossChance) {
    isBoss = true;
    const bossMut = allMutations.find(m => m.type === 'boss');
    if (bossMut) appliedMutations.push(bossMut);
  } else if (rng() < eliteChance) {
    isElite = true;
    const eliteMut = allMutations.find(m => m.type === 'elite');
    if (eliteMut) appliedMutations.push(eliteMut);
  }

  // 4. 普通变异抽取（0~2 个，不包含 elite/boss 类型）
  const normalMutations = filterMutations(
    allMutations.filter(m => m.type !== 'elite' && m.type !== 'boss'),
    realmIndex,
    options.regionTags,
    template,
  );

  if (normalMutations.length > 0) {
    const mutCount = rng() < 0.3 ? (rng() < 0.4 ? 2 : 1) : 0;
    const picked = new Set<string>();
    for (let i = 0; i < mutCount && normalMutations.length > 0; i++) {
      const mut = weightedPick(normalMutations, rng);
      if (picked.has(mut.id)) continue;
      // exclusive 互斥检查
      if (mut.exclusive && appliedMutations.some(m => m.type === mut.type)) continue;
      appliedMutations.push(mut);
      picked.add(mut.id);
    }
  }

  // 5. 属性合成
  const jitter = (min: number, max: number) => min + rng() * (max - min);

  let finalHp = template.baseStats.hp * statScale;
  let finalAtk = template.baseStats.atk * statScale;
  let finalDef = template.baseStats.def * statScale;
  let finalSpeed = template.baseStats.speed * statScale;
  let finalMoveSpeed = template.baseStats.moveSpeed * statScale;
  let finalCritRate = template.baseStats.critRate;
  let finalCritResist = template.baseStats.critResist;
  let finalCritDmgMult = template.baseStats.critDmgMultiplier ?? 1.5;

  // 应用变异属性倍率
  for (const mut of appliedMutations) {
    const mods = mut.statModifiers;
    if (mods.hp) finalHp *= mods.hp;
    if (mods.atk) finalAtk *= mods.atk;
    if (mods.def) finalDef *= mods.def;
    if (mods.speed) finalSpeed *= mods.speed;
    if (mods.moveSpeed) finalMoveSpeed *= mods.moveSpeed;
    if (mods.critRate) finalCritRate *= mods.critRate;
    if (mods.critResist) finalCritResist *= mods.critResist;
    if (mods.critDmgMultiplier) finalCritDmgMult *= mods.critDmgMultiplier;
  }

  // 随机浮动
  finalHp = Math.floor(finalHp * jitter(0.9, 1.1));
  finalAtk = Math.floor(finalAtk * jitter(0.9, 1.1));
  finalDef = Math.floor(finalDef * jitter(0.9, 1.1));
  finalSpeed = Math.floor(finalSpeed * jitter(0.95, 1.05));
  finalMoveSpeed = Math.floor(finalMoveSpeed * jitter(0.95, 1.05));

  // 经验/灵石
  let expBonus = 1;
  let goldBonus = 1;
  for (const mut of appliedMutations) {
    if (mut.expBonus) expBonus *= mut.expBonus;
    if (mut.goldBonus) goldBonus *= mut.goldBonus;
  }
  const finalExp = Math.floor(template.baseExpReward * expScale * expBonus);
  const finalGold = Math.floor(template.baseGoldReward * goldScale * goldBonus);

  // 6. 元素属性
  let element: ElementType | undefined = template.element;
  let elementResists: Partial<Record<ElementType, number>> | undefined =
    template.elementResists ? { ...template.elementResists } : undefined;

  for (const mut of appliedMutations) {
    if (mut.element) element = mut.element;
    if (mut.elementResists) {
      elementResists = { ...(elementResists ?? {}), ...mut.elementResists };
    }
  }

  // 7. 名称组装
  let prefix = '';
  let suffix = '';
  let emoji = template.emoji;
  for (const mut of appliedMutations) {
    if (mut.namePrefix) prefix += mut.namePrefix;
    if (mut.nameSuffix) suffix += mut.nameSuffix;
    if (mut.emojiOverride) emoji = mut.emojiOverride;
  }
  const finalName = prefix ? `${prefix}·${template.baseName}${suffix}` : `${template.baseName}${suffix}`;

  // 8. 生成 ID
  const seedHex = (seed >>> 0).toString(16).slice(0, 6);
  const monsterId = `proc-mon:${template.id}:${seedHex}`;

  // 9. 合成 MonsterDef
  const monsterDef: MonsterDef = {
    id: monsterId,
    name: finalName,
    emoji,
    realmIndex,
    hp: Math.max(1, finalHp),
    atk: Math.max(1, finalAtk),
    def: Math.max(0, finalDef),
    speed: Math.max(1, finalSpeed),
    moveSpeed: Math.max(1, finalMoveSpeed),
    critRate: Math.max(0, Math.floor(finalCritRate)),
    critResist: Math.max(0, Math.floor(finalCritResist)),
    critDmgMultiplier: finalCritDmgMult,
    expReward: Math.max(1, finalExp),
    goldReward: Math.max(0, finalGold),
    element,
    elementResists,
    regionTags: template.regionTags,
  };

  const updatedPlayer = saveProceduralMonsterState(player, state);
  return { player: updatedPlayer, monster: monsterDef };
}
