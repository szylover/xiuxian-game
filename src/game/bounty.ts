import type { Player } from './player';
import type { BountySystemState, GeneratedBounty, ActiveBounty, BountyObjectiveDef, QuestReward, QuestTrigger } from './types';
import { getAllBountyTemplateDefs, getItemDef, getMonster, getRegion } from './registry';
import { getCurrentRegion } from './map';
import { hasItem, addItem } from './inventory';
import { BOUNTY_TEXTS } from '../data/texts';

const BOARD_SIZE = 3;
const MAX_ACTIVE = 2;
const REFRESH_MONTHS = 3;

const DEFAULT_STATE: BountySystemState = {
  available: [],
  active: {},
  completed: {},
  lastRefreshAge: -1,
  reputation: 0,
};

export function getBountyState(player: Player): BountySystemState {
  const raw = player.systems.bounty as Partial<BountySystemState> | undefined;
  return {
    available: raw?.available ?? [],
    active: raw?.active ?? {},
    completed: raw?.completed ?? {},
    lastRefreshAge: typeof raw?.lastRefreshAge === 'number' ? raw.lastRefreshAge : -1,
    reputation: typeof raw?.reputation === 'number' ? raw.reputation : 0,
  };
}

export function setBountyState(player: Player, state: BountySystemState): Player {
  return { ...player, systems: { ...player.systems, bounty: state } };
}

export function ensureBountyBoard(player: Player, force = false): Player {
  const state = getBountyState(player);
  const shouldRefresh = force || state.lastRefreshAge < 0 || player.age - state.lastRefreshAge >= REFRESH_MONTHS;
  if (!shouldRefresh) return expireBounties(player);
  return setBountyState(player, { ...state, available: generateBoard(player), lastRefreshAge: player.age });
}

export function refreshBountyBoard(player: Player): { player: Player; logs: string[] } {
  return { player: ensureBountyBoard(player, true), logs: [BOUNTY_TEXTS.refreshed] };
}

export function acceptBounty(player: Player, bountyId: string): { player: Player; logs: string[] } {
  let p = ensureBountyBoard(player);
  const state = getBountyState(p);
  if (Object.keys(state.active).length >= MAX_ACTIVE) return { player: p, logs: [BOUNTY_TEXTS.maxActive] };
  const bounty = state.available.find(b => b.id === bountyId);
  if (!bounty) return { player: p, logs: [BOUNTY_TEXTS.notFound] };
  const active: ActiveBounty = { ...bounty, acceptedAt: p.age, progress: getCurrentProgress(p, bounty.objective), completed: false };
  const nextState = {
    ...state,
    available: state.available.filter(b => b.id !== bountyId),
    active: { ...state.active, [bountyId]: active },
  };
  p = setBountyState(p, nextState);
  return { player: p, logs: [BOUNTY_TEXTS.accepted(bounty.title)] };
}

export function tickBountyObjectives(player: Player, trigger: QuestTrigger): { player: Player; logs: string[] } {
  let p = expireBounties(player);
  const state = getBountyState(p);
  const active = { ...state.active };
  let changed = false;
  for (const [id, bounty] of Object.entries(active)) {
    if (bounty.completed) continue;
    const delta = getTriggerDelta(p, bounty.objective, trigger);
    const current = Math.min(bounty.objective.count, Math.max(bounty.progress, getCurrentProgress(p, bounty.objective)) + delta);
    const completed = current >= bounty.objective.count;
    if (current !== bounty.progress || completed !== bounty.completed) {
      active[id] = { ...bounty, progress: current, completed };
      changed = true;
    }
  }
  if (!changed) return { player: p, logs: [] };
  p = setBountyState(p, { ...state, active });
  return { player: p, logs: [] };
}

export function claimBounty(player: Player, bountyId: string): { player: Player; logs: string[] } {
  let p = tickBountyObjectives(player, { type: 'item_change' }).player;
  const state = getBountyState(p);
  const bounty = state.active[bountyId];
  if (!bounty) return { player: p, logs: [BOUNTY_TEXTS.notFound] };
  if (!bounty.completed) return { player: p, logs: [BOUNTY_TEXTS.notFound] };
  const rewardResult = applyBountyReward(p, bounty.rewards);
  p = rewardResult.player;
  const { [bountyId]: _, ...rest } = state.active;
  const nextState: BountySystemState = {
    ...getBountyState(p),
    active: rest,
    completed: { ...state.completed, [bountyId]: { completedAt: p.age, templateId: bounty.templateId } },
    reputation: state.reputation + bounty.reputation,
  };
  p = setBountyState(p, nextState);
  const rewards = [...rewardResult.logs, BOUNTY_TEXTS.rewardReputation(bounty.reputation)].join('、');
  return { player: p, logs: [BOUNTY_TEXTS.claimed(bounty.title, rewards)] };
}

export function describeBountyObjective(obj: BountyObjectiveDef): string {
  if (obj.type === 'kill_monster') return BOUNTY_TEXTS.objective.kill_monster(getMonster(obj.targetId)?.name ?? obj.targetId, obj.count);
  if (obj.type === 'collect_item') return BOUNTY_TEXTS.objective.collect_item(getItemDef(obj.targetId)?.name ?? obj.targetId, obj.count);
  return BOUNTY_TEXTS.objective.reach_region(getRegion(obj.targetId)?.name ?? obj.targetId);
}

function expireBounties(player: Player): Player {
  const state = getBountyState(player);
  const available = state.available.filter(b => b.expiresAt > player.age);
  const active = Object.fromEntries(Object.entries(state.active).filter(([, b]) => b.expiresAt > player.age));
  if (available.length === state.available.length && Object.keys(active).length === Object.keys(state.active).length) return player;
  return setBountyState(player, { ...state, available, active });
}

function generateBoard(player: Player): GeneratedBounty[] {
  const regionTags = getCurrentRegion(player)?.regionTags ?? [];
  const pool = getAllBountyTemplateDefs().filter(t => player.realmIndex >= t.minRealm
    && (t.maxRealm === undefined || player.realmIndex <= t.maxRealm)
    && (!t.regionTags.length || t.regionTags.some(tag => regionTags.includes(tag))));
  const board: GeneratedBounty[] = [];
  const used = new Set<string>();
  for (let i = 0; i < BOARD_SIZE && used.size < pool.length; i += 1) {
    const template = weightedPick(pool.filter(t => !used.has(t.id)));
    if (!template) break;
    used.add(template.id);
    board.push({
      id: `${template.id}:${player.age}:${i}`,
      templateId: template.id,
      title: template.title,
      description: template.description,
      issuer: template.issuer,
      icon: template.icon,
      createdAt: player.age,
      expiresAt: player.age + template.durationMonths,
      objective: template.objective,
      rewards: template.rewards,
      reputation: template.reputation,
    });
  }
  return board;
}

function weightedPick<T extends { weight: number }>(items: T[]): T | undefined {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= Math.max(0, item.weight);
    if (roll <= 0) return item;
  }
  return items[0];
}

function getTriggerDelta(player: Player, obj: BountyObjectiveDef, trigger: QuestTrigger): number {
  if (obj.type === 'kill_monster' && trigger.type === 'kill_monster' && trigger.monsterId === obj.targetId) return 1;
  if (obj.type === 'reach_region' && trigger.type === 'reach_region' && trigger.regionId === obj.targetId) return obj.count;
  if (obj.type === 'collect_item' && ['item_change', 'explore', 'combat', 'craft_item'].includes(trigger.type)) {
    return hasItem(player, obj.targetId, obj.count) ? obj.count : 0;
  }
  return 0;
}

function getCurrentProgress(player: Player, obj: BountyObjectiveDef): number {
  if (obj.type === 'collect_item') return hasItem(player, obj.targetId, obj.count) ? obj.count : 0;
  const currentRegion = getCurrentRegion(player);
  if (obj.type === 'reach_region' && currentRegion?.id === obj.targetId) return obj.count;
  return 0;
}

function applyBountyReward(player: Player, reward: QuestReward): { player: Player; logs: string[] } {
  let p = { ...player };
  const logs: string[] = [];
  if (reward.exp) {
    p.exp += reward.exp;
    logs.push(BOUNTY_TEXTS.rewardExp(reward.exp));
  }
  if (reward.gold) {
    p.gold += reward.gold;
    logs.push(BOUNTY_TEXTS.rewardGold(reward.gold));
  }
  for (const item of reward.items ?? []) {
    const result = addItem(p, item.itemId, item.count);
    p = result.player;
    logs.push(BOUNTY_TEXTS.rewardItem(getItemDef(item.itemId)?.name ?? item.itemId, item.count));
  }
  return { player: p, logs };
}
