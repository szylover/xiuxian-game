# T0029 — 突破系统重构 + 渡劫

- **状态**: ✅ 已完成
- **分类**: 进阶机制
- **前置**: T0004, T0012
- **Spec**: [T0029-breakthrough-tribulation.md](../specs/T0029-breakthrough-tribulation.md)

## 描述

突破需消耗特定物品 + 满足前置条件；化神/渡劫期需经历天劫多波连战。

## 关键文件

- `src/game/breakthrough.ts` — 突破逻辑（条件检查/物品消耗/掷骰/怜悯机制）
- `src/game/tribulation.ts` — 渡劫逻辑（多波连战/特殊效果/失败后果）
- `src/data/core-breakthrough.ts` — 7 个突破需求 + 2 个天劫定义
- `src/data/core-items.json` — 10 个新突破材料物品

## 完成记录

- 2026-03-27: 完成
