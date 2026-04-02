# 设计文档：任务链系统（Quest Chain）

任务：T0057
日期：2026-04-02
Issue：https://github.com/szylover/xiuxian-game/issues/119

---

## 概述

任务链系统（Quest Chain）为修仙游戏引入**多步骤剧情任务**，是「内容包（Content Pack）」的核心前置系统。系统本身是**纯逻辑壳子**，不硬编码任何具体任务内容；所有任务链数据通过 `registerDLC()` 注册（包括 `core` 命名空间的初始任务链）。

### 为什么需要

- 当前游戏的叙事完全依赖随机事件，缺少**有序的剧情线索**
- 内容包（CP-01 凡人流、CP-02 苟道流等）需要用任务链驱动**连续剧情 + 阶段性目标**
- 任务链可与地图、背包、NPC、战斗、历法等已有系统深度联动，提升游戏深度

### 核心设计目标

1. **数据驱动**：任务链定义用 JSON（`core-quests.json`），配套 `quest-loader.ts` 转换为运行时对象
2. **DLC 扩展**：通过 `DLCPack.questChains` 注册，命名空间隔离（`core:quest_xxx` / `cp-01:quest_xxx`）
3. **与事件引擎联动**：任务步骤的推进可由事件触发，任务接取/完成也可触发事件
4. **文案集中管理**：所有中文文本放 `src/data/texts/quest.ts`

---

## 核心概念

### QuestChainDef — 任务链定义

一条任务链（Quest Chain）是由多个**步骤（QuestStep）**按顺序组成的线性任务序列。
每个步骤有独立的目标描述、完成条件、步骤奖励，整条链完成后有额外的链级奖励。

### QuestStep — 任务步骤

每个步骤描述一个具体目标（例如：击杀某妖兽、收集某物品、前往某区域、达到某境界等）。
步骤必须**按顺序**完成，不支持跳步。

### 触发条件 vs 完成条件

- **触发条件（`condition`）**：任务链出现在「可接取」列表中的前提（境界、区域、好感度、已完成的前置任务链等）
- **完成条件（`objective`）**：每个步骤的具体完成目标

### 奖励

- **步骤奖励（`stepRewards`）**：每完成一个步骤立即发放
- **链级奖励（`chainRewards`）**：最后一步完成后额外发放

---

## 数据结构

### TypeScript 类型定义

```ts
// ── src/game/types.ts 新增 ──

// ── 任务链目标类型 ──

export type QuestObjectiveType =
  | 'kill_monster'      // 击杀指定妖兽
  | 'collect_item'      // 收集指定物品（背包中持有）
  | 'deliver_item'      // 交付物品（从背包扣除）
  | 'reach_region'      // 到达指定区域
  | 'reach_realm'       // 达到指定境界
  | 'talk_npc'          // 与 NPC 交互（预留，T0026 对话系统后生效）
  | 'craft_item'        // 炼制物品（炼丹/炼器）
  | 'explore_count'     // 探索 N 次
  | 'cultivate_count'   // 修炼 N 次
  | 'combat_count'      // 战斗 N 次
  | 'survive_months'    // 存活 N 个月
  | 'custom';           // 自定义条件（DLC 扩展用，谓词函数）

/** 任务目标定义 */
export interface QuestObjective {
  type: QuestObjectiveType;
  // ── 按 type 使用不同字段 ──
  targetId?: string;                    // kill_monster: monsterId / collect/deliver_item: itemId
                                        // reach_region: regionId / talk_npc: npcId / craft_item: recipeId
  count?: number;                       // 需要的数量（次数/个数），默认 1
  description: string;                  // 目标描述（展示给玩家的中文文本，loader 从 JSON 读取）
  minRealmIndex?: number;               // reach_realm 专用：目标境界
  customCheck?: (p: Player) => boolean; // custom 类型专用（JSON 不使用，仅 TS DLC 扩展）
}

/** 任务奖励 */
export interface QuestReward {
  exp?: number;
  gold?: number;
  items?: { itemId: string; count: number }[];
  statBonus?: Partial<Record<'atk' | 'def' | 'hp' | 'mp' | 'luck' | 'comprehension', number>>;
  affinityChange?: { npcId: string; delta: number }[];  // NPC 好感度变化
}

/** 任务步骤定义 */
export interface QuestStep {
  id: string;                           // 步骤 ID（链内唯一），如 'step_1'
  name: string;                         // 步骤名称
  description: string;                  // 步骤描述（日志/面板显示）
  objectives: QuestObjective[];         // 该步骤的所有目标（全部完成才算步骤完成）
  rewards?: QuestReward;                // 步骤完成奖励（可选）
  onStartEventId?: string;             // 步骤开始时触发的事件 ID（可选）
  onCompleteEventId?: string;          // 步骤完成时触发的事件 ID（可选）
  dialogueSnippet?: string;            // 步骤开始时显示的对话/叙述文本
  timeLimit?: number;                   // 时限（月），超时则任务失败（0 或不设 = 无时限）
}

/** 任务链接取条件（JSON 友好） */
export interface QuestChainCondition {
  minRealm?: number;
  maxRealm?: number;
  minAge?: number;                      // 最小年龄（月）
  regionId?: string;                    // 必须在指定区域
  regionTags?: string[];                // 必须在含指定标签的区域
  requiredQuests?: string[];            // 前置任务链 ID（必须已完成）
  requiredItems?: { itemId: string; count: number }[]; // 背包中持有
  npcAffinity?: { npcId: string; min: number }[];      // NPC 好感度门槛
  custom?: (p: Player) => boolean;      // 自定义条件（仅 TS DLC 扩展使用）
}

/** 任务链定义 */
export interface QuestChainDef {
  id: string;                           // 命名空间 ID，如 'core:quest_first_hunt'
  name: string;                         // 任务链名称
  description: string;                  // 任务链简介
  icon?: string;                        // 显示用 emoji
  category: QuestChainCategory;         // 分类
  condition?: QuestChainCondition;      // 接取条件
  steps: QuestStep[];                   // 步骤列表（按顺序执行）
  rewards: QuestReward;                 // 链级完成奖励
  repeatable?: boolean;                 // 是否可重复接取（默认 false）
  autoAccept?: boolean;                 // 满足条件时自动接取（默认 false，需玩家手动）
  failOnDeath?: boolean;               // 死亡时是否自动失败（默认 false）
  onCompleteEventId?: string;          // 整条链完成时触发的事件 ID
  maxConcurrent?: number;              // 同时可接取的同类任务数限制（预留）
}

/** 任务链分类 */
export type QuestChainCategory =
  | 'main'          // 主线任务
  | 'side'          // 支线任务
  | 'daily'         // 每日任务（repeatable=true）
  | 'event';        // 限时活动任务（预留）
```

### 玩家状态扩展

```ts
// ── player.systems['quest'] 存储的运行时状态 ──

/** 单个目标的进度 */
export interface QuestObjectiveProgress {
  objectiveIndex: number;              // 对应 step.objectives 的索引
  currentCount: number;                // 当前完成计数
  completed: boolean;                  // 是否已完成
}

/** 单条任务链的运行时进度 */
export interface QuestChainProgress {
  questId: string;                     // 任务链 ID
  status: QuestStatus;                 // 当前状态
  currentStepIndex: number;            // 当前步骤索引（0 起步）
  objectiveProgress: QuestObjectiveProgress[]; // 当前步骤各目标进度
  acceptedAt: number;                  // 接取时的 player.age（月）
  stepStartedAt: number;               // 当前步骤开始时的 player.age
  completedSteps: number[];            // 已完成步骤的索引列表
}

export type QuestStatus =
  | 'active'       // 进行中
  | 'completed'    // 已完成
  | 'failed'       // 已失败
  | 'abandoned';   // 已放弃

/** 任务系统总状态（存储在 player.systems['quest']） */
export interface QuestSystemState {
  activeQuests: Record<string, QuestChainProgress>;   // 进行中的任务 (questId → progress)
  completedQuests: Record<string, {                   // 已完成任务记录
    questId: string;
    completedAt: number;                              // 完成时 age
    repeatCount: number;                              // 完成次数（可重复任务用）
  }>;
  failedQuests: Record<string, {                      // 已失败任务记录
    questId: string;
    failedAt: number;
    reason: string;
  }>;
  abandonedQuests: string[];                           // 已放弃任务 ID 列表
  /** 行为计数器（用于 explore_count / cultivate_count / combat_count 目标追踪） */
  actionCounters: {
    explore: number;
    cultivate: number;
    combat: number;
  };
}
```

---

## 系统逻辑设计

### 1. 任务发现与接取

**流程：**
1. 玩家打开「任务面板」或执行行动（探索/修炼）时，系统扫描注册表中所有 `QuestChainDef`
2. 过滤出满足 `condition` 且未在 `activeQuests` / `completedQuests`（非 repeatable）中的任务链
3. `autoAccept=true` 的任务自动接取并写入 `activeQuests`；其余显示在「可接取」列表
4. 玩家点击「接受」按钮 → 调用 `acceptQuest(player, questId)` → 初始化进度 → 日志提示

**条件检查函数（quest.ts 中实现）：**

```pseudo
function checkQuestCondition(player, condition):
  if condition.minRealm && player.realmIndex < condition.minRealm → false
  if condition.regionId && 当前区域 !== condition.regionId → false
  if condition.requiredQuests → 检查 completedQuests 是否包含所有前置
  if condition.requiredItems → 检查 inventory 是否持有足够数量
  if condition.npcAffinity → 检查 NPC 好感度是否达标
  return true
```

### 2. 目标追踪与推进

**推进机制：**
任务目标的推进不用 `setInterval` 轮询，而是**事件驱动**——在对应的游戏行为发生时调用钩子检查。

| 目标类型 | 触发点 | 检查方式 |
|----------|--------|----------|
| `kill_monster` | 战斗胜利后（`useCoreActions.combat`） | 检查击败的 monsterId 是否匹配，+1 |
| `collect_item` | 任何 `addItem` 后、检查任务面板时 | 检查背包中 itemId 数量 ≥ count |
| `deliver_item` | 玩家点击「交付」按钮时 | 从背包扣除物品，标记完成 |
| `reach_region` | `travelTo` 后 | 检查当前区域 ID |
| `reach_realm` | 突破成功后 | 检查 realmIndex ≥ minRealmIndex |
| `talk_npc` | `meetNpc` 后 | 检查交互的 npcId |
| `craft_item` | 炼丹/炼器成功后 | 检查 recipeId 或产出 itemId |
| `explore_count` | 探索执行后 | actionCounters.explore 增量对比 |
| `cultivate_count` | 修炼执行后 | actionCounters.cultivate 增量对比 |
| `combat_count` | 战斗执行后 | actionCounters.combat 增量对比 |
| `survive_months` | advanceTime 后 | player.age - stepStartedAt ≥ count |
| `custom` | 每次行动后 | 调用 customCheck(player) |

**核心推进函数：**

```pseudo
function tickQuestObjectives(player, trigger: QuestTrigger):
  state = getQuestState(player)
  for each (questId, progress) in state.activeQuests:
    if progress.status !== 'active' → skip
    def = getQuestChainDef(questId)
    step = def.steps[progress.currentStepIndex]
    updated = false

    for each (i, objective) in step.objectives:
      if progress.objectiveProgress[i].completed → skip
      if matchesTrigger(objective, trigger):
        progress.objectiveProgress[i].currentCount += getDelta(objective, trigger)
        if currentCount >= objective.count:
          progress.objectiveProgress[i].completed = true
          updated = true

    // 检查步骤是否全部完成
    if allObjectivesCompleted(progress):
      applyStepRewards(player, step.rewards)
      advanceToNextStep(player, progress, def)

  return player
```

### 3. 步骤完成与推进

当一个步骤的所有目标完成时：
1. 发放步骤奖励（`step.rewards`）
2. 触发 `step.onCompleteEventId`（如有）
3. 推进到下一步骤（`currentStepIndex++`），重置 `objectiveProgress`
4. 触发下一步骤的 `onStartEventId` 和 `dialogueSnippet`
5. 若已是最后一步 → 进入「任务完成」流程

### 4. 任务完成

1. 发放链级奖励（`chainRewards`）
2. 触发 `onCompleteEventId`（如有）
3. 将进度从 `activeQuests` 移至 `completedQuests`
4. 写日志 + Toast 通知
5. 检查是否有新任务链因此前置被满足 → 提示「新任务可接取」

### 5. 任务失败

触发条件：
- 超时：`step.timeLimit > 0 && player.age - stepStartedAt > timeLimit`（在 `advanceTime` 中检查）
- 死亡：`failOnDeath=true` 且玩家死亡
- 手动放弃

失败后：
1. 移至 `failedQuests`，记录原因
2. 写日志通知
3. 不可重试（除非 `repeatable=true`，则可重新接取）

### 6. 任务放弃

玩家在任务面板点击「放弃」按钮 → 确认弹窗 → 移至 `abandonedQuests` → 写日志。
`repeatable` 或部分任务可重新接取。

---

## 与现有系统集成

### 事件引擎联动（T0007）

- 任务步骤的 `onStartEventId` / `onCompleteEventId` 调用 `triggerEvent(eventId, player)` 执行
- `QuestChainDef.onCompleteEventId` 可触发特殊奇遇事件

### 地图区域限制（T0021）

- `QuestChainCondition.regionId` / `regionTags`：限制接取区域
- `QuestObjective.type === 'reach_region'`：前往指定区域目标

### 背包物品需求/奖励（T0012）

- `collect_item`：检查 `hasItem(player, itemId, count)`
- `deliver_item`：调用 `removeItem(player, itemId, count)` 扣除
- 奖励中的 `items` 调用 `addItem(player, itemId, count)`

### NPC 系统（T0025）

- `talk_npc` 目标：与 `meetNpc` 集成
- `npcAffinity` 条件：读取 NPC 关系状态
- `affinityChange` 奖励：调用 `changeAffinity`

### 年月历法（T0042）

- 超时检查使用 `player.age`（月数）
- `survive_months` 目标基于 `player.age - stepStartedAt`

### 战斗系统（T0003）

- `kill_monster` 目标：在战斗胜利回调中推进
- `combat_count`：战斗次数计数

### 瓶颈系统联动（T0064）

- `BottleneckUnlockMethod.type === 'quest'` 已预留 `questId` 字段
- 完成特定任务可解锁瓶颈：任务完成时调用 `tryQuestUnlock(player, questId)`

---

## DLC 扩展性

### 注册机制

```ts
// DLCPack 新增字段（已在 roadmap.md 扩展性约定中预定义）
interface DLCPack {
  // ... 已有字段 ...
  questChains?: QuestChainDef[];   // T0057 新增
}

// registerDLC 中追加：
if (pack.questChains) for (const qc of pack.questChains) questChainRegistry.set(qc.id, qc);
```

### 注册表扩展

```ts
// registry/stores.ts 新增
export const questChainRegistry = new Map<string, QuestChainDef>();

// registry/queries.ts 新增
export function getQuestChainDef(id: string): QuestChainDef | undefined;
export function getAllQuestChainDefs(): QuestChainDef[];
export function getQuestChainsByCategory(category: QuestChainCategory): QuestChainDef[];
```

### 命名空间示例

| DLC | 命名空间 | ID 示例 |
|-----|----------|---------|
| 核心 | `core` | `core:quest_first_hunt`、`core:quest_gather_herbs` |
| CP-01 凡人流 | `cp-01` | `cp-01:quest_village_defense`、`cp-01:quest_mortal_oath` |
| CP-02 苟道流 | `cp-02` | `cp-02:quest_low_key_cultivation` |

---

## JSON 数据格式

### core-quests.json 示例

```json
[
  {
    "id": "core:quest_first_hunt",
    "name": "初次历练",
    "description": "前辈吩咐你去青云镇外斩杀几只野狼，锻炼实战能力。",
    "icon": "⚔️",
    "category": "main",
    "condition": {
      "minRealm": 0,
      "regionTags": ["beginner"]
    },
    "steps": [
      {
        "id": "step_1",
        "name": "前往野外",
        "description": "动身前往青云镇外的荒野地带。",
        "objectives": [
          {
            "type": "reach_region",
            "targetId": "core:wilderness",
            "description": "前往荒野"
          }
        ],
        "dialogueSnippet": "前辈语重心长道：「修仙之路非纸上谈兵，去荒野走走吧。」"
      },
      {
        "id": "step_2",
        "name": "斩杀野狼",
        "description": "在荒野中斩杀 3 只野狼。",
        "objectives": [
          {
            "type": "kill_monster",
            "targetId": "core:wild_wolf",
            "count": 3,
            "description": "斩杀野狼 (0/3)"
          }
        ],
        "rewards": {
          "exp": 50,
          "gold": 30
        }
      },
      {
        "id": "step_3",
        "name": "回城复命",
        "description": "返回青云镇向前辈复命。",
        "objectives": [
          {
            "type": "reach_region",
            "targetId": "core:qingyun_town",
            "description": "返回青云镇"
          }
        ],
        "dialogueSnippet": "前辈满意地点头：「不错，果然有几分修行的天赋。」"
      }
    ],
    "rewards": {
      "exp": 100,
      "gold": 50,
      "items": [
        { "itemId": "core:hp_pill", "count": 5 }
      ]
    },
    "autoAccept": true,
    "repeatable": false
  },
  {
    "id": "core:quest_gather_herbs",
    "name": "采药基础",
    "description": "收集灵芝和雪莲，了解炼丹的入门材料。",
    "icon": "🌿",
    "category": "side",
    "condition": {
      "minRealm": 1,
      "requiredQuests": ["core:quest_first_hunt"]
    },
    "steps": [
      {
        "id": "step_1",
        "name": "收集灵芝",
        "description": "在探索中收集 3 株灵芝。",
        "objectives": [
          {
            "type": "collect_item",
            "targetId": "core:herb_lingzhi",
            "count": 3,
            "description": "收集灵芝 (0/3)"
          }
        ]
      },
      {
        "id": "step_2",
        "name": "收集雪莲",
        "description": "收集 2 株雪莲。比灵芝更稀少，需要一些运气。",
        "objectives": [
          {
            "type": "collect_item",
            "targetId": "core:herb_snow_lotus",
            "count": 2,
            "description": "收集雪莲 (0/2)"
          }
        ],
        "rewards": {
          "exp": 30
        }
      }
    ],
    "rewards": {
      "exp": 80,
      "gold": 40,
      "items": [
        { "itemId": "core:hp_pill", "count": 3 }
      ]
    }
  }
]
```

### quest-loader.ts

`quest-loader.ts` 负责将 JSON 纯数据转换为运行时 `QuestChainDef` 对象，主要工作：

1. 解析 `condition` 字段 → 构建条件谓词函数（与 `event-loader.ts` 的 `buildCondition` 类似）
2. JSON 中不包含 `customCheck` / `custom` 函数，这些仅由 TS DLC 扩展使用
3. 校验数据完整性（steps 非空、objective type 合法等）

```pseudo
function loadQuestsFromJson(jsonQuests: JsonQuestChain[]): QuestChainDef[]
  for each json in jsonQuests:
    // 1. 解析 condition → 条件谓词
    // 2. 保持 steps/objectives 结构不变（纯数据，运行时通过 type 判断）
    // 3. 返回 QuestChainDef[]
```

---

## UI 设计

### 新增面板：任务面板（QuestPanel.tsx）

位于右侧面板区域（`src/components/panels/QuestPanel.tsx`），通过 PanelButtons 中新增「任务」按钮切换。

#### 面板结构

```
┌─────────────────────────────────────┐
│ 📜 任务        [标签栏]              │
│  进行中 | 可接取 | 已完成             │
├─────────────────────────────────────┤
│                                     │
│ 「进行中」标签：                       │
│ ┌─────────────────────────────────┐ │
│ │ ⚔️ 初次历练 [主线]               │ │
│ │   步骤 2/3：斩杀野狼             │ │
│ │   ▸ 斩杀野狼 (2/3) ██████░░ 66% │ │
│ │   [追踪] [放弃]                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 「可接取」标签：                       │
│ ┌─────────────────────────────────┐ │
│ │ 🌿 采药基础 [支线]               │ │
│ │   收集灵芝和雪莲，了解炼丹材料     │ │
│ │   奖励：80 修为 · 40 灵石          │ │
│ │   [接受]                         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 「已完成」标签：                       │
│ ┌─────────────────────────────────┐ │
│ │ ✅ 初次历练                       │ │
│ │   完成于 第3年6月                 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### 子组件拆分

| 组件 | 文件 | 用途 |
|------|------|------|
| `QuestPanel` | `panels/QuestPanel.tsx` | 面板入口 + 标签切换 |
| `QuestCard` | `panels/quest/QuestCard.tsx` | 单条任务链卡片 |
| `QuestObjectiveRow` | `panels/quest/QuestObjectiveRow.tsx` | 单条目标进度行 |
| `QuestRewardPreview` | `panels/quest/QuestRewardPreview.tsx` | 奖励预览 |

### 任务追踪指示器

在左侧面板（`LeftPanel.tsx`）底部或状态栏中，显示**当前追踪的任务**摘要：

```
────────────────
📜 追踪：初次历练
   斩杀野狼 (2/3)
────────────────
```

这是一个小型悬浮组件 `QuestTracker`，只显示当前标记为「追踪」的一条任务的当前步骤目标。

### 交互设计

| 操作 | 触发 | 效果 |
|------|------|------|
| 接受任务 | 点击「可接取」列表中的「接受」按钮 | 任务进入「进行中」，日志提示 |
| 追踪任务 | 点击「进行中」列表中的「追踪」按钮 | 该任务显示在追踪指示器，同时只能追踪一条 |
| 放弃任务 | 点击「放弃」按钮 → 确认弹窗 | 任务移至放弃列表 |
| 交付物品 | 在 `deliver_item` 目标旁显示「交付」按钮 | 扣除物品，推进目标 |
| 查看已完成 | 切换到「已完成」标签 | 展示历史完成记录 |

---

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键类/函数 |
|------|------|-------------|
| `src/game/quest.ts` | 任务链系统核心逻辑 | `acceptQuest`, `abandonQuest`, `tickQuestObjectives`, `checkQuestTimeouts`, `getAvailableQuests`, `getQuestState` |
| `src/game/quest-loader.ts` | JSON → QuestChainDef 转换器 | `loadQuestsFromJson` |
| `src/data/core-quests.json` | 核心任务链数据（3~5 条初始任务） | — |
| `src/data/texts/quest.ts` | 任务系统中文文案 | `QUEST_TEXTS` |
| `src/components/panels/QuestPanel.tsx` | 任务面板 | — |
| `src/components/panels/quest/QuestCard.tsx` | 任务卡片组件 | — |
| `src/components/panels/quest/QuestObjectiveRow.tsx` | 目标进度行 | — |
| `src/components/panels/quest/QuestRewardPreview.tsx` | 奖励预览 | — |
| `src/components/panels/quest/QuestTracker.tsx` | 追踪指示器 | — |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | 新增 QuestChainDef / QuestStep / QuestObjective / QuestReward 等类型 | 类型定义 |
| `src/game/registry/stores.ts` | 新增 `questChainRegistry` Map | 注册表 |
| `src/game/registry/dlc.ts` | `registerDLC` / `unregisterDLC` 新增 `questChains` 处理 | DLC 注册 |
| `src/game/registry/queries.ts` | 新增查询 API | 查询 |
| `src/game/registry/index.ts` | re-export 新增类型和 API | barrel |
| `src/game/events.ts` | `registerCoreEvents` 中加载 core-quests.json 并注册 | 核心数据加载 |
| `src/hooks/useCoreActions.ts` | 在 cultivate/combat/explore 成功后调用 `tickQuestObjectives` | 目标推进 |
| `src/hooks/useSystemActions.ts` | 在炼丹/炼器/移动/NPC 交互后调用 `tickQuestObjectives`；新增 `acceptQuest` / `abandonQuest` | 任务操作 |
| `src/hooks/useGameEngine.ts` | advanceTime 中调用 `checkQuestTimeouts`；新增 quest 相关 action 暴露 | 超时检测 |
| `src/components/layout/PanelButtons.tsx` 或相关 | 新增「任务」面板按钮 | UI 入口 |
| `src/components/layout/RightPanel.tsx` | 新增 QuestPanel 渲染 | 面板容器 |
| `src/components/layout/LeftPanel.tsx` | 添加 QuestTracker 组件 | 追踪显示 |
| `src/data/texts/index.ts` | re-export QUEST_TEXTS | 文案 barrel |
| `src/game/bottleneck.ts` | `tryQuestUnlock` 函数：完成任务时检查是否解锁瓶颈 | 瓶颈联动 |

### 核心函数签名

```pseudo
// quest.ts

// 状态读写
getQuestState(player: Player): QuestSystemState
setQuestState(player: Player, state: QuestSystemState): Player

// 查询
getAvailableQuests(player: Player): QuestChainDef[]         // 满足条件 + 未接取/未完成
getActiveQuests(player: Player): QuestChainProgress[]       // 进行中
getCompletedQuests(player: Player): string[]                // 已完成 IDs

// 操作
acceptQuest(player: Player, questId: string): { player: Player; message: string }
abandonQuest(player: Player, questId: string): { player: Player; message: string }
deliverQuestItem(player: Player, questId: string, objectiveIndex: number): { player: Player; message: string }

// 推进（各系统调用）
type QuestTrigger =
  | { type: 'kill_monster'; monsterId: string }
  | { type: 'reach_region'; regionId: string }
  | { type: 'reach_realm'; realmIndex: number }
  | { type: 'talk_npc'; npcId: string }
  | { type: 'craft_item'; recipeId: string; outputItemId: string }
  | { type: 'explore' }
  | { type: 'cultivate' }
  | { type: 'combat' }
  | { type: 'time_tick' }             // advanceTime 时触发
  | { type: 'item_change' }           // 背包变化时触发
  | { type: 'quest_complete'; questId: string }  // 任务完成时检查前置

tickQuestObjectives(player: Player, trigger: QuestTrigger): { player: Player; logs: string[] }
checkQuestTimeouts(player: Player): { player: Player; logs: string[] }

// 自动接取检查（每次行动后调用）
checkAutoAcceptQuests(player: Player): { player: Player; logs: string[] }
```

---

## 调试面板支持

在 `src/components/debug/` 中新增调试功能：

| 功能 | 操作 | 说明 |
|------|------|------|
| 接取任务 | 下拉选择任务链 + 「强制接取」按钮 | 无视条件直接接取 |
| 完成当前步骤 | 「跳过步骤」按钮 | 直接完成当前步骤所有目标并推进 |
| 完成整条链 | 「完成任务」按钮 | 直接完成所有步骤并发放奖励 |
| 重置任务 | 「重置任务」按钮 | 清除某条任务的进度记录 |
| 查看状态 | 显示当前 quest 系统状态 JSON | 调试用 |
| 清空全部 | 「清空任务数据」按钮 | 重置整个 QuestSystemState |

---

## 验证方式

### 测试用例（初稿，将写入 test-guide.md）

#### 13.1 任务接取

1. **新游戏后可接取初始任务**：新建角色 → 打开任务面板 → 「可接取」列表应显示 `core:quest_first_hunt`（autoAccept=true 的任务应自动出现在「进行中」）
2. **条件不满足时不可接取**：Debug 设置境界为 0 → `core:quest_gather_herbs`（要求 minRealm=1 + 前置任务）不应出现
3. **前置任务检查**：完成 `core:quest_first_hunt` 后 → 提升境界到 1 → `core:quest_gather_herbs` 应出现在可接取列表
4. **接取确认**：点击「接受」→ 任务移至「进行中」，日志显示接取消息

#### 13.2 目标推进

5. **击杀计数**：接取含 kill_monster 目标的任务 → 战斗胜利击杀目标妖兽 → 目标面板计数 +1
6. **物品收集**：接取含 collect_item 目标的任务 → 通过探索/商店获得目标物品 → 达到数量后目标自动完成
7. **区域到达**：接取含 reach_region 目标的任务 → 移动到目标区域 → 目标标记完成
8. **步骤推进**：步骤所有目标完成 → 自动推进到下一步骤，发放步骤奖励

#### 13.3 完成与失败

9. **任务完成**：最后一步完成 → 发放链级奖励，任务移至「已完成」，日志+Toast 通知
10. **超时失败**：设定含时限的步骤 → Debug 推进时间超过时限 → 任务标记为失败
11. **放弃任务**：点击「放弃」→ 确认 → 任务移至放弃列表
12. **已完成不可重复接取**：非 repeatable 任务完成后不应出现在可接取列表

#### 13.4 调试面板

13. **强制接取**：Debug 面板中选择任务 → 点击「强制接取」→ 无视条件直接接取
14. **跳过步骤**：Debug「跳过步骤」→ 当前步骤立即完成并推进
15. **完成任务**：Debug「完成任务」→ 整条链直接完成并发放奖励

---

## 实现计划

### Phase 1：基础框架（最小可用）

1. 类型定义（types.ts）
2. 注册表扩展（stores.ts / dlc.ts / queries.ts / index.ts）
3. quest-loader.ts（JSON 加载器）
4. quest.ts 核心逻辑（接取 / 放弃 / 推进 / 完成 / 失败）
5. core-quests.json（3 条初始任务链）
6. texts/quest.ts（文案）
7. events.ts 中加载 core-quests.json

### Phase 2：目标推进集成

8. useCoreActions.ts 集成（cultivate / combat / explore 后调用 tickQuestObjectives）
9. useSystemActions.ts 集成（炼丹 / 炼器 / 移动 / NPC 后触发）
10. useGameEngine.ts 中 advanceTime 集成超时检查 + 自动接取

### Phase 3：UI

11. QuestPanel.tsx + 子组件
12. PanelButtons / RightPanel 新增面板入口
13. QuestTracker 追踪指示器
14. LeftPanel 集成追踪

### Phase 4：调试 & 瓶颈联动

15. Debug 面板新增任务 Tab
16. bottleneck.ts 中 `tryQuestUnlock` 实现

---

## 依赖关系

### 前置任务（全部已完成 ✅）

| ID | 任务 | 状态 |
|----|------|------|
| T0007 | 事件引擎 | ✅ |
| T0012 | 背包系统 | ✅ |
| T0042 | 年月历法 | ✅ |
| T0021 | 地图系统 | ✅ |

### 后续任务（依赖 T0057）

| ID | 任务 | 说明 |
|----|------|------|
| CP-01 | 凡人修仙（内容包） | 需要任务链系统承载剧情 |
| CP-02 | 苟道求真（内容包） | 同上 |
| T0054 | 历练悬赏任务 | 可复用任务链框架（repeatable=true） |

### 可选集成（不阻塞，后续增强）

| ID | 集成点 | 说明 |
|----|--------|------|
| T0026 | 对话系统 | `talk_npc` 目标完整支持 |
| T0025 | NPC 系统 | `npcAffinity` 条件 & `affinityChange` 奖励 |
| T0064 | 瓶颈系统 | `quest` 类型瓶颈解锁 |
