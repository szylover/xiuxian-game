import { useCallback } from 'react';
import { useItem as inventoryUseItem } from '../../game/inventory';
import type { SystemActionContext } from './types';

export function useInventoryActions({ execAction }: Pick<SystemActionContext, 'execAction'>) {
  const useItem = useCallback((itemId: string) => {
    execAction(p => inventoryUseItem(p, itemId));
  }, [execAction]);

  return { useItem };
}
