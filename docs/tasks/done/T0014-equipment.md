# T0014 — 装备系统

- **状态**: ✅ 已完成
- **分类**: 物品与经济
- **前置**: T0012
- **Spec**: —

## 描述

武器/防具/饰品槽位，装备提供属性加成，品级（白→绿→蓝→紫→橙）。

- 6 个装备槽位：武器、头盔、衣甲、靴子、饰品×2
- 装备属性加成叠加到战斗属性（recalcStats）
- 16 个核心装备（4 武器 + 3 头盔 + 3 衣甲 + 3 靴子 + 3 饰品），按境界分级
- 装备/卸下操作，背包联动
- 战斗 5% 概率掉落装备（按妖兽境界分档）

## 关键文件

- `src/game/registry.ts` — EquipDef + EquipSlot 类型 + 注册/查询 API
- `src/game/equipment.ts` — 装备/卸下逻辑
- `src/data/core-equips.json` — 16 个核心装备数据
- `src/components/EquipmentPanel.tsx` — 装备 UI
- `src/game/player.ts` — EquippedSlots + recalcStats 装备加成

## 完成记录

- 2026-03-27: 完成
