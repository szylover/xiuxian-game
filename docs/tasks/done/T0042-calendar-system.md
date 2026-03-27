# T0042 — 年月历法系统

- **状态**: ✅ 已完成
- **前置**: T0001 ✅, T0005 ✅
- **Spec**: [docs/specs/T0042-calendar-system.md](../../specs/T0042-calendar-system.md)
- **完成日期**: 2026-03-27

## 关键文件

- `src/game/data.ts` — ACTION_COSTS 统一为月制 + MONTH_NAMES
- `src/game/player/types.ts` — gameYear/gameMonth 字段
- `src/hooks/useGameEngine.ts` — advanceTime 月份推进 + 旧存档兼容
- `src/components/layout/LeftPanel.tsx` — 显示“第X年 X月”

- **类型**：feat
- **状态**：⬜ 未开始
- **前置**：T0001 ✅, T0005 ✅
- **Spec**：[T0042-calendar-system.md](../../specs/T0042-calendar-system.md)
- **创建日期**：2026-03-27

## 描述

添加游戏内历法系统。一年 12 个月，每次行动统一消耗 1 个月。状态栏显示当前年月，与现有寿命系统整合。

## 关键改动

1. `Player` 新增 `gameYear`, `gameMonth` 字段
2. `ACTION_COSTS` 所有 `time` 统一为 1（月）
3. `advanceTime` 改为按月推进历法 + 年龄
4. `StatusBar` 显示"第X年 X月 (XX岁/寿限)"
5. 旧存档向后兼容

## 验收标准

- [ ] 新建角色状态栏显示"第1年 一月 (16岁/100)"
- [ ] 每次行动月份 +1，12 个月后年份 +1
- [ ] 寿元耗尽时游戏正常结束
- [ ] 旧存档加载后 gameYear/gameMonth 自动补算
