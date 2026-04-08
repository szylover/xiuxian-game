// ============================================================
// death/revival.ts — 死亡应用 + 复活手段检查与应用
// ============================================================

import type { Player } from '../player';
import { hasItem, removeItem } from '../inventory';
import { getAllRevivalMethods } from '../registry';
import type { DeathTriggerDef, RevivalMethodDef, DeathPenaltyDef } from '../types';
import { DEATH_TEXTS } from '../../data/texts/death';
import { getDeathSystemState, setDeathSystemState } from './state';
import type { DeathResult, RevivalResult } from './state';
import { DEFAULT_PENALTIES, applyPenalty } from './penalties';

// ── 应用死亡后果 ──

export function applyDeath(player: Player, trigger: DeathTriggerDef): DeathResult {
  const severity = trigger.severity;
  const penalty = DEFAULT_PENALTIES[severity];
  const logs: string[] = [];
  let p = { ...player };

  // 更新死亡统计
  const ds = getDeathSystemState(p);
  ds.deathCount += 1;
  ds.lastDeathCause = trigger.id;
  p = setDeathSystemState(p, ds);

  if (severity !== 'severe') {
    // 轻/中度：应用惩罚
    p = applyPenalty(p, penalty, logs);
    return {
      player: p,
      gameOver: false,
      availableRevivals: [],
      logs,
      severity,
      gameOverReason: '',
    };
  }

  // severe 级别
  if (trigger.bypassRevival) {
    // 跳过复活（寿元耗尽等），直接游戏结束
    const reason = `${trigger.name}，${trigger.description}`;
    logs.push(`💀 ${trigger.name}！${trigger.description}`);
    return {
      player: p,
      gameOver: true,
      availableRevivals: [],
      logs,
      severity,
      gameOverReason: reason,
    };
  }

  // 检查复活手段
  const availableRevivals = checkRevivalMethods(p);
  const reason = `${trigger.name}！${trigger.description}`;
  logs.push(`💀 ${trigger.name}！${trigger.description}`);

  return {
    player: p,
    gameOver: availableRevivals.length === 0,
    availableRevivals,
    logs,
    severity,
    gameOverReason: availableRevivals.length === 0 ? reason : '',
  };
}

// ── 检查复活手段 ──

function checkRevivalMethods(player: Player): RevivalMethodDef[] {
  const methods = getAllRevivalMethods()
    .sort((a, b) => a.priority - b.priority);

  const available: RevivalMethodDef[] = [];
  for (const method of methods) {
    if (method.type === 'item' && method.itemId && !hasItem(player, method.itemId)) continue;
    if (method.type === 'passive' && method.passiveId && !player.passives[method.passiveId]) continue;
    if (method.condition && !method.condition(player)) continue;
    available.push(method);
  }

  return available;
}

// ── 应用复活（玩家选择后调用）──

export function applyRevival(player: Player, method: RevivalMethodDef): RevivalResult {
  const logs: string[] = [];
  let p = { ...player };

  // 执行复活效果
  p = method.effect(p);
  logs.push(DEATH_TEXTS.revival(method.name, method.description));

  // 消耗物品
  if (method.consumeOnUse && method.type === 'item' && method.itemId) {
    p = removeItem(p, method.itemId, 1);
    logs.push(DEATH_TEXTS.consumeRevival(method.name));
  }

  // 应用复活代价
  if (method.penalty) {
    const penaltyDef: DeathPenaltyDef = {
      ...DEFAULT_PENALTIES.severe,
      ...method.penalty,
      gameOver: false, // 复活代价不会再次 gameOver
    };
    p = applyPenalty(p, penaltyDef, logs);
  }

  // 更新复活统计
  const ds = getDeathSystemState(p);
  ds.revivalCount += 1;

  // 散仙化特殊处理
  if (method.id === 'core:revival_loose_immortal') {
    ds.isLooseImmortal = true;
  }

  p = setDeathSystemState(p, ds);

  return { player: p, logs };
}
