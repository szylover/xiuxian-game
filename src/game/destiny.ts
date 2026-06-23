import type { Player } from './player';
import type { DestinyDef, TalentDef, TalentTreeNodeDef, DestinyTalentEffect, DestinyTalentState, DestinyTalentStatKey, UnlockTalentNodeResult } from './types';
import { getAllDestinyDefs, getAllTalentDefs, getTalentDef, getTalentTreeNodeDef, getAllTalentTreeNodeDefs } from './registry';
import { DESTINY_TEXTS, ATTR_NAMES } from '../data/texts';

const DEFAULT_STATE: DestinyTalentState = {
  talentPoints: 0,
  unlockedNodeIds: [],
  acquiredTalentIds: [],
};

export const CORE_DESTINIES: DestinyDef[] = [
  {
    id: 'core:lone_star',
    name: DESTINY_TEXTS.destinies.loneStar.name,
    rarity: 'rare',
    description: DESTINY_TEXTS.destinies.loneStar.description,
    weight: 18,
    effect: { statBonuses: { atk: 4, critRate: 3 }, cultivationSpeedBonus: 0.04 },
    initialKarma: -10,
  },
  {
    id: 'core:ziwei_emperor',
    name: DESTINY_TEXTS.destinies.ziwei.name,
    rarity: 'legendary',
    description: DESTINY_TEXTS.destinies.ziwei.description,
    weight: 6,
    effect: { statMultipliers: { maxHp: 0.05, maxMp: 0.05, atk: 0.05, def: 0.05, speed: 0.05 }, cultivationSpeedBonus: 0.06, breakthroughRateBonus: 0.03 },
    initialKarma: 10,
  },
  {
    id: 'core:immortal_body',
    name: DESTINY_TEXTS.destinies.immortalBody.name,
    rarity: 'legendary',
    description: DESTINY_TEXTS.destinies.immortalBody.description,
    weight: 6,
    effect: { statMultipliers: { maxHp: 0.12, def: 0.08 }, statBonuses: { maxPhysique: 20, physiqueDmgReduce: 2 } },
  },
  {
    id: 'core:bodhi_heart',
    name: DESTINY_TEXTS.destinies.bodhiHeart.name,
    rarity: 'rare',
    description: DESTINY_TEXTS.destinies.bodhiHeart.description,
    weight: 20,
    effect: { cultivationSpeedBonus: 0.08, breakthroughRateBonus: 0.02 },
    initialKarma: 8,
  },
  {
    id: 'core:hidden_dragon',
    name: DESTINY_TEXTS.destinies.hiddenDragon.name,
    rarity: 'common',
    description: DESTINY_TEXTS.destinies.hiddenDragon.description,
    weight: 50,
    effect: { cultivationSpeedBonus: 0.03, breakthroughRateBonus: 0.01 },
  },
];

export const CORE_TALENTS: TalentDef[] = [
  { id: 'core:breath_micro', name: DESTINY_TEXTS.talents.breath.name, rarity: 'common', description: DESTINY_TEXTS.talents.breath.description, effect: { cultivationSpeedBonus: 0.08 } },
  { id: 'core:sturdy_bones', name: DESTINY_TEXTS.talents.sturdy.name, rarity: 'common', description: DESTINY_TEXTS.talents.sturdy.description, effect: { statBonuses: { maxHp: 20, def: 2 } } },
  { id: 'core:clear_mind', name: DESTINY_TEXTS.talents.keen.name, rarity: 'rare', description: DESTINY_TEXTS.talents.keen.description, effect: { breakthroughRateBonus: 0.03 } },
  { id: 'core:first_edge', name: DESTINY_TEXTS.talents.sword.name, rarity: 'rare', description: DESTINY_TEXTS.talents.sword.description, effect: { statBonuses: { atk: 5, critRate: 2 } } },
  { id: 'core:wind_step', name: DESTINY_TEXTS.talents.wind.name, rarity: 'rare', description: DESTINY_TEXTS.talents.wind.description, effect: { statBonuses: { speed: 4, moveSpeed: 4 } } },
  { id: 'core:deep_fortune', name: DESTINY_TEXTS.talents.fortune.name, rarity: 'rare', description: DESTINY_TEXTS.talents.fortune.description, effect: { breakthroughRateBonus: 0.04 } },
  { id: 'core:spirit_vessel', name: DESTINY_TEXTS.talents.vessel.name, rarity: 'rare', description: DESTINY_TEXTS.talents.vessel.description, effect: { statBonuses: { maxMp: 25, maxMentalPower: 10 } } },
  { id: 'core:star_blessing', name: DESTINY_TEXTS.talents.star.name, rarity: 'legendary', description: DESTINY_TEXTS.talents.star.description, effect: { statMultipliers: { maxHp: 0.04, maxMp: 0.04, atk: 0.04, def: 0.04, speed: 0.04 }, cultivationSpeedBonus: 0.05, breakthroughRateBonus: 0.02 } },
];

export const CORE_TALENT_TREE_NODES: TalentTreeNodeDef[] = [
  { id: 'core:node_breath', talentId: 'core:breath_micro', tier: 1, cost: 1, prereqNodeIds: [], position: { x: 50, y: 8 } },
  { id: 'core:node_sturdy', talentId: 'core:sturdy_bones', tier: 1, cost: 1, prereqNodeIds: [], position: { x: 24, y: 24 } },
  { id: 'core:node_edge', talentId: 'core:first_edge', tier: 2, cost: 1, prereqNodeIds: ['core:node_sturdy'], position: { x: 18, y: 48 } },
  { id: 'core:node_wind', talentId: 'core:wind_step', tier: 2, cost: 1, prereqNodeIds: ['core:node_breath'], position: { x: 50, y: 44 } },
  { id: 'core:node_mind', talentId: 'core:clear_mind', tier: 2, cost: 1, prereqNodeIds: ['core:node_breath'], position: { x: 78, y: 48 } },
  { id: 'core:node_fortune', talentId: 'core:deep_fortune', tier: 3, cost: 2, prereqNodeIds: ['core:node_mind'], position: { x: 78, y: 72 } },
  { id: 'core:node_vessel', talentId: 'core:spirit_vessel', tier: 3, cost: 2, prereqNodeIds: ['core:node_wind'], position: { x: 50, y: 76 } },
  { id: 'core:node_star', talentId: 'core:star_blessing', tier: 4, cost: 3, prereqNodeIds: ['core:node_edge', 'core:node_fortune', 'core:node_vessel'], position: { x: 50, y: 94 } },
];

export function getDestinyTalentState(player: Player): DestinyTalentState {
  const raw = player.systems.destiny as Partial<DestinyTalentState> | undefined;
  return {
    talentPoints: typeof raw?.talentPoints === 'number' ? raw.talentPoints : DEFAULT_STATE.talentPoints,
    unlockedNodeIds: Array.isArray(raw?.unlockedNodeIds) ? raw.unlockedNodeIds : [],
    acquiredTalentIds: Array.isArray(raw?.acquiredTalentIds) ? raw.acquiredTalentIds : [],
  };
}

export function setDestinyTalentState(player: Player, state: DestinyTalentState): Player {
  return { ...player, systems: { ...player.systems, destiny: state } };
}

export function rollDestinyId(): string | null {
  const defs = getAllDestinyDefs();
  if (defs.length === 0) return null;
  const total = defs.reduce((sum, def) => sum + Math.max(0, def.weight), 0);
  let roll = Math.random() * total;
  for (const def of defs) {
    roll -= Math.max(0, def.weight);
    if (roll <= 0) return def.id;
  }
  return defs[defs.length - 1]?.id ?? null;
}

export function ensureDestinyTalentState(player: Player): Player {
  let p = player;
  const destinyId = p.destinyId ?? rollDestinyId();
  if (p.destinyId !== destinyId) p = { ...p, destinyId };
  const state = getDestinyTalentState(p);
  const acquired = new Set([...(p.talentIds ?? []), ...state.acquiredTalentIds]);
  p = { ...p, talentIds: Array.from(acquired) };
  return setDestinyTalentState(p, { ...state, acquiredTalentIds: Array.from(acquired) });
}

export function grantTalentPoints(player: Player, points: number): Player {
  const p = ensureDestinyTalentState(player);
  const state = getDestinyTalentState(p);
  return setDestinyTalentState(p, { ...state, talentPoints: state.talentPoints + points });
}

export function getBreakthroughTalentPointGain(realmIndex: number): number {
  return 1 + (realmIndex > 0 && realmIndex % 3 === 0 ? 1 : 0);
}

export function getActiveTalentDefs(player: Player): TalentDef[] {
  const p = ensureDestinyTalentState(player);
  const state = getDestinyTalentState(p);
  const ids = new Set([...(p.talentIds ?? []), ...state.acquiredTalentIds]);
  return Array.from(ids).map(id => getTalentDef(id)).filter((def): def is TalentDef => !!def);
}

export function getDestinyTalentEffects(player: Player): DestinyTalentEffect {
  const effects: DestinyTalentEffect[] = [];
  const destiny = player.destinyId ? getAllDestinyDefs().find(def => def.id === player.destinyId) : undefined;
  if (destiny) effects.push(destiny.effect);
  for (const talent of getActiveTalentDefs(player)) effects.push(talent.effect);
  return mergeEffects(effects);
}

export function unlockTalentNode(player: Player, nodeId: string): UnlockTalentNodeResult {
  const p = ensureDestinyTalentState(player);
  const state = getDestinyTalentState(p);
  const node = getTalentTreeNodeDef(nodeId);
  if (!node) return { success: false, player: p, message: DESTINY_TEXTS.logs.nodeNotFound };
  if (state.unlockedNodeIds.includes(nodeId)) return { success: false, player: p, message: DESTINY_TEXTS.logs.nodeAlreadyUnlocked };
  const talent = getTalentDef(node.talentId);
  if (!talent) return { success: false, player: p, message: DESTINY_TEXTS.logs.talentNotFound };
  if (state.talentPoints < node.cost) return { success: false, player: p, message: DESTINY_TEXTS.logs.insufficientPoints };
  const unlocked = new Set(state.unlockedNodeIds);
  if (!node.prereqNodeIds.every(id => unlocked.has(id))) {
    return { success: false, player: p, message: DESTINY_TEXTS.logs.prereqMissing };
  }
  const acquired = new Set([...(p.talentIds ?? []), ...state.acquiredTalentIds]);
  acquired.add(talent.id);
  const nextState: DestinyTalentState = {
    talentPoints: state.talentPoints - node.cost,
    unlockedNodeIds: [...state.unlockedNodeIds, nodeId],
    acquiredTalentIds: Array.from(acquired),
  };
  return {
    success: true,
    player: setDestinyTalentState({ ...p, talentIds: Array.from(acquired) }, nextState),
    message: DESTINY_TEXTS.logs.talentUnlocked(talent.name),
  };
}

export function getTalentNodeStatus(player: Player, node: TalentTreeNodeDef): 'unlocked' | 'available' | 'locked' {
  const state = getDestinyTalentState(player);
  if (state.unlockedNodeIds.includes(node.id)) return 'unlocked';
  const prereqReady = node.prereqNodeIds.every(id => state.unlockedNodeIds.includes(id));
  return prereqReady && state.talentPoints >= node.cost ? 'available' : 'locked';
}

export function describeEffect(effect: DestinyTalentEffect): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(effect.statBonuses ?? {}) as [DestinyTalentStatKey, number][]) {
    if (!value) continue;
    lines.push(DESTINY_TEXTS.effects.stat(getStatName(key), value));
  }
  for (const [key, value] of Object.entries(effect.statMultipliers ?? {}) as [DestinyTalentStatKey, number][]) {
    if (!value) continue;
    lines.push(DESTINY_TEXTS.effects.statPct(getStatName(key), Math.round(value * 100)));
  }
  if (effect.cultivationSpeedBonus) lines.push(DESTINY_TEXTS.effects.cultivation(Math.round(effect.cultivationSpeedBonus * 100)));
  if (effect.breakthroughRateBonus) lines.push(DESTINY_TEXTS.effects.breakthrough(Math.round(effect.breakthroughRateBonus * 100)));
  return lines;
}

export function getSortedTalentTreeNodes(): TalentTreeNodeDef[] {
  return getAllTalentTreeNodeDefs().sort((a, b) => a.tier - b.tier || a.position.y - b.position.y || a.position.x - b.position.x);
}

export function mergeEffects(effects: DestinyTalentEffect[]): DestinyTalentEffect {
  const merged: DestinyTalentEffect = { statBonuses: {}, statMultipliers: {}, cultivationSpeedBonus: 0, breakthroughRateBonus: 0 };
  for (const effect of effects) {
    for (const [key, value] of Object.entries(effect.statBonuses ?? {}) as [DestinyTalentStatKey, number][]) {
      merged.statBonuses![key] = (merged.statBonuses![key] ?? 0) + value;
    }
    for (const [key, value] of Object.entries(effect.statMultipliers ?? {}) as [DestinyTalentStatKey, number][]) {
      merged.statMultipliers![key] = (merged.statMultipliers![key] ?? 0) + value;
    }
    merged.cultivationSpeedBonus = (merged.cultivationSpeedBonus ?? 0) + (effect.cultivationSpeedBonus ?? 0);
    merged.breakthroughRateBonus = (merged.breakthroughRateBonus ?? 0) + (effect.breakthroughRateBonus ?? 0);
  }
  return merged;
}

function getStatName(key: DestinyTalentStatKey): string {
  const map: Record<DestinyTalentStatKey, string> = {
    maxHp: ATTR_NAMES.maxHp,
    maxMp: ATTR_NAMES.maxMp,
    maxStamina: ATTR_NAMES.maxStamina,
    maxMentalPower: ATTR_NAMES.maxMentalPower,
    atk: ATTR_NAMES.atk,
    def: ATTR_NAMES.def,
    speed: ATTR_NAMES.speed,
    skillResist: ATTR_NAMES.skillResist,
    spellResist: ATTR_NAMES.spellResist,
    critRate: ATTR_NAMES.critRate,
    critDmgMultiplier: ATTR_NAMES.critDmgMultiplier,
    critResist: ATTR_NAMES.critResist,
    moveSpeed: ATTR_NAMES.moveSpeed,
    luck: ATTR_NAMES.luck,
    comprehension: ATTR_NAMES.comprehension,
    charisma: ATTR_NAMES.charisma,
    lifespan: ATTR_NAMES.lifespan,
    inventoryCapacity: ATTR_NAMES.inventoryCapacity,
    maxPhysique: ATTR_NAMES.maxPhysique,
    physiqueDmgReduce: ATTR_NAMES.physiqueDmgReduce,
  };
  return map[key] ?? key;
}
