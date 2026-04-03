// ============================================================
// EquippableItem.tsx — 背包中可装备的物品行
// ============================================================

import './EquippableItem.css';
import type { EquipDef } from '../../../game/registry';
import { RARITY_COLORS, SLOT_ICONS, statsCN } from '../../shared';
import { getSlotName } from '../../../game/equipment';

interface EquippableItemProps {
  itemId: string;
  itemName: string;
  equipDef: EquipDef;
  canEquip: boolean;
  reason: string;
  onEquip: (equipId: string) => void;
}

export default function EquippableItem({ itemId, itemName, equipDef, canEquip, reason, onEquip }: EquippableItemProps) {
  return (
    <div
      className="equip-inv-item"
      style={{ '--rarity-color': RARITY_COLORS[equipDef.rarity] } as React.CSSProperties}
    >
      <span className="equip-inv-name">
        {SLOT_ICONS[equipDef.slot]} {itemName}
      </span>
      <span className="equip-inv-stats">
        {statsCN(equipDef.stats as Record<string, number | undefined>)}
      </span>
      <button
        className="btn btn-equip-action"
        disabled={!canEquip}
        onClick={() => onEquip(itemId)}
        title={canEquip ? `装备到${getSlotName(equipDef.slot)}` : reason}
      >
        {canEquip ? '装备' : reason}
      </button>
    </div>
  );
}
