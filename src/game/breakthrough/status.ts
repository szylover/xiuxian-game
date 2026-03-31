// ============================================================
// breakthrough/status.ts — 突破状态查询
// ============================================================

import type { Player } from '../player';
import { getNextRealm } from '../player';
import { BREAKTHROUGH_BASE_RATE, BREAKTHROUGH_COMP_BONUS, BREAKTHROUGH_LUCK_BONUS } from '../data';
import type { Realm } from '../data';
import { getBreakthroughReq, getItemDef } from '../registry';
import type { BreakthroughReqDef } from '../registry';
import type { BottleneckDef } from '../bottleneck/types';
import { getFirstLockedRealmBottleneck, getFirstRealmBottleneckDef } from '../bottleneck';
import { bottleneckDefsMap } from '../registry/stores';

export interface ItemCheckResult { itemId: string; name: string; required: number; have: number; ready: boolean; }
export interface CondCheckResult { id: string; description: string; ready: boolean; }

export interface BreakthroughStatus {
  canAttempt: boolean;
  nextRealm: Realm | null;
  req: BreakthroughReqDef | null;
  expReady: boolean;
  itemsReady: ItemCheckResult[];
  conditionsReady: CondCheckResult[];
  requiresTribulation: boolean;
  successRate: number;
  // T0064：瓶颈字段
  bottleneckActive?: boolean;
  bottleneckDef?: BottleneckDef | null;
  bottleneckProgress?: number;
  bottleneckThreshold?: number;
  bottleneckUnlocked?: boolean;
}

export function getBreakthroughState(player: Player) {
  const sys = (player.systems.breakthrough ?? {}) as Record<string, unknown>;
  return {
    failedAttempts: (sys.failedAttempts ?? {}) as Record<number, number>,
    tribulationsPassed: (sys.tribulationsPassed ?? []) as string[],
    isLooseImmortal: (sys.isLooseImmortal ?? false) as boolean,
  };
}

export function setBreakthroughState(player: Player, state: ReturnType<typeof getBreakthroughState>): Player {
  return { ...player, systems: { ...player.systems, breakthrough: state } };
}

export function getBreakthroughStatus(player: Player): BreakthroughStatus {
  const nextRealm = getNextRealm(player);
  if (!nextRealm) return { canAttempt: false, nextRealm: null, req: null, expReady: false, itemsReady: [], conditionsReady: [], requiresTribulation: false, successRate: 0 };

  // T0064：境界瓶颈检查（优先返回，阻止突破）
  const lockedBottleneckAb = getFirstLockedRealmBottleneck(player);
  if (lockedBottleneckAb) {
    const def = bottleneckDefsMap.get(lockedBottleneckAb.defId) ?? null;
    return {
      canAttempt: false,
      nextRealm,
      req: null,
      expReady: player.exp >= nextRealm.expReq,
      itemsReady: [],
      conditionsReady: [],
      requiresTribulation: false,
      successRate: 0,
      bottleneckActive: true,
      bottleneckDef: def,
      bottleneckProgress: lockedBottleneckAb.progress,
      bottleneckThreshold: def?.unlockProgressThreshold ?? 200,
      bottleneckUnlocked: false,
    };
  }

  // T0064：检查是否有已解锁（unlocked=true）但还未突破的境界瓶颈
  const unlockedBottleneckDef = getFirstRealmBottleneckDef(player);
  const req = getBreakthroughReq(player.realmIndex);
  const expReady = player.exp >= nextRealm.expReq;

  const itemsReady: ItemCheckResult[] = (req?.itemCosts ?? []).map(cost => {
    const def = getItemDef(cost.itemId);
    const have = player.inventory.find(s => s.itemId === cost.itemId)?.count ?? 0;
    return { itemId: cost.itemId, name: def?.name ?? cost.itemId, required: cost.count, have, ready: have >= cost.count };
  });

  const conditionsReady: CondCheckResult[] = (req?.conditions ?? []).map(cond => ({
    id: cond.id, description: cond.description, ready: cond.check(player),
  }));

  const requiresTribulation = req?.requiresTribulation ?? false;
  const btState = getBreakthroughState(player);
  const failCount = btState.failedAttempts[player.realmIndex] ?? 0;
  const baseRate = req?.baseSuccessRate ?? BREAKTHROUGH_BASE_RATE;
  const failBonus = Math.min(0.25, failCount * 0.05);
  const successRate = requiresTribulation ? 0 : Math.min(0.95, baseRate + player.comprehension * BREAKTHROUGH_COMP_BONUS + player.luck * BREAKTHROUGH_LUCK_BONUS + failBonus);

  const canAttempt = expReady && itemsReady.every(i => i.ready) && conditionsReady.every(c => c.ready);
  return {
    canAttempt, nextRealm, req: req ?? null, expReady, itemsReady, conditionsReady, requiresTribulation, successRate,
    bottleneckActive: false,
    bottleneckDef: unlockedBottleneckDef,
    bottleneckUnlocked: unlockedBottleneckDef !== null,
  };
}
