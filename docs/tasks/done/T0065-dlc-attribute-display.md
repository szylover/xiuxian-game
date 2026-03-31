# T0065 — DLC 属性动态展示（详细属性面板补全）

- **类型**：feat
- **状态**：✅ 已完成
- **Spec**：[docs/specs/T0065-dlc-attribute-display.md](../../specs/T0065-dlc-attribute-display.md)
- **创建日期**：2026-04-02
- **完成日期**：2026-03-31
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
3. 建立 stat key → 中文显示名的映射表，未注册的 key 原始 key 名兜底

## 实现清单

- [x] 在 StatusPanel 战斗属性段追加 `critDmgMultiplier` 行（🎯 暴击伤害，显示为百分比）
- [x] 新增 `STAT_LABEL_MAP`（写入 `src/components/shared/constants.ts`，含 30+ 常见 key 映射）
- [x] 新增「额外属性」段：条件渲染，过滤零值，按 key 字母排序
- [x] 倍率类（Multiplier 结尾）自动换算为百分比，其余直接显示原始值
- [ ] 负数值以红色显示（passives 当前无负数值，可后续追加）
- [ ] `camelToSpaced` 兜底格式化（未注册 key 直接显示原始 key 名，已够用）

## 关键文件

- `src/components/panels/StatusPanel.tsx` — 主改动
- `src/components/shared/constants.ts` — STAT_LABEL_MAP

## 验收标准

1. ✅ 战斗属性段出现「暴击伤害」行，初始值 150%
2. ✅ 新角色面板底部无「额外属性」段（passives 为空时不渲染）
3. ✅ 当 passives 中有非零数值时，「额外属性」段自动出现对应条目
4. ✅ 值为 0 的条目不显示
5. ✅ 未在映射表注册的 key 以原始 key 名显示，不崩溃
