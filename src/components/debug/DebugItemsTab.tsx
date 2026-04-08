// ============================================================
// debug/DebugItemsTab.tsx — 调试面板「物品」标签页
// ============================================================

import type { ItemDef, EquipDef } from '../../game/registry';
import DebugItemRow from './DebugItemRow';

interface DebugItemsTabProps {
  items: ItemDef[];
  equips: EquipDef[];
  getQty: (id: string) => number;
  onQtyChange: (id: string, v: number) => void;
  onGive: (id: string) => void;
  onGiveAll: () => void;
}

export default function DebugItemsTab({ items, equips, getQty, onQtyChange, onGive, onGiveAll }: DebugItemsTabProps) {
  return (
    <div className="debug-items">
      <div className="debug-section-title">📦 物品（点击添加）
        <button className="btn debug-btn" onClick={onGiveAll}>📦 全部添加 ×10</button>
      </div>
      <div className="debug-item-list">
        {items.map(item => (
          <DebugItemRow
            key={item.id}
            id={item.id}
            name={item.name}
            rarity={item.rarity}
            qty={getQty(item.id)}
            onQtyChange={onQtyChange}
            onGive={onGive}
          />
        ))}
      </div>
      {equips.length > 0 && (
        <>
          <div className="debug-section-title">⚔️ 装备</div>
          <div className="debug-item-list">
            {equips.map(eq => (
              <DebugItemRow
                key={eq.id}
                id={eq.id}
                name={eq.name}
                rarity={eq.rarity}
                qty={getQty(eq.id)}
                onQtyChange={onQtyChange}
                onGive={onGive}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
