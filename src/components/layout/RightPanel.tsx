// ============================================================
// layout/RightPanel.tsx — 右栏按钮组 + 浮动面板
// 点击按钮弹出可拖拽浮动窗口
// ============================================================

import type { Player } from '../../game/player';
import type { EquipSlot } from '../../game/registry';
import { FloatingPanel } from '../shared';
import PanelButtons from './PanelButtons';
import type { PanelKey } from './PanelButtons';
import InventoryPanel from '../panels/InventoryPanel';
import ShopPanel from '../panels/ShopPanel';
import CraftingPanel from '../panels/CraftingPanel';
import EquipmentPanel from '../panels/EquipmentPanel';

const PANEL_CONFIG: Record<PanelKey, { title: string; icon: string; width?: number }> = {
  inventory: { title: '背包', icon: '🎒', width: 380 },
  shop:      { title: '商店', icon: '🏪', width: 380 },
  crafting:  { title: '炼制', icon: '🔥', width: 380 },
  equipment: { title: '装备', icon: '⚔️', width: 380 },
};

interface RightPanelProps {
  player: Player;
  activePanel: PanelKey | null;
  onSelectPanel: (key: PanelKey) => void;
  onUseItem: (itemId: string) => void;
  onCraft: (recipeId: string) => void;
  onSmith: (recipeId: string) => void;
  onEquip: (equipId: string) => void;
  onUnequip: (slot: EquipSlot) => void;
  onBuy: (itemId: string) => void;
  onSell: (itemId: string) => void;
}

export default function RightPanel({
  player, activePanel, onSelectPanel,
  onUseItem, onCraft, onSmith, onEquip, onUnequip, onBuy, onSell,
}: RightPanelProps) {
  const closePanel = () => onSelectPanel(activePanel!);
  const config = activePanel ? PANEL_CONFIG[activePanel] : null;

  return (
    <>
      <PanelButtons player={player} activePanel={activePanel} onSelect={onSelectPanel} />

      {activePanel && config && (
        <FloatingPanel
          title={config.title}
          icon={config.icon}
          width={config.width}
          onClose={closePanel}
        >
          {activePanel === 'inventory' && <InventoryPanel player={player} onUseItem={onUseItem} />}
          {activePanel === 'shop' && <ShopPanel player={player} onBuy={onBuy} onSell={onSell} />}
          {activePanel === 'crafting' && <CraftingPanel player={player} onCraft={onCraft} onSmith={onSmith} />}
          {activePanel === 'equipment' && <EquipmentPanel player={player} onEquip={onEquip} onUnequip={onUnequip} />}
        </FloatingPanel>
      )}
    </>
  );
}
