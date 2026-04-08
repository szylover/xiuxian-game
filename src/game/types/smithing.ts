// ── 炼器配方定义 ──

export interface SmithingRecipeDef {
  id: string;                              // 命名空间 ID，如 core:smith_iron_sword
  name: string;                            // 配方名称
  description: string;                     // 描述
  inputs: { itemId: string; count: number }[]; // 输入材料
  goldCost: number;                        // 灵石消耗
  outputItemId: string;                    // 产出装备 ID
  baseSuccessRate: number;                 // 基础成功率 (0~1)
  mentalCost: number;                      // 念力消耗
  minRealm: number;                        // 最低境界要求
}
