// ============================================================
// types/reincarnation.ts — 转世重修系统类型（#101）
// ============================================================

import type { Player } from '../player';

export type ReincarnationContext = 'ascension' | 'death' | 'voluntary';

export interface LegacySnapshot {
  incarnationNo: number;
  peakRealmIndex: number;
  peakBodyRealmIndex: number;
  outcome: 'died' | 'ascended' | 'voluntary';
  age: number;
}

export interface ReincarnationLegacy {
  cultivationSpeedBonus: number;
  bodyExpBonus: number;
  atkBonus: number;
  defBonus: number;
  hpBonus: number;
  mpBonus: number;
  speedBonus: number;
  luckBonus: number;
  comprehensionBonus: number;
  charismaBonus: number;
  aptitudeBonus: number;
  spiritRootFloor: number;
  inventoryCapacityBonus: number;
  lifespanBonus: number;
}

export interface ReincarnationState {
  count: number;
  snapshots: LegacySnapshot[];
  legacy: ReincarnationLegacy;
}

export interface ReincarnationEffectDef {
  id: string;
  name: string;
  description: string;
  condition: (oldPlayer: Player) => boolean;
  apply: (newPlayer: Player, oldPlayer: Player) => Player;
  priority: number;
}
