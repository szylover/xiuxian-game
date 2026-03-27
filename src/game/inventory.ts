// ============================================================
// inventory.ts — 背包系统（C-1）
// 纯逻辑壳子：增删查用物品，容量管理，不含任何具体物品数据
// ============================================================

import type { Player, InventorySlot } from './player';
import { getItemDef } from './registry';
import type { ItemDef } from './registry';

// ── 查询 ──

export function hasItem(player: Player, itemId: string, count: number = 1): boolean {
  const slot = player.inventory.find(s => s.itemId === itemId);
  return !!slot && slot.count >= count;
}

export function getItemCount(player: Player, itemId: string): number {
  const slot = player.inventory.find(s => s.itemId === itemId);
  return slot ? slot.count : 0;
}

// 返回当前占用的格子数（不同的 itemId 各占一格）
export function getUsedSlots(player: Player): number {
  return player.inventory.length;
}

export function isInventoryFull(player: Player): boolean {
  return player.inventory.length >= player.inventoryCapacity;
}

// ── 增加物品 ──

export interface AddItemResult {
  player: Player;
  added: number;       // 实际添加的数量
  overflow: number;    // 溢出未添加的数量
}

export function addItem(player: Player, itemId: string, count: number = 1): AddItemResult {
  const def = getItemDef(itemId);
  if (!def) {
    return { player, added: 0, overflow: count };
  }

  const inv = [...player.inventory.map(s => ({ ...s }))];
  let remaining = count;

  // 尝试堆叠到已有格子
  if (def.stackable) {
    const existing = inv.find(s => s.itemId === itemId);
    if (existing) {
      const canAdd = def.maxStack - existing.count;
      const toAdd = Math.min(remaining, canAdd);
      existing.count += toAdd;
      remaining -= toAdd;
    }
  }

  // 剩余的放进新格子
  while (remaining > 0 && inv.length < player.inventoryCapacity) {
    const toAdd = def.stackable ? Math.min(remaining, def.maxStack) : 1;
    inv.push({ itemId, count: toAdd });
    remaining -= toAdd;
  }

  return {
    player: { ...player, inventory: inv },
    added: count - remaining,
    overflow: remaining,
  };
}

// ── 移除物品 ──

export function removeItem(player: Player, itemId: string, count: number = 1): Player {
  const inv = player.inventory.map(s => ({ ...s }));
  let remaining = count;

  for (let i = inv.length - 1; i >= 0 && remaining > 0; i--) {
    if (inv[i].itemId === itemId) {
      const take = Math.min(remaining, inv[i].count);
      inv[i].count -= take;
      remaining -= take;
      if (inv[i].count <= 0) {
        inv.splice(i, 1);
      }
    }
  }

  return { ...player, inventory: inv };
}

// ── 使用物品 ──

export interface UseItemResult {
  player: Player;
  success: boolean;
  message: string;
}

export function useItem(player: Player, itemId: string): UseItemResult {
  const def = getItemDef(itemId);
  if (!def) {
    return { player, success: false, message: '物品不存在。' };
  }
  if (!def.usable || !def.effect) {
    return { player, success: false, message: `${def.name} 无法使用。` };
  }
  if (!hasItem(player, itemId)) {
    return { player, success: false, message: `没有 ${def.name}。` };
  }

  let p = removeItem(player, itemId, 1);
  p = def.effect(p);

  const message = def.effectMessage || `使用了 ${def.name}。`;
  return { player: p, success: true, message };
}

// ── 获取背包内容（带定义）──

export interface InventoryEntry {
  slot: InventorySlot;
  def: ItemDef;
}

export function getInventoryEntries(player: Player): InventoryEntry[] {
  const entries: InventoryEntry[] = [];
  for (const slot of player.inventory) {
    const def = getItemDef(slot.itemId);
    if (def) {
      entries.push({ slot, def });
    }
  }
  return entries;
}
