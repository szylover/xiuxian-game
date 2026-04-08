// ============================================================
// game/ascension.ts — 飞升系统核心逻辑壳子（T0033）
//
// 飞升是凡界到仙界（或更高阶层）的特殊跨阶转换。
// 具体飞升定义（条件/天劫/奖励）由 DLC（如 CP-03）通过
// registerDLC({ ascensions: [...] }) 注册，本模块只提供通用逻辑。
//
// 核心包（core）不注册任何 AscensionDef → 大乘为终点。
// ============================================================

import type { Player } from './player';
import { recalcStats } from './player';
import type { AscensionDef, AscensionState, RealmTier } from './types';
import { getAscensionForRealm, getItemDef, getRealmDef } from './registry';
import { removeItem } from './inventory';

// ── 状态读写 ──

const DEFAULT_STATE: AscensionState = {
  hasAscended: false,
  currentTier: 'mortal',
  ascensionHistory: [],
  ascensionFailCount: 0,
};

export function getAscensionState(player: Player): AscensionState {
  const raw = player.systems.ascension as Partial<AscensionState> | undefined;
  if (!raw) return { ...DEFAULT_STATE };
  return {
    hasAscended: raw.hasAscended ?? false,
    currentTier: raw.currentTier ?? 'mortal',
    ascensionHistory: raw.ascensionHistory ?? [],
    ascensionFailCount: raw.ascensionFailCount ?? 0,
  };
}

export function setAscensionState(player: Player, state: AscensionState): Player {
  return { ...player, systems: { ...player.systems, ascension: state } };
}

// ── 飞升状态查询 ──

export interface AscensionItemCheck {
  itemId: string;
  name: string;
  required: number;
  have: number;
  ready: boolean;
}

export interface AscensionCondCheck {
  id: string;
  description: string;
  ready: boolean;
}

export interface AscensionStatus {
  canAscend: boolean;
  ascDef: AscensionDef | null;
  expReady: boolean;
  itemsReady: AscensionItemCheck[];
  conditionsReady: AscensionCondCheck[];
  currentTier: RealmTier;
  isLooseImmortal: boolean;
}

/** 查询玩家当前的飞升状态（是否可以飞升、条件满足情况等） */
export function getAscensionStatus(player: Player): AscensionStatus {
  const ascState = getAscensionState(player);
  const deathState = (player.systems.death ?? {}) as { isLooseImmortal?: boolean };
  const isLooseImmortal = deathState.isLooseImmortal ?? false;

  const ascDef = getAscensionForRealm(player.realmIndex);
  if (!ascDef) {
    return {
      canAscend: false,
      ascDef: null,
      expReady: false,
      itemsReady: [],
      conditionsReady: [],
      currentTier: ascState.currentTier,
      isLooseImmortal,
    };
  }

  // 散仙不能正常飞升
  if (isLooseImmortal) {
    return {
      canAscend: false,
      ascDef,
      expReady: player.exp >= ascDef.minExp,
      itemsReady: [],
      conditionsReady: [],
      currentTier: ascState.currentTier,
      isLooseImmortal: true,
    };
  }

  const expReady = player.exp >= ascDef.minExp;

  const itemsReady: AscensionItemCheck[] = ascDef.itemCosts.map(cost => {
    const def = getItemDef(cost.itemId);
    const have = player.inventory.find(s => s.itemId === cost.itemId)?.count ?? 0;
    return { itemId: cost.itemId, name: def?.name ?? cost.itemId, required: cost.count, have, ready: have >= cost.count };
  });

  const conditionsReady: AscensionCondCheck[] = ascDef.conditions.map(cond => ({
    id: cond.id,
    description: cond.description,
    ready: cond.check(player),
  }));

  const canAscend = expReady
    && itemsReady.every(i => i.ready)
    && conditionsReady.every(c => c.ready);

  return {
    canAscend,
    ascDef,
    expReady,
    itemsReady,
    conditionsReady,
    currentTier: ascState.currentTier,
    isLooseImmortal,
  };
}

// ── 飞升执行 ──

export interface AscensionResult {
  success: boolean;
  player: Player;
  logs: string[];
  triggerTribulation: boolean;
  tribulationId?: string;
  ascDef: AscensionDef | null;
}

/**
 * 尝试飞升。
 *
 * 流程：
 * 1. 检查飞升条件
 * 2. 消耗物品
 * 3. 如果有飞升天劫 → 返回 triggerTribulation=true，由调用方（Hook）执行渡劫
 * 4. 否则直接完成飞升（applyAscensionSuccess）
 */
export function attemptAscension(player: Player): AscensionResult {
  const status = getAscensionStatus(player);
  if (!status.ascDef || !status.canAscend) {
    return { success: false, player, logs: ['⚠️ 飞升条件未满足'], triggerTribulation: false, ascDef: null };
  }

  const ascDef = status.ascDef;
  let p = { ...player };
  const logs: string[] = [];

  // 消耗物品
  for (const cost of ascDef.itemCosts) {
    const def = getItemDef(cost.itemId);
    p = removeItem(p, cost.itemId, cost.count);
    logs.push(`消耗 ${def?.name ?? cost.itemId} ×${cost.count}`);
  }

  // 检查是否需要飞升天劫
  if (ascDef.tribulationId) {
    logs.push('天道感应，飞升天劫降临！');
    return { success: false, player: p, logs, triggerTribulation: true, tribulationId: ascDef.tribulationId, ascDef };
  }

  // 无天劫 → 直接成功
  const result = applyAscensionSuccess(p, ascDef);
  return {
    success: true,
    player: result.player,
    logs: [...logs, ...result.logs],
    triggerTribulation: false,
    ascDef,
  };
}

/** 应用飞升成功结果（天劫通过后 或 无天劫时直接调用） */
export function applyAscensionSuccess(
  player: Player,
  ascDef: AscensionDef,
): { player: Player; logs: string[] } {
  let p = { ...player };
  const logs: string[] = [];

  // 跳到目标境界
  p.realmIndex = ascDef.toRealmIndex;

  // 可选清零修为
  if (ascDef.statReset?.expReset) {
    p.exp = 0;
  }

  // 寿命加成
  const realmDef = getRealmDef(ascDef.toRealmIndex);
  if (realmDef) {
    p.lifespan += realmDef.lifespanBonus;
  }
  if (ascDef.rewards.lifespanBonus) {
    p.lifespan += ascDef.rewards.lifespanBonus;
    logs.push(`寿元大增 +${ascDef.rewards.lifespanBonus} 月`);
  }

  // 额外修为奖励
  if (ascDef.rewards.bonusExp) {
    p.exp += ascDef.rewards.bonusExp;
  }

  // 发放奖励物品
  for (const reward of ascDef.rewards.items) {
    const def = getItemDef(reward.itemId);
    const slot = p.inventory.find(s => s.itemId === reward.itemId);
    if (slot) {
      slot.count += reward.count;
    } else {
      p.inventory = [...p.inventory, { itemId: reward.itemId, count: reward.count }];
    }
    logs.push(`飞升奖励：获得 ${def?.name ?? reward.itemId} ×${reward.count}`);
  }

  // 更新飞升状态
  const ascState = getAscensionState(p);
  const newState: AscensionState = {
    hasAscended: true,
    currentTier: ascDef.toTier,
    ascensionHistory: [
      ...ascState.ascensionHistory,
      {
        fromTier: ascDef.fromTier,
        toTier: ascDef.toTier,
        atAge: p.age,
        realmIndexBefore: ascDef.fromRealmIndex,
      },
    ],
    ascensionFailCount: ascState.ascensionFailCount,
  };
  p = setAscensionState(p, newState);

  // 重算属性
  p = recalcStats(p);

  // 满血满蓝
  p.hp = p.maxHp;
  p.mp = p.maxMp;

  const realmName = realmDef?.name ?? `境界 ${ascDef.toRealmIndex}`;
  logs.unshift(`✨ 飞升成功！踏入${realmName}，超脱凡尘！`);

  return { player: p, logs };
}

/** 飞升天劫失败后调用（后果由 TribulationDef.failureType 决定） */
export function applyAscensionFailure(
  player: Player,
  ascDef: AscensionDef,
): { player: Player; logs: string[] } {
  const ascState = getAscensionState(player);
  const newState: AscensionState = {
    ...ascState,
    ascensionFailCount: ascState.ascensionFailCount + 1,
  };
  const p = setAscensionState(player, newState);
  return { player: p, logs: [] };
}
