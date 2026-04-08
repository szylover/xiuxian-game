import { useCallback } from 'react';
import { learnDivineArt as learnDivineArtFn, activateDivineArt as activateDivineArtFn, deactivateDivineArt as deactivateDivineArtFn } from '../../game/divine-arts';
import type { SystemActionContext } from './types';

export function useDivineArtsActions({ execAction }: Pick<SystemActionContext, 'execAction'>) {
  const learnDivineArt = useCallback((artId: string) => {
    execAction(p => learnDivineArtFn(p, artId));
  }, [execAction]);

  const activateDivineArt = useCallback((artId: string) => {
    execAction(p => activateDivineArtFn(p, artId));
  }, [execAction]);

  const deactivateDivineArt = useCallback(() => {
    execAction(p => deactivateDivineArtFn(p));
  }, [execAction]);

  return { learnDivineArt, activateDivineArt, deactivateDivineArt };
}
