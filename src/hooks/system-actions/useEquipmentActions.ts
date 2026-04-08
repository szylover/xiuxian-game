import { useCallback } from 'react';
import { equipItem, unequipItem } from '../../game/equipment';
import { getTechniqueDef, getEquipDef } from '../../game/registry';
import type { EquipSlot } from '../../game/registry';
import { UI_LABELS } from '../../data/texts/ui-labels';
import type { SystemActionContext } from './types';

export function useEquipmentActions({ execAction, player, addLog }: Pick<SystemActionContext, 'execAction' | 'player' | 'addLog'>) {
  const equip = useCallback((equipId: string) => {
    execAction(p => equipItem(p, equipId));
    // T0060：体修武器 techType 兼容性提示（装备后检查）
    if (player) {
      const def = getEquipDef(equipId);
      if (def?.techType?.length) {
        const activeTechDef = player.activeTechniqueId
          ? getTechniqueDef(player.activeTechniqueId)
          : null;
        if (!activeTechDef) {
          addLog(UI_LABELS.bodyWeaponHint(def.name, def.techType.join('/')), 'system');
        } else if (!def.techType.includes(activeTechDef.type)) {
          addLog(UI_LABELS.bodyWeaponMismatch(def.name, def.techType.join('/'), activeTechDef.name, activeTechDef.type), 'system');
        }
      }
    }
  }, [execAction, player, addLog]);

  const unequip = useCallback((slot: EquipSlot) => {
    execAction(p => unequipItem(p, slot));
  }, [execAction]);

  return { equip, unequip };
}
