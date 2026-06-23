import { useCallback } from 'react';
import type { SectMemberState } from '../../game/types';
import {
  advanceSectRank,
  assignSectMemberTask,
  buySectStoreItem,
  claimSectStipend,
  collectSectYield,
  completeSectMission,
  foundSectManagement,
  joinSect,
  recruitSectMember,
  upgradeSectFacility,
} from '../../game/sect';
import type { SystemActionContext } from './types';

type SectActionWithId = (player: Parameters<typeof joinSect>[0], id: string) => ReturnType<typeof joinSect>;

export function useSectActions({ addLog, setPlayer }: Pick<SystemActionContext, 'addLog' | 'setPlayer'>) {
  const run = useCallback((action: (player: Parameters<typeof claimSectStipend>[0]) => ReturnType<typeof claimSectStipend>) => {
    let logs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = action(prev);
      logs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of logs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  const runWithId = useCallback((action: SectActionWithId, id: string) => {
    let logs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = action(prev, id);
      logs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of logs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  const join = useCallback((sectId: string) => runWithId(joinSect, sectId), [runWithId]);
  const claimStipend = useCallback(() => run(claimSectStipend), [run]);
  const advanceRank = useCallback(() => run(advanceSectRank), [run]);
  const completeMission = useCallback((missionId: string) => runWithId(completeSectMission, missionId), [runWithId]);
  const buyStoreItem = useCallback((itemId: string) => runWithId(buySectStoreItem, itemId), [runWithId]);
  const foundManagement = useCallback(() => run(foundSectManagement), [run]);
  const recruitMember = useCallback(() => run(recruitSectMember), [run]);
  const collectYield = useCallback(() => run(collectSectYield), [run]);
  const upgradeFacility = useCallback((facilityId: string) => runWithId(upgradeSectFacility, facilityId), [runWithId]);
  const assignTask = useCallback((memberId: string, task: SectMemberState['task']) => {
    let logs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = assignSectMemberTask(prev, memberId, task);
      logs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of logs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  return {
    joinSect: join,
    claimSectStipend: claimStipend,
    advanceSectRank: advanceRank,
    completeSectMission: completeMission,
    buySectStoreItem: buyStoreItem,
    foundSectManagement: foundManagement,
    recruitSectMember: recruitMember,
    collectSectYield: collectYield,
    upgradeSectFacility: upgradeFacility,
    assignSectMemberTask: assignTask,
  };
}
