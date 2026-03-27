# T0009 — 奇遇系统

- **状态**: ✅ 已完成
- **分类**: 事件系统
- **前置**: T0007
- **Spec**: [design-novel-events.md](../specs/design-novel-events.md)

## 描述

低概率高回报事件链：洞府传承、仙人赠法、转世重修。

- 探索时 10% 概率触发奇遇代替普通探索
- 5 类 14 个小说风格奇遇事件

## 关键文件

- `src/data/core-events.json` — 事件数据（adventure 分类）
- `src/game/events.ts` — triggerExploreEvent()

## 完成记录

- 2026-03-27: 完成
