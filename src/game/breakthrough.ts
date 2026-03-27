// ============================================================
// breakthrough.ts — 突破系统（T0029）
// 纯逻辑壳子：检查突破条件、消耗物品、掷骰突破
// 所有突破需求数据通过 DLC 注册
// ============================================================

import type { Player } from './player';
import { recalcStats, getNextRealm } from './player';
import { REALMS, BREAKTHROUGH_BASE_RATE, BREAKTHROUGH_COMP_BONUS, BREAKTHROUGH_LUCK_BONUS, BREAKTHROUGH_FAIL_EXP_LOSS } from './data';
import { getBreakthroughReq, getItemDef } from './registry';
import type { BreakthroughReqDef } from './registry';
import { hasItem, removeItem, addItem } from './inventory';

// ── 突破状态 ──

export interface ItemCheckResult {
  itemId: string;
  name: string;
  required: number;
  have: number;
  ready: boolean;
}

export interface CondCheckResult {
  id: string;
  description: string;
  ready: boolean;
}

export interface BreakthroughStatus {
  canAttempt: boolean;
  nextRealm: typeof REALMS[number] | null;
  req: BreakthroughReqDef | null;
  expReady: boolean;
  itemsReady: ItemCheckResult[];
  conditionsReady: CondCheckResult[];
  requiresTribulation: boolean;
  successRate: number;
}

// ── 获取突破系统状态 ──

function getBreakthroughState(player: Player): { failedAttempts: Record<number, number>; tribulationsPassed: string[]; isLooseImmortal: boolean } {
  const sys = (player.systems.breakthrough ?? {}) as Record<string, unknown>;
  return {
    failedAttempts: (sys.failedAttempts ?? {}) as Record<number, number>,
    tribulationsPassed: (sys.tribulationsPassed ?? []) as string[],
    isLooseImmortal: (sys.isLooseImmortal ?? false) as boolean,
  };
}

function setBreakthroughState(player: Player, state: ReturnType<typeof getBreakthroughState>): Player {
  return { ...player, systems: { ...player.systems, breakthrough: state } };
}

// ── 查询突破状态 ──

export function getBreakthroughStatus(player: Player): BreakthroughStatus {
  const nextRealm = getNextRealm(player);
  if (!nextRealm) {
    return { canAttempt: false, nextRealm: null, req: null, expReady: false, itemsReady: [], conditionsReady: [], requiresTribulation: false, successRate: 0 };
  }

  const req = getBreakthroughReq(player.realmIndex);
  const expReady = player.exp >= nextRealm.expReq;

  // 物品检查
  const itemsReady: ItemCheckResult[] = (req?.itemCosts ?? []).map(cost => {
    const def = getItemDef(cost.itemId);
    const have = player.inventory.find(s => s.itemId === cost.itemId)?.count ?? 0;
    return {
      itemId: cost.itemId,
      name: def?.name ?? cost.itemId,
      required: cost.count,
      have,
      ready: have >= cost.count,
    };
  });

  // 条件检查
  const conditionsReady: CondCheckResult[] = (req?.conditions ?? []).map(cond => ({
    id: cond.id,
    description: cond.description,
    ready: cond.check(player),
  }));

  const requiresTribulation = req?.requiresTribulation ?? false;

  // 成功率
  const btState = getBreakthroughState(player);
  const failCount = btState.failedAttempts[player.realmIndex] ?? 0;
  const baseRate = req?.baseSuccessRate ?? BREAKTHROUGH_BASE_RATE;
  const compBonus = player.comprehension * BREAKTHROUGH_COMP_BONUS;
  const luckBonus = player.luck * BREAKTHROUGH_LUCK_BONUS;
  const failBonus = Math.min(0.25, failCount * 0.05);
  const successRate = requiresTribulation ? 0 : Math.min(0.95, baseRate + compBonus + luckBonus + failBonus);

  const allItemsReady = itemsReady.every(i => i.ready);
  const allConditionsReady = conditionsReady.every(c => c.ready);
  const canAttempt = expReady && allItemsReady && allConditionsReady;

  return { canAttempt, nextRealm, req: req ?? null, expReady, itemsReady, conditionsReady, requiresTribulation, successRate };
}

// ── 突破结果 ──

export interface BreakthroughResult {
  success: boolean;
  player: Player;
  logs: string[];
  triggerTribulation: boolean;
}

// ── 执行突破 ──

export function attemptBreakthrough(player: Player): BreakthroughResult {
  const status = getBreakthroughStatus(player);
  const logs: string[] = [];

  if (!status.nextRealm) {
    return { success: false, player, logs: ['🏔️ 你已到达当前版本的最高境界！'], triggerTribulation: false };
  }

  if (!status.expReady) {
    logs.push(`⚠️ 修为不足！突破 ${status.nextRealm.name} 需要 ${status.nextRealm.expReq} 修为（当前 ${player.exp}）。`);
    return { success: false, player, logs, triggerTribulation: false };
  }

  // 检查物品
  for (const item of status.itemsReady) {
    if (!item.ready) {
      logs.push(`⚠️ 材料不足：${item.name} 需要 ${item.required} 个（当前 ${item.have}）。`);
    }
  }

  // 检查条件
  for (const cond of status.conditionsReady) {
    if (!cond.ready) {
      logs.push(`⚠️ 条件未满足：${cond.description}`);
    }
  }

  if (!status.canAttempt) {
    return { success: false, player, logs, triggerTribulation: false };
  }

  // 消耗物品
  let p = { ...player };
  if (status.req) {
    for (const cost of status.req.itemCosts) {
      p = removeItem(p, cost.itemId, cost.count);
      const def = getItemDef(cost.itemId);
      logs.push(`📦 消耗 ${def?.name ?? cost.itemId} ×${cost.count}`);
    }
  }

  // 需要渡劫？
  if (status.requiresTribulation) {
    logs.push('⚡ 突破此境界需经历天劫考验！');
    return { success: false, player: p, logs, triggerTribulation: true };
  }

  // 掷骰突破
  const roll = Math.random();
  if (roll < status.successRate) {
    // 成功
    p.realmIndex += 1;
    const newRealm = REALMS[p.realmIndex];
    p.lifespan += newRealm.lifespanBonus;
    p = recalcStats(p);
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    p.stamina = p.maxStamina;
    p.mood = Math.min(100, p.mood + 20);

    // 清除该境界失败次数
    const btState = getBreakthroughState(p);
    delete btState.failedAttempts[player.realmIndex];
    p = setBreakthroughState(p, btState);

    logs.push(`🎆 突破成功！晋升 ${newRealm.name}期！`);
    logs.push(`寿限 +${newRealm.lifespanBonus}，属性全面提升！`);
    return { success: true, player: p, logs, triggerTribulation: false };
  } else {
    // 失败
    const penalty = status.req?.failurePenalty ?? {};
    const expLossRate = penalty.expLossRate ?? BREAKTHROUGH_FAIL_EXP_LOSS;
    const moodLoss = penalty.moodLoss ?? 20;
    const healthLoss = penalty.healthLoss ?? 10;

    const expLoss = Math.floor(p.exp * expLossRate);
    p.exp -= expLoss;
    p.mood = Math.max(0, p.mood - moodLoss);
    p.health = Math.max(0, p.health - healthLoss);

    // 累加失败次数
    const btState = getBreakthroughState(p);
    btState.failedAttempts[player.realmIndex] = (btState.failedAttempts[player.realmIndex] ?? 0) + 1;
    p = setBreakthroughState(p, btState);

    const failCount = btState.failedAttempts[player.realmIndex];
    logs.push(`💥 突破失败！损失 ${expLoss} 修为，心情 -${moodLoss}，健康 -${healthLoss}。`);
    logs.push(`（成功率 ${(status.successRate * 100).toFixed(1)}%，掷骰 ${(roll * 100).toFixed(1)}%，累计失败 ${failCount} 次）`);
    return { success: false, player: p, logs, triggerTribulation: false };
  }
}
