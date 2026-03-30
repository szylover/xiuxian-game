# T0020 — 神通（元素体系）

- **状态**: ✅ 已完成
- **分类**: 功法与技能
- **前置**: T0017, T0018
- **Spec**: [docs/specs/T0020-divine-arts.md](../specs/T0020-divine-arts.md)
- **完成日期**: 2026-03-30

## 描述

高级技能，需对应灵根资质，元素伤害 + 元素抗性体系。

- 火/水/雷/风/土/木六系神通
- 灵根资质决定可学习的神通和威力
- 元素克制关系

## 关键文件

- `src/game/divine-arts.ts` — 神通系统核心逻辑（学习/激活/计算/元素克制）
- `src/data/core-divine-arts.ts` — 六系神通数据（烈焰斩/寒冰波/雷霆击/疾风连斩/磐石护身/藤蔓束缚）
- `src/components/panels/DivineArtsPanel.tsx` — 神通面板 UI
- `src/game/types.ts` — 新增 ElementType/DivineArtDef/DivineArtSkillEffect 等类型
- `src/game/combat/run.ts` — 战斗集成神通触发、护盾减伤、playerEffects 管理
