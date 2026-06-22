import type { CombatResult } from '../combat';

export interface PvpDuelRecord {
  id: string;
  opponentId: string;
  opponentName: string;
  opponentRank: number;
  playerWon: boolean;
  rankBefore: number | null;
  rankAfter: number | null;
  rewardGold: number;
  rewardExp: number;
  age: number;
  year: number;
  month: number;
  logs: string[];
}

export interface PvpSystemState {
  rating: number;
  wins: number;
  losses: number;
  cooldownUntilAge: number;
  lastOpponentId: string | null;
  records: PvpDuelRecord[];
}

export interface PvpChallengeResult {
  player: import('../player').Player;
  success: boolean;
  message: string;
  record?: PvpDuelRecord;
  combatResult?: CombatResult;
}

