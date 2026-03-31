# T0060 — 体修武器内容（拳套 · 指环 · 手甲）

- **类型**：feat
- **状态**：⬜ 未开始
- **Spec**：[docs/specs/T0059-body-cultivation.md#四体修武器内容content](../../specs/T0059-body-cultivation.md)
- **创建日期**：2026-04-01

---

## 目标

新增 12 件体修专属武器，扩展 EquipDef 支持 `techType`（功法类型匹配）和 `physiqueBonusRate`（体魄攻击加成比），并在商店按体修境界解锁。

## 前置依赖

- T0059 ✅（体魄属性 + 体修系统核心）
- T0014 ✅ 装备系统
- T0015 ✅ 商店系统

## 验收标准

1. 12 件武器数据注册成功，可从商店购买（按境界分阶段解锁）
2. `EquipDef.techType` 匹配时，战斗 atk 正确追加 `physique × physiqueBonusRate`
3. 激活不匹配功法时，Toast 警告正常显示
