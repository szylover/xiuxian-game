// ============================================================
// events.ts — 事件内容注册（探索/奇遇/日常）
// 所有事件数据存储在 JSON 中，此文件只负责加载和注册
// ============================================================

import type { Player } from './player';
import { registerDLC, triggerEvent } from './registry';
import type { RecipeDef, EquipDef } from './registry';
import { loadEventsFromJson } from './event-loader';
import { loadItemsFromJson } from './item-loader';
import type { JsonEvent } from './event-loader';
import type { JsonItem } from './item-loader';
import coreEventsJson from '../data/core-events.json';
import coreItemsJson from '../data/core-items.json';
import coreRecipesJson from '../data/core-recipes.json';
import coreEquipsJson from '../data/core-equips.json';
import coreShopJson from '../data/core-shop.json';
import { registerShopGoods } from './shop';
import type { ShopGoodsDef } from './shop';

// ── 注册 core DLC（从 JSON 加载全部事件 + 物品 + 配方 + 装备 + 商店）──
export function registerCoreEvents(): void {
  const pack = loadEventsFromJson(coreEventsJson as JsonEvent[], {
    id: 'core',
    name: '基础事件包',
    description: '核心事件 + 物品 + 配方 + 装备 + 商店',
    version: '1.4.0',
  });
  const items = loadItemsFromJson(coreItemsJson as JsonItem[]);
  const recipes = coreRecipesJson as RecipeDef[];
  const equips = coreEquipsJson as EquipDef[];
  registerDLC({ ...pack, items, recipes, equips });
  registerShopGoods(coreShopJson as ShopGoodsDef[]);
}

// ── 探索入口 ──
export function triggerExploreEvent(player: Player): { player: Player; message: string } {
  // 10% 概率触发奇遇代替普通探索
  if (Math.random() < 0.10) {
    const adventure = triggerEvent('adventure', player);
    if (adventure) {
      return { player: adventure.player, message: adventure.message };
    }
  }

  const result = triggerEvent('explore', player);
  if (!result) {
    return { player, message: '🚶 四处探索了一番，未发现什么特别的东西。' };
  }
  return { player: result.player, message: result.message };
}

// ── 日常事件入口 ──
export function triggerDailyEvent(player: Player): { player: Player; message: string } | null {
  const result = triggerEvent('daily', player);
  if (!result || !result.message) return null;
  return { player: result.player, message: result.message };
}
