// ============================================================
// game/bottleneck/state.ts — 瓶颈状态初始化 & 读写
// ============================================================

import type { Player } from '../player';
import type { BottleneckDef, BottleneckState } from '../types';
import { getBottleneckDef } from '../registry';

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

export function getState(player: Player): BottleneckState {
  return (player.systems.bottleneck as BottleneckState) ?? { active: {}, unlocked: {} };
}

export function setState(player: Player, state: BottleneckState): Player {
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
