# 设计文档：秘籍研读系统（Learning System）

任务：T0075
日期：2026-04-08

## 概述

当前功法、神通、炼丹配方、炼器配方在面板中直接列出所有可学内容，玩家点击即可学会，缺乏获取感和成就感。本设计将这四类知识**物品化**为"秘籍/配方卷轴"，玩家需要先**获取**秘籍物品（探索掉落、商店购买、NPC 赠送、任务奖励、战斗掉落），再**使用**秘籍进入"研读"状态，根据**悟性**属性计算研读进度，研读完成后才解锁对应功法/神通/配方。

核心改变：
- **获取 → 研读 → 解锁** 三段式学习流程取代"点击即学会"
- 悟性属性从"修炼速度加成"提升为影响研读速度的核心属性
- 预留学习小游戏扩展接口（Phase 2）

---

## 数据结构

### 1. 新增物品子类型：秘籍/卷轴（复用 `ItemDef`）

不新增顶级类型，而是扩展 `ItemCategory` 和 `ItemDef`：

```ts
// types.ts — 扩展
export type ItemCategory = 
  | 'weapon' | 'armor' | 'accessory' 
  | 'consumable' | 'material' | 'technique' | 'misc'
  | 'scroll';  // 新增：秘籍/卷轴

// ItemDef 新增可选字段
export interface ItemDef {
  // ... 现有字段 ...
  
  // ── 秘籍/卷轴专用字段（仅 category='scroll' 时有效）──
  scrollType?: 'technique' | 'divineArt' | 'recipe' | 'smithingRecipe';
  // 秘籍对应的知识 ID（功法ID / 神通ID / 配方ID / 炼器配方ID）
  scrollTargetId?: string;
  // 研读所需的基础时间（月数），悟性越高实际时间越短
  scrollStudyMonths?: number;
  // 研读最低境界要求（可选，覆盖知识本身的 minRealm）
  scrollMinRealm?: number;
}
```

### 2. Player 状态扩展：研读进度 + 已学配方列表

```ts
// player/types.ts — 新增 systems 下的子状态

/** 研读系统状态，存储在 player.systems['learning'] */
export interface LearningSystemState {
  /** 当前正在研读的内容（同一时间只能研读一个） */
  activeStudy: ActiveStudy | null;
  
  /** 已习得的炼丹配方 ID 列表 */
  learnedRecipes: string[];
  
  /** 已习得的炼器配方 ID 列表 */
  learnedSmithingRecipes: string[];
}

export interface ActiveStudy {
  /** 秘籍物品 ID（用于消耗/引用） */
  scrollItemId: string;
  /** 秘籍类型 */
  scrollType: 'technique' | 'divineArt' | 'recipe' | 'smithingRecipe';
  /** 目标知识 ID */
  targetId: string;
  /** 目标名称（冗余缓存，方便展示） */
  targetName: string;
  /** 已投入的研读月数 */
  progressMonths: number;
  /** 总共需要的研读月数（创建时根据悟性计算确定） */
  totalMonths: number;
}
```

**说明**：
- 功法/神通的已学状态沿用现有存储方式（`player.techniques[]` 和 `player.systems['divineArts'].learned`），不做迁移。
- 炼丹配方、炼器配方当前没有"已学"概念（面板直接列出全部），需新增 `learnedRecipes` 和 `learnedSmithingRecipes` 列表。初始化时为空数组。
- 同一时间只能研读一个秘籍。研读过程中可以做其他操作（修炼、战斗等），但不能同时研读第二个。

### 3. 研读进度计算公式

```
基础研读月数 = scrollStudyMonths（秘籍定义中设置）
实际研读月数 = ceil(基础月数 × (100 / (100 + comprehension)))

例：
- 悟性 0   → 实际月数 = 基础月数 × 1.0（无加速）
- 悟性 50  → 实际月数 = 基础月数 × 0.67（加速 33%）
- 悟性 100 → 实际月数 = 基础月数 × 0.50（加速 50%）
- 悟性 200 → 实际月数 = 基础月数 × 0.33（加速 67%）
```

**研读推进触发**：每当玩家执行消耗月数的操作（修炼功法、修炼、炼丹等）时，研读进度自动 +1 月。当 `progressMonths >= totalMonths` 时研读完成，自动解锁对应知识。

### 4. 秘籍物品建议参数

| 类型 | 建议基础研读月数 | 说明 |
|------|-----------------|------|
| 功法秘籍（common ~ uncommon） | 2~4 | 低阶功法易学 |
| 功法秘籍（rare ~ epic） | 6~12 | 高阶功法需长期研读 |
| 功法秘籍（legendary） | 18~24 | 顶级功法需数年研读 |
| 神通秘籍 | 4~12 | 按元素系和威力决定 |
| 炼丹配方卷轴 | 1~4 | 配方相对简单 |
| 炼器配方卷轴 | 2~6 | 炼器配方稍复杂 |

---

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键函数 |
|------|------|----------|
| `src/game/learning.ts` | 研读系统核心逻辑 | `startStudy()` / `tickStudy()` / `completeStudy()` / `cancelStudy()` / `getLearningState()` / `hasLearnedRecipe()` / `hasLearnedSmithingRecipe()` / `calcActualStudyMonths()` |
| `src/data/texts/learning.ts` | 研读系统中文文案 | `LEARNING_TEXTS` |
| `src/components/panels/LearningPanel.tsx` | 研读面板 UI | 当前研读进度 + 背包中秘籍列表 |
| `src/components/panels/LearningPanel.css` | 研读面板样式 | — |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | `ItemCategory` 增加 `'scroll'`；`ItemDef` 增加 `scrollType` / `scrollTargetId` / `scrollStudyMonths` / `scrollMinRealm` 字段 | 秘籍物品化 |
| `src/game/technique.ts` | `learnTechnique()` — 不做改动，但新增 `learnTechniqueFromScroll()` 走研读完成流程 | 被 `completeStudy()` 调用 |
| `src/game/divine-arts.ts` | 同上，保留 `learnDivineArt()`，研读完成时调用 | 被 `completeStudy()` 调用 |
| `src/game/alchemy.ts` | `getAvailableRecipes()` 改为只返回已学会的配方 | 配方需先研读解锁 |
| `src/game/smithing.ts` | `getAvailableSmithingRecipes()` 改为只返回已学会的配方 | 配方需先研读解锁 |
| `src/components/panels/TechniquePanel.tsx` | 移除"可学功法"区域，只保留"已学功法"区域 | 功法不再直接可学 |
| `src/components/panels/DivineArtsPanel.tsx` | 移除"可学神通"区域，只保留"已学神通"区域 | 神通不再直接可学 |
| `src/components/panels/AlchemyPanel.tsx` | `getAllRecipes()` 改为只显示已学配方 | 配方需先研读解锁 |
| `src/components/panels/SmithingPanel.tsx` | `getAllSmithingRecipes()` 改为只显示已学配方 | 配方需先研读解锁 |
| `src/hooks/useSystemActions.ts` | 新增 `startStudy()` / `cancelStudy()` action；修改每月 tick 调用 `tickStudy()` | 研读行为入口 |
| `src/hooks/useGameEngine.ts` | 向 `GameActions` 暴露研读相关 action | 传递到组件 |
| `src/components/layout/RightPanel.tsx` | 新增研读面板 tab + 移除 `onLearnTechnique` / `onLearnDivineArt` prop | 面板入口 |
| `src/data/dlc/core/manifest.ts` | 注册秘籍/卷轴物品数据 | 核心包物品 |
| `src/data/dlc/core/items.json` | 新增所有功法/神通/配方对应的秘籍物品数据 | 物品数据 |
| `src/data/dlc/core/shop.json` | 商品改为售卖秘籍/卷轴，移除直接教授 | 商店改造 |
| `src/components/debug/DebugItemsTab.tsx` | 新增"一键学习所有"按钮 + 秘籍快速添加 | Debug 便利 |
| `src/data/texts/index.ts` | 导出 `LEARNING_TEXTS` | 文案集中管理 |
| `src/game/player/create.ts` | `LearningSystemState` 初始化 | 新角色默认状态 |
| `src/game/inventory.ts` | `useItem()` 对 `scroll` 类物品触发研读流程 | 使用秘籍 |

### 核心函数设计

```
// learning.ts 伪代码

getLearningState(player) → LearningSystemState
  从 player.systems['learning'] 读取，无则返回默认值

calcActualStudyMonths(baseMonths, comprehension) → number
  ceil(baseMonths × (100 / (100 + comprehension)))

startStudy(player, scrollItemId) → { player, message }
  1. 检查背包中有该秘籍
  2. 检查 activeStudy 为 null（不能同时研读两个）
  3. 检查境界是否满足 scrollMinRealm
  4. 检查目标知识是否已学会（防重复）
  5. 消耗秘籍物品（从背包移除）
  6. 写入 activeStudy
  7. 返回提示："开始研读《XX》，预计需要 N 个月…"

tickStudy(player) → { player, message, completed }
  1. 如果 activeStudy 为 null → 无操作
  2. progressMonths++
  3. 如果 progressMonths >= totalMonths → completeStudy()
  4. 否则返回进度提示

completeStudy(player) → { player, message }
  根据 scrollType 调用对应的 learn 函数：
  - technique → learnTechnique(player, targetId)
  - divineArt → learnDivineArt(player, targetId)
  - recipe → 将 targetId 加入 learnedRecipes
  - smithingRecipe → 将 targetId 加入 learnedSmithingRecipes
  清空 activeStudy

cancelStudy(player) → { player, message }
  放弃当前研读，秘籍不返还（已消耗）

hasLearnedRecipe(player, recipeId) → boolean
hasLearnedSmithingRecipe(player, recipeId) → boolean
```

### 研读推进时机

在以下操作中调用 `tickStudy()`：
- `practiceTechnique()` — 修炼功法（已消耗 1 月）
- `useCoreActions` 中的修炼操作（消耗月数时）
- `performAlchemy()` — 炼丹（如果炼丹消耗时间的话）
- 休息 — 休息时也推进研读

关键：只要游戏时间前进 1 个月，就推进研读进度 1 个月。在 `useSystemActions` 或 `useCoreActions` 中统一拦截所有月数推进的时机调用 `tickStudy()`。

### 数据迁移（存档兼容）

- 旧存档没有 `systems['learning']` → `getLearningState()` 返回默认初始值
- 旧存档的已学功法/神通不做迁移，保持已学状态
- 旧存档的炼丹/炼器配方：`learnedRecipes` 和 `learnedSmithingRecipes` 初始化为空→**需做一次性迁移**：旧存档加载时，将当前注册表中所有配方 ID 全部加入已学列表（等同于"全部已学"），避免老玩家丢失配方

---

## UI 方案（@Designer）

### 新增界面/面板

| 元素 | 位置 | 内容 |
|------|------|------|
| **研读面板（LearningPanel）** | 右侧面板 tab（"📜 研读"） | 当前研读进度 + 背包中秘籍列表 |
| **研读进度条** | 研读面板顶部 | 显示当前研读目标名称、进度条、预计剩余月数 |
| **秘籍列表** | 研读面板中部 | 列出背包中所有 `category='scroll'` 的物品，点击可开始研读 |

### 面板布局

```
┌─────────────────────────────────────┐
│ 📜 研读                            │
├─────────────────────────────────────┤
│ ⏳ 正在研读：《太乙剑诀》           │
│ ████████░░░░ 6/12 月               │
│ 悟性加速：×1.5 | 预计剩余 4 月      │
│ [放弃研读]                          │
├─────────────────────────────────────┤
│ 📚 秘籍 / 卷轴（背包中）            │
│ ┌─────────────────────────────────┐ │
│ │ 📕 《烈焰掌》秘籍  [研读]      │ │
│ │ 功法・稀有・需 8 月             │ │
│ ├─────────────────────────────────┤ │
│ │ 📗 回春丹配方卷轴  [研读]       │ │
│ │ 炼丹配方・需 2 月              │ │
│ ├─────────────────────────────────┤ │
│ │ 📘 寒铁剑图纸  [研读]           │ │
│ │ 炼器配方・需 4 月              │ │
│ └─────────────────────────────────┘ │
│ 暂无秘籍，可通过探索、商店获取…     │
└─────────────────────────────────────┘
```

### 现有面板改造

1. **功法面板（TechniquePanel）**
   - 移除底部"📚 可学功法"区域
   - 只保留"📖 已学功法"区域
   - 在底部添加提示文字："可在商店购买功法秘籍，或通过探索获得"

2. **神通面板（DivineArtsPanel）**
   - 移除"📚 可学神通"区域
   - 只保留"🌟 已学神通"区域
   - 同上提示

3. **炼丹面板（AlchemyPanel）**
   - `getAllRecipes()` 改为只显示 `learnedRecipes` 中的配方
   - 底部添加提示文字

4. **炼器面板（SmithingPanel）**
   - `getAllSmithingRecipes()` 改为只显示 `learnedSmithingRecipes` 中的配方
   - 底部添加提示文字

### 交互

- 点击秘籍卡片的 **[研读]** 按钮 → 弹出确认（"开始研读《XX》，预计需要 N 个月"）→ 确认后消耗秘籍、开始研读
- 研读期间每次月数推进，进度条更新
- 研读完成时弹出 Toast 通知："恭喜！研读完成，习得《太乙剑诀》！"
- **[放弃研读]** → 确认弹窗（"放弃将丢失秘籍和进度，确定？"）→ 确认后清空

---

## 获取途径设计

秘籍/卷轴物品的获取途径（由 @Content 负责填充数据，此处列出设计意图）：

| 途径 | 实现方式 | 备注 |
|------|---------|------|
| **商店购买** | 在 `shop.json` 中将秘籍注册为商品 | 低阶秘籍在初始商店，高阶需高境界区域 |
| **探索掉落** | 在事件 `effect` 中 `addItem(p, scrollId, 1)` | 奇遇事件给高品质秘籍 |
| **战斗掉落** | 妖兽掉落表加入秘籍 | 通过区域 `lootTable` 或怪物专属掉落 |
| **NPC 赠送** | 对话奖励 / 好感度礼物 | NPC 达到一定好感度后赠送秘籍 |
| **任务奖励** | 任务链完成奖励 | 高难度任务链奖励高品质秘籍 |
| **秘境探索** | T0023 秘境系统 | 秘境专属秘籍掉落（后续） |

---

## 验证方式

### 基本流程测试
1. 新开游戏 → 功法面板只显示已学功法（应为空）→ 无可学功法区域
2. 商店中可看到功法秘籍 → 购买秘籍 → 秘籍出现在背包
3. 打开研读面板 → 看到背包中的秘籍列表 → 点击研读 → 研读进度开始
4. 执行修炼等操作推进月数 → 研读进度增长 → 满进度后自动学会功法
5. 功法面板中出现已学会的功法 → 可修炼/激活

### 边界条件测试
1. 已在研读中时点击另一个秘籍 → 提示"正在研读中，请先完成或放弃当前研读"
2. 放弃研读 → 秘籍不返还，进度清空
3. 研读已学会的功法/配方 → 提示"已习得"，不消耗秘籍
4. 悟性为 0 时研读月数 = 基础月数
5. 悟性为 100 时研读月数 = 基础月数 × 0.5

### 存档兼容测试
1. 旧存档加载 → 已学功法/神通保持不变 → 炼丹/炼器配方全部已学
2. 新存档 → 配方列表初始为空

### Debug 辅助验证
- Debug 面板新增"一键学习全部配方"按钮
- Debug 面板新增"完成当前研读"按钮
- Debug 面板物品列表新增秘籍类物品快速添加

---

## 调试面板需求

1. **DebugStatsTab**：新增"一键学习全部配方"按钮（将所有注册配方加入已学列表）
2. **DebugStatsTab**：新增"完成当前研读"按钮（跳过研读时间，立即完成）
3. **DebugItemsTab**：秘籍类物品在 Debug 物品列表中正常显示，可快速添加到背包

---

## 依赖关系

### 前置任务
- T0012 背包系统 ✅（秘籍是物品，需要背包）
- T0017 功法系统 ✅（研读功法秘籍后调用功法学习）
- T0020 神通系统 ✅（研读神通秘籍后调用神通学习）
- T0013 炼丹系统 ✅（配方需研读解锁）
- T0016 炼器系统 ✅（配方需研读解锁）
- T0015 商店系统 ✅（秘籍通过商店售卖）
- T0065 文案集中管理 ✅（新增文案文件）

### 后续任务
- T0076（待创建）学习小游戏 — 研读时可选择玩小游戏提升进度/成功率
- T0049 悟道顿悟系统 — 可考虑悟道事件加速当前研读进度

---

## 实现步骤拆分

### Phase 1：核心逻辑 + 数据结构

1. **T0075-A**：扩展 `types.ts`（`ItemCategory` + `ItemDef` 秘籍字段）
2. **T0075-B**：实现 `learning.ts`（核心逻辑：`startStudy/tickStudy/completeStudy/cancelStudy`）
3. **T0075-C**：新增 `src/data/texts/learning.ts` 文案
4. **T0075-D**：在 `items.json` 中添加所有功法/神通/配方/炼器配方对应的秘籍物品数据
5. **T0075-E**：修改 `player/create.ts`，`LearningSystemState` 初始化 + 存档兼容迁移

### Phase 2：面板改造

6. **T0075-F**：实现 `LearningPanel.tsx` + `LearningPanel.css`（研读面板）
7. **T0075-G**：修改 `TechniquePanel.tsx` — 移除可学功法区域
8. **T0075-H**：修改 `DivineArtsPanel.tsx` — 移除可学神通区域
9. **T0075-I**：修改 `AlchemyPanel.tsx` — 只显示已学配方
10. **T0075-J**：修改 `SmithingPanel.tsx` — 只显示已学配方

### Phase 3：Hook + 集成

11. **T0075-K**：修改 `useSystemActions.ts` — 新增 `startStudy/cancelStudy` action + 进度推进
12. **T0075-L**：修改 `useGameEngine.ts` — 暴露研读 action
13. **T0075-M**：修改 `RightPanel.tsx` — 新增研读 tab + 移除学习回调

### Phase 4：数据填充 + 调试

14. **T0075-N**：修改 `shop.json` — 商品改为秘籍/卷轴
15. **T0075-O**：修改 Debug 面板 — 新增研读相关调试功能
16. **T0075-P**：确保各获取途径（探索/战斗/事件）可掉落秘籍物品

### Phase 5（后续）：学习小游戏

17. 预留 `LearningMinigame` 接口 — 研读时可选择玩小游戏加速进度
18. 实现翻牌记忆等小游戏（独立任务 T0076）

---

## 风险与注意事项

1. **存档兼容**：旧存档加载后必须做一次性迁移，将所有已注册配方标记为已学，否则老玩家会丢失所有配方。功法/神通已有 `techniques[]` 和 `divineArts.learned` 管理，无需迁移。
2. **数据量**：每个功法/神通/配方都需对应一个秘籍物品 ItemDef，数据量会膨胀。建议 @Content 用命名规则统一管理，如 `core:scroll_technique_basic_sword`。
3. **初期体验**：新玩家开局无任何功法/配方，需确保初始商店或初始事件给予 1~2 个低阶秘籍，否则前期空窗期太长。建议新手引导赠送基础剑法秘籍。
4. **商店改造**：商店中原来卖的是普通物品/丹药/材料，现在需要增加秘籍类商品。秘籍价格应显著高于普通物品，提供获取感。
5. **研读中存档**：研读状态随 `player.systems['learning']` 自动存档，加载后恢复进度，无特殊处理。
