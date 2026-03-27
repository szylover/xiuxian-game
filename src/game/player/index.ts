// ============================================================
// player/index.ts — barrel re-export
// ============================================================

export type { Player, Aptitudes, InventorySlot, EquippedSlots, PlayerTracking, SpiritRootGrade } from './types';
export { createPlayer } from './create';
export { getSpiritRootGrade, recalcStats, getRealmInfo, getNextRealm } from './stats';
