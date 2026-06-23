import { useCallback } from 'react';
import type { Player } from '../game/player';
import { recalcStats } from '../game/player';
import { unlockTalentNode as unlockTalentNodeFn } from '../game/destiny';

export function useTalentTree(
  player: Player | null,
  setPlayer: (updater: (prev: Player | null) => Player | null) => void,
  addLog: (msg: string, category?: 'default' | 'combat' | 'explore' | 'adventure' | 'daily' | 'system') => void,
) {
  const unlockTalentNode = useCallback((nodeId: string) => {
    if (!player) return;
    let message = '';
    setPlayer(prev => {
      if (!prev) return prev;
      const result = unlockTalentNodeFn(prev, nodeId);
      message = result.message;
      return result.success ? recalcStats(result.player) : result.player;
    });
    if (message) addLog(message, 'system');
  }, [player, setPlayer, addLog]);

  return { unlockTalentNode };
}
