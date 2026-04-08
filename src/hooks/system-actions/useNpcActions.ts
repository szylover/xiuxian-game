import { useCallback } from 'react';
import { meetNpc as meetNpcFn, giveGift as giveGiftFn } from '../../game/npc';
import { tickQuestObjectives, checkQuestDiscovery } from '../../game/quest';
import type { SystemActionContext } from './types';

export function useNpcActions({ addLog, setPlayer, execAction }: Pick<SystemActionContext, 'addLog' | 'setPlayer' | 'execAction'>) {
  const meetNpc = useCallback((npcId: string) => {
    let meetMsg = '';
    setPlayer(prev => {
      if (!prev) return prev;
      const result = meetNpcFn(prev, npcId);
      meetMsg = result.message;
      let p = result.player;
      // T0057: NPC 交互后推进 talk_npc 目标
      const questResult = tickQuestObjectives(p, { type: 'talk_npc', npcId });
      p = questResult.player;
      for (const log of questResult.logs) addLog(log, 'system');
      // T0067: NPC 交互后检查可发现的任务
      const questDiscover = checkQuestDiscovery(p, { type: 'talk_npc', npcId });
      p = questDiscover.player;
      for (const log of questDiscover.logs) addLog(log, 'system');
      return p;
    });
    if (meetMsg) addLog(meetMsg, 'system');
  }, [addLog, setPlayer]);

  const giveGift = useCallback((npcId: string, itemId: string) => {
    execAction(p => {
      const result = giveGiftFn(p, npcId, itemId);
      return { player: result.player, message: result.message };
    });
  }, [execAction]);

  return { meetNpc, giveGift };
}
