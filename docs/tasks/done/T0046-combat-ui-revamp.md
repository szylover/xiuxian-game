# T0046 — 战斗弹窗 UI 重做（头像 + 血条 + 可视化）

- **类型**：feat
- **状态**：✅ 已完成（2026-03-30）
- **前置**：T0003 ✅, T0044 ✅, T0041 ✅
- **Spec**：[T0046-combat-ui-revamp.md](../../specs/T0046-combat-ui-revamp.md)
- **创建日期**：2026-03-30

## 概述

重做战斗弹窗界面，加入双方头像、HP/MP 条等可视化元素。顶部对阵区、中间回合日志、底部操作按钮三段式布局。HP/MP 条按回合实时动画更新。预留扩展性（技能选择、BUFF 图标、战斗动画等）。

## 范围

### 游戏逻辑
- `CombatResult` 新增 `snapshots[]`（每回合 HP/MP 快照）+ `monsterMaxHp/playerMaxHp/playerMaxMp`
- `combat/run.ts` 每回合末尾采集快照
- `Monster` 接口新增 `emoji` 字段，数据表补充各怪物 emoji
- `CombatModalState` 补充怪物 emoji、玩家头像/名字等展示数据

### UI 组件
- `CombatModal.tsx` 重构为组合式入口
- 新增 `combat/CombatHeader.tsx`（对阵区：头像 + HP/MP 条）
- 新增 `combat/CombatBattleLog.tsx`（回合日志），迁入富文本渲染
- 新增 `combat/CombatFooter.tsx`（操作按钮）
- 新增 `combat/HpBar.tsx`（通用血条/蓝条组件）

## 关键文件

| 文件 | 操作 |
|------|------|
| `src/game/combat/types.ts` | 修改 |
| `src/game/combat/run.ts` | 修改 |
| `src/game/data.ts` | 修改 |
| `src/hooks/useGameEngine.ts` | 修改 |
| `src/hooks/useCoreActions.ts` | 修改 |
| `src/components/shared/CombatModal.tsx` | 重写 |
| `src/components/shared/combat/CombatHeader.tsx` | 新增 |
| `src/components/shared/combat/CombatBattleLog.tsx` | 新增 |
| `src/components/shared/combat/CombatFooter.tsx` | 新增 |
| `src/components/shared/combat/HpBar.tsx` | 新增 |
