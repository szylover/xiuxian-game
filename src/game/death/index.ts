// ============================================================
// death/index.ts — barrel re-export
// ============================================================

export { getDeathSystemState } from './state';
export type { DeathContext, DeathCheckResult, DeathResult, RevivalResult } from './state';

export { checkDeathTriggers } from './triggers';

export { applyDeath, applyRevival } from './revival';
