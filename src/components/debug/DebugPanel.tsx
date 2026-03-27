// ============================================================
// DebugPanel.tsx — 调试面板
// 仅在角色名为 "Debug" 时显示，提供修改数值/添加物品等功能
// ============================================================

import { useState } from 'react';
import type { Player } from '../../game/player';
import { getAllItemDefs, getAllEquipDefs } from '../../game/registry';
import { addItem } from '../../game/inventory';
import { CollapsiblePanel, TabBar } from '../shared';
import DebugStatsTab from './DebugStatsTab';
import DebugItemsTab from './DebugItemsTab';

interface DebugPanelProps {
  player: Player;
  onUpdate: (updater: (prev: Player | null) => Player | null) => void;
}

const DEBUG_TABS = [
  { key: 'stats' as const, label: '数值', icon: '📊' },
  { key: 'items' as const, label: '物品', icon: '📦' },
];

export default function DebugPanel({ player, onUpdate }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'stats' | 'items'>('stats');
  const [itemQty, setItemQty] = useState<Record<string, number>>({});

  if (!player || player.name !== 'Debug') return null;

  const allItems = getAllItemDefs();
  const allEquips = getAllEquipDefs();

  const setStat = (key: string, value: number) => {
    onUpdate(prev => {
      if (!prev) return prev;
      const p = { ...prev };
      (p as unknown as Record<string, number>)[key] = value;
      return p;
    });
  };

  const fullRestore = () => {
    onUpdate(prev => {
      if (!prev) return prev;
      return { ...prev, hp: prev.maxHp, mp: prev.maxMp, stamina: prev.maxStamina, mentalPower: prev.maxMentalPower, mood: 100, health: 100 };
    });
  };

  const giveItem = (itemId: string) => {
    const count = itemQty[itemId] || 1;
    onUpdate(prev => {
      if (!prev) return prev;
      const { player: p } = addItem(prev, itemId, count);
      return p;
    });
  };

  const getQty = (id: string) => itemQty[id] || 1;
  const setQty = (id: string, v: number) => setItemQty(prev => ({ ...prev, [id]: Math.max(1, v) }));

  return (
    <CollapsiblePanel
      className="debug-panel"
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      openLabel="🐛 收起调试"
      closedLabel="🐛 调试"
      toggleClass="debug-toggle"
    >
      <div className="debug-content">
        <div className="debug-warning">⚠️ Debug Mode — 角色名 "Debug" 激活</div>

        <TabBar
          tabs={DEBUG_TABS}
          activeKey={tab}
          onChange={setTab}
          className="shop-tabs"
          tabClassName="shop-tab"
        />

        {tab === 'stats' && (
          <DebugStatsTab player={player} onSetStat={setStat} onFullRestore={fullRestore} />
        )}

        {tab === 'items' && (
          <DebugItemsTab
            items={allItems}
            equips={allEquips}
            getQty={getQty}
            onQtyChange={setQty}
            onGive={giveItem}
          />
        )}
      </div>
    </CollapsiblePanel>
  );
}
