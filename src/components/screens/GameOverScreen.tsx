// ============================================================
// GameOverScreen.tsx — 游戏结束画面
// ============================================================

import type { LogEntry } from '../../hooks/useGameLog';
import type { Player } from '../../game/player';
import { checkReincarnation } from '../../game/reincarnation';
import { REINCARNATION_TEXTS, UI_LABELS } from '../../data/texts';
import GameLog from '../hud/GameLog';

interface GameOverScreenProps {
  reason: string;
  logs: LogEntry[];
  onRestart: () => void;
  player?: Player | null;
  onReincarnate?: () => void;
}

export default function GameOverScreen({ reason, logs, onRestart, player, onReincarnate }: GameOverScreenProps) {
  const reincarnation = player ? checkReincarnation(player, 'death') : null;
  return (
    <div className="game-container">
      <div className="game-over">
        <h2>💀 {UI_LABELS.gameOverTitle}</h2>
        <p>{reason}</p>
        {reincarnation?.canReincarnate && onReincarnate && (
          <button className="btn btn-primary" onClick={onReincarnate}>
            {REINCARNATION_TEXTS.deathButton}
          </button>
        )}
        <button className="btn btn-primary" onClick={onRestart}>
          {UI_LABELS.restartButton}
        </button>
      </div>
      <GameLog logs={logs} />
    </div>
  );
}
