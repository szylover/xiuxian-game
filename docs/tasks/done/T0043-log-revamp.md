# T0043 — 日志系统改进（Toast + 时间线 + 功法增强）

- **类型**：feat
- **状态**：✅ 已完成
- **前置**：T0011 ✅, T0042 ✅, T0017 ✅
- **完成日期**：2026-03-27

## 概述

对游戏日志系统进行全面改进：引入 Toast 即时反馈、时间线分组日志面板、历法时间戳，并修复若干日志相关 bug。同时增强功法系统的修炼消耗与战斗加成逻辑。

## 子项

| # | 内容 | 状态 |
|---|------|------|
| 1 | Toast 即时反馈系统 | ✅ |
| 2 | 时间线日志面板（按年/月分组） | ✅ |
| 3 | useGameLog 时间戳改造（接入历法系统） | ✅ |
| 4 | 修复 React Strict Mode 日志重复 | ✅ |
| 5 | 功法修炼消耗精力/灵力/时间 | ✅ |
| 6 | 功法加成在战斗中生效 | ✅ |
| 7 | Corner case（⚠️消息）只 Toast 不写日志 | ✅ |
| 8 | 突破信息日志修复（useRef + setTimeout） | ✅ |

## 关键文件

- `src/hooks/useToast.ts` — Toast Hook
- `src/hooks/useGameLog.ts` — 日志时间戳改造
- `src/components/hud/GameLog.tsx` — 时间线日志面板
- `src/game/technique.ts` — 功法消耗/加成逻辑
- `src/game/combat.ts` — 战斗中功法加成

## 备注

- 所有子项代码已完成并合入 main
