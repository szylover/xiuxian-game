// ============================================================
// shop.ts — 商店系统（T0015）
// 纯逻辑壳子：买入/卖出，charisma 折扣，商品列表通过 DLC 注册
// ============================================================

import type { Player } from './player';
import { getItemDef } from './registry';
import type { ItemDef } from './registry';
import { addItem, removeItem, hasItem } from './inventory';
import { getCurrentRegion } from './map';

// ── 商品定义（注册到全局表）──

export interface ShopGoodsDef {
  itemId: string;         // 商品物品 ID
  buyPrice: number;       // 基础买入价（玩家视角）
  stock: number;          // 库存（-1 = 无限）
  regionTags?: string[];  // T0021 区域标签（空/未设置 = 所有区域可购买）
}

// ── 商品注册表 ──

const shopGoodsRegistry: ShopGoodsDef[] = [];

export function registerShopGoods(goods: ShopGoodsDef[]): void {
  for (const g of goods) {
    // 避免重复
    if (!shopGoodsRegistry.find(x => x.itemId === g.itemId)) {
      shopGoodsRegistry.push(g);
    }
  }
}

export function getAllShopGoods(): ShopGoodsDef[] {
  return shopGoodsRegistry;
}

/** T0021: 按当前区域过滤商品（无 regionTags 的商品在所有区域可见） */
export function getShopGoodsForRegion(player: Player): ShopGoodsDef[] {
  const region = getCurrentRegion(player);
  if (!region) return shopGoodsRegistry;
  const tags = region.regionTags;
  return shopGoodsRegistry.filter(g =>
    !g.regionTags?.length || g.regionTags.some(t => tags.includes(t))
  );
}

// ── 价格计算 ──

// 买入价：base × (1 - charisma折扣)，charisma 100 → 打 7 折
export function calcBuyPrice(basePrice: number, charisma: number): number {
  const discount = 1 - (charisma / 100) * 0.3; // charisma=0→1.0, charisma=100→0.7
  return Math.max(1, Math.floor(basePrice * discount));
}

// 卖出价：物品定义的 sellPrice（固定，不受 charisma 影响）
export function calcSellPrice(itemDef: ItemDef): number {
  return itemDef.sellPrice;
}

// ── 操作结果 ──

export interface ShopResult {
  player: Player;
  success: boolean;
  message: string;
}

// ── 买入 ──

export function buyItem(player: Player, itemId: string, count: number = 1): ShopResult {
  const good = shopGoodsRegistry.find(g => g.itemId === itemId);
  if (!good) {
    return { player, success: false, message: '商品不存在。' };
  }

  const def = getItemDef(itemId);
  if (!def) {
    return { player, success: false, message: '物品定义不存在。' };
  }

  const unitPrice = calcBuyPrice(good.buyPrice, player.charisma);
  const totalCost = unitPrice * count;

  if (player.gold < totalCost) {
    return { player, success: false, message: `灵石不足！需要 ${totalCost}，当前 ${player.gold}。` };
  }

  const { player: p2, added, overflow } = addItem(player, itemId, count);
  if (added === 0) {
    return { player, success: false, message: '背包已满，无法购买。' };
  }

  const actualCost = unitPrice * added;
  const p = { ...p2, gold: p2.gold - actualCost };

  let msg = `🛒 购入 ${def.name} ×${added}，花费 ${actualCost} 灵石。`;
  if (overflow > 0) {
    msg += `（背包满，${overflow} 个未购入）`;
  }

  return { player: p, success: true, message: msg };
}

// ── 卖出 ──

export function sellItem(player: Player, itemId: string, count: number = 1): ShopResult {
  const def = getItemDef(itemId);
  if (!def) {
    return { player, success: false, message: '物品不存在。' };
  }

  if (!hasItem(player, itemId, count)) {
    return { player, success: false, message: `${def.name} 数量不足。` };
  }

  const unitPrice = calcSellPrice(def);
  const totalGold = unitPrice * count;

  let p = removeItem(player, itemId, count);
  p = { ...p, gold: p.gold + totalGold };

  return {
    player: p,
    success: true,
    message: `💰 卖出 ${def.name} ×${count}，获得 ${totalGold} 灵石。`,
  };
}
