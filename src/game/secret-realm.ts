import type { Player } from './player';
import type { QuestReward, SecretRealmRun, SecretRealmSystemState } from './types';
import { getAllSecretRealmDefs, getItemDef, getMonster, getRegion, getSecretRealmDef } from './registry';
import { getCurrentRegion } from './map';
import { addItem, hasItem, removeItem } from './inventory';
import { runCombat } from './combat';
import { SECRET_REALM_TEXTS } from '../data/texts';

const DEFAULT_STATE: SecretRealmSystemState = { cooldowns: {}, completedRuns: {} };

export function getSecretRealmState(player: Player): SecretRealmSystemState {
  const raw = player.systems.secretRealm as Partial<SecretRealmSystemState> | undefined;
  return {
    cooldowns: raw?.cooldowns ?? {},
    activeRun: raw?.activeRun,
    completedRuns: raw?.completedRuns ?? {},
  };
}

export function setSecretRealmState(player: Player, state: SecretRealmSystemState): Player {
  return { ...player, systems: { ...player.systems, secretRealm: state } };
}

export function getAvailableSecretRealms(player: Player) {
  const region = getCurrentRegion(player);
  return getAllSecretRealmDefs().filter(def => def.regionId === region?.id || region?.regionTags.includes('mystic') || def.minRealm <= player.realmIndex);
}

export function startSecretRealm(player: Player, realmId: string): { player: Player; logs: string[] } {
  const def = getSecretRealmDef(realmId);
  if (!def) return { player, logs: [SECRET_REALM_TEXTS.notFound] };
  const state = getSecretRealmState(player);
  if (state.activeRun && !state.activeRun.completed && !state.activeRun.failed) return { player, logs: [SECRET_REALM_TEXTS.activeRunExists] };
  const lock = getSecretRealmLockReason(player, realmId);
  if (lock) return { player, logs: [lock] };
  let p = { ...player, stamina: player.stamina - def.entryCost.stamina, gold: player.gold - (def.entryCost.gold ?? 0) };
  if (def.entryCost.itemId && def.entryCost.itemCount) p = removeItem(p, def.entryCost.itemId, def.entryCost.itemCount);
  const run: SecretRealmRun = { realmId, startedAt: p.age, stageIndex: 0, rewards: {}, logs: [], completed: false, failed: false };
  p = setSecretRealmState(p, { ...state, activeRun: run });
  return { player: p, logs: [SECRET_REALM_TEXTS.started(def.name)] };
}

export function advanceSecretRealm(player: Player): { player: Player; logs: string[] } {
  const state = getSecretRealmState(player);
  const run = state.activeRun;
  if (!run) return { player, logs: [SECRET_REALM_TEXTS.noRun] };
  const def = getSecretRealmDef(run.realmId);
  if (!def) return { player, logs: [SECRET_REALM_TEXTS.notFound] };
  const stage = def.stages[run.stageIndex];
  if (!stage) return finishSecretRealm(player);
  let p = { ...player };
  const logs: string[] = [];
  let nextRun: SecretRealmRun = { ...run, rewards: { ...run.rewards }, logs: [...run.logs] };

  if (stage.type === 'treasure') {
    nextRun.rewards = mergeRewards(nextRun.rewards, stage.reward);
    logs.push(SECRET_REALM_TEXTS.stageTreasure(stage.title, describeReward(stage.reward)));
  } else if (stage.type === 'trap') {
    const hpLoss = Math.max(1, Math.floor(p.maxHp * (stage.damageRate ?? def.risk)));
    const mpLoss = Math.max(0, Math.floor(p.maxMp * (stage.mpDamageRate ?? def.risk / 2)));
    p.hp = Math.max(1, p.hp - hpLoss);
    p.mp = Math.max(0, p.mp - mpLoss);
    logs.push(SECRET_REALM_TEXTS.stageTrap(stage.title, hpLoss, mpLoss));
  } else if (stage.type === 'rest') {
    const hpGain = Math.max(1, Math.floor(p.maxHp * 0.2));
    const mpGain = Math.max(1, Math.floor(p.maxMp * 0.2));
    p.hp = Math.min(p.maxHp, p.hp + hpGain);
    p.mp = Math.min(p.maxMp, p.mp + mpGain);
    logs.push(SECRET_REALM_TEXTS.stageRest(stage.title, hpGain, mpGain));
  } else {
    const monster = stage.monsterId ? getMonster(stage.monsterId) : undefined;
    if (monster) {
      const result = runCombat(p, monster);
      p.hp = result.playerHpLeft;
      p.mp = Math.max(0, p.mp - result.mpUsed);
      if (result.winner === 'player') {
        nextRun.rewards = mergeRewards(nextRun.rewards, stage.reward);
        nextRun.rewards = mergeRewards(nextRun.rewards, { exp: result.expGained, gold: result.goldGained });
        logs.push(SECRET_REALM_TEXTS.stageCombatWin(stage.title, monster.name));
      } else {
        nextRun.failed = true;
        logs.push(SECRET_REALM_TEXTS.stageCombatLose(stage.title, monster.name));
      }
    }
  }

  nextRun = { ...nextRun, stageIndex: nextRun.stageIndex + 1, logs: [...nextRun.logs, ...logs] };
  if (!nextRun.failed && nextRun.stageIndex >= def.stages.length) {
    nextRun.completed = true;
    nextRun.rewards = mergeRewards(nextRun.rewards, def.completionReward);
  }
  p = setSecretRealmState(p, { ...getSecretRealmState(p), activeRun: nextRun });
  return { player: p, logs };
}

export function finishSecretRealm(player: Player): { player: Player; logs: string[] } {
  const state = getSecretRealmState(player);
  const run = state.activeRun;
  if (!run) return { player, logs: [SECRET_REALM_TEXTS.noRun] };
  const def = getSecretRealmDef(run.realmId);
  if (!def) return { player, logs: [SECRET_REALM_TEXTS.notFound] };
  let p = { ...player };
  const logs: string[] = [];
  if (run.completed) {
    const reward = applyRealmReward(p, run.rewards);
    p = reward.player;
    logs.push(SECRET_REALM_TEXTS.completed(def.name, reward.logs.join('、')));
  } else {
    logs.push(SECRET_REALM_TEXTS.failed(def.name));
  }
  const nextState: SecretRealmSystemState = {
    cooldowns: { ...state.cooldowns, [def.id]: p.age + def.cooldownMonths },
    completedRuns: { ...state.completedRuns, [def.id]: (state.completedRuns[def.id] ?? 0) + (run.completed ? 1 : 0) },
  };
  p = setSecretRealmState(p, nextState);
  return { player: p, logs };
}

export function getSecretRealmLockReason(player: Player, realmId: string): string | null {
  const def = getSecretRealmDef(realmId);
  if (!def) return SECRET_REALM_TEXTS.notFound;
  const state = getSecretRealmState(player);
  if (player.realmIndex < def.minRealm) return SECRET_REALM_TEXTS.lockedRealm;
  if (getCurrentRegion(player)?.id !== def.regionId) return SECRET_REALM_TEXTS.lockedRegion;
  if ((state.cooldowns[realmId] ?? 0) > player.age) return SECRET_REALM_TEXTS.lockedCooldown;
  if (player.stamina < def.entryCost.stamina || player.gold < (def.entryCost.gold ?? 0)) return SECRET_REALM_TEXTS.insufficientCost;
  if (def.entryCost.itemId && def.entryCost.itemCount && !hasItem(player, def.entryCost.itemId, def.entryCost.itemCount)) return SECRET_REALM_TEXTS.insufficientCost;
  return null;
}

export function getSecretRealmCooldownAge(player: Player, realmId: string): number {
  return getSecretRealmState(player).cooldowns[realmId] ?? 0;
}

function mergeRewards(base: QuestReward, extra?: QuestReward): QuestReward {
  if (!extra) return base;
  const itemMap = new Map<string, number>();
  for (const item of base.items ?? []) itemMap.set(item.itemId, (itemMap.get(item.itemId) ?? 0) + item.count);
  for (const item of extra.items ?? []) itemMap.set(item.itemId, (itemMap.get(item.itemId) ?? 0) + item.count);
  return {
    exp: (base.exp ?? 0) + (extra.exp ?? 0),
    gold: (base.gold ?? 0) + (extra.gold ?? 0),
    items: Array.from(itemMap.entries()).map(([itemId, count]) => ({ itemId, count })),
  };
}

function applyRealmReward(player: Player, reward: QuestReward): { player: Player; logs: string[] } {
  let p = { ...player };
  const logs: string[] = [];
  if (reward.exp) {
    p.exp += reward.exp;
    logs.push(SECRET_REALM_TEXTS.rewardExp(reward.exp));
  }
  if (reward.gold) {
    p.gold += reward.gold;
    logs.push(SECRET_REALM_TEXTS.rewardGold(reward.gold));
  }
  for (const item of reward.items ?? []) {
    const result = addItem(p, item.itemId, item.count);
    p = result.player;
    logs.push(SECRET_REALM_TEXTS.rewardItem(getItemDef(item.itemId)?.name ?? item.itemId, item.count));
  }
  return { player: p, logs };
}

function describeReward(reward?: QuestReward): string {
  if (!reward) return SECRET_REALM_TEXTS.rewardGold(0);
  const parts: string[] = [];
  if (reward.exp) parts.push(SECRET_REALM_TEXTS.rewardExp(reward.exp));
  if (reward.gold) parts.push(SECRET_REALM_TEXTS.rewardGold(reward.gold));
  for (const item of reward.items ?? []) parts.push(SECRET_REALM_TEXTS.rewardItem(getItemDef(item.itemId)?.name ?? item.itemId, item.count));
  return parts.join('、');
}

export function getSecretRealmRegionName(realmId: string): string {
  const def = getSecretRealmDef(realmId);
  return def ? getRegion(def.regionId)?.name ?? def.regionId : '';
}
