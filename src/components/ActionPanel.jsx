// ============================================================
// ActionPanel.jsx — 操作按钮面板
// ============================================================

import { getNextRealm } from '../game/player.js';
import { ACTION_COSTS } from '../game/data.js';

export default function ActionPanel({ player, onCultivate, onFight, onExplore, onRest, onBreakthrough, gameOver }) {
  if (!player || gameOver) return null;

  const nextRealm = getNextRealm(player);
  const canBreak = nextRealm && player.exp >= nextRealm.expReq;

  const staminaOk = (key) => player.stamina >= ACTION_COSTS[key].stamina;

  return (
    <div className="action-panel">
      <button
        className="btn btn-action"
        onClick={onCultivate}
        disabled={!staminaOk('cultivate')}
        title={`消耗 ${ACTION_COSTS.cultivate.stamina} 精力`}
      >
        🧘 修炼
      </button>
      <button
        className="btn btn-action btn-danger"
        onClick={onFight}
        disabled={!staminaOk('combat')}
        title={`消耗 ${ACTION_COSTS.combat.stamina} 精力`}
      >
        ⚔️ 战斗
      </button>
      <button
        className="btn btn-action"
        onClick={onExplore}
        disabled={!staminaOk('explore')}
        title={`消耗 ${ACTION_COSTS.explore.stamina} 精力`}
      >
        🔍 探索
      </button>
      <button
        className="btn btn-action btn-rest"
        onClick={onRest}
        title="免费恢复精力"
      >
        💤 休息
      </button>
      {canBreak && (
        <button
          className="btn btn-action btn-break"
          onClick={onBreakthrough}
          title={`突破至 ${nextRealm.name}`}
        >
          🎆 突破 → {nextRealm.name}
        </button>
      )}
    </div>
  );
}
