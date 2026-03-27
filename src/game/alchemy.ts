// ============================================================
// alchemy.ts — 炼丹系统（T0013）
// 纯逻辑壳子：配方检查、成功率计算、品质随机、产出物品
// 所有配方数据通过 DLC 注册，不硬编码任何具体内容
// ============================================================

import type { Player } from './player';
import type { RecipeDef, RecipeQuality } from './registry';
import { getRecipe, getAllRecipes, getItemDef } from './registry';
import { hasItem, addItem, removeItem } from './inventory';

// ── 炼丹结果 ──

export interface AlchemyResult {
  player: Player;
  success: boolean;
  quality?: RecipeQuality;
  message: string;
}

// ── 查询可用配方（材料足够 + 境界达标 + 念力足够）──

export function getAvailableRecipes(player: Player): RecipeDef[] {
  return getAllRecipes().filter(r => canCraft(player, r.id));
}

export function canCraft(player: Player, recipeId: string): boolean {
  const recipe = getRecipe(recipeId);
  if (!recipe) return false;
  if (player.realmIndex < recipe.minRealm) return false;
  if (player.mentalPower < recipe.mentalCost) return false;
  for (const input of recipe.inputs) {
    if (!hasItem(player, input.itemId, input.count)) return false;
  }
  return true;
}

// ── 计算成功率 ──

export function calcSuccessRate(player: Player, recipe: RecipeDef): number {
  // base + alchemy × 0.005，上限 95%
  const alchemyBonus = player.aptitudes.alchemy * 0.005;
  return Math.min(0.95, recipe.baseSuccessRate + alchemyBonus);
}

// ── 品质抽取 ──
// alchemy 越高，出良品/极品概率越大

function rollQuality(player: Player): RecipeQuality {
  const alchemy = player.aptitudes.alchemy;
  // 极品概率：alchemy / 500（alchemy=100 → 20%）
  // 良品概率：alchemy / 200（alchemy=100 → 50%，但扣除极品部分）
  const excellentChance = alchemy / 500;
  const goodChance = alchemy / 200;

  const roll = Math.random();
  if (roll < excellentChance) return 'excellent';
  if (roll < goodChance) return 'good';
  return 'normal';
}

// ── 炼丹主逻辑 ──

export function performAlchemy(player: Player, recipeId: string): AlchemyResult {
  const recipe = getRecipe(recipeId);
  if (!recipe) {
    return { player, success: false, message: '配方不存在。' };
  }

  if (player.realmIndex < recipe.minRealm) {
    return { player, success: false, message: '境界不足，无法炼制此丹。' };
  }

  if (player.mentalPower < recipe.mentalCost) {
    return { player, success: false, message: '念力不足，无法炼丹。' };
  }

  for (const input of recipe.inputs) {
    if (!hasItem(player, input.itemId, input.count)) {
      const def = getItemDef(input.itemId);
      return { player, success: false, message: `材料不足：${def?.name ?? input.itemId} 需要 ${input.count} 个。` };
    }
  }

  // 消耗材料 + 念力
  let p = { ...player };
  for (const input of recipe.inputs) {
    p = removeItem(p, input.itemId, input.count);
  }
  p.mentalPower = Math.max(0, p.mentalPower - recipe.mentalCost);

  // 成功率判定
  const successRate = calcSuccessRate(p, recipe);
  const roll = Math.random();

  if (roll >= successRate) {
    return {
      player: p,
      success: false,
      message: `💥 炼丹失败！材料化为灰烬。（成功率 ${(successRate * 100).toFixed(1)}%）`,
    };
  }

  // 成功：抽品质 → 产出物品
  const quality = rollQuality(p);
  const outputCount = Math.max(1, Math.floor(recipe.outputCount * recipe.qualityBonusMultipliers[quality]));
  const { player: p2, added } = addItem(p, recipe.outputItemId, outputCount);
  p = p2;

  const outputDef = getItemDef(recipe.outputItemId);
  const qualityLabel = quality === 'excellent' ? '✨极品' : quality === 'good' ? '🌟良品' : '普通';

  return {
    player: p,
    success: true,
    quality,
    message: `🔥 炼丹成功！获得 ${qualityLabel} ${outputDef?.name ?? recipe.outputItemId} ×${added}。（成功率 ${(successRate * 100).toFixed(1)}%）`,
  };
}
