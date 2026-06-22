import { useCallback } from 'react';
import { suppressHeartDemon, tryHeartDemonTribulation } from '../../game/heart-demon';
import type { SystemActionContext } from './types';

export function useHeartDemonActions({ player, addLog, setPlayer, chronicleHooks }: Pick<SystemActionContext, 'player' | 'addLog' | 'setPlayer' | 'chronicleHooks'>) {
  const suppressHeartDemonAction = useCallback(() => {
    if (!player) return;
    const result = suppressHeartDemon(player);
    setPlayer(result.player);
    for (const log of result.logs) addLog(log, 'system');
  }, [player, addLog, setPlayer]);

  const confrontHeartDemon = useCallback(() => {
    if (!player) return;
    const result = tryHeartDemonTribulation(player, true);
    setPlayer(result.player);
    for (const log of result.logs) addLog(log, result.success ? 'adventure' : 'system');
    if (result.triggered) {
      chronicleHooks?.recordEvent('special_adventure', result.player, result.logs[result.logs.length - 1] ?? '');
      chronicleHooks?.syncSnapshot(result.player);
    }
  }, [player, addLog, setPlayer, chronicleHooks]);

  return { suppressHeartDemon: suppressHeartDemonAction, confrontHeartDemon };
}
