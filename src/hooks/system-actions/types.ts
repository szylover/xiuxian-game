import type { Player } from '../../game/player';
import type { ChronicleEventType } from '../../game/chronicle';
import type { DeathModalState } from '../useCombatModal';
import type { LogCategory } from '../useGameLog';

export interface ChronicleHooks {
  recordEvent: (type: ChronicleEventType, player: Player, description: string, meta?: Record<string, unknown>) => void;
  syncSnapshot: (player: Player) => void;
}

export interface SystemActionDeps {
  player: Player | null;
  addLog: (msg: string, category?: LogCategory) => void;
  setPlayer: React.Dispatch<React.SetStateAction<Player | null>>;
  setGameOver: React.Dispatch<React.SetStateAction<boolean>>;
  setGameOverReason: React.Dispatch<React.SetStateAction<string>>;
  setDeathModal: React.Dispatch<React.SetStateAction<DeathModalState | null>>;
  chronicleHooks?: ChronicleHooks;
}

export type ExecAction = (
  action: (p: Player) => { player: Player; message: string },
  category?: LogCategory,
) => void;

export interface SystemActionContext extends SystemActionDeps {
  execAction: ExecAction;
}
