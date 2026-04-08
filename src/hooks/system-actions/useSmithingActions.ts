import { useCallback } from 'react';
import { performSmithing } from '../../game/smithing';
import { tickQuestObjectives } from '../../game/quest';
import { getSmithingRecipe } from '../../game/registry';
import type { SystemActionContext } from './types';

export function useSmithingActions({ addLog, setPlayer }: Pick<SystemActionContext, 'addLog' | 'setPlayer'>) {
  const smith = useCallback((recipeId: string) => {
    let smithMsg = '';
    setPlayer(prev => {
      if (!prev) return prev;
      const result = performSmithing(prev, recipeId);
      smithMsg = result.message;
      let p = result.player;
      // T0057: 炼器成功后推进 craft_item 目标
      if (result.message && !result.message.includes('❌') && !result.message.includes('⚠️')) {
        const recipeDef = getSmithingRecipe(recipeId);
        if (recipeDef) {
          const questResult = tickQuestObjectives(p, { type: 'craft_item', recipeId, outputItemId: recipeDef.outputItemId });
          p = questResult.player;
          for (const log of questResult.logs) addLog(log, 'system');
        }
      }
      return p;
    });
    if (smithMsg) addLog(smithMsg, 'system');
  }, [addLog, setPlayer]);

  return { smith };
}
