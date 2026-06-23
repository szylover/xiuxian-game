// ============================================================
// breakthrough/status.ts — 突破状态查询
// ============================================================

import type { Player } from '../player';
import { getNextRealm } from '../player';
import { BREAKTHROUGH_BASE_RATE, BREAKTHROUGH_COMP_BONUS, BREAKTHROUGH_LUCK_BONUS } from '../data';
import type { Realm } from '../data';
import { getBreakthroughReq, getItemDef, getAscensionForRealm } from '../registry';
import type { BreakthroughReqDef, AscensionDef } from '../registry';
import { getDestinyTalentEffects, ensureDestinyTalentState } from '../destiny';
import { getEnlightenmentEffects } from '../enlightenment';
import { getHeartDemonEffects } from '../heart-demon';

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
  /** T0033: 下一步需要飞升（而非普通突破） */
  requiresAscension: boolean;
  /** T0033: 匹配的飞升定义 */
  ascensionDef: AscensionDef | null;
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
  const p = ensureDestinyTalentState(player);
  const nextRealm = getNextRealm(p);

  // T0033: 如果没有下一境界但有飞升定义，说明需要飞升
  const ascDef = getAscensionForRealm(p.realmIndex);
  if (!nextRealm && ascDef) {
    return { canAttempt: false, nextRealm: null, req: null, expReady: false, itemsReady: [], conditionsReady: [], requiresTribulation: false, successRate: 0, requiresAscension: true, ascensionDef: ascDef };
  }
  if (!nextRealm) return { canAttempt: false, nextRealm: null, req: null, expReady: false, itemsReady: [], conditionsReady: [], requiresTribulation: false, successRate: 0, requiresAscension: false, ascensionDef: null };

  // T0033: 如果下一境界需要飞升，标记 requiresAscension
  if (nextRealm.ascensionRequired) {
    return { canAttempt: false, nextRealm, req: null, expReady: false, itemsReady: [], conditionsReady: [], requiresTribulation: false, successRate: 0, requiresAscension: true, ascensionDef: ascDef ?? null };
  }

  const req = getBreakthroughReq(p.realmIndex);
  const expReady = p.exp >= nextRealm.expReq;

  const itemsReady: ItemCheckResult[] = (req?.itemCosts ?? []).map(cost => {
    const def = getItemDef(cost.itemId);
    const have = p.inventory.find(s => s.itemId === cost.itemId)?.count ?? 0;
    return { itemId: cost.itemId, name: def?.name ?? cost.itemId, required: cost.count, have, ready: have >= cost.count };
  });

  const conditionsReady: CondCheckResult[] = (req?.conditions ?? []).map(cond => ({
    id: cond.id, description: cond.description, ready: cond.check(p),
  }));

  const requiresTribulation = req?.requiresTribulation ?? false;
  const btState = getBreakthroughState(p);
  const failCount = btState.failedAttempts[p.realmIndex] ?? 0;
  const baseRate = req?.baseSuccessRate ?? BREAKTHROUGH_BASE_RATE;
  const failBonus = Math.min(0.25, failCount * 0.05);
  const destinyBonus = getDestinyTalentEffects(p).breakthroughRateBonus ?? 0;
  const enlightenmentBonus = getEnlightenmentEffects(p).breakthroughRateBonus ?? 0;
  const heartDemonPenalty = getHeartDemonEffects(p).breakthroughRatePenalty;
  const successRate = requiresTribulation ? 0 : Math.min(0.95, Math.max(0.05, baseRate + p.comprehension * BREAKTHROUGH_COMP_BONUS + p.luck * BREAKTHROUGH_LUCK_BONUS + failBonus + destinyBonus + enlightenmentBonus - heartDemonPenalty));

  const canAttempt = expReady && itemsReady.every(i => i.ready) && conditionsReady.every(c => c.ready);
  return { canAttempt, nextRealm, req: req ?? null, expReady, itemsReady, conditionsReady, requiresTribulation, successRate, requiresAscension: false, ascensionDef: null };
}
