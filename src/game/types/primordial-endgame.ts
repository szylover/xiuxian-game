// ============================================================
// types/primordial-endgame.ts — 洪荒终局类型（#104）
// ============================================================

import type { Player } from '../player';
import type { MonsterDef } from './combat';

export type PrimordialEndingRoute = 'righteous' | 'evil' | 'transcendent';

export interface PrimordialEndgameRequirement {
  realmIndex: number;
  minExp: number;
  requiredItems: { itemId: string; count: number }[];
  condition: (player: Player) => boolean;
  description: string;
}

export interface PrimordialEndgameDef {
  id: string;
  name: string;
  description: string;
  route: PrimordialEndingRoute;
  requirement: PrimordialEndgameRequirement;
  boss: MonsterDef;
  rewards: {
    title: string;
    legacyMultiplierBonus: number;
    items: { itemId: string; count: number }[];
  };
  endingTitle: string;
  endingText: string;
}

export interface PrimordialEndgameState {
  attemptedIds: string[];
  completedId: string | null;
  endingRoute: PrimordialEndingRoute | null;
  endingTitle: string | null;
  endingText: string | null;
  completedAtAge: number | null;
}
