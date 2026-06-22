import { useCallback } from 'react';
import { contemplateInsight, tryTriggerEnlightenment } from '../../game/enlightenment';
import type { SystemActionContext } from './types';

export function useEnlightenmentActions({ execAction }: Pick<SystemActionContext, 'execAction'>) {
  const contemplateEnlightenment = useCallback(() => {
    execAction(p => contemplateInsight(p), 'adventure');
  }, [execAction]);

  const triggerEnlightenment = useCallback(() => {
    execAction(p => {
      const result = tryTriggerEnlightenment(p, Math.max(20, Math.floor(p.exp * 0.02)), true);
      return { player: result.player, message: result.logs.join(' ') };
    }, 'adventure');
  }, [execAction]);

  return { contemplateEnlightenment, triggerEnlightenment };
}
