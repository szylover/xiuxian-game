export const EQUIPMENT_TEXTS = {
  unknownEquip: (id: string) => `⚠️ 装备定义不存在（${id}），可能缺少注册。`,
  realmInsufficient: (name: string, realm: string) => `⚠️ 境界不足！${name} 需要 ${realm}期。`,
  noItemInInventory: (name: string) => `⚠️ 背包中没有 ${name}。`,
  equip: (name: string, slot: string) => `⚔️ 装备 ${name} → ${slot}。`,
  equipReplace: (name: string, oldName: string) => `⚔️ 装备 ${name}，替换 ${oldName}。`,
  noEquipInSlot: (slot: string) => `${slot} 没有装备。`,
  inventoryFull: '背包已满，无法卸下装备。',
  unequip: (name: string) => `🔓 卸下 ${name}。`,
} as const;
