// ============================================================
// InventoryPanel.tsx — 背包面板（C-1）
// 分类标签 + 物品列表 + 使用/丢弃操作
// ============================================================

import { useState } from 'react';
import type { Player } from '../../game/player';
import { getInventoryEntries } from '../../game/inventory';
import type { ItemCategory } from '../../game/registry';
import { CollapsiblePanel, CapacityBar, TabBar, CATEGORY_TABS } from '../shared';
import InventoryItem from './inventory/InventoryItem';

interface InventoryPanelProps {
  player: Player;
  isOpen: boolean;
  onToggle: () => void;
  onUseItem: (itemId: string) => void;
}

export default function InventoryPanel({ player, isOpen, onToggle, onUseItem }: InventoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | ItemCategory>('all');

  if (!player) return null;

  const entries = getInventoryEntries(player);
  const filtered = activeTab === 'all'
    ? entries
    : entries.filter(e => e.def.category === activeTab);

  const usedSlots = entries.length;

  return (
    <CollapsiblePanel
      className="inventory-panel"
      isOpen={isOpen}
      onToggle={onToggle}
      openLabel="🎒 收起背包"
      closedLabel={`🎒 背包 (${usedSlots}/${player.inventoryCapacity})`}
    >
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
    </CollapsiblePanel>
  );
}
