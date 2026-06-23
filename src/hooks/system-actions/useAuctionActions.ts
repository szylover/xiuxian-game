import { useCallback } from 'react';
import { consignAuctionItem, ensureAuctionHouse, placeAuctionBid, refreshAuctionHouse, settleDueAuctions } from '../../game/auction';
import type { AuctionActionResult } from '../../game/auction';
import type { Player } from '../../game/player';
import type { SystemActionContext } from './types';

export function useAuctionActions({ addLog, setPlayer }: Pick<SystemActionContext, 'addLog' | 'setPlayer'>) {
  const runAuctionAction = useCallback((action: (player: Player) => AuctionActionResult) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = action(prev);
      for (const log of result.logs) addLog(log, 'system');
      return result.player;
    });
  }, [addLog, setPlayer]);

  const bidAuctionLot = useCallback((lotId: string) => {
    runAuctionAction(player => placeAuctionBid(player, lotId));
  }, [runAuctionAction]);

  const consignAuction = useCallback((itemId: string, count: number, askPrice: number) => {
    runAuctionAction(player => consignAuctionItem(player, itemId, count, askPrice));
  }, [runAuctionAction]);

  const refreshAuction = useCallback(() => runAuctionAction(refreshAuctionHouse), [runAuctionAction]);
  const settleAuction = useCallback(() => runAuctionAction(player => settleDueAuctions(player, true)), [runAuctionAction]);
  const ensureAuction = useCallback(() => runAuctionAction(player => ensureAuctionHouse(player)), [runAuctionAction]);

  return { bidAuctionLot, consignAuction, refreshAuction, settleAuction, ensureAuction };
}
