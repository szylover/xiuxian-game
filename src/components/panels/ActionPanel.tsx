// ============================================================
// ActionPanel.tsx — 操作按钮面板
// ============================================================

import { getNextRealm } from '../../game/player';
import type { Player } from '../../game/player';
import { ACTION_COSTS } from '../../game/data';
import { getBreakthroughStatus } from '../../game/breakthrough';

interface ActionPanelProps {
  player: Player;
  onCultivate: () => void;
  onFight: () => void;
  onExplore: () => void;
  onRest: () => void;
  onBreakthrough: () => void;
  gameOver: boolean;
}

export default function ActionPanel({ player, onCultivate, onFight, onExplore, onRest, onBreakthrough, gameOver }: ActionPanelProps) {
  if (!player || gameOver) return null;

  const nextRealm = getNextRealm(player);
  const btStatus = getBreakthroughStatus(player);

  const staminaOk = (key: string) => player.stamina >= ACTION_COSTS[key].stamina;

  // 突破按钮提示
  let breakTitle = '';
  if (nextRealm) {
    if (!btStatus.expReady) breakTitle = `修为不足（需 ${nextRealm.expReq}）`;
    else if (!btStatus.canAttempt) {
      const missing = [
        ...btStatus.itemsReady.filter(i => !i.ready).map(i => `${i.name} ×${i.required}`),
        ...btStatus.conditionsReady.filter(c => !c.ready).map(c => c.description),
      ];
      breakTitle = `条件不足：${missing.join('，')}`;
    } else if (btStatus.requiresTribulation) breakTitle = `突破至 ${nextRealm.name}（需渡劫）`;
    else breakTitle = `突破至 ${nextRealm.name}（成功率 ${(btStatus.successRate * 100).toFixed(0)}%）`;
  }

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
      {nextRealm && btStatus.expReady && (
        <button
          className="btn btn-action btn-break"
          onClick={onBreakthrough}
          disabled={!btStatus.canAttempt}
          title={breakTitle}
        >
          {btStatus.requiresTribulation ? '⛈️' : '🎆'} 突破 → {nextRealm.name}
          {btStatus.canAttempt && !btStatus.requiresTribulation && ` (${(btStatus.successRate * 100).toFixed(0)}%)`}
          {btStatus.requiresTribulation && ' (渡劫)'}
        </button>
      )}
    </div>
  );
}
