import { useCallback } from 'react';
import { cancelStudy, startStudy } from '../../game/learning';
import type { SystemActionContext } from './types';

export function useLearningActions({ execAction }: Pick<SystemActionContext, 'execAction'>) {
  const startStudyAction = useCallback((scrollItemId: string) => {
    execAction(p => startStudy(p, scrollItemId));
  }, [execAction]);

  const cancelStudyAction = useCallback(() => {
    execAction(p => cancelStudy(p));
  }, [execAction]);

  return {
    startStudy: startStudyAction,
    cancelStudy: cancelStudyAction,
  };
}
