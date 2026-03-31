// ============================================================
// game/bottleneck/index.ts — barrel re-export（T0064）
// ============================================================

export type { BottleneckDef, UnlockMethodDef, ActiveBottleneck, BottleneckSystemState } from './types';
export {
  getBottleneckState,
  setBottleneckState,
  getFirstLockedRealmBottleneck,
  getFirstRealmBottleneckDef,
  hasLockedRealmBottleneck,
  hasLockedBottleneck,
  getLockedTechniqueBottleneck,
  getFirstLockedBottleneck,
  checkAndEnterRealmBottleneck,
  enterBottleneck,
  addBottleneckProgress,
  addProgressToAllLocked,
  resolveBottleneck,
  resolveAllBottlenecks,
  resetBottleneckState,
  checkCombatBottleneckUnlock,
  resolveRealmBottleneckByExplore,
  addExploreProgressToBottleneck,
} from './engine';
