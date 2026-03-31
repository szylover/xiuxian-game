// ============================================================
// breakthrough/attempt.ts — 执行突破
// ============================================================

import type { Player } from '../player';
import { recalcStats } from '../player';
import { REALMS, BREAKTHROUGH_FAIL_EXP_LOSS } from '../data';
import { getItemDef } from '../registry';
import { removeItem } from '../inventory';
import { getBreakthroughStatus, getBreakthroughState, setBreakthroughState } from './status';

export interface BreakthroughResult {
  success: boolean;
  player: Player;
  logs: string[];
  triggerTribulation: boolean;
}

export function attemptBreakthrough(player: Player): BreakthroughResult {
  const status = getBreakthroughStatus(player);
  const logs: string[] = [];

  if (!status.nextRealm) return { success: false, player, logs: ['🏔️ 你已到达当前版本的最高境界！'], triggerTribulation: false };
  if (!status.expReady) {
    logs.push(`⚠️ 修为不足！突破 ${status.nextRealm.name} 需要 ${status.nextRealm.expReq} 修为（当前 ${player.exp}）。`);
    return { success: false, player, logs, triggerTribulation: false };
  }

  for (const item of status.itemsReady) if (!item.ready) logs.push(`⚠️ 材料不足：${item.name} 需要 ${item.required} 个（当前 ${item.have}）。`);
  for (const cond of status.conditionsReady) if (!cond.ready) logs.push(`⚠️ 条件未满足：${cond.description}`);
  if (!status.canAttempt) return { success: false, player, logs, triggerTribulation: false };

  // 消耗物品
  let p = { ...player };
  if (status.req) {
    for (const cost of status.req.itemCosts) {
      p = removeItem(p, cost.itemId, cost.count);
      const def = getItemDef(cost.itemId);
      logs.push(`📦 消耗 ${def?.name ?? cost.itemId} ×${cost.count}`);
    }
  }

  // 渡劫
  if (status.requiresTribulation) {
    logs.push('⚡ 突破此境界需经历天劫考验！');
    return { success: false, player: p, logs, triggerTribulation: true };
  }

  // 掷骰
  const roll = Math.random();
  if (roll < status.successRate) {
    p.realmIndex += 1;
    const newRealm = REALMS[p.realmIndex];
    p.lifespan += newRealm.lifespanBonus;
    p = recalcStats(p);
    p.hp = p.maxHp; p.mp = p.maxMp; p.stamina = p.maxStamina;
    p.mood = Math.min(100, p.mood + 20);

    const btState = getBreakthroughState(p);
    delete btState.failedAttempts[player.realmIndex];
    p = setBreakthroughState(p, btState);

    // 突破成功：重置连续突破失败计数
    p.tracking = { ...p.tracking, consecutiveBreakthroughFails: 0 };

    logs.push(`🎆 突破成功！晋升 ${newRealm.name}期！`);
    logs.push(`寿限 +${newRealm.lifespanBonus}，属性全面提升！`);
    return { success: true, player: p, logs, triggerTribulation: false };
  }

  // 失败
  const penalty = status.req?.failurePenalty ?? {};
  const expLoss = Math.floor(p.exp * (penalty.expLossRate ?? BREAKTHROUGH_FAIL_EXP_LOSS));
  p.exp -= expLoss;
  p.mood = Math.max(0, p.mood - (penalty.moodLoss ?? 20));
  p.health = Math.max(0, p.health - (penalty.healthLoss ?? 10));

  const btState = getBreakthroughState(p);
  btState.failedAttempts[player.realmIndex] = (btState.failedAttempts[player.realmIndex] ?? 0) + 1;
  p = setBreakthroughState(p, btState);
  const failCount = btState.failedAttempts[player.realmIndex];

  // 突破失败：递增连续突破失败计数
  p.tracking = { ...p.tracking, consecutiveBreakthroughFails: (p.tracking.consecutiveBreakthroughFails ?? 0) + 1 };

  logs.push(`💥 突破失败！损失 ${expLoss} 修为，心情 -${penalty.moodLoss ?? 20}，健康 -${penalty.healthLoss ?? 10}。`);
  logs.push(`（成功率 ${(status.successRate * 100).toFixed(1)}%，掷骰 ${(roll * 100).toFixed(1)}%，累计失败 ${failCount} 次）`);
  return { success: false, player: p, logs, triggerTribulation: false };
}
