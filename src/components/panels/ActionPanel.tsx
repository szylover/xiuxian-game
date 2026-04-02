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
          className="btn btn-action btn-break"
          onClick={onBodyBreakthrough}
          disabled={!bodyBt.canAttempt}
          title={bodyBreakTitle}
          style={{ borderColor: '#FF9800' }}
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
            style={{
              background: 'linear-gradient(135deg, #4a2800, #2a1500)',
              border: '1px solid #ff9800',
              borderRadius: 6,
              padding: '6px 10px',
              margin: '4px 0',
              cursor: 'pointer',
              fontSize: 12,
              color: '#ffcc80',
            }}
          >
            ⚠️ <strong>{def.name}</strong>
            {persistMethod && (
              <span style={{ marginLeft: 8, color: '#aaa' }}>
                坚韧修炼 {progress}/{total}
              </span>
            )}
            <span style={{ float: 'right', color: '#888', fontSize: 11 }}>点击详情</span>
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
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowBottleneckModal(null)}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                border: '2px solid #ff9800',
                borderRadius: 12,
                padding: '20px 24px',
                maxWidth: 420,
                width: '90%',
                color: '#e0e0e0',
              }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ color: '#ff9800', margin: '0 0 8px', fontSize: 16 }}>
                🚧 {def.name}
              </h3>
              <p style={{ fontSize: 13, color: '#ccc', margin: '0 0 12px', lineHeight: 1.6 }}>
                {def.description}
              </p>
              <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 12px', fontStyle: 'italic' }}>
                💡 {def.hint}
              </p>
              <div style={{ fontSize: 13 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 6, color: '#ffcc80' }}>解锁方式（任意一种即可）：</div>
                {def.unlockMethods.map((m, i) => {
                  const icons: Record<string, string> = {
                    quest: '📜', combat: '⚔️', discourse: '💬', epiphany: '✨', persistence: '🔁',
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
                    <div key={i} style={{ padding: '3px 0', color: '#ddd' }}>
                      {icons[m.type] ?? '⬜'} {desc}
                      {m.type === 'persistence' && entry && (
                        <div style={{
                          background: '#333', borderRadius: 4, height: 6, marginTop: 3, overflow: 'hidden',
                        }}>
                          <div style={{
                            background: '#ff9800',
                            height: '100%',
                            width: `${Math.min(100, ((entry.progress.persistenceCultivationCount ?? 0) / m.cultivationCount) * 100)}%`,
                            borderRadius: 4,
                            transition: 'width 0.3s',
                          }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setShowBottleneckModal(null)}
                style={{
                  marginTop: 16, width: '100%', padding: '8px', background: '#333',
                  border: '1px solid #555', borderRadius: 6, color: '#ccc', cursor: 'pointer',
                }}
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
