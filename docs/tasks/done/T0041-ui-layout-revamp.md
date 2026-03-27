# T0041 — 界面布局改版（三栏布局 + 头像系统）

- **类型**：feat
- **状态**：✅ 已完成
- **前置**：T0006 ✅
- **Spec**：[docs/specs/T0041-ui-layout-revamp.md](../../specs/T0041-ui-layout-revamp.md)
- **完成日期**：2026-03-27

## 关键文件

- `src/components/layout/` — GameLayout, LeftPanel, RightPanel, PanelButtons, Avatar
- `src/components/shared/FloatingPanel.tsx` — 可拖拽浮动窗口
- `src/components/panels/CraftingPanel.tsx` — 炼丹+炼器合并面板
- `public/avatars/default.svg` — 古风男性头像

同时引入头像系统（初版 Emoji + CSS 边框）。

## 关键交付物

- [ ] `src/components/layout/GameLayout.tsx` — 三栏布局骨架
- [ ] `src/components/layout/LeftPanel.tsx` — 左栏组件
- [ ] `src/components/layout/RightPanel.tsx` — 右栏组件
- [ ] `src/components/layout/PanelButtons.tsx` — 按钮组组件
- [ ] `src/components/Avatar.tsx` — 头像组件
- [ ] `src/game/avatar.ts` — 头像定义
- [ ] `src/App.tsx` 重构 — 使用 GameLayout
- [ ] `src/App.css` — 三栏布局 + 响应式样式
- [ ] 各面板组件移除 toggle 逻辑
- [ ] Player 类型新增 `avatar` 字段 + 存档兼容
- [ ] 响应式适配（≥960px 三栏 / 768–959 两栏 / <768 单栏）

## 验收标准

- 桌面端（≥960px）三栏正确排列
- 左栏头像 + 核心属性实时更新
- 右栏按钮分组，点击切换面板，功能正常
- 所有原有功能（背包/炼丹/装备/商店/炼器/战斗/修炼/探索/休息）不受影响
- 旧存档加载兼容
- 移动端单栏降级可用
