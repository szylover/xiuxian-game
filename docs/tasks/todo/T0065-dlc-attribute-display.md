# T0065 — DLC 属性动态展示（详细属性面板补全）

- **类型**：feat
- **状态**：📐 设计完成，待实现
- **Spec**：[docs/specs/T0065-dlc-attribute-display.md](../../specs/T0065-dlc-attribute-display.md)
- **创建日期**：2026-04-02
- **前置任务**：T0006 ✅, T0019 ✅, T0059 ✅

---

## 问题描述

「详细属性」面板（StatusPanel）目前硬编码约 32 条属性，存在两个缺口：

1. **遗漏核心属性**：`critDmgMultiplier`（暴击伤害倍率）已参与战斗计算，但从未在面板中展示，玩家不可见。
2. **DLC 属性不可见**：功法被动（`passiveEffects`）、体修境界奖励、灵根加成等系统通过 `player.passives: Record<string, number>` 注入的自定义属性，StatusPanel 完全不读取，玩家无法看到这些 buff 是否生效。

## 目标

将 StatusPanel 升级为「核心硬编码 + DLC 动态追加」混合渲染模式：

1. 在「战斗属性」段补入 `critDmgMultiplier`（暴击伤害）显示行
2. 遍历 `player.passives`，渲染动态「额外属性」段（仅 passives 非空时显示）
3. 建立 stat key → 中文显示名的映射表，未注册的 key 自动驼峰转换兜底

## 实现清单

- [ ] 在 StatusPanel 战斗属性段追加 `critDmgMultiplier` 行
- [ ] 新增 `STAT_LABEL_MAP`（常量，初期写在 StatusPanel 顶部）
- [ ] 实现 `camelToSpaced` 兜底格式化函数
- [ ] 新增「额外属性」段：条件渲染，过滤零值，按 key 字母排序
- [ ] 负数值以红色显示
- [ ] （可选）若映射表条目超过 20 条，提取到 `src/utils/statLabels.ts`

## 验收标准

1. 战斗属性段出现「暴击伤害」行，初始值 ≥ 100%
2. 新角色面板底部无「额外属性」段
3. 学习含 `passiveEffects` 的功法后，「额外属性」段出现对应条目
4. 值为 0 的条目不显示
5. 未在映射表注册的 key 自动转换显示，不崩溃
6. 负数值以红色渲染
