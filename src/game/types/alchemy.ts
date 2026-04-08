import type { RecipeQuality } from './common';

export interface RecipeDef {
  id: string;                              // 命名空间 ID，如 core:recipe_hp_pill
  name: string;                            // 配方名称
  description: string;                     // 描述
  inputs: { itemId: string; count: number }[]; // 输入材料
  outputItemId: string;                    // 产出物品 ID
  outputCount: number;                     // 基础产出数量
  baseSuccessRate: number;                 // 基础成功率 (0~1)
  mentalCost: number;                      // 念力消耗
  minRealm: number;                        // 最低境界要求
  qualityBonusMultipliers: Record<RecipeQuality, number>; // 品质倍率
}
