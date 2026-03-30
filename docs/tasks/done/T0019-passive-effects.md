# T0019 — 被动效果

- **状态**: ✅ 已完成
- **完成日期**: 2026-03-30
- **分类**: 功法与技能
- **前置**: T0017
- **Spec**: [docs/specs/T0019-passive-effects.md](../../specs/T0019-passive-effects.md)

## 描述

修炼功法提供永久被动加成（+攻/+防/+暴击等）。

- 功法熟练度达到阈值解锁被动
- 被动效果叠加到角色属性

## 关键实现文件

| 文件 | 说明 |
|------|------|
| `src/game/types.ts` | `PassiveEffect` 接口定义 |
| `src/game/technique.ts` | `getAllTechniquePassiveBonus()` 函数，汇总所有已解锁被动加成 |
| `src/game/player/stats.ts` | `recalcStats()` 接入被动效果，属性重算时自动叠加 |
| `src/data/core-techniques.json` | 12 条功法被动数据（含解锁阈值与效果描述） |
| `src/components/panels/TechniquePanel.tsx` | 功法面板展示被动效果与解锁进度 |
| `src/components/debug/DebugPanel.tsx` | 调试面板新增被动效果查看入口 |
| `docs/specs/T0019-passive-effects.md` | 设计文档 |
