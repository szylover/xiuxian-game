// ============================================================
// SceneFooter.tsx — 底部状态栏（T0069）
// 瓶颈提示 + 任务追踪摘要 + 日志打开按钮
// ============================================================

import './SceneFooter.css';
import type { Player } from '../../../game/player';
import { getActiveBottlenecks } from '../../../game/bottleneck';
import type { BottleneckUnlockMethod } from '../../../game/types';
import { getQuestState } from '../../../game/quest';
import { getQuestChainDef } from '../../../game/registry';

interface SceneFooterProps {
  player: Player;
  onOpenLog: () => void;
  onOpenMap?: () => void;
}

export default function SceneFooter({ player, onOpenLog, onOpenMap }: SceneFooterProps) {
  const bottlenecks = getActiveBottlenecks(player);
  const bn = bottlenecks[0]; // 只显示第一个激活的瓶颈

  const questState = getQuestState(player);
  const trackedId = questState.trackedQuestId;
  const trackedProgress = trackedId ? questState.activeQuests[trackedId] : undefined;
  const trackedDef = trackedId ? getQuestChainDef(trackedId) : undefined;

  // 获取当前任务步骤的简要描述
  let trackedSummary = '';
  if (trackedDef && trackedProgress) {
    const step = trackedDef.steps[trackedProgress.currentStepIndex];
    if (step) {
      const obj = step.objectives[0];
      if (obj) {
        const objProgress = trackedProgress.objectiveProgress[0];
        const current = objProgress?.currentCount ?? 0;
        const total = obj.count ?? 1;
        trackedSummary = `${obj.description} ${current}/${total}`;
      }
    }
  }

  return (
    <div className="scene-footer">
      <div className="scene-footer-left">
        {/* 瓶颈提示 */}
        {bn && (() => {
          const persistMethod = bn.def.unlockMethods.find(
            (m): m is Extract<BottleneckUnlockMethod, { type: 'persistence' }> => m.type === 'persistence'
          );
          const progress = bn.entry.progress.persistenceCultivationCount ?? 0;
          const total = persistMethod?.cultivationCount ?? 0;
          const pct = total > 0 ? Math.min(100, (progress / total) * 100) : 0;
          return (
            <span className="scene-footer-bottleneck">
              ⚠️ {bn.def.name}
              {persistMethod && (
                <span className="scene-footer-bn-bar">
                  <span
                    className="scene-footer-bn-fill"
                    style={{ '--bn-pct': `${pct}%` } as React.CSSProperties}
                  />
                </span>
              )}
              {persistMethod && (
                <span className="scene-footer-bn-nums">{progress}/{total}</span>
              )}
            </span>
          );
        })()}

        {/* 任务追踪 */}
        {trackedSummary && (
          <span className="scene-footer-quest">
            📋 {trackedSummary}
          </span>
        )}
      </div>

      {onOpenMap && (
        <button className="scene-footer-map-btn" onClick={onOpenMap} title="查看可去之处">
          🗺️ 外出
        </button>
      )}
      <button className="scene-footer-log-btn" onClick={onOpenLog} title="打开日志">
        📜 日志
      </button>
    </div>
  );
}
