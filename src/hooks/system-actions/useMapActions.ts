import { useCallback } from 'react';
import { travelTo as travelToFn } from '../../game/map';
import { tickQuestObjectives, checkQuestDiscovery } from '../../game/quest';
import { tickBountyObjectives } from '../../game/bounty';
import type { SystemActionContext } from './types';

export function useMapActions({ addLog, setPlayer }: Pick<SystemActionContext, 'addLog' | 'setPlayer'>) {
  const travel = useCallback((regionId: string) => {
    let travelMsg = '';
    setPlayer(prev => {
      if (!prev) return prev;
      const result = travelToFn(prev, regionId);
      travelMsg = result.message;
      let p = result.player;
      // T0057: 移动后推进 reach_region 目标
        if (result.message && !result.message.includes('❌') && !result.message.includes('⚠️')) {
        const questResult = tickQuestObjectives(p, { type: 'reach_region', regionId });
        p = questResult.player;
        for (const log of questResult.logs) addLog(log, 'system');
        const bountyResult = tickBountyObjectives(p, { type: 'reach_region', regionId });
        p = bountyResult.player;
        // T0067: 移动后检查可发现的任务
        const questDiscover = checkQuestDiscovery(p, { type: 'reach_region', regionId });
        p = questDiscover.player;
        for (const log of questDiscover.logs) addLog(log, 'system');
      }
      return p;
    });
    if (travelMsg) addLog(travelMsg, 'system');
  }, [addLog, setPlayer]);

  return { travel };
}
