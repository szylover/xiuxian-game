import { useCallback } from 'react';
import { performMining } from '../../game/feng-shui-mining';
import type { SystemActionContext } from './types';

export function useMiningActions({ addLog, setPlayer }: Pick<SystemActionContext, 'addLog' | 'setPlayer'>) {
  const mineAtSite = useCallback((siteId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = performMining(prev, siteId);
      for (const log of result.logs) addLog(log, 'system');
      return result.player;
    });
  }, [addLog, setPlayer]);

  return { mineAtSite };
}
