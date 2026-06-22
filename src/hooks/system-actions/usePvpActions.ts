import { useCallback } from 'react';
import { challengePvpOpponent } from '../../game/pvp';
import { PVP_TEXTS } from '../../data/texts';
import type { SystemActionContext } from './types';

export function usePvpActions({ player, addLog, setPlayer, chronicleHooks }: Pick<SystemActionContext, 'player' | 'addLog' | 'setPlayer' | 'chronicleHooks'>) {
  const challengePvp = useCallback((opponentId: string) => {
    if (!player) return;
    const result = challengePvpOpponent(player, opponentId);
    setPlayer(result.player);
    if (result.record) addLog(PVP_TEXTS.logs.start(result.record.opponentName, result.record.opponentRank), 'combat');
    addLog(result.message, result.success ? 'adventure' : 'combat');
    if (result.record) {
      chronicleHooks?.recordEvent('special_adventure', result.player, result.message, { opponentId });
      chronicleHooks?.syncSnapshot(result.player);
    }
  }, [player, addLog, setPlayer, chronicleHooks]);
  return { challengePvp };
}
