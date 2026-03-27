// ============================================================
// InventoryPanel.tsx — 背包面板（C-1）
// 分类标签 + 物品列表 + 使用/丢弃操作
// ============================================================

import { useState } from 'react';
import type { Player } from '../game/player';
import { getInventoryEntries } from '../game/inventory';
import type { ItemCategory, ItemRarity } from '../game/registry';

interface InventoryPanelProps {
  player: Player;
  isOpen: boolean;
  onToggle: () => void;
  onUseItem: (itemId: string) => void;
}

const CATEGORY_TABS: { key: 'all' | ItemCategory; label: string; icon: string }[] = [
  { key: 'all',        label: '全部', icon: '📦' },
  { key: 'consumable', label: '丹药', icon: '💊' },
  { key: 'material',   label: '材料', icon: '🪨' },
  { key: 'equipment',  label: '装备', icon: '⚔️' },
  { key: 'misc',       label: '杂物', icon: '📜' },
];

const RARITY_COLORS: Record<ItemRarity, string> = {
  common:    '#9E9E9E',
  uncommon:  '#4CAF50',
  rare:      '#2196F3',
  epic:      '#9C27B0',
  legendary: '#FFD700',
};

const RARITY_LABELS: Record<ItemRarity, string> = {
  common:    '白',
  uncommon:  '绿',
  rare:      '蓝',
  epic:      '紫',
  legendary: '橙',
};

export default function InventoryPanel({ player, isOpen, onToggle, onUseItem }: InventoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | ItemCategory>('all');

  if (!player) return null;

  const entries = getInventoryEntries(player);
  const filtered = activeTab === 'all'
    ? entries
    : entries.filter(e => e.def.category === activeTab);

  const usedSlots = entries.length;

  return (
    <div className="inventory-panel">
      <button className="panel-toggle" onClick={onToggle}>
        {isOpen ? '🎒 收起背包' : `🎒 背包 (${usedSlots}/${player.inventoryCapacity})`}
      </button>

      {isOpen && (
        <div className="inventory-content">
          {/* 分类标签 */}
          <div className="inventory-tabs">
            {CATEGORY_TABS.map(tab => (
              <button
                key={tab.key}
                className={`inventory-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* 容量条 */}
          <div className="inventory-capacity">
            <span className="capacity-text">
              容量 {usedSlots}/{player.inventoryCapacity}
            </span>
            <div className="capacity-bar">
              <div
                className="capacity-bar-fill"
                style={{
                  width: `${(usedSlots / player.inventoryCapacity) * 100}%`,
                  background: usedSlots >= player.inventoryCapacity ? '#F44336' : '#4CAF50',
                }}
              />
            </div>
          </div>

          {/* 物品列表 */}
          <div className="inventory-list">
            {filtered.length === 0 ? (
              <div className="inventory-empty">空空如也…</div>
            ) : (
              filtered.map(({ slot, def }) => (
                <div
                  key={slot.itemId}
                  className="inventory-item"
                  style={{ borderLeftColor: RARITY_COLORS[def.rarity] }}
                >
                  <div className="item-info">
                    <span className="item-name" style={{ color: RARITY_COLORS[def.rarity] }}>
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
