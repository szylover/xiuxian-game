# T0007 — 事件引擎（luck 加权随机）

- **状态**: ✅ 已完成
- **分类**: 事件系统
- **前置**: T0001
- **Spec**: —

## 描述

luck 驱动的加权随机系统，事件分好/坏/中性三类。

- 好事件权重随 luck 增加，坏事件随 luck 减少
- once 事件只触发一次，cooldown 冷却机制
- 条件谓词过滤可触发事件

## 关键文件

- `src/game/registry.ts` — 全局注册表 + triggerEvent()
- `src/game/event-loader.ts` — JSON→GameEvent 转换器

## 完成记录

- 2026-03-27: 完成
