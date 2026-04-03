// ============================================================
// ShopSellItem.tsx — 商店卖出物品行
// ============================================================

import './ShopSellItem.css';
import type { ItemDef } from '../../../game/registry';
import { RARITY_COLORS } from '../../shared';

interface InventorySlot {
  itemId: string;
  count: number;
}

interface ShopSellItemProps {
  slot: InventorySlot;
  def: ItemDef;
  onSell: (itemId: string) => void;
}

export default function ShopSellItem({ slot, def, onSell }: ShopSellItemProps) {
  return (
    <div className="shop-item" style={{ '--rarity-color': RARITY_COLORS[def.rarity] } as React.CSSProperties}>
      <div className="shop-item-info">
        <span className="shop-item-name">
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
  );
}
