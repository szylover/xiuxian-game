import { useCallback } from 'react';
import { buyItem, sellItem } from '../../game/shop';
import type { SystemActionContext } from './types';

export function useShopActions({ execAction }: Pick<SystemActionContext, 'execAction'>) {
  const buy = useCallback((itemId: string) => {
    execAction(p => buyItem(p, itemId));
  }, [execAction]);

  const sell = useCallback((itemId: string) => {
    execAction(p => sellItem(p, itemId));
  }, [execAction]);

  return { buy, sell };
}
