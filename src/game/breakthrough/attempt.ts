// ============================================================
// breakthrough/attempt.ts — 执行突破
// ============================================================

import type { Player } from '../player';
import { recalcStats } from '../player';
import { REALMS, BREAKTHROUGH_FAIL_EXP_LOSS } from '../data';
import { getItemDef } from '../registry';
import { removeItem } from '../inventory';
import { getBreakthroughStatus, getBreakthroughState, setBreakthroughState } from './status';
import { checkBottleneck, activateBottleneck, ensureBottleneckState } from '../bottleneck';
import { BREAKTHROUGH_TEXTS } from '../../data/texts/breakthrough';

export interface BreakthroughResult {
  success: boolean;
  player: Player;
  logs: string[];
  triggerTribulation: boolean;
  blockedByBottleneck?: boolean;
}

export function attemptBreakthrough(player: Player): BreakthroughResult {
  const status = getBreakthroughStatus(player);
  const logs: string[] = [];

  if (!status.nextRealm) return { success: false, player, logs: [BREAKTHROUGH_TEXTS.maxRealm], triggerTribulation: false };
  if (!status.expReady) {
    logs.push(BREAKTHROUGH_TEXTS.expInsufficient(status.nextRealm.name, status.nextRealm.expReq, player.exp));
    return { success: false, player, logs, triggerTribulation: false };
  }

  for (const item of status.itemsReady) if (!item.ready) logs.push(BREAKTHROUGH_TEXTS.materialInsufficient(item.name, item.required, item.have));
  for (const cond of status.conditionsReady) if (!cond.ready) logs.push(BREAKTHROUGH_TEXTS.conditionNotMet(cond.description));
  if (!status.canAttempt) return { success: false, player, logs, triggerTribulation: false };

  // T0064: 境界瓶颈检查
  let p = ensureBottleneckState(player);
  const bnResult = checkBottleneck(p, 'realm', p.realmIndex);
  if (bnResult.blocked && bnResult.bottleneckDef) {
    if (bnResult.isNewlyActivated) {
      const act = activateBottleneck(p, bnResult.bottleneckDef.id);
      p = act.player;
      logs.push(act.log);
    }
    logs.push(BREAKTHROUGH_TEXTS.bottleneck(bnResult.bottleneckDef.name, bnResult.bottleneckDef.hint));
    return { success: false, player: p, logs, triggerTribulation: false, blockedByBottleneck: true };
  }

  // 消耗物品
  if (status.req) {
    for (const cost of status.req.itemCosts) {
      p = removeItem(p, cost.itemId, cost.count);
      const def = getItemDef(cost.itemId);
      logs.push(BREAKTHROUGH_TEXTS.consumeItem(def?.name ?? cost.itemId, cost.count));
    }
  }

  // 渡劫
  if (status.requiresTribulation) {
    logs.push(BREAKTHROUGH_TEXTS.tribulationRequired);
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

    logs.push(BREAKTHROUGH_TEXTS.success(newRealm.name));
    logs.push(BREAKTHROUGH_TEXTS.successBonus(newRealm.lifespanBonus));
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

  logs.push(BREAKTHROUGH_TEXTS.failed(expLoss, penalty.moodLoss ?? 20, penalty.healthLoss ?? 10));
  logs.push(BREAKTHROUGH_TEXTS.failedStats((status.successRate * 100).toFixed(1), (roll * 100).toFixed(1), failCount));
  return { success: false, player: p, logs, triggerTribulation: false };
}
