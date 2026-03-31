// ============================================================
// InventoryPanel.tsx — 背包面板（C-1）
// 分类标签 + 物品列表 + 使用/丢弃操作
// ============================================================

import { useState } from 'react';
import type { Player } from '../../game/player';
import { getInventoryEntries } from '../../game/inventory';
import type { ItemCategory } from '../../game/registry';
import { CapacityBar, TabBar, CATEGORY_TABS } from '../shared';
import InventoryItem from './inventory/InventoryItem';

interface InventoryPanelProps {
  player: Player;
  onUseItem: (itemId: string) => void;
}

export default function InventoryPanel({ player, onUseItem }: InventoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | ItemCategory>('all');

  if (!player) return null;

  const entries = getInventoryEntries(player);
  const filtered = activeTab === 'all'
    ? entries
    : entries.filter(e => e.def.category === activeTab);

  const usedSlots = entries.length;

  return (
    <div className="inventory-content">
      <TabBar
        tabs={CATEGORY_TABS}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      <div className="inventory-capacity">
        <CapacityBar
          current={usedSlots}
          max={player.inventoryCapacity}
          label="容量"
          warnOnFull
        />
      </div>

      <div className="inventory-list">
        {filtered.length === 0 ? (
          <div className="inventory-empty">空空如也…</div>
        ) : (
          filtered.map(({ slot, def }) => (
            <InventoryItem key={slot.itemId} slot={slot} def={def} onUseItem={onUseItem} />
          ))
        )}
      </div>
    </div>
  );
}
