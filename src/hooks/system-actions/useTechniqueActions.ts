import { useCallback } from 'react';
import { learnTechnique, practiceTechnique, activateTechnique } from '../../game/technique';
import { recalcStats } from '../../game/player';
import type { SystemActionContext } from './types';
import { tickStudy } from '../../game/learning';

export function useTechniqueActions({ execAction }: Pick<SystemActionContext, 'execAction'>) {
  const learnTechniqueAction = useCallback((techniqueId: string) => {
    execAction(p => learnTechnique(p, techniqueId));
  }, [execAction]);

  const practiceTechniqueAction = useCallback((techniqueId: string) => {
    execAction(p => {
      const result = practiceTechnique(p, techniqueId);
      const learningTick = tickStudy(result.player, 1);
      const message = [result.message, ...learningTick.messages].filter(Boolean).join(' ');
      // 修炼后重算属性以应用被动加成（T0019）
      return { player: recalcStats(learningTick.player), message };
    });
  }, [execAction]);

  const activateTechniqueAction = useCallback((techniqueId: string) => {
    execAction(p => activateTechnique(p, techniqueId));
  }, [execAction]);

  return {
    learnTechnique: learnTechniqueAction,
    practiceTechnique: practiceTechniqueAction,
    activateTechnique: activateTechniqueAction,
  };
}
