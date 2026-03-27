// ============================================================
// ShopPanel.tsx — 商店面板（T0015）
// 商品列表 + 买入/卖出 + charisma 折扣显示
// ============================================================

import { useState } from 'react';
import type { Player } from '../game/player';
import type { ItemRarity } from '../game/registry';
import { getItemDef } from '../game/registry';
import { getAllShopGoods, calcBuyPrice } from '../game/shop';
import { getInventoryEntries } from '../game/inventory';

interface ShopPanelProps {
  player: Player;
  isOpen: boolean;
  onToggle: () => void;
  onBuy: (itemId: string) => void;
  onSell: (itemId: string) => void;
}

const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9E9E9E',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FFD700',
};

type ShopTab = 'buy' | 'sell';

export default function ShopPanel({ player, isOpen, onToggle, onBuy, onSell }: ShopPanelProps) {
  const [tab, setTab] = useState<ShopTab>('buy');

  if (!player) return null;

  const goods = getAllShopGoods();
  const inventoryEntries = getInventoryEntries(player);

  return (
    <div className="shop-panel">
      <button className="panel-toggle" onClick={onToggle}>
        {isOpen ? '🏪 收起商店' : `🏪 商店 (💰${player.gold})`}
      </button>

      {isOpen && (
        <div className="shop-content">
          {/* 标签切换 */}
          <div className="shop-tabs">
            <button
              className={`shop-tab ${tab === 'buy' ? 'active' : ''}`}
              onClick={() => setTab('buy')}
            >
              🛒 买入
            </button>
            <button
              className={`shop-tab ${tab === 'sell' ? 'active' : ''}`}
              onClick={() => setTab('sell')}
            >
              💰 卖出
            </button>
            <span className="shop-gold">💰 {player.gold} 灵石</span>
          </div>

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
                  const canAfford = player.gold >= price;
                  return (
                    <div key={good.itemId} className="shop-item" style={{ borderLeftColor: RARITY_COLORS[def.rarity] }}>
                      <div className="shop-item-info">
                        <span className="shop-item-name" style={{ color: RARITY_COLORS[def.rarity] }}>
                          {def.name}
                        </span>
                        <span className="shop-item-desc">{def.description}</span>
                      </div>
                      <div className="shop-item-action">
                        <span className={`shop-price ${canAfford ? '' : 'price-high'}`}>
                          💰{price}
                          {price < good.buyPrice && <span className="shop-discount"> (-{Math.round((1 - price / good.buyPrice) * 100)}%)</span>}
                        </span>
                        <button
                          className="btn btn-shop-buy"
                          disabled={!canAfford}
                          onClick={() => onBuy(good.itemId)}
                        >
                          买
                        </button>
                      </div>
                    </div>
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
                  <div key={slot.itemId} className="shop-item" style={{ borderLeftColor: RARITY_COLORS[def.rarity] }}>
                    <div className="shop-item-info">
                      <span className="shop-item-name" style={{ color: RARITY_COLORS[def.rarity] }}>
                        {def.name} <span className="shop-item-count">×{slot.count}</span>
                      </span>
                    </div>
                    <div className="shop-item-action">
                      <span className="shop-price">💰{def.sellPrice}</span>
                      <button
                        className="btn btn-shop-sell"
                        onClick={() => onSell(slot.itemId)}
                      >
                        卖1
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
