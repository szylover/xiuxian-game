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
import { getActiveBottlenecks } from '../../game/bottleneck';
import type { BottleneckDef, BottleneckState } from '../../game/types';
import { getBottleneckDef } from '../../game/registry';
import { useState } from 'react';
import './ActionPanel.css';

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

  const [showBottleneckModal, setShowBottleneckModal] = useState<string | null>(null);

  const staminaOk = (key: string) => player.stamina >= ACTION_COSTS[key].stamina;
  const region = getCurrentRegion(player);
  const isSafeZone = region?.safeZone ?? false;

  // ── T0064: 激活的瓶颈 ──
  const activeBottlenecks = getActiveBottlenecks(player);
  const bnState = (player.systems.bottleneck ?? { active: {}, unlocked: {} }) as BottleneckState;

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
        {isSafeZone ? `🛡️ 安全区域` : '⚔️ 战斗'}
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
          className="btn btn-action btn-break btn-body-break"
          onClick={onBodyBreakthrough}
          disabled={!bodyBt.canAttempt}
          title={bodyBreakTitle}
        >
          🔥 体修突破 → {bodyBt.nextRealm!.name}
        </button>
      )}

      {/* T0064: 瓶颈提示条 */}
      {activeBottlenecks.map(({ def, entry }) => {
        const persistMethod = def.unlockMethods.find(m => m.type === 'persistence') as
          | Extract<import('../../game/types').BottleneckUnlockMethod, { type: 'persistence' }>
          | undefined;
        const progress = entry.progress.persistenceCultivationCount ?? 0;
        const total = persistMethod?.cultivationCount ?? 0;
        return (
          <div
            key={def.id}
            className="bottleneck-bar"
            onClick={() => setShowBottleneckModal(def.id)}
          >
            ⚠️ <strong>{def.name}</strong>
            {persistMethod && (
              <span className="bottleneck-bar-progress">
                坚韧修炼 {progress}/{total}
              </span>
            )}
            <span className="bottleneck-bar-hint">点击详情</span>
          </div>
        );
      })}

      {/* T0064: 瓶颈详情弹窗 */}
      {showBottleneckModal && (() => {
        const def = getBottleneckDef(showBottleneckModal);
        if (!def) return null;
        const entry = bnState.active[showBottleneckModal];
        return (
          <div
            className="bottleneck-modal-overlay"
            onClick={() => setShowBottleneckModal(null)}
          >
            <div
              className="bottleneck-modal-content"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="bottleneck-modal-title">
                🚧 {def.name}
              </h3>
              <p className="bottleneck-modal-desc">
                {def.description}
              </p>
              <p className="bottleneck-modal-hint">
                💡 {def.hint}
              </p>
              <div className="bottleneck-modal-methods">
                <div className="bottleneck-modal-methods-title">解锁方式（任意一种即可）：</div>
                {def.unlockMethods.map((m, i) => {
                  const icons: Record<string, string> = {
                    quest: '📜', combat: '⚔️', discourse: '💬', epiphany: '✨', persistence: '🔁', overflow: '🌊',
                  };
                  let desc = '';
                  if (m.type === 'combat') desc = `击败指定强敌`;
                  else if (m.type === 'quest') desc = `完成指定任务`;
                  else if (m.type === 'discourse') desc = `与 NPC 论道`;
                  else if (m.type === 'epiphany') desc = `探索中灵光一闪（${(m.baseChance * 100).toFixed(0)}% 概率）`;
                  else if (m.type === 'persistence') {
                    const progress = entry?.progress.persistenceCultivationCount ?? 0;
                    desc = `坚韧修炼 ${progress}/${m.cultivationCount} 次`;
                  }
                  return (
                    <div key={i} className="bottleneck-modal-method">
                      {icons[m.type] ?? '⬜'} {desc}
                      {m.type === 'persistence' && entry && (
                        <div className="bottleneck-method-progress-track">
                          <div
                            className="bottleneck-method-progress-fill"
                            style={{
                              '--progress-width': `${Math.min(100, ((entry.progress.persistenceCultivationCount ?? 0) / m.cultivationCount) * 100)}%`,
                            } as React.CSSProperties}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setShowBottleneckModal(null)}
                className="bottleneck-modal-close-btn"
              >
                关闭
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
