import { useCallback } from 'react';
import { acceptBounty as acceptBountyFn, claimBounty as claimBountyFn, refreshBountyBoard } from '../../game/bounty';
import type { SystemActionContext } from './types';

export function useBountyActions({ addLog, setPlayer }: Pick<SystemActionContext, 'addLog' | 'setPlayer'>) {
  const run = useCallback((action: typeof acceptBountyFn, id: string) => {
    let logs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = action(prev, id);
      logs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of logs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  const acceptBounty = useCallback((id: string) => run(acceptBountyFn, id), [run]);
  const claimBounty = useCallback((id: string) => run(claimBountyFn, id), [run]);
  const refreshBounties = useCallback(() => {
    let logs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = refreshBountyBoard(prev);
      logs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of logs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  return { acceptBounty, claimBounty, refreshBounties };
}
