// ============================================================
// game/bottleneck/index.ts — barrel re-export
// ============================================================

export { ensureBottleneckState, getActiveBottlenecks } from './state';
export { checkBottleneck, activateBottleneck, unlockBottleneck } from './checks';
export type { BottleneckCheckResult } from './checks';
export {
  tickPersistenceCultivation,
  tryBattleUnlock,
  tryEpiphanyUnlock,
  tryOverflowUnlock,
  tryDiscourseUnlock,
  tryQuestUnlock,
} from './methods';
