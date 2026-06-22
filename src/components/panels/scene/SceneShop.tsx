import './SceneShop.css';
import { useEffect, useState } from 'react';
import type { Player } from '../../../game/player';
import { calcKarmaBuyPrice, getGoodsForMerchant, getMerchantsInRegion } from '../../../game/shop';
import { getInventoryEntries } from '../../../game/inventory';
import { getItemDef } from '../../../game/registry';
import { TabBar } from '../../shared';
import ShopBuyItem from '../shop/ShopBuyItem';
import ShopSellItem from '../shop/ShopSellItem';
import { SCENE_SHOP_TEXTS } from '../../../data/texts';

interface SceneShopProps {
  player: Player;
  onBuy: (itemId: string) => void;
  onSell: (itemId: string) => void;
}

export default function SceneShop({ player, onBuy, onSell }: SceneShopProps) {
  const merchants = getMerchantsInRegion(player);
  const firstKey = merchants[0]?.id ?? 'sell';
  const [activeTab, setActiveTab] = useState(firstKey);

  useEffect(() => {
    setActiveTab(firstKey);
  }, [firstKey]);

  if (merchants.length === 0) return null;

  const tabs = [
    ...merchants.map(npc => ({ key: npc.id, label: `${npc.emoji} ${npc.name}` })),
    { key: 'sell', label: SCENE_SHOP_TEXTS.sellTab, icon: '💰' },
  ];
  const inventoryEntries = getInventoryEntries(player);
  const goods = activeTab === 'sell' ? [] : getGoodsForMerchant(activeTab, player);

  return (
    <div className="scene-shop">
      <div className="scene-section-header">
        <span className="scene-section-title">{SCENE_SHOP_TEXTS.title}</span>
        <span className="scene-shop-gold">{SCENE_SHOP_TEXTS.gold(player.gold)}</span>
      </div>
      <TabBar
        tabs={tabs}
        activeKey={activeTab}
        onChange={setActiveTab}
        className="scene-shop-tabs"
        tabClassName="scene-shop-tab"
      />
      <div className="scene-shop-list">
        {activeTab === 'sell' ? (
          inventoryEntries.length === 0 ? (
            <div className="inventory-empty">{SCENE_SHOP_TEXTS.emptyInventory}</div>
          ) : (
            inventoryEntries.map(({ slot, def }) => (
              <ShopSellItem key={slot.itemId} slot={slot} def={def} onSell={onSell} />
            ))
          )
        ) : (
          goods.length === 0 ? (
            <div className="inventory-empty">{SCENE_SHOP_TEXTS.emptyGoods}</div>
          ) : (
            goods.map(good => {
              const def = getItemDef(good.itemId);
              if (!def) return null;
              const price = calcKarmaBuyPrice(good.buyPrice, player.charisma, player.karma ?? 0);
              return (
                <ShopBuyItem
                  key={`${activeTab}:${good.itemId}`}
                  itemId={good.itemId}
                  def={def}
                  price={price}
                  originalPrice={good.buyPrice}
                  canAfford={player.gold >= price}
                  onBuy={onBuy}
                />
              );
            })
          )
        )}
      </div>
    </div>
  );
}
