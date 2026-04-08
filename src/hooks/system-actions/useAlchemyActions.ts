import { useCallback } from 'react';
import { performAlchemy } from '../../game/alchemy';
import { tickQuestObjectives } from '../../game/quest';
import { getRecipe } from '../../game/registry';
import type { SystemActionContext } from './types';

export function useAlchemyActions({ addLog, setPlayer }: Pick<SystemActionContext, 'addLog' | 'setPlayer'>) {
  const craft = useCallback((recipeId: string) => {
    let craftMsg = '';
    setPlayer(prev => {
      if (!prev) return prev;
      const result = performAlchemy(prev, recipeId);
      craftMsg = result.message;
      let p = result.player;
      // T0057: 炼丹成功后推进 craft_item 目标
      if (result.message && !result.message.includes('❌') && !result.message.includes('⚠️')) {
        const recipeDef = getRecipe(recipeId);
        if (recipeDef) {
          const questResult = tickQuestObjectives(p, { type: 'craft_item', recipeId, outputItemId: recipeDef.outputItemId });
          p = questResult.player;
          for (const log of questResult.logs) addLog(log, 'system');
        }
      }
      return p;
    });
    if (craftMsg) addLog(craftMsg, 'system');
  }, [addLog, setPlayer]);

  return { craft };
}
