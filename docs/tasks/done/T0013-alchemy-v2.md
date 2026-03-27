# T0013 — 丹药系统 v2（炼丹）

- **状态**: ✅ 已完成
- **分类**: 物品与经济
- **前置**: T0012
- **Spec**: —

## 描述

炼丹成功率受 `alchemy` 资质影响，丹药品质随机，念力消耗。

- 炼丹配方：输入材料 → 输出丹药
- 成功率 = base + alchemy × 0.5%，上限 95%
- 品质随机（普通/良品/极品），影响产出倍率
- 消耗念力（mentalPower）
- 8 个核心配方（回血丹/回灵丹/聚气丹/筑基丹/静心丹/养生丹/灵泉水/九转还魂丹）

## 关键文件

- `src/game/registry.ts` — RecipeDef 类型 + 配方注册/查询 API
- `src/game/alchemy.ts` — 炼丹逻辑（成功率/品质/产出）
- `src/data/core-recipes.json` — 8 个核心配方数据
- `src/components/AlchemyPanel.tsx` — 炼丹 UI

## 完成记录

- 2026-03-27: 完成
