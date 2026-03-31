# T0059 — 体修路线（武器 · 拳法 · 指法）

- **类型**：feat
- **状态**：✅ 已完成
- **完成日期**：2026-03-31
- **Spec**：[docs/specs/T0059-body-cultivation.md](../../specs/T0059-body-cultivation.md)
- **数值调整指南**：[docs/specs/T0059-body-tuning-guide.md](../../specs/T0059-body-tuning-guide.md)
- **创建日期**：2026-04-01
- **关键文件**：`src/game/body-cultivation.ts`, `src/data/core-body-config.ts`, `src/data/core-techniques.json`

---

## 目标

新增"体修"成长路线，与现有气修路线并行。玩家可通过修炼拳法/指法功法、装备体修专属武器、积累体修修为来淬炼肉身，解锁体修境界（凡躯→不灭）。体修核心优势：高 HP、物理减伤、肉身强化；区别于气修的高爆发技能路线。

## 包含内容

| 子部分 | 说明 |
|--------|------|
| T0059 核心 | 体魄属性 + 体修境界系统 + 战斗减伤逻辑 |
| T0060 | 体修专属武器（拳套 · 指环 · 手甲，共 12 件） |
| T0061 | 高阶拳法 + 指法功法（共 22 条） |
| T0062 | 体修 UI（境界行 · 体魄条 · Debug 面板） |

## 前置依赖

- T0001 ✅ 属性系统
- T0003 ✅ 战斗系统 v2
- T0017 ✅ 功法系统
- T0019 ✅ 被动效果

## 后续任务

- T0060（体修武器）
- T0061（拳法指法功法内容）
- T0062（体修 UI）

## 验收标准

1. `player.physique`、`player.bodyRealmIndex` 等字段正确初始化
2. 修炼拳法/指法积累 `bodyRealmExp`，满足条件自动突破体修境界
3. `physiqueDmgReduce` 在战斗中正确减伤（上限 50%）
4. 装备体修武器 + 激活拳法/指法时，`physiqueBonusRate` 加成追加 atk
5. 所有体修内容通过 `registerDLC()` 挂载，系统模块零硬编码
