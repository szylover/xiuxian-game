// ============================================================
// ShopPanel.tsx — 商店面板（T0015）
// 商品列表 + 买入/卖出 + charisma 折扣显示
// ============================================================

import { useState } from 'react';
import type { Player } from '../../game/player';
import { getItemDef } from '../../game/registry';
import { getShopGoodsForRegion, calcBuyPrice } from '../../game/shop';
import { getInventoryEntries } from '../../game/inventory';
import { TabBar } from '../shared';
import ShopBuyItem from './shop/ShopBuyItem';
import ShopSellItem from './shop/ShopSellItem';

interface ShopPanelProps {
  player: Player;
  onBuy: (itemId: string) => void;
  onSell: (itemId: string) => void;
}

const SHOP_TABS = [
  { key: 'buy' as const, label: '买入', icon: '🛒' },
  { key: 'sell' as const, label: '卖出', icon: '💰' },
];

type ShopTab = 'buy' | 'sell';

export default function ShopPanel({ player, onBuy, onSell }: ShopPanelProps) {
  const [tab, setTab] = useState<ShopTab>('buy');

  if (!player) return null;

  const goods = getShopGoodsForRegion(player);
  const inventoryEntries = getInventoryEntries(player);

  return (
    <div className="shop-content">
      <TabBar
        tabs={SHOP_TABS}
        activeKey={tab}
        onChange={setTab}
        className="shop-tabs"
        tabClassName="shop-tab"
        extra={<span className="shop-gold">💰 {player.gold} 灵石</span>}
      />

        {/* 买入列表 */}
        {tab === 'buy' && (
          <div className="shop-list">
            {goods.length === 0 ? (
              <div className="inventory-empty">商人还没到…</div>
            ) : (
              goods.map(good => {
                const def = getItemDef(good.itemId);
                if (!def) return null;
                const price = calcBuyPrice(good.buyPrice, player.charisma);
                return (
                  <ShopBuyItem
                    key={good.itemId}
                    itemId={good.itemId}
                    def={def}
                    price={price}
                    originalPrice={good.buyPrice}
                    canAfford={player.gold >= price}
                    onBuy={onBuy}
                  />
                );
              })
            )}
          </div>
        )}

        {/* 卖出列表 */}
        {tab === 'sell' && (
          <div className="shop-list">
            {inventoryEntries.length === 0 ? (
              <div className="inventory-empty">背包空空…</div>
            ) : (
              inventoryEntries.map(({ slot, def }) => (
                <ShopSellItem key={slot.itemId} slot={slot} def={def} onSell={onSell} />
              ))
            )}
          </div>
        )}
    </div>
  );
}
