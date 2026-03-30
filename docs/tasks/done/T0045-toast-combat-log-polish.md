# T0045 — Toast 降噪 + 战斗日志合并

**类型**：feat（UI 体验优化）
**状态**：✅ 已完成（2026-03-30）
**前置**：T0043 ✅, T0044 ✅
**设计文档**：[spec](../../specs/T0045-toast-combat-log-polish.md)
**关键文件**：`src/hooks/useToast.ts`、`src/components/hud/ToastContainer.tsx`、`src/components/shared/CombatModal.tsx`、`src/hooks/useGameEngine.ts`、`src/hooks/useCoreActions.ts`、`src/components/layout/GameLayout.tsx`

## 目标

1. 将 Toast 从多条堆叠气泡改为单条消息栏，降低视觉噪音
2. 战斗日志合并为一条结构化摘要，括号内包含所有属性变化
3. 探索拾取日志合并到探索事件描述中

## 关键改动

| 文件 | 改动 |
|------|------|
| `src/hooks/useToast.ts` | 单条消息机制，新消息替换旧消息 |
| `src/components/hud/ToastContainer.tsx` | 单条渲染，降低视觉强度 |
| `src/App.css` | 样式从 fixed 浮层改为内联消息条 |
| `src/hooks/useGameEngine.ts` | `handleCombatClose` 战斗摘要格式 |
| `src/hooks/useCoreActions.ts` | 探索日志合并 |
| `src/App.tsx` | ToastContainer 位置调整 |

## 完成标准

- [ ] Toast 改为单条消息栏，不再堆叠
- [ ] 战斗胜利日志格式：`⚔️ 击败 X（+修为 +灵石 -HP 获得: Y×n）`
- [ ] 战斗失败日志格式：`💀 败于 X（-HP -健康 惩罚信息）`
- [ ] 探索拾取合并为一条
- [ ] ⚠️ 提示正常工作
