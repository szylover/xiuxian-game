import type { Player } from './player';
import type { SectDef, SectFacilityDef, SectManagementState, SectMemberState, SectRankDef, SectResources, SectStoreItemDef, SectSystemState } from './types';
import { getAllSectDefs, getItemDef, getSectDef, getTechniqueDef } from './registry';
import { addItem, hasItem, removeItem } from './inventory';
import { changeKarma } from './karma';
import { SECT_TEXTS, ATTR_NAMES, SEPARATOR } from '../data/texts';

const DEFAULT_STATE: SectSystemState = {
  sectId: null,
  rankId: null,
  contribution: 0,
  totalContribution: 0,
  joinedAt: -1,
  claimedStipendYear: 0,
  missionCooldowns: {},
  storePurchases: {},
};

const MANAGEMENT_ENTRY_GOLD = 500;
const MANAGEMENT_ENTRY_CONTRIBUTION = 300;

export function getSectState(player: Player): SectSystemState {
  const raw = player.systems.sect as Partial<SectSystemState> | undefined;
  return {
    sectId: typeof raw?.sectId === 'string' ? raw.sectId : null,
    rankId: typeof raw?.rankId === 'string' ? raw.rankId : null,
    contribution: typeof raw?.contribution === 'number' ? raw.contribution : 0,
    totalContribution: typeof raw?.totalContribution === 'number' ? raw.totalContribution : 0,
    joinedAt: typeof raw?.joinedAt === 'number' ? raw.joinedAt : -1,
    claimedStipendYear: typeof raw?.claimedStipendYear === 'number' ? raw.claimedStipendYear : 0,
    missionCooldowns: raw?.missionCooldowns ?? {},
    storePurchases: raw?.storePurchases ?? {},
    management: normalizeManagement(raw?.management),
  };
}

export function setSectState(player: Player, state: SectSystemState): Player {
  return { ...player, systems: { ...player.systems, sect: state } };
}

export function getAvailableSects(player: Player): SectDef[] {
  return getAllSectDefs().filter(def => !getJoinLockReason(player, def.id));
}

export function getJoinLockReason(player: Player, sectId: string): string | null {
  const def = getSectDef(sectId);
  if (!def) return SECT_TEXTS.logs.sectNotFound;
  const state = getSectState(player);
  if (state.sectId) return SECT_TEXTS.logs.alreadyJoined;
  if (player.realmIndex < def.minRealm) return SECT_TEXTS.logs.conditionRealm;
  if (def.minKarma !== undefined && player.karma < def.minKarma) return SECT_TEXTS.logs.conditionKarma;
  if (def.maxKarma !== undefined && player.karma > def.maxKarma) return SECT_TEXTS.logs.conditionKarma;
  if ((def.entryGold ?? 0) > player.gold) return SECT_TEXTS.logs.conditionGold;
  return null;
}

export function joinSect(player: Player, sectId: string) {
  const def = getSectDef(sectId);
  if (!def) return { player, logs: [SECT_TEXTS.logs.sectNotFound] };
  const lock = getJoinLockReason(player, sectId);
  if (lock) return { player, logs: [lock] };
  const firstRank = def.ranks[0];
  let p = { ...player, gold: player.gold - (def.entryGold ?? 0) };
  p = setSectState(p, {
    ...DEFAULT_STATE,
    sectId,
    rankId: firstRank.id,
    joinedAt: player.age,
  });
  return { player: p, logs: [SECT_TEXTS.logs.joined(def.name, firstRank.name)] };
}

export function claimSectStipend(player: Player) {
  const ctx = getMembership(player);
  if (!ctx) return { player, logs: [SECT_TEXTS.logs.notJoined] };
  const { state, def, rank } = ctx;
  if (state.claimedStipendYear === player.gameYear) return { player, logs: [SECT_TEXTS.logs.stipendClaimedThisYear] };
  let p = { ...player, gold: player.gold + rank.stipendGold };
  p = updateContribution(p, rank.stipendContribution);
  p = setSectState(p, { ...getSectState(p), claimedStipendYear: p.gameYear });
  return { player: p, logs: [SECT_TEXTS.logs.stipendClaimed(rank.stipendGold, rank.stipendContribution)] };
}

export function advanceSectRank(player: Player) {
  const ctx = getMembership(player);
  if (!ctx) return { player, logs: [SECT_TEXTS.logs.notJoined] };
  const { state, def, rank } = ctx;
  const rankIndex = getRankIndex(def, rank.id);
  const next = def.ranks[rankIndex + 1];
  if (!next) return { player, logs: [SECT_TEXTS.logs.rankNoNext] };
  if (state.totalContribution < next.minContribution) return { player, logs: [SECT_TEXTS.logs.rankContribution] };
  const p = setSectState(player, { ...state, rankId: next.id });
  return { player: p, logs: [SECT_TEXTS.logs.rankAdvanced(next.name)] };
}

export function completeSectMission(player: Player, missionId: string) {
  const ctx = getMembership(player);
  if (!ctx) return { player, logs: [SECT_TEXTS.logs.notJoined] };
  const { state, def, rank } = ctx;
  const mission = def.missions.find(m => m.id === missionId);
  if (!mission) return { player, logs: [SECT_TEXTS.logs.sectNotFound] };
  if (getRankIndex(def, rank.id) < getRankIndex(def, mission.minRankId)) return { player, logs: [SECT_TEXTS.logs.missionLocked] };
  const availableAt = state.missionCooldowns[missionId] ?? 0;
  if (availableAt > player.age) return { player, logs: [SECT_TEXTS.logs.missionCooldown(availableAt - player.age)] };
  if ((mission.staminaCost ?? 0) > player.stamina) return { player, logs: [SECT_TEXTS.logs.costStamina] };
  if ((mission.goldCost ?? 0) > player.gold) return { player, logs: [SECT_TEXTS.logs.costGold] };
  if (mission.itemCost && !hasItem(player, mission.itemCost.itemId, mission.itemCost.count)) return { player, logs: [SECT_TEXTS.logs.costItem] };

  let p = { ...player, stamina: player.stamina - (mission.staminaCost ?? 0), gold: player.gold - (mission.goldCost ?? 0) };
  if (mission.itemCost) p = removeItem(p, mission.itemCost.itemId, mission.itemCost.count);
  const rewards: string[] = [];
  if (mission.reward.exp) {
    p.exp += mission.reward.exp;
    rewards.push(SECT_TEXTS.reward.exp(mission.reward.exp));
  }
  if (mission.reward.gold) {
    p.gold += mission.reward.gold;
    rewards.push(SECT_TEXTS.reward.gold(mission.reward.gold));
  }
  for (const item of mission.reward.items ?? []) {
    const added = addItem(p, item.itemId, item.count);
    p = added.player;
    rewards.push(SECT_TEXTS.reward.item(getItemDef(item.itemId)?.name ?? item.itemId, item.count));
  }
  if (mission.reward.contribution) {
    p = updateContribution(p, mission.reward.contribution);
    rewards.push(SECT_TEXTS.reward.contribution(mission.reward.contribution));
  }
  if (mission.reward.karmaChange) {
    const karmaResult = changeKarma(p, mission.reward.karmaChange, mission.title);
    p = karmaResult.player;
    rewards.push(SECT_TEXTS.reward.karma(mission.reward.karmaChange));
  }
  if (mission.reward.sectPrestige) {
    p = addManagementResources(p, { prestige: mission.reward.sectPrestige });
    rewards.push(SECT_TEXTS.reward.prestige(mission.reward.sectPrestige));
  }
  p = setSectState(p, {
    ...getSectState(p),
    missionCooldowns: { ...getSectState(p).missionCooldowns, [missionId]: p.age + mission.repeatCooldownMonths },
  });
  return { player: p, logs: [SECT_TEXTS.logs.missionDone(mission.title, rewards.join(SEPARATOR))] };
}

export function buySectStoreItem(player: Player, itemId: string) {
  const ctx = getMembership(player);
  if (!ctx) return { player, logs: [SECT_TEXTS.logs.notJoined] };
  const { state, def, rank } = ctx;
  const item = def.store.find(s => s.itemId === itemId);
  if (!item) return { player, logs: [SECT_TEXTS.logs.sectNotFound] };
  if (getRankIndex(def, rank.id) < getRankIndex(def, item.minRankId)) return { player, logs: [SECT_TEXTS.logs.storeRank] };
  if (state.contribution < item.contributionCost) return { player, logs: [SECT_TEXTS.logs.storeContribution] };
  if (item.stockPerYear && (state.storePurchases[itemId] ?? 0) >= item.stockPerYear) return { player, logs: [SECT_TEXTS.logs.storeStock] };
  const added = addItem(player, itemId, 1);
  const nextState = getSectState(added.player);
  const p = setSectState(added.player, {
    ...nextState,
    contribution: nextState.contribution - item.contributionCost,
    storePurchases: { ...nextState.storePurchases, [itemId]: (nextState.storePurchases[itemId] ?? 0) + 1 },
  });
  return { player: p, logs: [SECT_TEXTS.logs.storeBought(getItemDef(itemId)?.name ?? itemId, item.contributionCost)] };
}

export function getSectRank(player: Player): SectRankDef | null {
  const ctx = getMembership(player);
  return ctx?.rank ?? null;
}

export function getSectCultivationBonus(player: Player): number {
  const ctx = getMembership(player);
  if (!ctx) return 0;
  const management = ctx.state.management;
  const facilityBonus = management?.active ? getFacilityEffectTotal(ctx.def, management, 'cultivationBonus') : 0;
  return ctx.rank.cultivationBonus + facilityBonus;
}

export function getSectStatBonuses(player: Player): Partial<Record<'atk' | 'def' | 'hp' | 'mp' | 'speed', number>> {
  return getSectRank(player)?.statBonuses ?? {};
}

export function foundSectManagement(player: Player) {
  const ctx = getMembership(player);
  if (!ctx) return { player, logs: [SECT_TEXTS.logs.managementNeedSect] };
  if (getRankIndex(ctx.def, ctx.rank.id) < 1 || ctx.state.totalContribution < MANAGEMENT_ENTRY_CONTRIBUTION) {
    return { player, logs: [SECT_TEXTS.logs.managementNeedRank] };
  }
  if (player.gold < MANAGEMENT_ENTRY_GOLD) return { player, logs: [SECT_TEXTS.logs.managementNeedGold] };
  const management: SectManagementState = {
    active: true,
    foundedAt: player.age,
    members: [],
    resources: { treasury: 200, herbs: 20, ore: 20, morale: 60, prestige: 10 },
    facilities: Object.fromEntries(ctx.def.facilities.map(f => [f.id, 0])),
    lastYieldAge: player.age,
  };
  const p = setSectState({ ...player, gold: player.gold - MANAGEMENT_ENTRY_GOLD }, { ...ctx.state, management });
  return { player: p, logs: [SECT_TEXTS.logs.managementFounded] };
}

export function recruitSectMember(player: Player) {
  const ctx = getMembership(player);
  if (!ctx?.state.management?.active) return { player, logs: [SECT_TEXTS.logs.managementNeedSect] };
  const management = ctx.state.management;
  if (management.resources.prestige < 5 || management.resources.morale < 20) return { player, logs: [SECT_TEXTS.logs.recruitNeedResources] };
  const name = SECT_TEXTS.generatedMembers[management.members.length % SECT_TEXTS.generatedMembers.length];
  const member: SectMemberState = {
    id: `${ctx.def.id}:member:${player.age}:${management.members.length}`,
    name,
    role: management.members.length >= 4 ? 'steward' : 'disciple',
    loyalty: Math.min(95, 55 + management.resources.morale),
    cultivation: Math.max(1, player.realmIndex * 20 + management.members.length * 5),
    task: 'idle',
  };
  const next = {
    ...management,
    members: [...management.members, member],
    resources: { ...management.resources, prestige: management.resources.prestige - 5, morale: management.resources.morale - 5 },
  };
  return { player: setSectState(player, { ...ctx.state, management: next }), logs: [SECT_TEXTS.logs.memberRecruited(name)] };
}

export function assignSectMemberTask(player: Player, memberId: string, task: SectMemberState['task']) {
  const ctx = getMembership(player);
  const management = ctx?.state.management;
  if (!ctx || !management?.active) return { player, logs: [SECT_TEXTS.logs.managementNeedSect] };
  const member = management.members.find(m => m.id === memberId);
  if (!member) return { player, logs: [SECT_TEXTS.logs.memberMissing] };
  const members = management.members.map(m => m.id === memberId ? { ...m, task } : m);
  return {
    player: setSectState(player, { ...ctx.state, management: { ...management, members } }),
    logs: [SECT_TEXTS.logs.taskAssigned(member.name, SECT_TEXTS.taskNames[task])],
  };
}

export function upgradeSectFacility(player: Player, facilityId: string) {
  const ctx = getMembership(player);
  const management = ctx?.state.management;
  if (!ctx || !management?.active) return { player, logs: [SECT_TEXTS.logs.managementNeedSect] };
  const facility = ctx.def.facilities.find(f => f.id === facilityId);
  if (!facility) return { player, logs: [SECT_TEXTS.logs.facilityMissing] };
  const level = management.facilities[facilityId] ?? 0;
  if (level >= facility.maxLevel) return { player, logs: [SECT_TEXTS.logs.facilityMax] };
  if (!canPayResources(management.resources, facility.upgradeCost)) return { player, logs: [SECT_TEXTS.logs.facilityCost] };
  const resources = payResources(management.resources, facility.upgradeCost);
  const next = { ...management, resources, facilities: { ...management.facilities, [facilityId]: level + 1 } };
  return { player: setSectState(player, { ...ctx.state, management: next }), logs: [SECT_TEXTS.logs.facilityUpgraded(facility.name, level + 1)] };
}

export function collectSectYield(player: Player) {
  const ctx = getMembership(player);
  const management = ctx?.state.management;
  if (!ctx || !management?.active) return { player, logs: [SECT_TEXTS.logs.managementNeedSect] };
  const months = player.age - management.lastYieldAge;
  if (months < 1) return { player, logs: [SECT_TEXTS.logs.yieldTooSoon] };
  const gather = management.members.filter(m => m.task === 'gather').length;
  const cultivate = management.members.filter(m => m.task === 'cultivate').length;
  const guard = management.members.filter(m => m.task === 'guard').length;
  const treasury = months * (20 + gather * 8 + getFacilityEffectTotal(ctx.def, management, 'treasuryYield'));
  const herbs = months * (4 + gather * 3 + getFacilityEffectTotal(ctx.def, management, 'herbYield'));
  const ore = months * (4 + gather * 2 + getFacilityEffectTotal(ctx.def, management, 'oreYield'));
  const morale = Math.min(100, management.resources.morale + guard * 2 - Math.max(0, management.members.length - guard));
  const prestige = management.resources.prestige + guard + Math.floor(cultivate / 2);
  const members = management.members.map(m => ({
    ...m,
    cultivation: m.cultivation + (m.task === 'cultivate' ? months * 8 : months * 2),
    loyalty: Math.min(100, m.loyalty + (m.task === 'idle' ? 1 : 0)),
  }));
  const resources = {
    treasury: management.resources.treasury + treasury,
    herbs: management.resources.herbs + herbs,
    ore: management.resources.ore + ore,
    morale,
    prestige,
  };
  const summary = [
    SECT_TEXTS.reward.gold(treasury),
    SECT_TEXTS.reward.item(SECT_TEXTS.panel.resourcesTitle, herbs + ore),
    SECT_TEXTS.reward.prestige(prestige - management.resources.prestige),
  ].join(SEPARATOR);
  return {
    player: setSectState(player, { ...ctx.state, management: { ...management, members, resources, lastYieldAge: player.age } }),
    logs: [SECT_TEXTS.logs.yieldCollected(summary)],
  };
}

export function describeSectBenefits(player: Player): string[] {
  const ctx = getMembership(player);
  if (!ctx) return [];
  const stat = getSectStatBonuses(player);
  const lines = [SECT_TEXTS.panel.cultivationBonus(Math.round(getSectCultivationBonus(player) * 100))];
  const statMap = { atk: ATTR_NAMES.atk, def: ATTR_NAMES.def, hp: ATTR_NAMES.maxHp, mp: ATTR_NAMES.maxMp, speed: ATTR_NAMES.speed };
  for (const [key, value] of Object.entries(stat) as [keyof typeof statMap, number][]) {
    if (value) lines.push(SECT_TEXTS.panel.statBonus(statMap[key], value));
  }
  const techniqueNames = ctx.rank.techniqueIds.map(id => getTechniqueDef(id)?.name ?? id).join(SEPARATOR) || SECT_TEXTS.state.none;
  lines.push(SECT_TEXTS.panel.techniques(techniqueNames));
  return lines;
}

function getMembership(player: Player): { state: SectSystemState; def: SectDef; rank: SectRankDef } | null {
  const state = getSectState(player);
  if (!state.sectId || !state.rankId) return null;
  const def = getSectDef(state.sectId);
  const rank = def?.ranks.find(r => r.id === state.rankId);
  if (!def || !rank) return null;
  return { state, def, rank };
}

function updateContribution(player: Player, amount: number): Player {
  const state = getSectState(player);
  return setSectState(player, {
    ...state,
    contribution: state.contribution + amount,
    totalContribution: state.totalContribution + Math.max(0, amount),
  });
}

function getRankIndex(def: SectDef, rankId: string): number {
  return Math.max(0, def.ranks.findIndex(r => r.id === rankId));
}

function normalizeManagement(raw: SectSystemState['management']): SectManagementState | undefined {
  if (!raw?.active) return raw;
  return {
    active: true,
    foundedAt: raw.foundedAt,
    members: raw.members ?? [],
    resources: raw.resources ?? { treasury: 0, herbs: 0, ore: 0, morale: 50, prestige: 0 },
    facilities: raw.facilities ?? {},
    lastYieldAge: typeof raw.lastYieldAge === 'number' ? raw.lastYieldAge : raw.foundedAt,
  };
}

function addManagementResources(player: Player, delta: Partial<SectResources>): Player {
  const state = getSectState(player);
  if (!state.management?.active) return player;
  const resources = { ...state.management.resources };
  for (const [key, value] of Object.entries(delta) as [keyof SectResources, number][]) {
    resources[key] += value;
  }
  return setSectState(player, { ...state, management: { ...state.management, resources } });
}

function canPayResources(resources: SectResources, cost: SectFacilityDef['upgradeCost']): boolean {
  return resources.treasury >= cost.treasury
    && resources.herbs >= (cost.herbs ?? 0)
    && resources.ore >= (cost.ore ?? 0)
    && resources.prestige >= (cost.prestige ?? 0);
}

function payResources(resources: SectResources, cost: SectFacilityDef['upgradeCost']): SectResources {
  return {
    ...resources,
    treasury: resources.treasury - cost.treasury,
    herbs: resources.herbs - (cost.herbs ?? 0),
    ore: resources.ore - (cost.ore ?? 0),
    prestige: resources.prestige - (cost.prestige ?? 0),
  };
}

function getFacilityEffectTotal(def: SectDef, management: SectManagementState, key: keyof SectFacilityDef['effects']): number {
  return def.facilities.reduce((sum, facility) => sum + (management.facilities[facility.id] ?? 0) * (facility.effects[key] ?? 0), 0);
}
