import { useCallback } from 'react';
import type { Player } from '../../game/player';
import { restorePhysique, tryBodyRealmBreakthrough } from '../../game/body-cultivation';
import type { CoreActionDeps, LogQueue } from './types';
import type { LogCategory } from '../useGameLog';
import { CULTIVATION_TEXTS } from '../../data/texts/cultivation';

export function useRestActions(
  deps: Pick<CoreActionDeps, 'addLog' | 'setPlayer' | 'advanceTime'>,
  pendingRef: React.MutableRefObject<LogQueue>,
  flushLogs: () => void,
) {
  const { addLog, setPlayer, advanceTime } = deps;

  const queueLog = (msg: string, cat: LogCategory = 'default') => {
    pendingRef.current.msgs.push(msg);
    pendingRef.current.categories.push(cat);
  };

  const rest = useCallback(() => {
    pendingRef.current = { msgs: [], categories: [] };
    setPlayer(prev => {
      if (!prev) return prev;
      let p: Player = { ...prev };
      p.stamina = p.maxStamina;
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      p.health = Math.min(100, p.health + 5);
      p.mood = Math.min(100, p.mood + 3);
      // T0059 休息恢复体魄
      p = restorePhysique(p);
      // 体魄恢复后检查体修突破
      const btResult = tryBodyRealmBreakthrough(p);
      if (btResult.breakthrough) {
        p = btResult.player;
        queueLog(btResult.message, 'system');
      }
      p.tracking = { ...p.tracking, consecutiveRests: p.tracking.consecutiveRests + 1, consecutiveCultivates: 0 };
      p = advanceTime(p, 'rest');

      pendingRef.current = { msgs: [], categories: [] };
      queueLog(CULTIVATION_TEXTS.rest, 'system');
      return p;
    });
    setTimeout(flushLogs, 0);
  }, [advanceTime, addLog, setPlayer]);

  return { rest };
}
