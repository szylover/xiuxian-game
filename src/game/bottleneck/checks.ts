// ============================================================
// game/bottleneck/checks.ts — 瓶颈检查、激活、解锁
// ============================================================

import type { Player } from '../player';
import type { BottleneckDef, BottleneckState, BottleneckUnlockMethod } from '../types';
import { addItem } from '../inventory';
import {
  getBottleneckDef,
  getBottlenecksForRealm,
  getBottlenecksForBodyRealm,
  getBottlenecksForTechnique,
} from '../registry';
import { BOTTLENECK_TEXTS } from '../../data/texts/bottleneck';
import { ensureBottleneckState, getState, setState } from './state';

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
