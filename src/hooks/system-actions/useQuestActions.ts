import { useCallback } from 'react';
import { acceptQuest as acceptQuestFn, abandonQuest as abandonQuestFn, deliverQuestItem as deliverQuestItemFn, turnInQuest as turnInQuestFn, setTrackedQuest as setTrackedQuestFn } from '../../game/quest';
import { getQuestChainDef } from '../../game/registry';
import type { SystemActionContext } from './types';

export function useQuestActions({ addLog, setPlayer, chronicleHooks }: Pick<SystemActionContext, 'addLog' | 'setPlayer' | 'chronicleHooks'>) {
  const acceptQuest = useCallback((questId: string) => {
    let questLogs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = acceptQuestFn(prev, questId);
      questLogs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of questLogs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  const abandonQuest = useCallback((questId: string) => {
    let questLogs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = abandonQuestFn(prev, questId);
      questLogs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of questLogs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  const deliverQuestItem = useCallback((questId: string, objectiveIndex: number) => {
    let questLogs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = deliverQuestItemFn(prev, questId, objectiveIndex);
      questLogs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of questLogs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  const turnInQuest = useCallback((questId: string) => {
    let questLogs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = turnInQuestFn(prev, questId);
      questLogs = result.logs;
      // T0068: 记录任务完成事件
      if (result.logs.some(l => l.includes('🎉'))) {
        const questDef = getQuestChainDef(questId);
        chronicleHooks?.recordEvent('achievement_unlocked', result.player,
          `完成任务「${questDef?.name ?? questId}」`,
          { questId, questName: questDef?.name },
        );
      }
      return result.player;
    });
    setTimeout(() => { for (const log of questLogs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer, chronicleHooks]);

  const setTrackedQuest = useCallback((questId: string | null) => {
    setPlayer(prev => {
      if (!prev) return prev;
      return setTrackedQuestFn(prev, questId);
    });
  }, [setPlayer]);

  return { acceptQuest, abandonQuest, deliverQuestItem, turnInQuest, setTrackedQuest };
}
