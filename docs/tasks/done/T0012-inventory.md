# T0012 — 背包系统

- **状态**: ✅ 已完成
- **分类**: 物品与经济
- **前置**: T0001
- **Spec**: —

## 描述

物品栏 UI，分类标签（丹药/材料/装备/杂物），堆叠，容量管理。

- ItemDef 类型注册到全局注册表
- 背包逻辑：增删查用物品，容量受境界影响（20 + realm×5）
- 16 个核心物品（7 丹药 + 5 材料 + 2 杂物 + 灵泉水 + 九转还魂丹）
- 战斗掉落獠牙/妖丹，探索随机拾取物品
- 品质颜色：白/绿/蓝/紫/橙

## 关键文件

- `src/game/registry.ts` — ItemDef 类型 + 物品注册 API
- `src/game/item-loader.ts` — JSON 物品加载器
- `src/game/inventory.ts` — 背包逻辑（增删查用）
- `src/data/core-items.json` — 核心物品数据
- `src/components/InventoryPanel.tsx` — 背包 UI

## 完成记录

- 2026-03-27: 完成
