// ============================================================
// smithing.ts — 炼器系统（T0016）
// 纯逻辑壳子：消耗矿石+灵石打造装备，smithing 资质影响成功率
// ============================================================

import type { Player } from './player';
import type { SmithingRecipeDef } from './registry';
import { getSmithingRecipe, getAllSmithingRecipes, getItemDef, getEquipDef } from './registry';
import { hasItem, addItem, removeItem } from './inventory';
import { SMITHING_TEXTS } from '../data/texts/smithing';

// ── 炼器结果 ──

export interface SmithingResult {
  player: Player;
  success: boolean;
  message: string;
}

// ── 查询可用炼器配方 ──

export function getAvailableSmithingRecipes(player: Player): SmithingRecipeDef[] {
  return getAllSmithingRecipes().filter(r => canSmith(player, r.id));
}

export function canSmith(player: Player, recipeId: string): boolean {
  const recipe = getSmithingRecipe(recipeId);
  if (!recipe) return false;
  if (player.realmIndex < recipe.minRealm) return false;
  if (player.mentalPower < recipe.mentalCost) return false;
  if (player.gold < recipe.goldCost) return false;
  for (const input of recipe.inputs) {
    if (!hasItem(player, input.itemId, input.count)) return false;
  }
  return true;
}

// ── 计算成功率 ──

export function calcSmithingSuccessRate(player: Player, recipe: SmithingRecipeDef): number {
  // base + smithing × 0.005，上限 95%
  const smithingBonus = player.aptitudes.smithing * 0.005;
  return Math.min(0.95, recipe.baseSuccessRate + smithingBonus);
}

// ── 炼器主逻辑 ──

export function performSmithing(player: Player, recipeId: string): SmithingResult {
  const recipe = getSmithingRecipe(recipeId);
  if (!recipe) {
    return { player, success: false, message: SMITHING_TEXTS.recipeNotFound };
  }

  if (player.realmIndex < recipe.minRealm) {
    return { player, success: false, message: SMITHING_TEXTS.realmInsufficient };
  }

  if (player.mentalPower < recipe.mentalCost) {
    return { player, success: false, message: SMITHING_TEXTS.mentalInsufficient };
  }

  if (player.gold < recipe.goldCost) {
    return { player, success: false, message: SMITHING_TEXTS.goldInsufficient(recipe.goldCost, player.gold) };
  }

  for (const input of recipe.inputs) {
    if (!hasItem(player, input.itemId, input.count)) {
      const def = getItemDef(input.itemId);
      return { player, success: false, message: SMITHING_TEXTS.materialInsufficient(def?.name ?? input.itemId, input.count) };
    }
  }

  // 消耗材料 + 念力 + 灵石
  let p = { ...player };
  for (const input of recipe.inputs) {
    p = removeItem(p, input.itemId, input.count);
  }
  p.mentalPower = Math.max(0, p.mentalPower - recipe.mentalCost);
  p.gold -= recipe.goldCost;

  // 成功率判定
  const successRate = calcSmithingSuccessRate(p, recipe);
  const roll = Math.random();

  if (roll >= successRate) {
    return {
      player: p,
      success: false,
      message: SMITHING_TEXTS.failed((successRate * 100).toFixed(1)),
    };
  }

  // 成功：产出装备
  const { player: p2, added } = addItem(p, recipe.outputItemId, 1);
  p = p2;

  const outputDef = getItemDef(recipe.outputItemId) ?? getEquipDef(recipe.outputItemId);
  const name = outputDef?.name ?? recipe.outputItemId;

  return {
    player: p,
    success: true,
    message: added > 0
      ? SMITHING_TEXTS.success(name, (successRate * 100).toFixed(1))
      : SMITHING_TEXTS.successFull(name),
  };
}
