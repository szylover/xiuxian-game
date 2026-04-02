// ============================================================
// game/bottleneck.ts — 瓶颈系统核心逻辑（T0064）
// 瓶颈是修炼关键节点的"天花板"，阻止突破直到满足解锁条件。
// 所有瓶颈定义通过 DLC 注册，系统代码只读注册表。
// ============================================================

import type { Player } from './player';
import type { BottleneckDef, BottleneckState, BottleneckUnlockMethod } from './types';
import { addItem } from './inventory';
import {
  getBottleneckDef,
  getAllBottleneckDefs,
  getBottlenecksForRealm,
  getBottlenecksForBodyRealm,
  getBottlenecksForTechnique,
  getRealmDef,
  getBodyRealmDef,
} from './registry';
import { BOTTLENECK_TEXTS } from '../data/texts/bottleneck';

// ── 存档兼容：确保 player.systems.bottleneck 存在 ──

export function ensureBottleneckState(player: Player): Player {
  const state = player.systems.bottleneck as BottleneckState | undefined;
  if (state?.active && state?.unlocked) return player;
  return {
    ...player,
    systems: {
      ...player.systems,
      bottleneck: { active: {}, unlocked: {} } satisfies BottleneckState,
    },
  };
}

function getState(player: Player): BottleneckState {
  return (player.systems.bottleneck as BottleneckState) ?? { active: {}, unlocked: {} };
}

function setState(player: Player, state: BottleneckState): Player {
  return { ...player, systems: { ...player.systems, bottleneck: state } };
}

// ── 查询当前激活的瓶颈 ──

export function getActiveBottlenecks(player: Player): Array<{ def: BottleneckDef; entry: BottleneckState['active'][string] }> {
  const state = getState(player);
  const result: Array<{ def: BottleneckDef; entry: BottleneckState['active'][string] }> = [];
  for (const [id, entry] of Object.entries(state.active)) {
    const def = getBottleneckDef(id);
    if (def) result.push({ def, entry });
  }
  return result;
}

// ── 检查瓶颈 ──
// 返回 blocked=true 表示被瓶颈卡住，不能突破/升级

export interface BottleneckCheckResult {
  blocked: boolean;
  bottleneckDef?: BottleneckDef;
  isNewlyActivated?: boolean;
}

export function checkBottleneck(
  player: Player,
  targetType: 'realm' | 'body_realm' | 'technique',
  index: number,
  techniqueId?: string,
): BottleneckCheckResult {
  // 根据类型查询匹配的瓶颈定义
  let defs: BottleneckDef[];
  if (targetType === 'realm') {
    defs = getBottlenecksForRealm(index);
  } else if (targetType === 'body_realm') {
    defs = getBottlenecksForBodyRealm(index);
  } else {
    defs = techniqueId ? getBottlenecksForTechnique(techniqueId, index) : [];
  }

  if (defs.length === 0) return { blocked: false };

  const state = getState(player);

  for (const def of defs) {
    // 条件谓词不满足则跳过
    if (def.condition && !def.condition(player)) continue;

    // 已解锁则跳过
    if (state.unlocked[def.id]) continue;

    // 已激活或首次触碰 → blocked
    return {
      blocked: true,
      bottleneckDef: def,
      isNewlyActivated: !state.active[def.id],
    };
  }

  return { blocked: false };
}

// ── 激活瓶颈（首次触碰时记录） ──

export function activateBottleneck(player: Player, bottleneckId: string): { player: Player; log: string } {
  const def = getBottleneckDef(bottleneckId);
  if (!def) return { player, log: '' };

  let p = ensureBottleneckState(player);
  const state = getState(p);

  // 已经激活或已解锁则忽略
  if (state.active[bottleneckId] || state.unlocked[bottleneckId]) return { player: p, log: '' };

  const newState: BottleneckState = {
    ...state,
    active: {
      ...state.active,
      [bottleneckId]: {
        bottleneckId,
        activatedAt: p.gameYear,
        progress: { persistenceCultivationCount: 0 },
      },
    },
  };

  p = setState(p, newState);
  const log = BOTTLENECK_TEXTS.activated(def.name, def.description);
  return { player: p, log };
}

// ── 解锁瓶颈（通用入口） ──

export function unlockBottleneck(
  player: Player,
  bottleneckId: string,
  method: BottleneckUnlockMethod['type'],
): { player: Player; log: string } {
  const def = getBottleneckDef(bottleneckId);
  if (!def) return { player, log: '' };

  let p = ensureBottleneckState(player);
  const state = getState(p);

  // 未激活或已解锁则忽略
  if (!state.active[bottleneckId] || state.unlocked[bottleneckId]) return { player: p, log: '' };

  // 从 active 移除，记入 unlocked
  const { [bottleneckId]: _, ...remainingActive } = state.active;
  const newState: BottleneckState = {
    active: remainingActive,
    unlocked: {
      ...state.unlocked,
      [bottleneckId]: {
        bottleneckId,
        unlockedAt: p.gameYear,
        method,
      },
    },
  };
  p = setState(p, newState);

  // 发放解锁奖励
  if (def.unlockBonus) {
    if (def.unlockBonus.expBonus) p = { ...p, exp: p.exp + def.unlockBonus.expBonus };
    if (def.unlockBonus.statBonus) {
      for (const [key, val] of Object.entries(def.unlockBonus.statBonus)) {
        if (val && key in p) {
          (p as unknown as Record<string, number>)[key] = ((p as unknown as Record<string, number>)[key] ?? 0) + val;
        }
      }
    }
    if (def.unlockBonus.items) {
      for (const item of def.unlockBonus.items) {
        const result = addItem(p, item.itemId, item.count);
        p = result.player;
      }
    }
  }

  const methodNames = BOTTLENECK_TEXTS.methodNames;
  const log = BOTTLENECK_TEXTS.unlocked(def.name, methodNames[method]);
  return { player: p, log };
}

// ── 坚韧修炼：每次修炼时 tick ──

export function tickPersistenceCultivation(player: Player, bottleneckId: string): {
  player: Player;
  unlocked: boolean;
  log: string;
} {
  const def = getBottleneckDef(bottleneckId);
  if (!def) return { player, unlocked: false, log: '' };

  let p = ensureBottleneckState(player);
  const state = getState(p);
  const entry = state.active[bottleneckId];
  if (!entry) return { player: p, unlocked: false, log: '' };

  // 找到 persistence 解锁方式
  const persistenceMethod = def.unlockMethods.find(m => m.type === 'persistence') as
    | Extract<BottleneckUnlockMethod, { type: 'persistence' }>
    | undefined;
  if (!persistenceMethod) return { player: p, unlocked: false, log: '' };

  const newCount = (entry.progress.persistenceCultivationCount ?? 0) + 1;

  if (newCount >= persistenceMethod.cultivationCount) {
    // 自动解锁
    const result = unlockBottleneck(p, bottleneckId, 'persistence');
    return { player: result.player, unlocked: true, log: result.log };
  }

  // 更新进度
  const newState: BottleneckState = {
    ...state,
    active: {
      ...state.active,
      [bottleneckId]: {
        ...entry,
        progress: { ...entry.progress, persistenceCultivationCount: newCount },
      },
    },
  };
  p = setState(p, newState);
  return { player: p, unlocked: false, log: '' };
}

// ── 战斗胜利后检查 ──

export function tryBattleUnlock(player: Player, killedMonsterId: string): {
  player: Player;
  triggered: boolean;
  log: string;
} {
  let p = ensureBottleneckState(player);
  const state = getState(p);
  let triggered = false;
  let log = '';

  // 1. 检查已激活的瓶颈
  for (const [id, entry] of Object.entries(state.active)) {
    const def = getBottleneckDef(id);
    if (!def) continue;
    for (const method of def.unlockMethods) {
      if (method.type === 'combat' && method.monsterId === killedMonsterId) {
        const result = unlockBottleneck(p, entry.bottleneckId, 'combat');
        p = result.player;
        log = result.log;
        triggered = true;
        break;
      }
    }
    if (triggered) break;
  }

  // 2. 未激活但匹配当前玩家的瓶颈也能被击杀预解锁
  if (!triggered) {
    const allDefs = getAllBottleneckDefs();
    for (const def of allDefs) {
      if (getState(p).active[def.id] || getState(p).unlocked[def.id]) continue;
      if (def.condition && !def.condition(p)) continue;
      for (const method of def.unlockMethods) {
        if (method.type === 'combat' && method.monsterId === killedMonsterId) {
          let relevant = false;
          if (def.targetType === 'realm' && def.fromRealmIndex === p.realmIndex) relevant = true;
          if (def.targetType === 'body_realm' && def.fromBodyRealmIndex === p.bodyRealmIndex) relevant = true;
          if (def.targetType === 'technique' && def.techniqueId) {
            relevant = p.techniques.some(t => t.techniqueId === def.techniqueId);
          }
          if (relevant) {
            const act = activateBottleneck(p, def.id);
            p = act.player;
            const result = unlockBottleneck(p, def.id, 'combat');
            p = result.player;
            log = result.log;
            triggered = true;
            break;
          }
        }
      }
      if (triggered) break;
    }
  }

  return { player: p, triggered, log };
}

// ── 探索顿悟检查 ──

export function tryEpiphanyUnlock(player: Player, locationTag: string): {
  player: Player;
  triggered: boolean;
  bottleneckId?: string;
  log: string;
} {
  let p = ensureBottleneckState(player);

  // 收集所有应检查的瓶颈（已激活 + 未激活但相关的）
  const candidates: BottleneckDef[] = [];
  const state = getState(p);
  for (const [id] of Object.entries(state.active)) {
    const def = getBottleneckDef(id);
    if (def) candidates.push(def);
  }
  // 未激活但与当前玩家相关的
  for (const def of getAllBottleneckDefs()) {
    if (state.active[def.id] || state.unlocked[def.id]) continue;
    if (def.condition && !def.condition(p)) continue;
    let relevant = false;
    if (def.targetType === 'realm' && def.fromRealmIndex === p.realmIndex) relevant = true;
    if (def.targetType === 'body_realm' && def.fromBodyRealmIndex === p.bodyRealmIndex) relevant = true;
    if (def.targetType === 'technique' && def.techniqueId) {
      relevant = p.techniques.some(t => t.techniqueId === def.techniqueId);
    }
    if (relevant) candidates.push(def);
  }

  for (const def of candidates) {
    for (const method of def.unlockMethods) {
      if (method.type !== 'epiphany') continue;
      if (method.locationTag && method.locationTag !== locationTag && locationTag !== '') continue;

      const chance = method.baseChance * (1 + p.luck * 0.002 + p.comprehension * 0.003);
      if (Math.random() < chance) {
        // 如果未激活，先激活
        if (!getState(p).active[def.id]) {
          const act = activateBottleneck(p, def.id);
          p = act.player;
        }
        const result = unlockBottleneck(p, def.id, 'epiphany');
        return { player: result.player, triggered: true, bottleneckId: def.id, log: result.log };
      }
    }
  }

  return { player: p, triggered: false, log: '' };
}

// ── 修为溢出自动消除瓶颈 ──

export function tryOverflowUnlock(player: Player): {
  player: Player;
  triggered: boolean;
  log: string;
} {
  let p = ensureBottleneckState(player);
  const state = getState(p);
  let triggered = false;
  let log = '';

  for (const [id] of Object.entries(state.active)) {
    const def = getBottleneckDef(id);
    if (!def) continue;

    const ratio = def.overflowRatio ?? 1.5;
    if (ratio <= 0 || !isFinite(ratio)) continue;

    if (def.targetType === 'realm' && def.fromRealmIndex !== undefined) {
      const nextRealm = getRealmDef(def.fromRealmIndex + 1);
      if (nextRealm && p.exp >= nextRealm.expReq * ratio) {
        const result = unlockBottleneck(p, id, 'overflow');
        p = result.player;
        log = BOTTLENECK_TEXTS.overflowRealm(def.name);
        triggered = true;
        break;
      }
    } else if (def.targetType === 'body_realm' && def.fromBodyRealmIndex !== undefined) {
      const nextBodyRealm = getBodyRealmDef(def.fromBodyRealmIndex + 1);
      if (nextBodyRealm && p.bodyRealmExp >= nextBodyRealm.expReq * ratio) {
        const result = unlockBottleneck(p, id, 'overflow');
        p = result.player;
        log = BOTTLENECK_TEXTS.overflowBody(def.name);
        triggered = true;
        break;
      }
    }
  }

  return { player: p, triggered, log };
}

// ── 论道解锁（T0064-C，预留接口） ──

export function tryDiscourseUnlock(
  player: Player, npcId: string,
): { success: boolean; player: Player; log: string } {
  let p = ensureBottleneckState(player);
  const state = getState(p);

  for (const [id] of Object.entries(state.active)) {
    const def = getBottleneckDef(id);
    if (!def) continue;
    for (const method of def.unlockMethods) {
      if (method.type !== 'discourse' || method.npcId !== npcId) continue;
      // 检查道具（暂不实现扣除，T0064-C 接入时完善）
      const result = unlockBottleneck(p, id, 'discourse');
      return { success: true, player: result.player, log: result.log };
    }
  }
  return { success: false, player: p, log: '' };
}

// ── 任务完成后检查（T0064-C，预留接口） ──

export function tryQuestUnlock(player: Player, questId: string): {
  player: Player;
  triggered: boolean;
  log: string;
} {
  let p = ensureBottleneckState(player);
  const state = getState(p);

  for (const [id] of Object.entries(state.active)) {
    const def = getBottleneckDef(id);
    if (!def) continue;
    for (const method of def.unlockMethods) {
      if (method.type === 'quest' && method.questId === questId) {
        const result = unlockBottleneck(p, id, 'quest');
        return { player: result.player, triggered: true, log: result.log };
      }
    }
  }
  return { player: p, triggered: false, log: '' };
}
