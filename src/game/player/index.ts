// ============================================================
// player/index.ts — barrel re-export
// ============================================================

export type { Player, Aptitudes, InventorySlot, EquippedSlots, PlayerTracking, SpiritRootGrade, PlayerSpiritRoots } from './types';
export { createPlayer } from './create';
export type { CreatePlayerOptions } from './create';
export { getSpiritRootGrade, getSpiritRootDisplay, recalcStats, getRealmInfo, getNextRealm } from './stats';
