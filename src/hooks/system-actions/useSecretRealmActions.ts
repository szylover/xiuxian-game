import { useCallback } from 'react';
import { advanceSecretRealm, finishSecretRealm, startSecretRealm } from '../../game/secret-realm';
import type { SystemActionContext } from './types';

export function useSecretRealmActions({ addLog, setPlayer }: Pick<SystemActionContext, 'addLog' | 'setPlayer'>) {
  const startRealm = useCallback((realmId: string) => {
    let logs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = startSecretRealm(prev, realmId);
      logs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of logs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  const advanceRealm = useCallback(() => {
    let logs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = advanceSecretRealm(prev);
      logs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of logs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  const finishRealm = useCallback(() => {
    let logs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = finishSecretRealm(prev);
      logs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of logs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  return { startRealm, advanceRealm, finishRealm };
}
