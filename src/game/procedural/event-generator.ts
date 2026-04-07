// ============================================================
// procedural/event-generator.ts — 程序化事件生成引擎（T0070）
//
// 根据 player 状态，从注册表中的 EventTemplate + VariablePool
// 组合生成兼容 GameEvent 的事件对象。
// 使用确定性 PRNG，相同 seed 总是产生相同事件。
// ============================================================

import type { Player } from '../player';
import type {
  GameEvent, EventCategory, EventTemplate, VariablePool, VariableEntry,
  ProceduralEventState,
} from '../types';
import { getAllEventTemplates, getVariablePool, getVariablePoolsByVariable, getAllVariablePools } from '../registry/queries';
import { createRNG, hashSeed, weightedPick } from './seed';
import { interpolate } from './interpolate';
import { PROCEDURAL_TEXTS } from '../../data/texts/procedural';

// ── 辅助：检查 JSON 条件是否满足 ──

function meetsCondition(
  cond: EventTemplate['condition'],
  player: Player,
): boolean {
  if (!cond) return true;
  if (cond.minRealm !== undefined && player.realmIndex < cond.minRealm) return false;
  if (cond.maxRealm !== undefined && player.realmIndex > cond.maxRealm) return false;
  if (cond.minLuck !== undefined && player.luck < cond.minLuck) return false;
  if (cond.maxLuck !== undefined && player.luck > cond.maxLuck) return false;
  if (cond.minComprehension !== undefined && player.comprehension < cond.minComprehension) return false;
  if (cond.minCharisma !== undefined && player.charisma < cond.minCharisma) return false;
  if (cond.minGold !== undefined && player.gold < cond.minGold) return false;
  if (cond.maxMood !== undefined && player.mood > cond.maxMood) return false;
  if (cond.minMood !== undefined && player.mood < cond.minMood) return false;
  if (cond.minHealth !== undefined && player.health < cond.minHealth) return false;
  if (cond.maxHealth !== undefined && player.health > cond.maxHealth) return false;
  return true;
}

// ── 辅助：筛选词库条目 ──

function filterEntries(
  entries: VariableEntry[],
  realmIndex: number,
  regionTags?: string[],
): Array<VariableEntry & { weight: number }> {
  return entries
    .filter(e => {
      if (e.minRealm !== undefined && realmIndex < e.minRealm) return false;
      if (e.maxRealm !== undefined && realmIndex > e.maxRealm) return false;
      if (regionTags && e.regionTags?.length) {
        if (!e.regionTags.some(t => regionTags.includes(t))) return false;
      }
      return true;
    })
    .map(e => ({ ...e, weight: e.weight ?? 1 }));
}

// ── 辅助：解析效果值中的变量引用 ──

type PlayerNumericKey = 'hp' | 'mp' | 'stamina' | 'exp' | 'gold' | 'mood' | 'health' | 'mentalPower' | 'lifespan';

const CLAMP_MAX_FIELDS: Record<string, keyof Player> = {
  hp: 'maxHp',
  mp: 'maxMp',
  stamina: 'maxStamina',
  mentalPower: 'maxMentalPower',
};
const CLAMP_100_FIELDS = new Set(['mood', 'health']);
const MIN_1_FIELDS = new Set(['hp']);

function resolveEffects(
  effectsPattern: Record<string, string>,
  vars: Record<string, string>,
): (p: Player) => Player {
  // 预解析所有效果值
  const resolvedEffects: Array<{ key: PlayerNumericKey; delta: number }> = [];

  for (const [field, pattern] of Object.entries(effectsPattern)) {
    const resolved = interpolate(pattern, vars);
    const num = parseFloat(resolved);
    if (!isNaN(num)) {
      resolvedEffects.push({ key: field as PlayerNumericKey, delta: num });
    }
  }

  return (p: Player): Player => {
    const result = { ...p };
    for (const { key, delta } of resolvedEffects) {
      const current = result[key] as number;
      let value = current + delta;

      // 上限 clamp
      const maxField = CLAMP_MAX_FIELDS[key];
      if (maxField) {
        const maxVal = result[maxField] as number;
        value = Math.min(value, maxVal);
      }
      if (CLAMP_100_FIELDS.has(key)) {
        value = Math.min(value, 100);
      }

      // 下限 clamp
      if (MIN_1_FIELDS.has(key)) {
        value = Math.max(1, value);
      } else if (key !== 'lifespan') {
        value = Math.max(0, value);
      }

      (result as Record<string, unknown>)[key] = value;
    }
    return result;
  };
}

// ── 辅助：生成 seed hash 后缀 ──

function seedHashSuffix(seed: number): string {
  return (seed >>> 0).toString(16).slice(0, 6);
}

// ── 初始化程序化事件状态 ──

export function createProceduralState(masterSeed?: number): ProceduralEventState {
  return {
    masterSeed: masterSeed ?? ((Math.random() * 0xFFFFFFFF) >>> 0),
    eventCounter: 0,
  };
}

// ── 获取/初始化玩家的程序化事件状态 ──

export function getProceduralState(player: Player): ProceduralEventState {
  const state = player.systems['procedural'] as ProceduralEventState | undefined;
  if (state) return state;
  return createProceduralState();
}

function setProceduralState(player: Player, state: ProceduralEventState): Player {
  return {
    ...player,
    systems: { ...player.systems, procedural: state },
  };
}

// ── 核心：生成一个程序化事件 ──

export function generateProceduralEvent(
  player: Player,
  category?: EventCategory,
  regionTags?: string[],
): { event: GameEvent; player: Player } | null {
  const state = { ...getProceduralState(player) };
  const subSeed = hashSeed(state.masterSeed, state.eventCounter);
  state.eventCounter++;
  const rng = createRNG(subSeed);

  // 筛选满足条件的模板
  const allTemplates = getAllEventTemplates();
  const eligible = allTemplates.filter(t => {
    if (category && t.category !== category) return false;
    if (!meetsCondition(t.condition, player)) return false;
    if (regionTags && t.regionTags?.length) {
      if (!t.regionTags.some(tag => regionTags.includes(tag))) return false;
    }
    return true;
  });

  if (eligible.length === 0) return null;

  // 加权选择模板
  const template = weightedPick(eligible, rng);

  // 抽取变量
  const vars: Record<string, string> = {};
  for (const slot of template.variableSlots) {
    if (vars[slot] !== undefined) continue; // 已被联动填充

    const constraint = template.varConstraints?.[slot];
    let pool: VariablePool | undefined;

    // 优先使用指定的 pool
    if (constraint?.pool) {
      pool = getVariablePool(constraint.pool);
    }
    // 否则按变量名搜索
    if (!pool) {
      const pools = getVariablePoolsByVariable(slot);
      if (pools.length > 0) {
        // 随机选一个池
        const idx = Math.floor(rng() * pools.length);
        pool = pools[idx];
      }
    }

    if (!pool || pool.entries.length === 0) {
      vars[slot] = `{${slot}}`;
      continue;
    }

    const filtered = filterEntries(pool.entries, player.realmIndex, regionTags);
    if (filtered.length === 0) {
      vars[slot] = pool.entries[0].value;
      continue;
    }

    const entry = weightedPick(filtered, rng);
    vars[slot] = entry.value;

    // 处理联动值
    if (entry.linkedValues) {
      for (const [linkedKey, linkedVal] of Object.entries(entry.linkedValues)) {
        vars[linkedKey] = linkedVal;
      }
    }
  }

  // 文本替换
  const name = interpolate(template.namePattern, vars);
  const message = interpolate(template.messagePattern, vars);

  // 效果计算
  const effect = resolveEffects(template.effectsPattern, vars);

  // 构建 GameEvent
  const eventId = `proc:${template.id}:${seedHashSuffix(subSeed)}`;
  const event: GameEvent = {
    id: eventId,
    category: template.category,
    tone: template.tone,
    name,
    weight: template.weight,
    effect,
    message: () => message,
    once: false,
    regionTags: template.regionTags,
  };

  // 更新 player 的程序化状态
  const updatedPlayer = setProceduralState(player, state);

  return { event, player: updatedPlayer };
}

// ── 便捷入口：生成并立即执行程序化事件 ──

export function triggerProceduralEvent(
  player: Player,
  category?: EventCategory,
  regionTags?: string[],
): { player: Player; message: string; eventId: string } | null {
  const result = generateProceduralEvent(player, category, regionTags);
  if (!result) return null;

  const { event, player: playerWithState } = result;
  const newPlayer = event.effect(playerWithState);
  const message = event.message(newPlayer);

  return {
    player: newPlayer,
    message,
    eventId: event.id,
  };
}

// ── 调试：重置种子 ──

export function resetProceduralSeed(player: Player, newSeed?: number): Player {
  return setProceduralState(player, createProceduralState(newSeed));
}

// ── 统计 ──

export function getProceduralStats(): { templateCount: number; poolCount: number } {
  return {
    templateCount: getAllEventTemplates().length,
    poolCount: getAllVariablePools().length,
  };
}
