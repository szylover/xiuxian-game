import type { Player } from '../player';
import type { NpcDef } from './npc';

export type RankingBoardKind = 'leaderboard' | 'celestial';

export type RankingScoreKey =
  | 'realm'
  | 'power'
  | 'wealth'
  | 'reputation'
  | 'technique'
  | 'destiny'
  | 'talent';

export interface RankingDimensionDef {
  id: string;
  board: RankingBoardKind;
  scoreKey: RankingScoreKey;
  order: number;
  limit: number;
  playerEligible?: (player: Player) => boolean;
  npcEligible?: (npc: NpcDef, player: Player) => boolean;
}

export interface RankingEntry {
  id: string;
  source: 'player' | 'npc';
  name: string;
  title?: string;
  emoji: string;
  realmIndex: number;
  score: number;
  rank: number;
  isPlayer: boolean;
}

export interface RankingSnapshot {
  dimensionId: string;
  entries: RankingEntry[];
  playerRank: number | null;
  playerScore: number;
  refreshedAtAge: number;
  refreshedAtYear: number;
  refreshedAtMonth: number;
}

export interface RankingSystemState {
  snapshots: Record<string, RankingSnapshot>;
  lastRefreshAge: number;
}
