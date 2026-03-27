# T0010 — 日常事件

- **状态**: ✅ 已完成
- **分类**: 事件系统
- **前置**: T0007
- **Spec**: —

## 描述

每次时间推进时有概率触发日常事件：集市折扣、门派邀请、天气影响修炼效率。

## 关键文件

- `src/data/core-events.json` — 事件数据（daily 分类）
- `src/game/events.ts` — triggerDailyEvent()

## 完成记录

- 2026-03-27: 完成
