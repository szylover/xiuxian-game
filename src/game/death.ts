// ============================================================
// death.ts — 死亡系统逻辑壳子
// 纯逻辑：死因检查、护命判定、死亡惩罚、复活检查
// 所有死因/护命/复活内容通过 registerDLC 注册到全局注册表
// ============================================================

import type { Player } from './player';
import { recalcStats } from './player';
import { REALMS } from './data';
import { hasItem, removeItem } from './inventory';
import { getAllDeathTriggers, getAllLifeSavers, getAllRevivalMethods } from './registry';
import type {
  DeathSeverity, DeathTriggerDef, DeathPenaltyDef,
  LifeSaverDef, RevivalMethodDef, DeathSystemState,
} from './types';
import { DEATH_TEXTS } from '../data/texts/death';

// ── 默认后果表 ──

const DEFAULT_PENALTIES: Record<DeathSeverity, DeathPenaltyDef> = {
  light: {
    severity: 'light',
    expLossRate: 0.1,
    goldLossRate: 0.1,
    inventoryLossCount: 0,
    healthLoss: 20,
    moodLoss: 15,
    realmDrop: 0,
    gameOver: false,
  },
  moderate: {
    severity: 'moderate',
    expLossRate: 0.3,
    goldLossRate: 0.3,
    inventoryLossCount: 2,
    healthLoss: 40,
    moodLoss: 30,
    realmDrop: 1,
    gameOver: false,
  },
  severe: {
    severity: 'severe',
    expLossRate: 1.0,
    goldLossRate: 1.0,
    inventoryLossCount: 0,
    healthLoss: 0,
    moodLoss: 0,
    realmDrop: 0,
    gameOver: true,
  },
};

// ── 获取死亡系统子状态 ──

export function getDeathSystemState(player: Player): DeathSystemState {
  const state = player.systems.death as DeathSystemState | undefined;
  return state ?? {
    deathCount: 0,
    lastDeathCause: null,
    revivalCount: 0,
    lifeSaverTriggered: [],
    isLooseImmortal: false,
  };
}

function setDeathSystemState(player: Player, state: DeathSystemState): Player {
  return { ...player, systems: { ...player.systems, death: state } };
}

// ── 死亡上下文 ──

export interface DeathContext {
  source: 'combat' | 'time' | 'tribulation' | 'alchemy' | 'other';
  data?: Record<string, unknown>;
}

// ── 死亡检查结果 ──

export interface DeathCheckResult {
  triggered: boolean;
  trigger: DeathTriggerDef | null;
  blocked: boolean;
  blockedBy: LifeSaverDef | null;
  player: Player;
  logs: string[];
}

// ── 死亡应用结果 ──

export interface DeathResult {
  player: Player;
  gameOver: boolean;
  availableRevivals: RevivalMethodDef[];
  logs: string[];
  severity: DeathSeverity;
  gameOverReason: string;
}

// ── 复活应用结果 ──

export interface RevivalResult {
  player: Player;
  logs: string[];
}

// ── 检查死亡触发 ──

export function checkDeathTriggers(player: Player, context: DeathContext): DeathCheckResult {
  const triggers = getAllDeathTriggers()
    .filter(t => {
      // 按来源过滤
      if (t.id === 'core:death_combat_boss') {
        return context.source === 'combat' && context.data?.isBoss === true;
      }
      if (t.id === 'core:death_combat') {
        return context.source === 'combat' && context.data?.isBoss !== true;
      }
      if (t.id === 'core:death_lifespan') return context.source === 'time';
      if (t.id === 'core:death_tribulation') return context.source === 'tribulation';
      if (t.id === 'core:death_alchemy_fail') return context.source === 'alchemy';
      // 通用触发条件不限来源
      return true;
    })
    .sort((a, b) => a.priority - b.priority);

  for (const trigger of triggers) {
    if (!trigger.check(player)) continue;

    // 触发了死亡条件
    if (trigger.canBeBlocked) {
      const saverResult = checkLifeSavers(player, trigger.severity);
      if (saverResult.blocked && saverResult.saver) {
        // 护命道具拦截
        let p = saverResult.player;
        const ds = getDeathSystemState(p);
        ds.lifeSaverTriggered = [...ds.lifeSaverTriggered, saverResult.saver.id];
        p = setDeathSystemState(p, ds);

        return {
          triggered: true,
          trigger,
          blocked: true,
          blockedBy: saverResult.saver,
          player: p,
          logs: [DEATH_TEXTS.lifeSaverBlock(saverResult.saver.name)],
        };
      }
    }

    return {
      triggered: true,
      trigger,
      blocked: false,
      blockedBy: null,
      player,
      logs: [],
    };
  }

  return {
    triggered: false,
    trigger: null,
    blocked: false,
    blockedBy: null,
    player,
    logs: [],
  };
}

// ── 检查护命道具 ──

interface LifeSaverCheckResult {
  blocked: boolean;
  saver: LifeSaverDef | null;
  player: Player;
}

function checkLifeSavers(player: Player, severity: DeathSeverity): LifeSaverCheckResult {
  const savers = getAllLifeSavers()
    .filter(s => s.blockSeverities.includes(severity))
    .sort((a, b) => a.priority - b.priority);

  for (const saver of savers) {
    if (!hasItem(player, saver.itemId)) continue;
    if (saver.condition && !saver.condition(player)) continue;

    let p = { ...player };
    if (saver.consumeOnUse) {
      p = removeItem(p, saver.itemId, 1);
    }
    if (saver.afterEffect) {
      p = saver.afterEffect(p);
    }

    return { blocked: true, saver, player: p };
  }

  return { blocked: false, saver: null, player };
}

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

// ── 应用惩罚 ──

function applyPenalty(player: Player, penalty: DeathPenaltyDef, logs: string[]): Player {
  let p = { ...player };

  // 修为损失
  if (penalty.expLossRate > 0) {
    const loss = Math.floor(p.exp * penalty.expLossRate);
    p.exp = Math.max(0, p.exp - loss);
    if (loss > 0) logs.push(DEATH_TEXTS.expLoss(loss));
  }

  // 灵石损失
  if (penalty.goldLossRate > 0) {
    const loss = Math.floor(p.gold * penalty.goldLossRate);
    p.gold = Math.max(0, p.gold - loss);
    if (loss > 0) logs.push(DEATH_TEXTS.goldLoss(loss));
  }

  // 随机丢失物品
  if (penalty.inventoryLossCount > 0 && p.inventory.length > 0) {
    let lost = 0;
    const inv = [...p.inventory.map(s => ({ ...s }))];
    for (let i = 0; i < penalty.inventoryLossCount && inv.length > 0; i++) {
      const idx = Math.floor(Math.random() * inv.length);
      inv.splice(idx, 1);
      lost++;
    }
    p = { ...p, inventory: inv };
    if (lost > 0) logs.push(DEATH_TEXTS.itemLoss(lost));
  }

  // 健康、心情损失
  if (penalty.healthLoss > 0) {
    p.health = Math.max(0, p.health - penalty.healthLoss);
    logs.push(DEATH_TEXTS.healthLoss(penalty.healthLoss));
  }
  if (penalty.moodLoss > 0) {
    p.mood = Math.max(0, p.mood - penalty.moodLoss);
    logs.push(DEATH_TEXTS.moodLoss(penalty.moodLoss));
  }

  // 降境界
  if (penalty.realmDrop > 0 && p.realmIndex > 0) {
    const drop = Math.min(penalty.realmDrop, p.realmIndex);
    p.realmIndex -= drop;
    p = recalcStats(p);
    p.hp = Math.max(1, Math.min(p.hp, p.maxHp));
    p.mp = Math.min(p.mp, p.maxMp);
    logs.push(DEATH_TEXTS.realmDrop(drop, REALMS[p.realmIndex].name));
  }

  return p;
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
