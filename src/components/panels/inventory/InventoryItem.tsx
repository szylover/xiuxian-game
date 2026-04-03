// ============================================================
// InventoryItem.tsx — 单个背包物品卡片
// ============================================================

import './InventoryItem.css';
import type { ItemDef, ItemRarity } from '../../../game/registry';
import { RARITY_COLORS, RARITY_LABELS } from '../../shared';

interface InventorySlot {
  itemId: string;
  count: number;
}

interface InventoryItemProps {
  slot: InventorySlot;
  def: ItemDef;
  onUseItem: (itemId: string) => void;
}

export default function InventoryItem({ slot, def, onUseItem }: InventoryItemProps) {
  return (
    <div
      className="inventory-item"
      style={{ '--rarity-color': RARITY_COLORS[def.rarity] } as React.CSSProperties}
    >
      <div className="item-info">
        <span className="item-name">
          {def.name}
          <span className="item-rarity">[{RARITY_LABELS[def.rarity]}]</span>
        </span>
        <span className="item-count">×{slot.count}</span>
      </div>
      <div className="item-desc">{def.description}</div>
      <div className="item-actions">
        {def.usable && def.effect && (
          <button
            className="btn btn-item-use"
            onClick={() => onUseItem(slot.itemId)}
          >
            使用
          </button>
        )}
        <span className="item-price">💰{def.sellPrice}</span>
      </div>
    </div>
  );
}
