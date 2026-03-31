// ============================================================
// ActionPanel.tsx — 操作按钮面板
// 突破按钮支持多修炼路线（气修/体修/未来扩展），满足条件时动态显示
// ============================================================

import { getNextRealm } from '../../game/player';
import type { Player } from '../../game/player';
import { ACTION_COSTS } from '../../game/data';
import { getBreakthroughStatus } from '../../game/breakthrough';
import { getBodyBreakthroughStatus } from '../../game/body-cultivation';
import { getCurrentRegion } from '../../game/map';

interface ActionPanelProps {
  player: Player;
  onCultivate: () => void;
  onFight: () => void;
  onExplore: () => void;
  onRest: () => void;
  onBreakthrough: () => void;
  onBodyBreakthrough: () => void;
  gameOver: boolean;
}

export default function ActionPanel({ player, onCultivate, onFight, onExplore, onRest, onBreakthrough, onBodyBreakthrough, gameOver }: ActionPanelProps) {
  if (!player || gameOver) return null;

  const staminaOk = (key: string) => player.stamina >= ACTION_COSTS[key].stamina;
  const region = getCurrentRegion(player);
  const isSafeZone = region?.safeZone ?? false;

  // ── 气修突破状态 ──
  const nextRealm = getNextRealm(player);
  const btStatus = getBreakthroughStatus(player);
  let qiBreakTitle = '';
  if (nextRealm) {
    if (!btStatus.expReady) qiBreakTitle = `修为不足（需 ${nextRealm.expReq}）`;
    else if (!btStatus.canAttempt) {
      const missing = [
        ...btStatus.itemsReady.filter(i => !i.ready).map(i => `${i.name} ×${i.required}`),
        ...btStatus.conditionsReady.filter(c => !c.ready).map(c => c.description),
      ];
      qiBreakTitle = `条件不足：${missing.join('，')}`;
    } else if (btStatus.requiresTribulation) qiBreakTitle = `气修突破至 ${nextRealm.name}（需渡劫）`;
    else qiBreakTitle = `气修突破至 ${nextRealm.name}（成功率 ${(btStatus.successRate * 100).toFixed(0)}%）`;
  }
  const showQiBreak = nextRealm && btStatus.expReady;

  // ── 体修突破状态 ──
  const bodyBt = getBodyBreakthroughStatus(player);
  let bodyBreakTitle = '';
  if (bodyBt.nextRealm) {
    if (!bodyBt.physiqueReady && bodyBt.expReady)
      bodyBreakTitle = `体魄不足（${player.physique}/${bodyBt.physiqueRequired}），休息或战斗可恢复`;
    else if (!bodyBt.expReady)
      bodyBreakTitle = `体修修为不足（${player.bodyRealmExp}/${bodyBt.nextRealm.expReq}）`;
    else
      bodyBreakTitle = `体修突破至【${bodyBt.nextRealm.name}】`;
  }
  const showBodyBreak = bodyBt.nextRealm && bodyBt.expReady;

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
        disabled={!staminaOk('combat') || isSafeZone}
        title={isSafeZone ? `🛡️ ${region?.emoji} ${region?.name}是安全区域，无法战斗` : `消耗 ${ACTION_COSTS.combat.stamina} 精力`}
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

      {/* 气修突破 */}
      {showQiBreak && (
        <button
          className="btn btn-action btn-break"
          onClick={onBreakthrough}
          disabled={!btStatus.canAttempt}
          title={qiBreakTitle}
        >
          {btStatus.requiresTribulation ? '⛈️' : '🎆'} 气修突破 → {nextRealm.name}
          {btStatus.canAttempt && !btStatus.requiresTribulation && ` (${(btStatus.successRate * 100).toFixed(0)}%)`}
          {btStatus.requiresTribulation && ' (渡劫)'}
        </button>
      )}

      {/* 体修突破 */}
      {showBodyBreak && (
        <button
          className="btn btn-action btn-break"
          onClick={onBodyBreakthrough}
          disabled={!bodyBt.canAttempt}
          title={bodyBreakTitle}
          style={{ borderColor: '#FF9800' }}
        >
          🔥 体修突破 → {bodyBt.nextRealm!.name}
        </button>
      )}
    </div>
  );
}
