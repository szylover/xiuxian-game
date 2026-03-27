# T0016 — 炼器系统

- **状态**: ✅ 已完成
- **分类**: 物品与经济
- **前置**: T0012, T0014
- **Spec**: —

## 描述

消耗矿石 + 灵石打造装备，`smithing` 资质影响成功率。

- SmithingRecipeDef：独立炼器配方类型，输入材料+灵石→装备
- 成功率 = base + smithing × 0.5%（上限 95%）
- 10 个核心炼器配方（凡人 4 + 炼气 3 + 筑基 2 + 金丹 1）

## 关键文件

- `src/game/registry.ts` — SmithingRecipeDef + 注册/查询 API
- `src/game/smithing.ts` — 炼器逻辑
- `src/data/core-smithing.json` — 10 个核心配方
- `src/components/SmithingPanel.tsx` — 炼器 UI

## 完成记录

- 2026-03-27: 完成
