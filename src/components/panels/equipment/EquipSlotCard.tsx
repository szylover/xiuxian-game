// ============================================================
// EquipSlotCard.tsx — 装备槽位卡片
// ============================================================

import type { EquipSlot, EquipDef } from '../../../game/registry';
import { RARITY_COLORS, SLOT_ICONS, statsCN } from '../../shared';
import { getSlotName } from '../../../game/equipment';
import './EquipSlotCard.css';

interface EquipSlotCardProps {
  slot: EquipSlot;
  def: EquipDef | null;
  onUnequip: (slot: EquipSlot) => void;
}

export default function EquipSlotCard({ slot, def, onUnequip }: EquipSlotCardProps) {
  return (
    <div className={`equip-slot ${def ? 'equipped' : 'empty'}`}>
      <span className="slot-icon">{SLOT_ICONS[slot]}</span>
      <div className="slot-info">
        <span className="slot-label">{getSlotName(slot)}</span>
        {def ? (
          <>
            <span className="slot-equip-name" style={{ '--rarity-color': RARITY_COLORS[def.rarity] } as React.CSSProperties}>
              {def.name}
            </span>
            <span className="slot-stats">
              {statsCN(def.stats as Record<string, number | undefined>)}
            </span>
          </>
        ) : (
          <span className="slot-empty-text">空</span>
        )}
      </div>
      {def && (
        <button className="btn btn-unequip" onClick={() => onUnequip(slot)}>卸</button>
      )}
    </div>
  );
}
