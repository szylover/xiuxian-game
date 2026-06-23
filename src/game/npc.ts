// ============================================================
// npc.ts — NPC 系统核心逻辑（T0025）
// 状态读写、好感度变化、区域 NPC 查询、年度衰减
// ============================================================

import type { Player } from './player';
import type { DualCultivationState, NpcDef, NpcDynamicState, NpcRelation, NpcRelationLevel, NpcSystemState, NpcWorldEvent, NpcWorldGoal, NpcWorldStatus } from './types';
import type { Combatant } from './combat/types';
import { getAllNpcDefs, getAllRegions, getNpcDef, getItemDef, getRealmDef, getRegion } from './registry';
import { getCurrentRegion, getMaxCultivationLevel } from './map';
import { hasItem, removeItem } from './inventory';
import { calcAffinityKarmaModifier } from './karma';
import { NPC_WORLD_TEXTS, DUAL_CULTIVATION_TEXTS } from '../data/texts';

// ── 默认状态 ──

/** 赠礼 CD：3 个月（age 单位为月） */
export const GIFT_CD = 3;

const DEFAULT_NPC_STATE: NpcSystemState = {
  relations: {},
  discoveredNpcs: [],
  lastGiftAge: {},
  world: {
    lastTickAge: 0,
    dynamic: {},
    events: [],
  },
  dualCultivation: {
    companionNpcId: null,
    bondedAtAge: null,
    lastDualCultivationAge: null,
    bondLevel: 0,
    totalSessions: 0,
    activeBuffUntilAge: null,
  },
};

/** 读取 NPC 系统状态（兼容旧存档） */
export function getNpcState(player: Player): NpcSystemState {
  const s = player.systems['npc'];
  if (!s || typeof s !== 'object') return { ...DEFAULT_NPC_STATE, relations: {}, discoveredNpcs: [], lastGiftAge: {} };
  const state = s as Partial<NpcSystemState> & { lastGiftYear?: Record<string, number> };
  return {
    relations: state.relations ?? {},
    discoveredNpcs: Array.isArray(state.discoveredNpcs) ? state.discoveredNpcs : [],
    // 兼容旧存档 lastGiftYear → lastGiftAge
    lastGiftAge: state.lastGiftAge ?? state.lastGiftYear ?? {},
    world: normalizeWorldState(state.world as Partial<NpcSystemState['world']> | undefined),
    dualCultivation: normalizeDualCultivationState(state.dualCultivation as Partial<DualCultivationState> | undefined),
  };
}

/** 写回 NPC 系统状态 */
function setNpcState(player: Player, state: NpcSystemState): Player {
  return { ...player, systems: { ...player.systems, npc: state } };
}

function normalizeWorldState(raw?: Partial<NpcSystemState['world']>): NpcSystemState['world'] {
  return {
    lastTickAge: typeof raw?.lastTickAge === 'number' ? raw.lastTickAge : 0,
    dynamic: raw?.dynamic ?? {},
    events: Array.isArray(raw?.events) ? raw.events.slice(-12) : [],
  };
}

function normalizeDualCultivationState(raw?: Partial<DualCultivationState>): DualCultivationState {
  return {
    companionNpcId: typeof raw?.companionNpcId === 'string' ? raw.companionNpcId : null,
    bondedAtAge: typeof raw?.bondedAtAge === 'number' ? raw.bondedAtAge : null,
    lastDualCultivationAge: typeof raw?.lastDualCultivationAge === 'number' ? raw.lastDualCultivationAge : null,
    bondLevel: typeof raw?.bondLevel === 'number' ? raw.bondLevel : 0,
    totalSessions: typeof raw?.totalSessions === 'number' ? raw.totalSessions : 0,
    activeBuffUntilAge: typeof raw?.activeBuffUntilAge === 'number' ? raw.activeBuffUntilAge : null,
  };
}

// ── 关系等级映射 ──

export function calcRelationLevel(affinity: number): NpcRelationLevel {
  if (affinity < -50) return 'hostile';
  if (affinity < -10) return 'cold';
  if (affinity < 10)  return 'stranger';
  if (affinity < 30)  return 'acquaintance';
  if (affinity < 60)  return 'friend';
  if (affinity < 90)  return 'close_friend';
  return 'soulmate';
}

/** 获取某 NPC 的关系（不存在时返回默认 stranger） */
export function getRelation(player: Player, npcId: string): NpcRelation {
  const state = getNpcState(player);
  const rel = state.relations[npcId];
  if (rel) return rel;
  return {
    npcId,
    affinity: 0,
    met: false,
    metAt: 0,
    interactionCount: 0,
    lastInteractionYear: 0,
    relationLevel: 'stranger',
    flags: {},
  };
}

// ── 好感度修改 ──

export function changeAffinity(
  player: Player, npcId: string, delta: number, _reason: string,
): { player: Player; message: string; newLevel?: NpcRelationLevel } {
  const npcDef = getNpcDef(npcId);
  if (!npcDef) return { player, message: '❌ 未找到该 NPC。' };

  const state = getNpcState(player);
  const rel = state.relations[npcId] ?? getRelation(player, npcId);
  const maxAffinity = npcDef.maxAffinity ?? 100;
  const oldLevel = rel.relationLevel;
  const effectiveDelta = calcAffinityKarmaModifier(player, npcDef, delta);
  const newAffinity = Math.max(-100, Math.min(maxAffinity, rel.affinity + effectiveDelta));
  const newLevel = calcRelationLevel(newAffinity);

  const updatedRel: NpcRelation = {
    ...rel,
    affinity: newAffinity,
    relationLevel: newLevel,
    interactionCount: rel.interactionCount + 1,
    lastInteractionYear: player.gameYear,
  };

  const newState: NpcSystemState = {
    ...state,
    relations: { ...state.relations, [npcId]: updatedRel },
  };

  const sign = effectiveDelta >= 0 ? '+' : '';
  let msg = `${npcDef.emoji} ${npcDef.name} 好感度 ${sign}${effectiveDelta}（${newAffinity}）`;
  if (oldLevel !== newLevel) {
    msg += ` → 关系变为【${RELATION_CN[newLevel]}】`;
  }

  return {
    player: setNpcState(player, newState),
    message: msg,
    newLevel: oldLevel !== newLevel ? newLevel : undefined,
  };
}

// ── 邂逅 NPC ──

export function meetNpc(
  player: Player, npcId: string,
): { player: Player; message: string } {
  const npcDef = getNpcDef(npcId);
  if (!npcDef) return { player, message: '❌ 未找到该 NPC。' };

  const state = getNpcState(player);
  const existing = state.relations[npcId];
  if (existing?.met) {
    return { player, message: `${npcDef.emoji} ${npcDef.name}：老朋友，又见面了。` };
  }

  const initialAffinity = 5;
  const newRel: NpcRelation = {
    npcId,
    affinity: initialAffinity,
    met: true,
    metAt: player.gameYear,
    interactionCount: 1,
    lastInteractionYear: player.gameYear,
    relationLevel: calcRelationLevel(initialAffinity),
    flags: {},
  };

  const discovered = state.discoveredNpcs.includes(npcId)
    ? state.discoveredNpcs
    : [...state.discoveredNpcs, npcId];

  const newState: NpcSystemState = {
    ...state,
    relations: { ...state.relations, [npcId]: newRel },
    discoveredNpcs: discovered,
  };

  return {
    player: setNpcState(player, newState),
    message: `✨ 邂逅了${npcDef.emoji} ${npcDef.name}（${npcDef.title ?? ''}）！好感度 +5`,
  };
}

// ── 赠礼 ──

export function giveGift(
  player: Player, npcId: string, itemId: string,
): { player: Player; message: string; affinityChange: number } {
  const npcDef = getNpcDef(npcId);
  if (!npcDef) return { player, message: '❌ 未找到该 NPC。', affinityChange: 0 };

  const state = getNpcState(player);
  const rel = state.relations[npcId];
  if (!rel?.met) return { player, message: '❌ 尚未邂逅此 NPC。', affinityChange: 0 };

  // 赠礼 CD：3 个月
  const lastAge = state.lastGiftAge[npcId] ?? -Infinity;
  const remaining = (lastAge + GIFT_CD) - player.age;
  if (remaining > 0) {
    return { player, message: `❌ 赠礼尚在冷却中，还需等待约 ${remaining} 个月。`, affinityChange: 0 };
  }

  if (!hasItem(player, itemId, 1)) {
    return { player, message: '❌ 背包中没有此物品。', affinityChange: 0 };
  }

  const itemDef = getItemDef(itemId);
  const itemName = itemDef?.name ?? itemId;

  // 判断喜好
  const prefs = npcDef.giftPreferences;
  let base: number;
  let reaction: string;
  if (prefs?.loved.includes(itemId)) {
    base = 15 + Math.floor(Math.random() * 11); // 15~25
    reaction = '爱不释手';
  } else if (prefs?.liked.includes(itemId)) {
    base = 5 + Math.floor(Math.random() * 6);   // 5~10
    reaction = '欣然接受';
  } else if (prefs?.disliked.includes(itemId)) {
    base = -(5 + Math.floor(Math.random() * 6)); // -10~-5
    reaction = '面露不悦';
  } else {
    base = 2 + Math.floor(Math.random() * 4);    // 2~5 默认
    reaction = '收下了';
  }

  // 好感度 = base × (1 + charisma/200)，负面不受魅力加成
  const delta = base > 0
    ? Math.round(base * (1 + player.charisma / 200))
    : base;

  let p = removeItem(player, itemId, 1);

  const newLastGiftAge = { ...state.lastGiftAge, [npcId]: player.age };
  p = setNpcState(p, { ...getNpcState(p), lastGiftAge: newLastGiftAge });

  const result = changeAffinity(p, npcId, delta, 'gift');
  const msg = `🎁 向${npcDef.emoji} ${npcDef.name}赠送了【${itemName}】，${npcDef.name}${reaction}。${result.message}`;

  return {
    player: result.player,
    message: msg,
    affinityChange: delta,
  };
}

// ── 区域 NPC 查询 ──

export function getNpcsInRegion(player: Player): NpcDef[] {
  const region = getCurrentRegion(player);
  if (!region) return [];
  const all = getAllNpcDefs();
  const maxLevel = getMaxCultivationLevel(player);

  return all.filter(npc => {
    if (npc.minRealm && maxLevel < npc.minRealm) return false;
    if (npc.condition && !npc.condition(player)) return false;
    const dynamic = getNpcDynamicState(player, npc.id);
    if (!dynamic.alive) return false;
    if (dynamic.regionId) return dynamic.regionId === region.id;
    if (npc.homeRegionId) return npc.homeRegionId === region.id;
    if (!npc.regionTags.length) return true;
    return npc.regionTags.some(tag => region.regionTags.includes(tag));
  });
}

// ── 年度好感度衰减 ──

export function tickAffinityDecay(player: Player): Player {
  const state = getNpcState(player);
  const newRelations = { ...state.relations };
  let changed = false;

  for (const [npcId, rel] of Object.entries(newRelations)) {
    const def = getNpcDef(npcId);
    const decayRate = def?.affinityDecayRate ?? 0;
    if (decayRate <= 0) continue;
    if (rel.affinity <= 0) continue; // 不让衰减到更低的负值

    const newAffinity = Math.max(0, rel.affinity - decayRate);
    newRelations[npcId] = {
      ...rel,
      affinity: newAffinity,
      relationLevel: calcRelationLevel(newAffinity),
    };
    changed = true;
  }

  if (!changed) return player;
  return setNpcState(player, { ...state, relations: newRelations });
}

// ── NPC 世界模拟（#114） ──

const WORLD_EVENT_LIMIT = 12;
const DUAL_CULTIVATION_CD = 12;
const DUAL_CULTIVATION_BUFF_MONTHS = 12;

export function getNpcDynamicState(player: Player, npcId: string): NpcDynamicState {
  const def = getNpcDef(npcId);
  const state = getNpcState(player);
  return state.world.dynamic[npcId] ?? createDefaultDynamicState(def, player.age);
}

export function getNpcWorldEvents(player: Player): NpcWorldEvent[] {
  return [...getNpcState(player).world.events].sort((a, b) => b.age - a.age);
}

export function tickNpcWorld(player: Player): { player: Player; logs: string[] } {
  const state = getNpcState(player);
  const startAge = Math.max(state.world.lastTickAge || player.age - 1, 0);
  if (player.age <= startAge) return { player, logs: [] };

  let nextState = state;
  let dynamic = { ...state.world.dynamic };
  let events = [...state.world.events];
  const logs: string[] = [];
  const defs = getAllNpcDefs();
  const months = Math.min(24, player.age - startAge);

  for (let i = 0; i < months; i += 1) {
    for (const def of defs) {
      const current = dynamic[def.id] ?? createDefaultDynamicState(def, startAge + i);
      const result = advanceNpcOneMonth(player, def, current, dynamic);
      dynamic[def.id] = result.dynamic;
      for (const event of result.events) {
        events.push(event);
        logs.push(event.message);
      }
    }
  }

  events = events.slice(-WORLD_EVENT_LIMIT);
  nextState = { ...nextState, world: { lastTickAge: player.age, dynamic, events } };
  return { player: setNpcState(player, nextState), logs };
}

function advanceNpcOneMonth(player: Player, def: NpcDef, current: NpcDynamicState, allDynamic: Record<string, NpcDynamicState>): { dynamic: NpcDynamicState; events: NpcWorldEvent[] } {
  if (!current.alive) return { dynamic: current, events: [] };
  let dynamic = { ...current, ageMonths: current.ageMonths + 1, lastUpdatedAge: player.age };
  const events: NpcWorldEvent[] = [];
  const realmFactor = Math.max(1, dynamic.realmIndex + 1);
  const cultivateRate = getNpcCultivationRate(def, dynamic.goal);
  dynamic.cultivation += cultivateRate;

  const breakthroughReq = 120 * realmFactor * realmFactor;
  if (dynamic.cultivation >= breakthroughReq && Math.random() < getBreakthroughChance(def, dynamic)) {
    dynamic = { ...dynamic, realmIndex: dynamic.realmIndex + 1, cultivation: 0, status: 'secluded', goal: 'cultivate' };
    events.push(createWorldEvent(player, def.id, 'breakthrough', NPC_WORLD_TEXTS.logs.breakthrough(def.name, getRealmName(dynamic.realmIndex))));
  } else if (shouldTravel(def, dynamic)) {
    const regionId = pickNpcRegion(def, dynamic.regionId);
    if (regionId && regionId !== dynamic.regionId) {
      dynamic = { ...dynamic, regionId, status: 'wandering', goal: 'travel' };
      events.push(createWorldEvent(player, def.id, 'travel', NPC_WORLD_TEXTS.logs.travel(def.name, getRegion(regionId)?.name ?? NPC_WORLD_TEXTS.fallbackRegion)));
    }
  } else if (Math.random() < 0.025) {
    dynamic = { ...dynamic, status: pickStatus(def), goal: pickGoal(def) };
    events.push(createWorldEvent(player, def.id, 'status', NPC_WORLD_TEXTS.logs.status(def.name, NPC_WORLD_TEXTS.status[dynamic.status])));
  }

  if (Math.random() < 0.018) {
    const other = pickOtherNpc(def.id, allDynamic);
    if (other) {
      const relDelta = (def.alignment && other.def.alignment && def.alignment !== other.def.alignment) || def.disposition === 'hostile' ? -2 : 2;
      events.push(createWorldEvent(
        player,
        def.id,
        'relationship',
        relDelta > 0 ? NPC_WORLD_TEXTS.logs.relationshipUp(def.name, other.def.name) : NPC_WORLD_TEXTS.logs.relationshipDown(def.name, other.def.name),
      ));
    }
  }

  if (dynamic.ageMonths > getNpcLongevityMonths(dynamic.realmIndex) && Math.random() < 0.01) {
    dynamic = { ...dynamic, alive: false, status: 'fallen', deathAge: player.age };
    events.push(createWorldEvent(player, def.id, 'death', NPC_WORLD_TEXTS.logs.death(def.name)));
  }

  return { dynamic, events };
}

function createDefaultDynamicState(def: NpcDef | undefined, age: number): NpcDynamicState {
  return {
    npcId: def?.id ?? '',
    realmIndex: def?.realmIndex ?? 0,
    cultivation: 0,
    regionId: def ? pickNpcRegion(def, null) : null,
    alive: true,
    status: 'normal',
    goal: def ? pickGoal(def) : 'cultivate',
    ageMonths: Math.max(240, ((def?.realmIndex ?? 0) + 2) * 180),
    lastUpdatedAge: age,
  };
}

function getNpcCultivationRate(def: NpcDef, goal: NpcWorldGoal): number {
  const base = 4 + def.charisma / 30 + def.realmIndex;
  const roleBonus = def.roles.includes('elder') || def.roles.includes('companion') ? 1.25 : 1;
  return Math.max(1, Math.round(base * roleBonus * (goal === 'cultivate' ? 1.6 : 1)));
}

function getBreakthroughChance(def: NpcDef, dynamic: NpcDynamicState): number {
  const personalityBonus = def.personality === 'gentle' || def.personality === 'mysterious' ? 0.03 : 0;
  return Math.min(0.28, 0.08 + personalityBonus + (dynamic.goal === 'cultivate' ? 0.04 : 0));
}

function shouldTravel(def: NpcDef, dynamic: NpcDynamicState): boolean {
  if (def.homeRegionId) return false;
  const mobile = def.roles.includes('wanderer') || def.roles.includes('rival') || def.roles.includes('companion') || def.regionTags.length === 0;
  return mobile && Math.random() < 0.04;
}

function pickNpcRegion(def: NpcDef, excludeRegionId: string | null): string | null {
  if (def.homeRegionId) return def.homeRegionId;
  const regions = getAllRegions().filter(region => {
    if (region.isContainer) return false;
    if (region.id === excludeRegionId) return false;
    if (!def.regionTags.length) return true;
    return def.regionTags.some(tag => region.regionTags.includes(tag));
  });
  if (regions.length === 0) return def.homeRegionId ?? null;
  return regions[Math.floor(Math.random() * regions.length)]?.id ?? null;
}

function pickStatus(def: NpcDef): NpcWorldStatus {
  if (def.roles.includes('wanderer')) return 'wandering';
  if (def.roles.includes('elder') || def.roles.includes('companion')) return 'secluded';
  if (def.disposition === 'hostile') return 'injured';
  return 'normal';
}

function pickGoal(def: NpcDef): NpcWorldGoal {
  if (def.roles.includes('merchant') || def.roles.includes('smith') || def.roles.includes('alchemist')) return 'trade';
  if (def.roles.includes('guard')) return 'guard';
  if (def.roles.includes('rival') || def.disposition === 'hostile') return 'rivalry';
  if (def.roles.includes('wanderer')) return 'travel';
  if (def.roles.includes('companion')) return 'seek_fortune';
  return 'cultivate';
}

function pickOtherNpc(selfId: string, dynamic: Record<string, NpcDynamicState>): { def: NpcDef; dynamic: NpcDynamicState } | null {
  const candidates = getAllNpcDefs()
    .filter(def => def.id !== selfId)
    .map(def => ({ def, dynamic: dynamic[def.id] }))
    .filter((entry): entry is { def: NpcDef; dynamic: NpcDynamicState } => !!entry.dynamic?.alive);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

function createWorldEvent(player: Player, npcId: string, type: NpcWorldEvent['type'], message: string): NpcWorldEvent {
  return {
    id: `${npcId}:${type}:${player.age}:${Math.random().toString(36).slice(2, 8)}`,
    npcId,
    type,
    age: player.age,
    gameYear: player.gameYear,
    gameMonth: player.gameMonth,
    message,
  };
}

function getRealmName(index: number): string {
  return getRealmDef(index)?.name ?? String(index);
}

function getNpcLongevityMonths(realmIndex: number): number {
  return 900 + realmIndex * 600;
}

// ── 道侣双修（#111） ──

export function getDualCultivationState(player: Player): DualCultivationState {
  return getNpcState(player).dualCultivation;
}

export function getDualCultivationBonus(player: Player): number {
  const state = getDualCultivationState(player);
  if (!state.companionNpcId) return 0;
  if (state.activeBuffUntilAge === null || state.activeBuffUntilAge < player.age) return 0;
  return 0.08 + Math.min(0.12, state.bondLevel * 0.02);
}

export function getDualCultivationStatBonuses(player: Player): Partial<Record<'atk' | 'def' | 'hp' | 'mp', number>> {
  const state = getDualCultivationState(player);
  if (!state.companionNpcId || state.activeBuffUntilAge === null || state.activeBuffUntilAge < player.age) return {};
  const bond = Math.max(1, state.bondLevel);
  return { atk: bond * 2, def: bond * 2, hp: bond * 10, mp: bond * 8 };
}

export function canFormDaoCompanion(player: Player, npcId: string): boolean {
  const def = getNpcDef(npcId);
  if (!def || def.disposition === 'hostile') return false;
  const state = getNpcState(player);
  if (state.dualCultivation.companionNpcId) return false;
  const rel = getRelation(player, npcId);
  const dynamic = getNpcDynamicState(player, npcId);
  return rel.met && rel.affinity >= 90 && dynamic.alive && (def.roles.includes('companion') || rel.relationLevel === 'soulmate');
}

export function formDaoCompanion(player: Player, npcId: string): { player: Player; message: string } {
  const def = getNpcDef(npcId);
  if (!def) return { player, message: DUAL_CULTIVATION_TEXTS.logs.npcNotFound };
  const state = getNpcState(player);
  if (state.dualCultivation.companionNpcId) return { player, message: DUAL_CULTIVATION_TEXTS.logs.alreadyHasCompanion };
  if (!getRelation(player, npcId).met) return { player, message: DUAL_CULTIVATION_TEXTS.logs.notMet };
  if (!canFormDaoCompanion(player, npcId)) return { player, message: DUAL_CULTIVATION_TEXTS.logs.notEligible };
  const dualCultivation: DualCultivationState = {
    companionNpcId: npcId,
    bondedAtAge: player.age,
    lastDualCultivationAge: null,
    bondLevel: 1,
    totalSessions: 0,
    activeBuffUntilAge: null,
  };
  const rel = getRelation(player, npcId);
  const nextState: NpcSystemState = {
    ...state,
    relations: { ...state.relations, [npcId]: { ...rel, flags: { ...rel.flags, daoCompanion: true } } },
    dualCultivation,
  };
  return { player: setNpcState(player, nextState), message: DUAL_CULTIVATION_TEXTS.logs.formed(def.name) };
}

export function dissolveDaoCompanion(player: Player): { player: Player; message: string } {
  const state = getNpcState(player);
  const npcId = state.dualCultivation.companionNpcId;
  if (!npcId) return { player, message: DUAL_CULTIVATION_TEXTS.logs.companionMissing };
  const def = getNpcDef(npcId);
  const rel = getRelation(player, npcId);
  const nextState: NpcSystemState = {
    ...state,
    relations: { ...state.relations, [npcId]: { ...rel, flags: { ...rel.flags, daoCompanion: false }, affinity: Math.max(60, rel.affinity - 20), relationLevel: calcRelationLevel(Math.max(60, rel.affinity - 20)) } },
    dualCultivation: { ...DEFAULT_NPC_STATE.dualCultivation },
  };
  return { player: setNpcState(player, nextState), message: DUAL_CULTIVATION_TEXTS.logs.dissolved(def?.name ?? npcId) };
}

export function performDualCultivation(player: Player): { player: Player; message: string } {
  const state = getNpcState(player);
  const dual = state.dualCultivation;
  if (!dual.companionNpcId) return { player, message: DUAL_CULTIVATION_TEXTS.logs.companionMissing };
  const def = getNpcDef(dual.companionNpcId);
  if (!def) return { player, message: DUAL_CULTIVATION_TEXTS.logs.npcNotFound };
  if (!getNpcDynamicState(player, def.id).alive) return { player, message: DUAL_CULTIVATION_TEXTS.logs.companionFallen };
  const remaining = (dual.lastDualCultivationAge ?? -Infinity) + DUAL_CULTIVATION_CD - player.age;
  if (remaining > 0) return { player, message: DUAL_CULTIVATION_TEXTS.logs.cooldown(remaining) };

  const expGain = Math.max(80, Math.floor((player.realmIndex + 1) * 120 * (1 + dual.bondLevel * 0.15)));
  const bondLevel = Math.min(10, dual.bondLevel + 1);
  const dynamic = getNpcDynamicState(player, def.id);
  const nextDual: DualCultivationState = {
    ...dual,
    lastDualCultivationAge: player.age,
    bondLevel,
    totalSessions: dual.totalSessions + 1,
    activeBuffUntilAge: player.age + DUAL_CULTIVATION_BUFF_MONTHS,
  };
  const nextState: NpcSystemState = {
    ...state,
    world: {
      ...state.world,
      dynamic: { ...state.world.dynamic, [def.id]: { ...dynamic, cultivation: dynamic.cultivation + expGain } },
    },
    dualCultivation: nextDual,
  };
  const p = setNpcState({ ...player, exp: player.exp + expGain, mood: Math.min(100, player.mood + 8) }, nextState);
  const affinity = changeAffinity(p, def.id, 4, 'dualCultivation');
  return { player: affinity.player, message: DUAL_CULTIVATION_TEXTS.logs.dualCultivated(def.name, expGain, bondLevel) };
}

// ── NPC → 战斗参与者 ──

export function npcToCombatant(npc: NpcDef): Combatant {
  return {
    name: npc.name,
    hp: npc.hp,
    atk: npc.atk,
    def: npc.def,
    speed: npc.speed,
    moveSpeed: 0,
    critRate: npc.critRate,
    critDmgMultiplier: npc.critDmgMultiplier,
    critResist: npc.critResist,
  };
}

// ── 关系等级中文映射（供 UI 使用）──

export const RELATION_CN: Record<NpcRelationLevel, string> = {
  hostile:      '敌对',
  cold:         '冷淡',
  stranger:     '陌生',
  acquaintance: '相识',
  friend:       '友好',
  close_friend: '至交',
  soulmate:     '知己',
};

export const RELATION_COLORS: Record<NpcRelationLevel, string> = {
  hostile:      '#F44336',
  cold:         '#9E9E9E',
  stranger:     '#FFFFFF',
  acquaintance: '#FFEB3B',
  friend:       '#4CAF50',
  close_friend: '#2196F3',
  soulmate:     '#E91E63',
};

export const RELATION_EMOJI: Record<NpcRelationLevel, string> = {
  hostile:      '💢',
  cold:         '🥶',
  stranger:     '🤍',
  acquaintance: '💛',
  friend:       '💚',
  close_friend: '💙',
  soulmate:     '❤️',
};

export const PERSONALITY_CN: Record<string, string> = {
  gentle:       '温和',
  cold:         '冷漠',
  hot_tempered: '暴躁',
  cunning:      '狡猾',
  righteous:    '正义',
  mysterious:   '神秘',
};
