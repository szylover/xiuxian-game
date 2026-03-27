// ============================================================
// EquipmentPanel.tsx — 装备面板（T0014）
// 6 个槽位展示 + 背包中装备列表 + 装备/卸下操作
// ============================================================

import type { Player } from '../../game/player';
import type { EquipSlot } from '../../game/registry';
import { getEquipDef } from '../../game/registry';
import { getEquippedDef } from '../../game/equipment';
import { getInventoryEntries } from '../../game/inventory';
import { CollapsiblePanel } from '../shared';
import EquipSlotCard from './equipment/EquipSlotCard';
import EquippableItem from './equipment/EquippableItem';

interface EquipmentPanelProps {
  player: Player;
  isOpen: boolean;
  onToggle: () => void;
  onEquip: (equipId: string) => void;
  onUnequip: (slot: EquipSlot) => void;
}

const SLOTS: EquipSlot[] = ['weapon', 'helmet', 'armor', 'boots', 'accessory1', 'accessory2'];

export default function EquipmentPanel({ player, isOpen, onToggle, onEquip, onUnequip }: EquipmentPanelProps) {
  if (!player) return null;

  // 背包中的装备类物品
  const equipItems = getInventoryEntries(player).filter(e => e.def.category === 'weapon' || e.def.category === 'armor' || e.def.category === 'accessory');

  return (
    <CollapsiblePanel
      className="equipment-panel"
      isOpen={isOpen}
      onToggle={onToggle}
      openLabel="⚔️ 收起装备"
      closedLabel="⚔️ 装备"
    >
      <div className="equipment-content">
        {/* 已装备槽位 */}
        <div className="equip-slots">
          {SLOTS.map(slot => (
            <EquipSlotCard
              key={slot}
              slot={slot}
              def={getEquippedDef(player, slot)}
              onUnequip={onUnequip}
            />
          ))}
        </div>

        {/* 背包中可装备的物品 */}
        {equipItems.length > 0 && (
          <div className="equip-inventory">
            <div className="equip-inv-title">🎒 可装备</div>
            {equipItems.map(({ slot, def }) => {
              const equipDef = getEquipDef(slot.itemId);
              if (!equipDef) return null;
              const canEquip = player.realmIndex >= equipDef.minRealm;
              const reason = !canEquip ? `需 ${['凡人','炼气','筑基','金丹','元婴','化神','渡劫','大乘'][equipDef.minRealm] ?? ''}期` : '';
              return (
                <EquippableItem
                  key={slot.itemId}
                  itemId={slot.itemId}
                  itemName={def.name}
                  equipDef={equipDef}
                  canEquip={canEquip}
                  reason={reason}
                  onEquip={onEquip}
                />
              );
            })}
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
}
