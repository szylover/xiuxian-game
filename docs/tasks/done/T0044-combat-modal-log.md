# T0044 — 战斗弹窗 + 日志精简

- **类型**：feat
- **状态**：✅ 已完成（2026-03-27）
- **前置**：T0003 ✅, T0043 ✅
- **Spec**：[T0044-combat-modal-log.md](../../specs/T0044-combat-modal-log.md)
- **关键文件**: `src/components/shared/CombatModal.tsx`、`src/hooks/useCoreActions.ts`、`src/hooks/useGameEngine.ts`、`src/components/hud/GameLog.tsx`、`src/components/layout/PanelButtons.tsx`

## 描述

将战斗结果展示从"日志平铺"改为"模态弹窗 + 摘要日志"模式：

1. 战斗触发时弹出模态框，逐条展示回合详情
2. 胜利后点"查看战利品"切换为战利品展示，再确认关闭
3. GameLog 中只记录一行战斗摘要
4. GameLog 标题栏加"折叠全部"按钮

## 涉及文件

- `src/components/shared/CombatModal.tsx`（新增）
- `src/hooks/useCoreActions.ts`（改造 fight()）
- `src/App.tsx`（编排弹窗状态）
- `src/components/hud/GameLog.tsx`（折叠全部按钮）
- `src/App.css`（弹窗样式）
