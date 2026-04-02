# 设计文档：文案集中管理

任务：T0065
日期：2026-04-02

## 概述

当前项目中所有面向玩家的中文文本（日志模板、系统提示、UI 标签、属性名映射等）散落在 30+ 个源码文件中，总计约 300+ 条文案。存在以下问题：

1. **重复定义** — 同一文案/映射表在多处出现（如「精力不足」出现 3 次，属性中文名映射在 `constants.ts`、`AchievementPanel.tsx`、`TechniquePanel.tsx` 各有一份，境界名数组在 `equipment.ts`、`EquipmentPanel.tsx` 分别硬编码）
2. **散乱难维护** — 改一条提示需要在逻辑代码中搜索，容易遗漏
3. **无法统一风格** — emoji 前缀、标点、语气随开发者习惯各异
4. **不利于未来国际化** — 文本耦合逻辑，无法抽换语言包

## 调研现状

### 文案分布统计

| 分类 | 文件数 | 大致条数 | 说明 |
|------|--------|----------|------|
| **战斗日志** | 2 (`combat/run.ts`, `combat/damage.ts`) | ~40 | 战斗过程中的回合日志、技能/神通施展、胜负结果 |
| **功法系统消息** | 1 (`technique.ts`) | ~20 | 学习/修炼/切换功法的反馈 |
| **神通系统消息** | 1 (`divine-arts.ts`) | ~15 | 学习/激活/取消神通的反馈 + 战斗中元素伤害日志 |
| **炼丹/炼器消息** | 2 (`alchemy.ts`, `smithing.ts`) | ~15 | 成功/失败/材料不足/灵力不足等 |
| **装备系统消息** | 1 (`equipment.ts`) | ~12 | 装备/卸下/境界不足等 + 槽位中文名映射 |
| **突破/渡劫消息** | 2 (`breakthrough/attempt.ts`, `tribulation/run.ts`) | ~20 | 突破成功/失败、天劫波次、奖励 |
| **死亡系统消息** | 1 (`death.ts`) | ~8 | 惩罚日志（损失修为/灵石/物品/健康等） |
| **背包系统消息** | 1 (`inventory.ts`) | ~4 | 使用/不存在/无法使用 |
| **地图系统消息** | 1 (`map.ts`) | ~8 | 旅行成功/失败/精力不足 |
| **体修系统消息** | 1 (`body-cultivation.ts`) | ~2 | 体修突破/瓶颈 |
| **核心行为消息** | 1 (`useCoreActions.ts`) | ~14 | 修炼/战斗/探索/休息的即时反馈 |
| **引擎消息** | 1 (`useGameEngine.ts`) | ~10 | 开局/存档/成就解锁/寿元耗尽 |
| **战斗弹窗消息** | 1 (`useCombatModal.ts`) | ~12 | 战斗结果摘要（击败/败于/脱战） |
| **系统行为消息** | 1 (`useSystemActions.ts`) | ~3 | 渡劫失败/瓶颈提示/体修突破 |
| **UI 标签/映射** | 10+ 个组件文件 | ~80 | 属性中文名、品质名、面板标题、按钮文字、筛选标签 |
| **数据内容文本** | 3 (`events.ts`、`achievement/data.ts`、`player/stats.ts`) | ~50 | 成就名/描述、妖兽名、灵根等级名、死亡触发器名描述 |
| **调试面板标签** | 4 (`DebugPanel.tsx` 等) | ~40 | Debug 面板各属性标签 |

**合计：~350+ 条散落文本，分布在 30+ 文件中。**

### 重复定义实例

| 文本/映射 | 出现位置 |
|-----------|----------|
| `'⚠️ 精力不足，请先休息！'` | `useCoreActions.ts` × 3 处 |
| 属性中文名映射 `{ atk: '攻击', def: '防御', ... }` | `shared/constants.ts`、`AchievementPanel.tsx`、`TechniquePanel.tsx` |
| 灵根类型中文名 `{ sword: '剑法', ... }` | `shared/constants.ts`、`TechniquePanel.tsx` |
| 境界名数组 `['凡人','炼气','筑基',...]` | `equipment.ts`、`EquipmentPanel.tsx` |
| 元素中文名 `{ fire: '火', water: '水', ... }` | `divine-arts.ts`、`shared/constants.ts` |
| 品质标签 `'✨极品' / '🌟良品' / '普通'` | `alchemy.ts` 内联 |

## 数据结构

### 文案分类体系

按**系统模块**组织文案文件，每个文件导出一个 `const` 对象：

```typescript
// 文案 key 的命名约定：
// - 静态文本：直接 string
// - 动态模板：函数 (...args) => string

// 示例：src/data/texts/combat.ts
export const COMBAT_TEXTS = {
  encounter: (name: string, hp: number) => `⚔️ 遭遇 ${name}（${hp} HP）！`,
  victory: (name: string) => `🎉 你击败了 ${name}！`,
  defeat: (name: string) => `💀 你被 ${name} 击败了…`,
  timeout: () => '战斗超时，双方脱战。',
  // ...
} as const;
```

### 文件结构规划

```text
src/data/texts/
├── index.ts               # barrel re-export
├── common.ts              # 通用映射（属性名、品质名、灵根名、元素名、境界名）
├── combat.ts              # 战斗系统文案（回合日志、技能施展、胜负结果）
├── cultivation.ts         # 修炼系统文案（修炼反馈、修为获得）
├── technique.ts           # 功法系统文案（学习/修炼/切换/被动）
├── divine-arts.ts         # 神通系统文案（学习/激活/元素伤害）
├── alchemy.ts             # 炼丹系统文案（成功/失败/材料不足）
├── smithing.ts            # 炼器系统文案
├── equipment.ts           # 装备系统文案（装备/卸下/槽位名）
├── inventory.ts           # 背包系统文案
├── shop.ts                # 商店系统文案
├── breakthrough.ts        # 突破/渡劫文案
├── death.ts               # 死亡/惩罚文案
├── map.ts                 # 地图/旅行文案
├── body-cultivation.ts    # 体修系统文案
├── explore.ts             # 探索/休息文案
├── achievement.ts         # 成就面板 UI 文案（注：成就数据内容仍在 achievement/data.ts）
├── ui-labels.ts           # 通用 UI 标签（面板标题、按钮、筛选标签）
└── debug.ts               # 调试面板标签（可选，低优先级）
```

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键导出 |
|------|------|----------|
| `src/data/texts/index.ts` | barrel re-export | 所有文案模块的统一入口 |
| `src/data/texts/common.ts` | 通用映射表 | `ATTR_NAMES`, `QUALITY_NAMES`, `SPIRIT_ROOT_NAMES`, `ELEMENT_NAMES`, `REALM_NAMES`, `SLOT_NAMES` 等 |
| `src/data/texts/combat.ts` | 战斗文案 | `COMBAT_TEXTS` — 回合日志模板函数 |
| `src/data/texts/cultivation.ts` | 修炼文案 | `CULTIVATION_TEXTS` |
| `src/data/texts/technique.ts` | 功法文案 | `TECHNIQUE_TEXTS` |
| `src/data/texts/divine-arts.ts` | 神通文案 | `DIVINE_ARTS_TEXTS` |
| `src/data/texts/alchemy.ts` | 炼丹文案 | `ALCHEMY_TEXTS` |
| `src/data/texts/smithing.ts` | 炼器文案 | `SMITHING_TEXTS` |
| `src/data/texts/equipment.ts` | 装备文案 | `EQUIPMENT_TEXTS` |
| `src/data/texts/inventory.ts` | 背包文案 | `INVENTORY_TEXTS` |
| `src/data/texts/breakthrough.ts` | 突破/渡劫文案 | `BREAKTHROUGH_TEXTS`, `TRIBULATION_TEXTS` |
| `src/data/texts/death.ts` | 死亡文案 | `DEATH_TEXTS` |
| `src/data/texts/map.ts` | 地图文案 | `MAP_TEXTS` |
| `src/data/texts/body-cultivation.ts` | 体修文案 | `BODY_CULTIVATION_TEXTS` |
| `src/data/texts/explore.ts` | 探索/休息文案 | `EXPLORE_TEXTS` |
| `src/data/texts/ui-labels.ts` | UI 标签 | `UI_LABELS` — 面板标题、按钮、筛选标签 |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/combat/run.ts` | 将 ~35 条内联文案替换为 `COMBAT_TEXTS.xxx(...)` 调用 | 战斗日志集中管理 |
| `src/game/combat/damage.ts` | 替换 ~6 条伤害日志 | 同上 |
| `src/game/technique.ts` | 替换 ~20 条功法消息 | 功法文案集中 |
| `src/game/divine-arts.ts` | 替换 ~15 条神通消息 | 神通文案集中 |
| `src/game/alchemy.ts` | 替换 ~9 条炼丹消息 | 炼丹文案集中 |
| `src/game/smithing.ts` | 替换 ~8 条炼器消息 | 炼器文案集中 |
| `src/game/equipment.ts` | 替换 ~12 条装备消息 + 槽位映射 | 装备文案集中 |
| `src/game/inventory.ts` | 替换 ~4 条背包消息 | 背包文案集中 |
| `src/game/map.ts` | 替换 ~8 条地图消息 | 地图文案集中 |
| `src/game/death.ts` | 替换 ~8 条死亡消息 | 死亡文案集中 |
| `src/game/body-cultivation.ts` | 替换 ~2 条体修消息 | 体修文案集中 |
| `src/game/breakthrough/attempt.ts` | 替换 ~12 条突破消息 | 突破文案集中 |
| `src/game/tribulation/run.ts` | 替换 ~10 条渡劫消息 | 渡劫文案集中 |
| `src/game/tribulation/wave-combat.ts` | 替换 ~1 条 | 同上 |
| `src/game/player/create.ts` | 默认名 '无名散修' 提取 | 集中管理 |
| `src/game/player/stats.ts` | 灵根等级名映射提取 | 集中管理 |
| `src/game/events.ts` | 死亡触发器名/描述提取 | 集中管理 |
| `src/hooks/useGameEngine.ts` | 替换 ~10 条引擎消息 | 引擎文案集中 |
| `src/hooks/useCoreActions.ts` | 替换 ~14 条行为消息 | 行为文案集中 |
| `src/hooks/useCombatModal.ts` | 替换 ~12 条战斗摘要 | 战斗文案集中 |
| `src/hooks/useSystemActions.ts` | 替换 ~3 条消息 | 系统文案集中 |
| `src/components/shared/constants.ts` | 移除重复映射，改为从 `texts/common.ts` re-export | 消除重复 |
| `src/components/panels/AchievementPanel.tsx` | 删除本地属性映射，引用 `common.ts` | 消除重复 |
| `src/components/panels/TechniquePanel.tsx` | 删除本地类型映射，引用 `common.ts` | 消除重复 |
| `src/components/panels/EquipmentPanel.tsx` | 删除内联境界数组，引用 `common.ts` | 消除重复 |
| 其他组件文件（约 10 个） | 将 UI 标签文字替换为 `UI_LABELS.xxx` 引用 | UI 文案集中 |

### 设计约定

1. **静态文本导出为 `string` 常量，动态文本导出为箭头函数**
2. **每个文案 key 必须唯一且语义化**（如 `COMBAT_TEXTS.victory` 而非 `COMBAT_TEXTS.msg1`）
3. **emoji 前缀是文案的一部分**，统一在文案文件中管理
4. **游戏数据内容不迁移** — 成就定义（`achievement/data.ts`）、妖兽定义（`events.ts`）、物品/装备/配方 JSON 中的 `name`/`description` 字段属于**内容数据**，保持原位即可。这些内容通过 DLC 注册表管理，有自己的数据文件，不属于"散落文案"
5. **`shared/constants.ts` 保留为 re-export 入口**，避免大面积修改已有 import 路径

## UI 方案（@Designer）

### 新增界面/面板

无新增 UI。本任务是纯代码重构，不影响用户可见界面。

### 交互

无变化。

## 迁移策略

采用**按模块逐步迁移，一次一个 PR** 的策略：

### 阶段 1：基础设施 + 通用映射（1 个 PR）
- 创建 `src/data/texts/` 目录和 `index.ts`
- 迁移 `common.ts`（属性名、品质名、灵根名、元素名、境界名、槽位名）
- 更新 `shared/constants.ts` 改为从 `common.ts` re-export
- 消除 `AchievementPanel.tsx`、`TechniquePanel.tsx`、`EquipmentPanel.tsx`、`equipment.ts` 中的重复映射

### 阶段 2：战斗系统文案（1 个 PR）
- 迁移 `combat.ts` 文案文件
- 更新 `combat/run.ts`、`combat/damage.ts`、`useCombatModal.ts`

### 阶段 3：修炼/功法/神通文案（1 个 PR）
- 迁移 `cultivation.ts`、`technique.ts`、`divine-arts.ts` 文案文件
- 更新对应逻辑和 Hook 文件

### 阶段 4：物品/炼丹/炼器/装备/商店文案（1 个 PR）
- 迁移 `alchemy.ts`、`smithing.ts`、`equipment.ts`、`inventory.ts`、`shop.ts` 文案文件
- 更新对应逻辑文件

### 阶段 5：突破/渡劫/死亡/地图/体修文案（1 个 PR）
- 迁移 `breakthrough.ts`、`death.ts`、`map.ts`、`body-cultivation.ts`、`explore.ts` 文案文件
- 更新对应逻辑和 Hook 文件

### 阶段 6：UI 标签文案（1 个 PR）
- 迁移 `ui-labels.ts` 文案文件
- 更新各组件中的静态 UI 标签

### 阶段 7（可选）：调试面板标签
- 迁移 `debug.ts`，低优先级

每个阶段完成后应确保 `npm run build` 通过且游戏功能正常。

## 验证方式

### 功能验证
- 游戏所有功能正常：修炼、战斗、探索、炼丹、炼器、装备、商店、突破、渡劫、地图移动、功法、神通、体修
- 所有日志/提示文案与迁移前完全一致（文字、emoji、动态参数正确填充）
- Debug 面板所有标签正常显示

### 代码质量验证
- `npm run build` 无报错
- 用 `grep` 检查：`src/game/` 和 `src/hooks/` 中不再有内联中文字符串（注释除外）
- 各组件不再出现重复的属性名映射

### 测试用例

1. **战斗日志正确性** — 开始战斗，检查战斗弹窗中的回合日志是否与之前一致（回合数、伤害数值、技能名、emoji 前缀）
2. **修炼反馈正确性** — 点击修炼，检查日志区域显示的修炼反馈（修为数值、悟性/灵根倍率）是否正确
3. **系统提示正确性** — 精力耗尽时操作，检查是否显示"⚠️ 精力不足，请先休息！"Toast
4. **属性面板中文名** — 打开详细属性面板，确认所有属性名为中文
5. **装备操作文案** — 装备/卸下装备，确认日志文案正确
6. **炼丹失败文案** — 材料不足时炼丹，确认提示正确
7. **突破文案** — 执行突破，确认成功/失败日志正确
8. **面板标题** — 打开各功能面板（背包、商店、功法、神通、炼制、装备、成就、地图），确认标题和图标正确

## 调试面板需求

无需更新调试面板功能。阶段 7 中可选择性迁移调试面板标签，但不影响功能。

## 依赖关系

- **前置任务**：无（纯重构任务，不依赖新功能）
- **后续受益**：
  - 所有未来新增系统的文案可直接放入 `texts/` 目录
  - 为未来国际化（i18n）奠定基础
  - 减少新功能开发时的文案重复定义

## 不迁移范围

以下内容**保持原位**，不在本次迁移范围内：

1. **游戏内容数据** — `src/game/achievement/data.ts`（成就名/描述）、`src/game/events.ts`（妖兽名/DLC 描述）等通过 DLC 注册表管理的内容数据
2. **JSON 数据文件** — `src/data/*.json` 中的 `name`/`description` 字段
3. **代码注释** — 中文注释不在迁移范围
4. **CSS 类名** — 不涉及
5. **`changelog.ts`** — 版本日志内容
