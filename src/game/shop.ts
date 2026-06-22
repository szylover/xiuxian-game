// ============================================================
// shop.ts — 商店系统（T0015）
// 纯逻辑壳子：买入/卖出，charisma 折扣，商品列表通过 DLC 注册
// ============================================================

import type { Player } from './player';
import { getItemDef } from './registry';
import type { ItemDef } from './registry';
import { addItem, removeItem, hasItem } from './inventory';
import { getCurrentRegion } from './map';
import { SHOP_TEXTS } from '../data/texts/shop';
import type { Alignment } from './types';
import { getAlignment } from './karma';
import { ALIGNMENT_CN, KARMA_TEXTS } from '../data/texts';
import { getNpcsInRegion } from './npc';
import type { NpcDef } from './types';

// ── 商品定义（注册到全局表）──

export interface ShopGoodsDef {
  itemId: string;         // 商品物品 ID
  buyPrice: number;       // 基础买入价（玩家视角）
  stock: number;          // 库存（-1 = 无限）
  regionTags?: string[];  // T0021 区域标签（空/未设置 = 所有区域可购买）
  requiredAlignment?: Alignment;
  npcId?: string;
}

// ── 商品注册表 ──

const shopGoodsRegistry: ShopGoodsDef[] = [];

export function registerShopGoods(goods: ShopGoodsDef[]): void {
  for (const g of goods) {
    // 避免重复
    if (!shopGoodsRegistry.find(x => x.itemId === g.itemId && x.npcId === g.npcId)) {
      shopGoodsRegistry.push(g);
    }
  }
}

export function getAllShopGoods(): ShopGoodsDef[] {
  return shopGoodsRegistry;
}

/** 清空商品注册表（切换 DLC 前调用） */
export function clearShopGoods(): void {
  shopGoodsRegistry.length = 0;
}

/** T0021: 按当前区域过滤商品（无 regionTags 的商品在所有区域可见） */
export function getShopGoodsForRegion(player: Player): ShopGoodsDef[] {
  const region = getCurrentRegion(player);
  if (!region) return shopGoodsRegistry;
  const tags = region.regionTags;
  return shopGoodsRegistry.filter(g =>
    (!g.regionTags?.length || g.regionTags.some(t => tags.includes(t)))
    && (!g.requiredAlignment || getAlignment(player.karma ?? 0) === g.requiredAlignment)
  );
}

export function getMerchantsInRegion(player: Player): NpcDef[] {
  return getNpcsInRegion(player).filter(npc => npc.roles.includes('merchant') && getGoodsForMerchant(npc.id, player).length > 0);
}

export function getGoodsForMerchant(npcId: string, player: Player): ShopGoodsDef[] {
  const regionGoods = getShopGoodsForRegion(player);
  return regionGoods.filter(g => g.npcId === npcId || (!g.npcId && getLegacyMerchantMatch(npcId)));
}

export function hasShopInRegion(player: Player): boolean {
  return getMerchantsInRegion(player).length > 0;
}

function getLegacyMerchantMatch(npcId: string): boolean {
  return npcId === 'core:npc_market_chen';
}

// ── 价格计算 ──

// 买入价：base × (1 - charisma折扣)，charisma 100 → 打 7 折
export function calcBuyPrice(basePrice: number, charisma: number): number {
  const discount = 1 - (charisma / 100) * 0.3; // charisma=0→1.0, charisma=100→0.7
  return Math.max(1, Math.floor(basePrice * discount));
}

export function calcKarmaBuyPrice(basePrice: number, charisma: number, karma: number): number {
  const alignment = getAlignment(karma);
  const karmaFactor = alignment === 'righteous' ? 0.95 : alignment === 'evil' ? 1.08 : 1;
  return Math.max(1, Math.floor(calcBuyPrice(basePrice, charisma) * karmaFactor));
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
    return { player, success: false, message: SHOP_TEXTS.itemNotFound };
  }

  if (good.requiredAlignment && getAlignment(player.karma ?? 0) !== good.requiredAlignment) {
    return { player, success: false, message: KARMA_TEXTS.logs.shopGate(ALIGNMENT_CN[good.requiredAlignment]) };
  }

  const def = getItemDef(itemId);
  if (!def) {
    return { player, success: false, message: SHOP_TEXTS.itemDefNotFound };
  }

  const unitPrice = calcKarmaBuyPrice(good.buyPrice, player.charisma, player.karma ?? 0);
  const totalCost = unitPrice * count;

  if (player.gold < totalCost) {
    return { player, success: false, message: SHOP_TEXTS.goldInsufficient(totalCost, player.gold) };
  }

  const { player: p2, added, overflow } = addItem(player, itemId, count);
  if (added === 0) {
    return { player, success: false, message: SHOP_TEXTS.inventoryFull };
  }

  const actualCost = unitPrice * added;
  const p = { ...p2, gold: p2.gold - actualCost };

  let msg = SHOP_TEXTS.bought(def.name, added, actualCost);
  if (overflow > 0) {
    msg += SHOP_TEXTS.boughtOverflow(overflow);
  }

  return { player: p, success: true, message: msg };
}

// ── 卖出 ──

export function sellItem(player: Player, itemId: string, count: number = 1): ShopResult {
  const def = getItemDef(itemId);
  if (!def) {
    return { player, success: false, message: SHOP_TEXTS.sellItemNotFound };
  }

  if (!hasItem(player, itemId, count)) {
    return { player, success: false, message: SHOP_TEXTS.stockInsufficient(def.name) };
  }

  const unitPrice = calcSellPrice(def);
  const totalGold = unitPrice * count;

  let p = removeItem(player, itemId, count);
  p = { ...p, gold: p.gold + totalGold };

  return {
    player: p,
    success: true,
    message: SHOP_TEXTS.sold(def.name, count, totalGold),
  };
}
