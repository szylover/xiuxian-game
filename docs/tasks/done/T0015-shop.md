# T0015 — 商店系统

- **状态**: ✅ 已完成
- **分类**: 物品与经济
- **前置**: T0012
- **Spec**: —

## 描述

NPC 商人，价格受 `charisma` 影响。

- 商品列表通过 registerShopGoods() 注册
- 买入价 = base × (1 - charisma/100 × 0.3)，最高打 7 折
- 卖出价 = ItemDef.sellPrice（固定）
- 19 个核心商品（丹药/材料/装备）

## 关键文件

- `src/game/shop.ts` — 商店逻辑
- `src/data/core-shop.json` — 商品数据
- `src/components/ShopPanel.tsx` — 商店 UI

## 完成记录

- 2026-03-27: 完成
