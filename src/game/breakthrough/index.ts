// ============================================================
// breakthrough/index.ts — barrel re-export
// ============================================================

export type { BreakthroughStatus, ItemCheckResult, CondCheckResult } from './status';
export { getBreakthroughStatus, getBreakthroughState, setBreakthroughState } from './status';
export type { BreakthroughResult } from './attempt';
export { attemptBreakthrough } from './attempt';
