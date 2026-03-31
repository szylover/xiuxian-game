# T0031 — 成就系统

- **状态**: ✅ 已完成
- **分类**: 进阶机制
- **前置**: T0001
- **Spec**: [docs/specs/T0031-achievement.md](../specs/T0031-achievement.md)
- **完成日期**: 2026-03-30

## 描述

收集成就解锁称号和永久加成。

- 成就条件为谓词函数
- 成就解锁提供称号 + 永久属性加成
- 成就数据通过 DLC 注册

## 关键文件

- `src/game/achievement/types.ts` — 类型定义
- `src/game/achievement/engine.ts` — 检测引擎
- `src/game/achievement/data.ts` — 26 条核心成就
- `src/components/panels/AchievementPanel.tsx` — UI 面板
- `src/game/registry/stores.ts` — achievementRegistry
- `src/game/player/stats.ts` — recalcStats 成就加成集成
