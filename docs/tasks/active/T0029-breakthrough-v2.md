# T0029 — 突破系统重构 + 渡劫

- **状态**: 📐 设计完成
- **分类**: 进阶机制
- **前置**: T0004, T0012
- **Spec**: [T0029-breakthrough-tribulation.md](../specs/T0029-breakthrough-tribulation.md)

## 描述

突破需消耗特定物品 + 满足前置条件；化神/渡劫期需经历天劫多波连战。

- BreakthroughReqDef：每个境界跳跃定义物品消耗 + 条件谓词
- TribulationDef：天劫多波次连战（波间不回血）
- 天劫特殊效果：灼烧 DOT / 碎甲 / 禁疗
- 失败后果：降境界 / 沦为散仙 / 形神俱灭
- 怜悯机制：同境界每次失败 +5% 成功率（上限 +25%）
- 所有数据通过 DLC 注册，系统是纯壳子
