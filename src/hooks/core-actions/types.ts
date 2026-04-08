import type { Player } from '../../game/player';
import type { CombatResult } from '../../game/combat';
import type { DeathTriggerDef, DeathSeverity, RevivalMethodDef } from '../../game/types';
import type { LogCategory } from '../useGameLog';

export interface LootEntry {
  icon: string;
  name: string;
  amount: number;
}

export interface CombatDeathInfo {
  blocked: boolean;
  saverName?: string;
  triggered: boolean;
  severity?: DeathSeverity;
  penaltyLogs?: string[];
  availableRevivals?: RevivalMethodDef[];
  triggerDef?: DeathTriggerDef;
}

export interface CoreActionDeps {
  addLog: (msg: string, category?: LogCategory) => void;
  addLogs: (msgs: string[], category?: LogCategory) => void;
  setPlayer: React.Dispatch<React.SetStateAction<Player | null>>;
  advanceTime: (p: Player, actionKey: string) => Player;
  canAct: (actionKey: string) => boolean;
  onCombatResult: (monsterName: string, monsterEmoji: string, result: CombatResult, loot: LootEntry[], deathInfo?: CombatDeathInfo, hpBefore?: number, mpBefore?: number) => void;
}

export interface LogQueue {
  msgs: string[];
  categories: LogCategory[];
}
