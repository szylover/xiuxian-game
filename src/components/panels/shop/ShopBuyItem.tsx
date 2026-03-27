// ============================================================
// ShopBuyItem.tsx — 商店买入物品行
// ============================================================

import type { ItemDef } from '../../../game/registry';
import { RARITY_COLORS } from '../../shared';

interface ShopBuyItemProps {
  itemId: string;
  def: ItemDef;
  price: number;
  originalPrice: number;
  canAfford: boolean;
  onBuy: (itemId: string) => void;
}

export default function ShopBuyItem({ itemId, def, price, originalPrice, canAfford, onBuy }: ShopBuyItemProps) {
  return (
    <div className="shop-item" style={{ borderLeftColor: RARITY_COLORS[def.rarity] }}>
      <div className="shop-item-info">
        <span className="shop-item-name" style={{ color: RARITY_COLORS[def.rarity] }}>
          {def.name}
        </span>
        <span className="shop-item-desc">{def.description}</span>
      </div>
      <div className="shop-item-action">
        <span className={`shop-price ${canAfford ? '' : 'price-high'}`}>
          💰{price}
          {price < originalPrice && (
            <span className="shop-discount"> (-{Math.round((1 - price / originalPrice) * 100)}%)</span>
          )}
        </span>
        <button
          className="btn btn-shop-buy"
          disabled={!canAfford}
          onClick={() => onBuy(itemId)}
        >
          买
        </button>
      </div>
    </div>
  );
}
