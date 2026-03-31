# T0061 — 体修功法内容（高阶拳法 · 指法）

- **类型**：feat
- **状态**：⬜ 未开始
- **Spec**：[docs/specs/T0059-body-cultivation.md#五拳法功法内容content](../../specs/T0059-body-cultivation.md)
- **创建日期**：2026-04-01

---

## 目标

新增 22 条高阶拳法+指法功法数据（拳法 10 条、指法 11 条，含 uncommon/rare/epic/legendary 各稀有度），覆盖炼气至元婴各境界。功法修炼时触发 bodyRealmExp 积累逻辑。

## 前置依赖

- T0059（体修系统核心，提供 bodyRealmExp 积累接口）
- T0017 ✅ 功法系统

## 验收标准

1. 22 条功法注册成功，功法面板可见可学
2. 修炼拳法/指法时正确积累 bodyRealmExp
3. 各级被动效果（体魄上限/减伤/ATK等）正确解锁并触发 recalcStats
