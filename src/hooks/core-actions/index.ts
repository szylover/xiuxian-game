// ============================================================
// core-actions/index.ts — 核心行为 Hook 组合入口
// 将修炼/战斗/探索/休息子 Hook 组合为统一的 useCoreActions 返回值
// ============================================================

import { useRef } from 'react';
import type { CoreActionDeps, LogQueue } from './types';
import { useCultivationActions } from './useCultivationActions';
import { useCombatActions } from './useCombatActions';
import { useExplorationActions } from './useExplorationActions';
import { useRestActions } from './useRestActions';

export type { LootEntry, CombatDeathInfo, CoreActionDeps } from './types';

export function useCoreActions(deps: CoreActionDeps) {
  const { addLog } = deps;

  // 收集日志用 ref，避免 React strict mode 重复
  const pendingRef = useRef<LogQueue>({ msgs: [], categories: [] });

  const flushLogs = () => {
    const { msgs, categories } = pendingRef.current;
    for (let i = 0; i < msgs.length; i++) {
      addLog(msgs[i], categories[i]);
    }
    pendingRef.current = { msgs: [], categories: [] };
  };

  const { cultivate } = useCultivationActions(deps, pendingRef, flushLogs);
  const { fight } = useCombatActions(deps, pendingRef, flushLogs);
  const { explore } = useExplorationActions(deps, pendingRef, flushLogs);
  const { rest } = useRestActions(deps, pendingRef, flushLogs);

  return { cultivate, fight, explore, rest };
}
