// ============================================================
// ActionPanel.tsx — 操作按钮面板
// ============================================================

import { getNextRealm } from '../../game/player';
import type { Player } from '../../game/player';
import { ACTION_COSTS } from '../../game/data';
import { getBreakthroughStatus } from '../../game/breakthrough';
import { getBottleneckState } from '../../game/bottleneck';
import { bottleneckDefsMap } from '../../game/registry/stores';

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

  // T0064：获取瓶颈详情用于显示
  const bottleneckState = getBottleneckState(player);
  const activeRealmBottleneck = bottleneckState.activeBottlenecks.find(ab => {
    if (ab.unlocked) return false;
    const def = bottleneckDefsMap.get(ab.defId);
    return def?.type === 'realm';
  });
  const bottleneckDef = activeRealmBottleneck ? (bottleneckDefsMap.get(activeRealmBottleneck.defId) ?? null) : null;

  const staminaOk = (key: string) => player.stamina >= ACTION_COSTS[key].stamina;

  // 突破按钮提示
  let breakTitle = '';
  if (btStatus.bottleneckActive) {
    breakTitle = `🔒 ${bottleneckDef?.name ?? '瓶颈'}阻隔，需寻机缘（进度 ${Math.floor(activeRealmBottleneck?.progress ?? 0)}/${bottleneckDef?.unlockProgressThreshold ?? 200}）`;
  } else if (nextRealm) {
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
        <>
          {/* T0064：瓶颈详情卡 */}
          {btStatus.bottleneckActive && bottleneckDef && activeRealmBottleneck && (
            <div className="bottleneck-detail-card">
              <div className="bottleneck-title">🔒 {bottleneckDef.name}</div>
              <div className="bottleneck-desc">{bottleneckDef.description}</div>
              <div className="bottleneck-methods">
                <div className="bottleneck-methods-title">解锁途径（满足任一即可）：</div>
                {bottleneckDef.unlockMethods.map(m => (
                  <div key={m.id} className="bottleneck-method-item">
                    {m.type === 'combat' && '⚔️'}
                    {m.type === 'explore' && '💡'}
                    {m.type === 'discuss' && '🗣️'}
                    {m.type === 'quest' && '📜'}
                    {m.type === 'item' && '💊'}
                    {' '}{m.description}
                    {(m.condition?.includes('T0025') || m.type === 'discuss') && ' （T0025预留）'}
                    {(m.condition?.includes('T0057') || (m.type === 'quest' && !m.condition?.includes('T0025'))) && ' （T0057预留）'}
                  </div>
                ))}
              </div>
              <div className="bottleneck-progress-row">
                <span>积累进度：{Math.floor(activeRealmBottleneck.progress)}/{bottleneckDef.unlockProgressThreshold}</span>
                <div className="bottleneck-progress-bar">
                  <div
                    className="bottleneck-progress-fill"
                    style={{ width: `${Math.min(100, (activeRealmBottleneck.progress / bottleneckDef.unlockProgressThreshold) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          <button
            className={`btn btn-action btn-break${btStatus.bottleneckActive ? ' btn-break-locked' : (btStatus.bottleneckUnlocked ? ' btn-break-unlocked' : '')}`}
            onClick={onBreakthrough}
            disabled={btStatus.bottleneckActive ?? false}
            title={breakTitle}
          >
            {btStatus.bottleneckActive
              ? '道路封闭 🔒'
              : btStatus.requiresTribulation
                ? `⛈️ 突破 → ${nextRealm.name} (渡劫)`
                : `${btStatus.bottleneckUnlocked ? '✨' : '🎆'} 突破 → ${nextRealm.name}${btStatus.canAttempt && !btStatus.requiresTribulation ? ` (${(btStatus.successRate * 100).toFixed(0)}%)` : ''}`
            }
          </button>
        </>
      )}
    </div>
  );
}
