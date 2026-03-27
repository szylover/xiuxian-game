// ============================================================
// GameOverScreen.tsx — 游戏结束画面
// ============================================================

import type { LogEntry } from '../../hooks/useGameLog';
import GameLog from '../hud/GameLog';

interface GameOverScreenProps {
  reason: string;
  logs: LogEntry[];
  onRestart: () => void;
}

export default function GameOverScreen({ reason, logs, onRestart }: GameOverScreenProps) {
  return (
    <div className="game-container">
      <div className="game-over">
        <h2>💀 游戏结束</h2>
        <p>{reason}</p>
        <button className="btn btn-primary" onClick={onRestart}>
          重新开始
        </button>
      </div>
      <GameLog logs={logs} />
    </div>
  );
}
