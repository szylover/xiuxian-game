// ============================================================
// EquipmentPanel.tsx — 装备面板（T0014）
// 6 个槽位展示 + 背包中装备列表 + 装备/卸下操作
// ============================================================

import type { Player } from '../game/player';
import type { EquipSlot, ItemRarity } from '../game/registry';
import { getEquipDef, getItemDef } from '../game/registry';
import { getEquippedDef, getSlotName } from '../game/equipment';
import { getInventoryEntries } from '../game/inventory';

interface EquipmentPanelProps {
  player: Player;
  isOpen: boolean;
  onToggle: () => void;
  onEquip: (equipId: string) => void;
  onUnequip: (slot: EquipSlot) => void;
}

const SLOTS: EquipSlot[] = ['weapon', 'helmet', 'armor', 'boots', 'accessory1', 'accessory2'];

const STAT_CN: Record<string, string> = {
  atk: '攻击', def: '防御', speed: '速度', hp: '体力', mp: '灵力',
  critRate: '暴击', critResist: '护心', moveSpeed: '移速',
};

function statsCN(stats: Record<string, number | undefined>): string {
  return Object.entries(stats)
    .filter(([, v]) => v)
    .map(([k, v]) => `${STAT_CN[k] || k}+${v}`)
    .join(' ');
}
const SLOT_ICONS: Record<EquipSlot, string> = {
  weapon: '🗡️',
  helmet: '⛑️',
  armor: '🛡️',
  boots: '👢',
  accessory1: '💎',
  accessory2: '💍',
};

const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9E9E9E',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FFD700',
};

export default function EquipmentPanel({ player, isOpen, onToggle, onEquip, onUnequip }: EquipmentPanelProps) {
  if (!player) return null;

  // 背包中的装备类物品
  const equipItems = getInventoryEntries(player).filter(e => e.def.category === 'weapon' || e.def.category === 'armor' || e.def.category === 'accessory');

  return (
    <div className="equipment-panel">
      <button className="panel-toggle" onClick={onToggle}>
        {isOpen ? '⚔️ 收起装备' : '⚔️ 装备'}
      </button>

      {isOpen && (
        <div className="equipment-content">
          {/* 已装备槽位 */}
          <div className="equip-slots">
            {SLOTS.map(slot => {
              const def = getEquippedDef(player, slot);
              return (
                <div key={slot} className={`equip-slot ${def ? 'equipped' : 'empty'}`}>
                  <span className="slot-icon">{SLOT_ICONS[slot]}</span>
                  <div className="slot-info">
                    <span className="slot-label">{getSlotName(slot)}</span>
                    {def ? (
                      <>
                        <span className="slot-equip-name" style={{ color: RARITY_COLORS[def.rarity] }}>
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
            })}
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
                  <div key={slot.itemId} className="equip-inv-item" style={{ borderLeftColor: RARITY_COLORS[def.rarity] }}>
                    <span className="equip-inv-name" style={{ color: RARITY_COLORS[def.rarity] }}>
                      {SLOT_ICONS[equipDef.slot]} {def.name}
                    </span>
                    <span className="equip-inv-stats">
                      {statsCN(equipDef.stats as Record<string, number | undefined>)}
                    </span>
                    <button
                      className="btn btn-equip-action"
                      disabled={!canEquip}
                      onClick={() => onEquip(slot.itemId)}
                      title={canEquip ? `装备到${getSlotName(equipDef.slot)}` : reason}
                    >
                      {canEquip ? '装备' : reason}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
