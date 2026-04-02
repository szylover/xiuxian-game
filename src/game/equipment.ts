// ============================================================
// equipment.ts — 装备系统（T0014）
// 纯逻辑壳子：装备/卸下/查询，不含任何具体装备数据
// ============================================================

import type { Player } from './player';
import type { EquipDef, EquipSlot } from './registry';
import { getEquipDef } from './registry';
import { addItem, removeItem, hasItem } from './inventory';
import { recalcStats } from './player';
import { REALM_NAMES, SLOT_NAMES } from '../data/texts/common';

// ── 装备操作结果 ──

export interface EquipResult {
  player: Player;
  success: boolean;
  message: string;
}

// ── 获取槽位中文名 ──
export function getSlotName(slot: EquipSlot): string {
  return SLOT_NAMES[slot];
}

// ── 查询已装备 ──

export function getEquippedDef(player: Player, slot: EquipSlot): EquipDef | null {
  const id = player.equipped[slot];
  if (!id) return null;
  return getEquipDef(id) ?? null;
}

// ── 装备物品 ──

export function equipItem(player: Player, equipId: string): EquipResult {
  const def = getEquipDef(equipId);
  if (!def) {
    return { player, success: false, message: `⚠️ 装备定义不存在（${equipId}），可能缺少注册。` };
  }

  if (player.realmIndex < def.minRealm) {
    return { player, success: false, message: `⚠️ 境界不足！${def.name} 需要 ${REALM_NAMES[def.minRealm] ?? ''}期。` };
  }

  if (!hasItem(player, equipId)) {
    return { player, success: false, message: `⚠️ 背包中没有 ${def.name}。` };
  }

  let p = { ...player, equipped: { ...player.equipped } };

  // 如果该槽位已有装备，先卸下旧装备到背包
  const oldEquipId = p.equipped[def.slot];
  if (oldEquipId) {
    const { player: p2 } = addItem(p, oldEquipId, 1);
    p = { ...p2, equipped: { ...p.equipped } };
  }

  // 从背包移除新装备
  p = { ...removeItem(p, equipId, 1), equipped: { ...p.equipped } };

  // 装备到槽位
  p.equipped[def.slot] = equipId;

  // 重算属性
  p = recalcStats(p);

  const oldDef = oldEquipId ? getEquipDef(oldEquipId) : null;
  const msg = oldDef
    ? `⚔️ 装备 ${def.name}，替换 ${oldDef.name}。`
    : `⚔️ 装备 ${def.name} → ${getSlotName(def.slot)}。`;

  return { player: p, success: true, message: msg };
}

// ── 卸下装备 ──

export function unequipItem(player: Player, slot: EquipSlot): EquipResult {
  const equipId = player.equipped[slot];
  if (!equipId) {
    return { player, success: false, message: `${getSlotName(slot)} 没有装备。` };
  }

  const def = getEquipDef(equipId);

  let p = { ...player, equipped: { ...player.equipped } };

  // 装备放回背包
  const { player: p2, added } = addItem(p, equipId, 1);
  if (added === 0) {
    return { player, success: false, message: '背包已满，无法卸下装备。' };
  }

  p = { ...p2, equipped: { ...p.equipped } };
  p.equipped[slot] = null;

  // 重算属性
  p = recalcStats(p);

  return {
    player: p,
    success: true,
    message: `🔓 卸下 ${def?.name ?? equipId}。`,
  };
}
