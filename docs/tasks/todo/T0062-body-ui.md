# T0062 — 体修 UI 展示

- **类型**：feat
- **状态**：⬜ 未开始
- **Spec**：[docs/specs/T0059-body-cultivation.md#八ui方案designer](../../specs/T0059-body-cultivation.md)
- **创建日期**：2026-04-01

---

## 目标

在状态面板、战斗弹窗、Debug 面板中展示体修相关信息：体修境界行、体魄橙色进度条、Debug 快速调试按钮。

## 前置依赖

- T0059（体修数据结构）
- T0041 ✅ 界面布局改版
- T0046 ✅ 战斗弹窗 UI

## 验收标准

1. 状态面板中体修境界行正常显示（名称 + 体修修为进度）
2. HP/MP 条下方新增橙色体魄条，数值正确
3. 战斗弹窗中体魄条可见
4. Debug 面板可修改 physique、bodyRealmIndex 等字段，`+体修修为` 按钮正常工作
