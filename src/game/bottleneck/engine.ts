// ============================================================
// game/bottleneck/engine.ts — 瓶颈系统核心引擎（T0064）
// 纯 JS 逻辑，不依赖 React
// ============================================================

import type { Player } from '../player';
import type { MonsterDef } from '../types';
import type { BottleneckDef, BottleneckSystemState, ActiveBottleneck } from './types';
import { bottleneckDefsMap } from '../registry/stores';
import { getRealmDef } from '../registry/queries';

// ── 状态访问器 ──

const EMPTY_STATE: BottleneckSystemState = { activeBottlenecks: [], resolvedBottlenecks: [] };

export function getBottleneckState(player: Player): BottleneckSystemState {
  const raw = player.systems?.bottleneck;
  if (!raw) return EMPTY_STATE;
  return raw as BottleneckSystemState;
}

export function setBottleneckState(player: Player, state: BottleneckSystemState): Player {
  return { ...player, systems: { ...player.systems, bottleneck: state } };
}

// ── 查询函数 ──

/** 获取当前活跃且未解锁的第一个境界瓶颈（ActiveBottleneck） */
export function getFirstLockedRealmBottleneck(player: Player): ActiveBottleneck | null {
  const state = getBottleneckState(player);
  for (const ab of state.activeBottlenecks) {
    if (!ab.unlocked) {
      const def = bottleneckDefsMap.get(ab.defId);
      if (def?.type === 'realm') return ab;
    }
  }
  return null;
}

/** 获取第一个活跃境界瓶颈的定义（含已解锁的） */
export function getFirstRealmBottleneckDef(player: Player): BottleneckDef | null {
  const state = getBottleneckState(player);
  for (const ab of state.activeBottlenecks) {
    const def = bottleneckDefsMap.get(ab.defId);
    if (def?.type === 'realm') return def;
  }
  return null;
}

/** 是否存在未解锁的境界瓶颈 */
export function hasLockedRealmBottleneck(player: Player): boolean {
  return getFirstLockedRealmBottleneck(player) !== null;
}

/** 是否存在任何未解锁的瓶颈（境界或功法） */
export function hasLockedBottleneck(player: Player): boolean {
  const state = getBottleneckState(player);
  return state.activeBottlenecks.some(b => !b.unlocked);
}

/** 获取指定功法的活跃且未解锁的瓶颈 */
export function getLockedTechniqueBottleneck(player: Player, techniqueId: string): (ActiveBottleneck & { unlockThreshold: number }) | null {
  const state = getBottleneckState(player);
  for (const ab of state.activeBottlenecks) {
    if (!ab.unlocked) {
      const def = bottleneckDefsMap.get(ab.defId);
      if (def?.type === 'technique' && def.blockedTechniqueId === techniqueId) {
        return { ...ab, unlockThreshold: def.unlockProgressThreshold };
      }
    }
  }
  return null;
}

/** 获取第一个活跃的未解锁瓶颈（任意类型），用于顿悟石 */
export function getFirstLockedBottleneck(player: Player): ActiveBottleneck | null {
  const state = getBottleneckState(player);
  return state.activeBottlenecks.find(b => !b.unlocked) ?? null;
}

// ── 激活瓶颈 ──

/** 检查并激活对应境界的瓶颈（如果条件满足） */
export function checkAndEnterRealmBottleneck(player: Player): Player {
  const state = getBottleneckState(player);

  // 遍历所有注册的境界瓶颈
  for (const def of bottleneckDefsMap.values()) {
    if (def.type !== 'realm') continue;
    if (def.blockedAtRealmIndex !== player.realmIndex) continue;

    // 条件 B：未曾解决过此瓶颈
    if (state.resolvedBottlenecks.includes(def.id)) continue;

    // 条件 C：修为达到 90% 上限
    const realmDef = getRealmDef(player.realmIndex);
    if (!realmDef) continue;
    if (player.exp < realmDef.expReq * 0.9) continue;

    // 条件 D：当前激活列表中无此瓶颈
    if (state.activeBottlenecks.some(ab => ab.defId === def.id)) continue;

    // 激活瓶颈
    const newActive: ActiveBottleneck = {
      defId: def.id,
      enteredAt: player.gameYear,
      progress: 0,
      methodProgress: {},
      unlocked: false,
      unlockedBy: null,
    };
    const newState: BottleneckSystemState = {
      ...state,
      activeBottlenecks: [...state.activeBottlenecks, newActive],
    };
    return setBottleneckState(player, newState);
  }
  return player;
}

/** 手动激活指定 defId 的瓶颈（用于 debug / DLC 触发） */
export function enterBottleneck(player: Player, defId: string): Player {
  const def = bottleneckDefsMap.get(defId);
  if (!def) return player;

  const state = getBottleneckState(player);
  if (state.resolvedBottlenecks.includes(defId)) return player;
  if (state.activeBottlenecks.some(ab => ab.defId === defId)) return player;

  const newActive: ActiveBottleneck = {
    defId,
    enteredAt: player.gameYear,
    progress: 0,
    methodProgress: {},
    unlocked: false,
    unlockedBy: null,
  };
  return setBottleneckState(player, {
    ...state,
    activeBottlenecks: [...state.activeBottlenecks, newActive],
  });
}

// ── 进度积累 ──

/** 给指定 defId 的活跃瓶颈添加 progress */
export function addBottleneckProgress(
  player: Player,
  defId: string,
  actionType: string,
  amount: number,
): Player {
  const state = getBottleneckState(player);
  const idx = state.activeBottlenecks.findIndex(ab => ab.defId === defId && !ab.unlocked);
  if (idx === -1) return player;

  const ab = state.activeBottlenecks[idx];
  const def = bottleneckDefsMap.get(defId);
  if (!def) return player;

  const newProgress = ab.progress + amount;
  const newMethodProgress = { ...ab.methodProgress, [actionType]: (ab.methodProgress[actionType] ?? 0) + amount };

  const newAbs = [...state.activeBottlenecks];
  newAbs[idx] = { ...ab, progress: newProgress, methodProgress: newMethodProgress };

  let p = setBottleneckState(player, { ...state, activeBottlenecks: newAbs });

  // 更新 tracking.bottleneckTotalProgress
  p = { ...p, tracking: { ...p.tracking, bottleneckTotalProgress: (p.tracking.bottleneckTotalProgress ?? 0) + amount } };

  // 检查兜底解锁
  if (newProgress >= def.unlockProgressThreshold) {
    const { player: p2 } = resolveBottleneck(p, defId, 'force');
    return p2;
  }

  return p;
}

/** 给所有活跃的未解锁瓶颈添加 progress（用于修炼/战斗/探索的通用调用） */
export function addProgressToAllLocked(player: Player, actionType: string, amount: number): Player {
  const state = getBottleneckState(player);
  let p = player;
  for (const ab of state.activeBottlenecks) {
    if (!ab.unlocked) {
      p = addBottleneckProgress(p, ab.defId, actionType, amount);
    }
  }
  return p;
}

// ── 解锁（resolve）──

/** 解锁指定瓶颈，标记为已解决 */
export function resolveBottleneck(
  player: Player,
  defId: string,
  source: 'quest' | 'combat' | 'explore' | 'discuss' | 'item' | 'force',
): { player: Player; log: string } {
  const state = getBottleneckState(player);
  const idx = state.activeBottlenecks.findIndex(ab => ab.defId === defId);

  let log = '';
  const def = bottleneckDefsMap.get(defId);
  const name = def?.name ?? defId;

  if (idx !== -1) {
    const newAbs = [...state.activeBottlenecks];
    newAbs[idx] = { ...newAbs[idx], unlocked: true, unlockedBy: source };

    const newResolved = state.resolvedBottlenecks.includes(defId)
      ? state.resolvedBottlenecks
      : [...state.resolvedBottlenecks, defId];

    const p2 = setBottleneckState(player, { ...state, activeBottlenecks: newAbs, resolvedBottlenecks: newResolved });

    switch (source) {
      case 'combat':
        log = `⚔️ 生死边缘，道心震颤！${name}豁然开朗，突破契机到来！`;
        break;
      case 'explore':
        log = `💡 灵光一闪！${name}已解除，突破之机已至！`;
        break;
      case 'force':
        log = `🌅 经年累月的积累，量变引发质变，${name}豁然贯通！`;
        break;
      case 'item':
        log = `🪨 顿悟石散发奇异光晕，心中陡然明悟，${name}消融！`;
        break;
      case 'discuss':
        log = `🗣️ 论道有得，心境突破，${name}已解除！`;
        break;
      case 'quest':
        log = `📜 完成特殊任务，${name}已解除！`;
        break;
      default:
        log = `🌟 ${name}已解除！突破契机已至！`;
    }

    return { player: p2, log };
  }

  // 如果没有激活的瓶颈，直接加入 resolved 列表（防止重复触发）
  const newResolved = state.resolvedBottlenecks.includes(defId)
    ? state.resolvedBottlenecks
    : [...state.resolvedBottlenecks, defId];

  const p2 = setBottleneckState(player, { ...state, resolvedBottlenecks: newResolved });
  return { player: p2, log: `🌟 ${name}已解除！` };
}

/** 解锁所有活跃的未解锁瓶颈（Debug 用） */
export function resolveAllBottlenecks(player: Player): Player {
  const state = getBottleneckState(player);
  let p = player;
  for (const ab of [...state.activeBottlenecks]) {
    if (!ab.unlocked) {
      const { player: p2 } = resolveBottleneck(p, ab.defId, 'force');
      p = p2;
    }
  }
  return p;
}

/** 重置所有瓶颈状态（Debug 用） */
export function resetBottleneckState(player: Player): Player {
  return setBottleneckState(player, { activeBottlenecks: [], resolvedBottlenecks: [] });
}

// ── 战斗感悟检查 ──

/**
 * 战斗胜利后检查是否触发瓶颈解锁（感悟）
 * 返回新 player + 是否解锁 + 日志
 */
export function checkCombatBottleneckUnlock(
  player: Player,
  monster: MonsterDef,
): { player: Player; unlocked: boolean; log?: string } {
  const ab = getFirstLockedRealmBottleneck(player);
  if (!ab) return { player, unlocked: false };

  const def = bottleneckDefsMap.get(ab.defId);
  if (!def) return { player, unlocked: false };

  // 战斗感悟概率：同级/高级妖兽更高
  const realmDiff = monster.realmIndex - player.realmIndex;
  let baseProb = 0.02;
  if (realmDiff >= 2) baseProb = 0.15;
  else if (realmDiff >= 1) baseProb = 0.10;
  else if (realmDiff >= 0) baseProb = 0.05;

  // 积累越多越容易触发
  const progressBonus = (ab.progress / def.unlockProgressThreshold) * 0.15;

  if (Math.random() < baseProb + progressBonus) {
    const { player: p2, log } = resolveBottleneck(player, ab.defId, 'combat');
    return { player: p2, unlocked: true, log };
  }

  // 未解锁时积累 progress（战斗胜利 +3）
  const p2 = addBottleneckProgress(player, ab.defId, 'combat', 3);
  return { player: p2, unlocked: false };
}

// ── 探索事件解锁 ──

/** 探索事件直接解锁境界瓶颈 */
export function resolveRealmBottleneckByExplore(player: Player): { player: Player; log: string } | null {
  const ab = getFirstLockedRealmBottleneck(player);
  if (!ab) return null;
  return resolveBottleneck(player, ab.defId, 'explore');
}

/** 探索事件给进度 +n */
export function addExploreProgressToBottleneck(player: Player, amount: number): Player {
  const ab = getFirstLockedBottleneck(player);
  if (!ab) return player;
  return addBottleneckProgress(player, ab.defId, 'explore', amount);
}

// ── NPC 论道（T0025 预留）──
// 当 T0025 NPC 系统实现后，在此处添加 notifyBottleneckUnlock(player, 'discuss', npcId) 函数。
// 接口约定：接收 player + npcId，返回 { player: Player; unlocked: boolean; log?: string }。

