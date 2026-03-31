# T0057 — 任务链系统（Quest Chain）

- **状态**: ⬜ 未开始
- **分类**: 事件系统
- **前置**: T0007（事件引擎）, T0012（背包）, T0042（历法）, T0021（地图系统）
- **Spec**: —（待设计）

## 描述

通用的任务链系统，支持多步骤剧情、分支选择、条件触发、地点绑定和奖励发放。作为 DLC 的最高价值载体，让各小说流派（凡人流/苟道流/洪荒流等）能够通过 `registerDLC()` 挂载自己的故事线。

## 核心概念

### 1. 任务链结构

```
QuestChain（任务链）
  ├── QuestStep 1（第一步）
  │   ├── condition: 触发条件（境界/物品/属性/地点…）
  │   ├── location: 触发地点（绑定地图区域）
  │   ├── description: 剧情文段
  │   ├── choices: 玩家可选分支
  │   │   ├── Choice A → effects + nextStep
  │   │   └── Choice B → effects + nextStep
  │   └── rewards: 完成奖励
  ├── QuestStep 2 …
  └── QuestStep N（终点）
```

### 2. 地点绑定（核心设计要点）

**每个任务步骤可以绑定一个触发地点**，玩家必须处于该区域时才能触发/推进该步骤：

| 字段 | 说明 |
|------|------|
| `location` | 绑定的地图区域 ID（来自 T0021 地图系统） |
| `locationHint` | 提示文本，如"前往青云山脉寻找线索" |
| `anyLocation` | 为 `true` 时不限地点（少数通用任务） |

这样设计的好处：
- 任务链驱动玩家**探索地图**，而不是原地站桩完成所有剧情
- 不同区域有不同的任务链可触发，增加区域特色
- DLC 可以定义整条路线：坊市接任务 → 深山采药 → 秘境挑战 → 回城交付

### 3. 任务步骤类型（Step Types）

每个任务步骤有一个 `type` 字段，决定该步骤的完成方式和交互逻辑：

#### 🗡️ 战斗类

| 类型 | 说明 | 完成条件 | 示例 |
|------|------|---------|------|
| `kill` | 清怪任务 | 在指定区域击杀 N 只指定妖兽 | "清除矿洞中的 5 只石蝎" |
| `kill_boss` | 击杀 BOSS | 击杀指定强敌（唯一怪） | "击败矿洞守护者·石蝎王" |
| `survive` | 生存挑战 | 在指定区域存活 N 回合 | "在瘴气谷中坚持 10 回合" |
| `duel` | 与 NPC 切磋 | 挑战指定 NPC 并胜利 | "击败青云剑派·李师兄" |

#### 🔍 探索类

| 类型 | 说明 | 完成条件 | 示例 |
|------|------|---------|------|
| `goto` | 前往某地 | 到达指定区域 | "前往坊市" |
| `explore` | 区域探索 | 在指定区域探索 N 次 | "在灵矿深处探索 3 次" |
| `search` | 搜寻物品 | 在指定区域找到特定物品（概率触发） | "在废墟中搜寻古卷残页" |
| `escort` | 护送任务 | 护送目标从 A 地到 B 地（途中遇袭） | "护送药童穿越妖兽林" |

#### 🤝 社交类

| 类型 | 说明 | 完成条件 | 示例 |
|------|------|---------|------|
| `talk` | 对话 NPC | 与指定 NPC 交谈（触发剧情） | "与坊市老板打听消息" |
| `find_npc` | 寻人任务 | 在某区域找到指定 NPC | "在青云山找到失踪的师弟" |
| `gift` | 赠礼任务 | 将指定物品交给 NPC | "将灵芝交给药童" |
| `reputation` | 声望达标 | 与某势力好感度达到阈值 | "获得青云派信任（好感≥60）" |

#### 📦 收集类

| 类型 | 说明 | 完成条件 | 示例 |
|------|------|---------|------|
| `collect` | 收集物品 | 背包中持有 N 个指定物品 | "收集 10 株灵草" |
| `craft` | 制作物品 | 成功炼制指定丹药/装备 | "炼制一枚聚气丹" |
| `buy` | 购买物品 | 从商店购入指定物品 | "从坊市购入铁矿石×20" |

#### 📖 修炼类

| 类型 | 说明 | 完成条件 | 示例 |
|------|------|---------|------|
| `cultivate` | 修炼达标 | 修炼经验/境界达到要求 | "突破到筑基期" |
| `learn_technique` | 修炼功法 | 学会/升级指定功法 | "将《基础剑诀》修炼至 3 级" |
| `breakthrough` | 完成突破 | 成功突破一次 | "成功突破当前境界" |

#### 💬 剧情类

| 类型 | 说明 | 完成条件 | 示例 |
|------|------|---------|------|
| `dialogue` | 剧情对话 | 阅读剧情文段 + 做出选择 | "与神秘老者交谈，选择是否接受传承" |
| `cutscene` | 纯叙事 | 无交互，自动推进 | "你感受到一股强大的灵压从远处传来…" |
| `choice` | 抉择分支 | 从多个选项中选择，影响后续走向 | "救人 / 夺宝 / 离开" |
| `timer` | 限时等待 | 等待 N 个游戏月后自动推进 | "闭关修炼 3 个月后再来找我" |

#### 🔧 特殊类

| 类型 | 说明 | 完成条件 | 示例 |
|------|------|---------|------|
| `use_item` | 使用物品 | 在指定地点使用特定物品 | "在祭坛上使用血玉" |
| `equip` | 穿戴装备 | 装备指定物品 | "装上那把古剑再来见我" |
| `condition` | 条件检查 | 满足任意自定义条件 | "气运≥80 时天机自动显现" |
| `random_event` | 概率触发 | 在指定区域活动时有概率触发 | "在古林中有 15% 概率遇到隐士" |

### 4. 数据结构草案

```ts
// ---- 步骤类型枚举 ----
type QuestStepType =
  // 战斗类
  | 'kill' | 'kill_boss' | 'survive' | 'duel'
  // 探索类
  | 'goto' | 'explore' | 'search' | 'escort'
  // 社交类
  | 'talk' | 'find_npc' | 'gift' | 'reputation'
  // 收集类
  | 'collect' | 'craft' | 'buy'
  // 修炼类
  | 'cultivate' | 'learn_technique' | 'breakthrough'
  // 剧情类
  | 'dialogue' | 'cutscene' | 'choice' | 'timer'
  // 特殊类
  | 'use_item' | 'equip' | 'condition' | 'random_event';

// ---- 步骤目标（按类型填不同字段） ----
interface QuestObjective {
  // 战斗类
  targetMonsterId?: string;      // kill / kill_boss：目标妖兽 ID
  targetNpcId?: string;          // duel / talk / find_npc / gift / escort
  killCount?: number;            // kill：需击杀数量
  surviveRounds?: number;        // survive：存活回合

  // 收集类
  itemId?: string;               // collect / gift / buy / use_item / search
  itemCount?: number;            // 需要数量
  craftRecipeId?: string;        // craft：配方 ID

  // 修炼类
  minRealm?: number;             // cultivate：最低境界 index
  techniqueId?: string;          // learn_technique：功法 ID
  techniqueLevel?: number;       // learn_technique：最低等级

  // 社交类
  factionId?: string;            // reputation：势力 ID
  reputationMin?: number;        // reputation：最低好感度

  // 探索类
  exploreCount?: number;         // explore：探索次数
  escortDestination?: string;    // escort：护送目的地区域 ID

  // 特殊类
  waitMonths?: number;           // timer：等待月数
  triggerChance?: number;        // random_event：触发概率（0-1）
}

// ---- 任务链定义 ----
interface QuestChainDef {
  id: string;                    // 'core:mine_crisis'
  name: string;                  // '矿洞危机'
  description: string;
  category: 'main' | 'side' | 'hidden';
  repeatable: boolean;
  condition: JsonCondition;      // 整条链的解锁条件
  steps: QuestStepDef[];
}

// ---- 任务步骤定义 ----
interface QuestStepDef {
  id: string;
  name: string;
  description: string;
  type: QuestStepType;           // 步骤类型
  objective?: QuestObjective;    // 该类型的目标参数
  location?: string;             // 绑定地图区域 ID
  locationHint?: string;
  anyLocation?: boolean;
  condition?: JsonCondition;     // 额外前提条件
  autoAdvance?: boolean;         // 条件满足后自动推进（默认 false）
  choices?: QuestChoice[];       // dialogue / choice 类型使用
  nextStepId?: string;           // 默认后继步骤
  failStepId?: string;           // 失败时跳转的步骤（如超时/战败）
  rewards?: QuestReward;
  timeout?: number;              // 限时（游戏月数）
}

// ---- 选择分支 ----
interface QuestChoice {
  label: string;
  condition?: JsonCondition;
  effects: Record<string, EffectValue>;
  nextStepId: string | null;     // null = 任务终止
  message: string;
}

// ---- 任务奖励 ----
interface QuestReward {
  exp?: number;
  gold?: number;
  items?: { itemId: string; count: number }[];
  unlockQuest?: string;          // 解锁后续任务链
  reputation?: { factionId: string; value: number }; // 好感变化
}
```

### 5. 任务进度存储

```ts
// 存在 player.systems['questProgress'] 中
interface QuestProgress {
  activeQuests: Record<string, {
    currentStepId: string;
    startTime: { year: number; month: number };
    choiceHistory: string[];
    // 当前步骤的进度计数（kill/collect/explore 等类型用）
    stepProgress: {
      killCount?: number;        // 已击杀数
      collectCount?: number;     // 已收集数
      exploreCount?: number;     // 已探索次数
      surviveRounds?: number;    // 已存活回合
      waitedMonths?: number;     // 已等待月数
    };
  }>;
  completedQuests: string[];
  failedQuests: string[];
}
```

### 6. DLC 对接

```ts
// DLCPack 新增字段
interface DLCPack {
  // ...现有字段...
  questChains?: QuestChainDef[];
}

// stores.ts 新增
export const questChainRegistry = new Map<string, QuestChainDef>();
```

### 7. 示例：核心任务链（多类型步骤演示）

#### 示例 1：矿洞危机（战斗 + 探索 + 收集混合）

```json
{
  "id": "core:mine_crisis",
  "name": "矿洞危机",
  "description": "矿洞深处传来异响，似有妖兽作祟…",
  "category": "side",
  "repeatable": false,
  "condition": { "minRealm": 1 },
  "steps": [
    {
      "id": "goto_mine", "type": "goto",
      "name": "赶赴矿洞",
      "description": "坊市门口贴出告示：灵矿深处妖兽肆虐，急需修士前往清剿。",
      "location": "spirit_mine",
      "locationHint": "前往灵矿入口",
      "nextStepId": "clear_monsters"
    },
    {
      "id": "clear_monsters", "type": "kill",
      "name": "清剿石蝎",
      "description": "矿道中到处是石蝎的痕迹，必须将它们清除干净。",
      "location": "spirit_mine",
      "objective": { "targetMonsterId": "core:stone_scorpion", "killCount": 5 },
      "nextStepId": "explore_deep",
      "rewards": { "exp": 50 }
    },
    {
      "id": "explore_deep", "type": "explore",
      "name": "深入探查",
      "description": "石蝎已清，但深处似乎还有更强大的气息…",
      "location": "spirit_mine",
      "objective": { "exploreCount": 3 },
      "nextStepId": "boss_fight"
    },
    {
      "id": "boss_fight", "type": "kill_boss",
      "name": "击败石蝎王",
      "description": "矿洞最深处，一只巨大的石蝎王正在吞噬灵矿精华！",
      "location": "spirit_mine",
      "objective": { "targetMonsterId": "core:stone_scorpion_king" },
      "nextStepId": "collect_ore",
      "failStepId": "retreat",
      "rewards": { "exp": 200 }
    },
    {
      "id": "collect_ore", "type": "collect",
      "name": "采集灵矿",
      "description": "石蝎王已除，矿脉完好。顺手采些灵矿石回去交差。",
      "location": "spirit_mine",
      "objective": { "itemId": "core:spirit_ore", "itemCount": 10 },
      "nextStepId": "report_back"
    },
    {
      "id": "report_back", "type": "goto",
      "name": "回城复命",
      "description": "带着灵矿石回到坊市交付。",
      "location": "fangshi",
      "locationHint": "返回坊市",
      "rewards": { "gold": 500, "items": [{ "itemId": "core:return_scroll", "count": 2 }] }
    },
    {
      "id": "retreat", "type": "cutscene",
      "name": "仓皇撤退",
      "description": "石蝎王的实力远超预料，你不得不暂时撤退，下次再来挑战。",
      "anyLocation": true,
      "autoAdvance": true
    }
  ]
}
```

#### 示例 2：灵药之缘（社交 + 收集 + 剧情分支）

```json
{
  "id": "core:herb_fate",
  "name": "灵药之缘",
  "description": "偶遇一位神秘药童，由此踏上炼丹之路…",
  "category": "side",
  "repeatable": false,
  "condition": { "minRealm": 2, "minComprehension": 30 },
  "steps": [
    {
      "id": "meet_boy", "type": "random_event",
      "name": "偶遇药童",
      "description": "在山间采药时，有一定概率遇到一位满身药香的少年。",
      "location": "qingyun_mountain",
      "objective": { "triggerChance": 0.2 },
      "nextStepId": "talk_boy"
    },
    {
      "id": "talk_boy", "type": "choice",
      "name": "攀谈",
      "description": "少年看起来焦急万分，似乎遇到了什么麻烦。",
      "location": "qingyun_mountain",
      "choices": [
        { "label": "上前询问", "effects": { "mood": 5 }, "nextStepId": "gather_herbs", "message": "你主动上前，药童感激地向你求助…" },
        { "label": "视而不见", "effects": {}, "nextStepId": null, "message": "你径直走过，不欲多事。" }
      ]
    },
    {
      "id": "gather_herbs", "type": "collect",
      "name": "采集灵草",
      "description": "药童说师父急需百年灵芝入药，但深林中妖兽出没，他一个人不敢去。",
      "location": "deep_forest",
      "locationHint": "进入深林寻找灵芝",
      "objective": { "itemId": "core:spirit_herb", "itemCount": 3 },
      "nextStepId": "deliver_herbs"
    },
    {
      "id": "deliver_herbs", "type": "gift",
      "name": "交付灵草",
      "description": "将灵芝带回给药童。",
      "location": "qingyun_mountain",
      "locationHint": "返回青云山找药童",
      "objective": { "targetNpcId": "core:herb_boy", "itemId": "core:spirit_herb", "itemCount": 3 },
      "nextStepId": "learn_alchemy"
    },
    {
      "id": "learn_alchemy", "type": "craft",
      "name": "学以致用",
      "description": "药童的师父赠你一份丹方，让你尝试炼制聚气丹作为答谢。",
      "anyLocation": true,
      "objective": { "craftRecipeId": "core:juqi_pill" },
      "rewards": {
        "exp": 100,
        "items": [{ "itemId": "core:alchemy_furnace_basic", "count": 1 }],
        "unlockQuest": "core:herb_fate_ch2"
      }
    }
  ]
}
```

#### 示例 3：剑冢试炼（修炼 + 战斗 + 限时）

```json
{
  "id": "core:sword_tomb_trial",
  "name": "剑冢试炼",
  "description": "一处上古剑修遗迹，传闻其中封印着一柄绝世神剑…",
  "category": "hidden",
  "repeatable": false,
  "condition": { "minRealm": 5, "hasItem": "core:sword_tomb_key" },
  "steps": [
    {
      "id": "enter", "type": "use_item",
      "name": "开启剑冢",
      "description": "以剑冢钥匙开启封印大门。",
      "location": "sword_tomb",
      "objective": { "itemId": "core:sword_tomb_key" },
      "nextStepId": "survive_trial"
    },
    {
      "id": "survive_trial", "type": "survive",
      "name": "剑意洗礼",
      "description": "无数道剑意凭空出现，向你疯狂斩来！",
      "location": "sword_tomb",
      "objective": { "surviveRounds": 15 },
      "timeout": 1,
      "nextStepId": "duel_guardian",
      "failStepId": "expelled"
    },
    {
      "id": "duel_guardian", "type": "duel",
      "name": "挑战剑灵",
      "description": "一道残影凝聚成形——这是上古剑修的意志化身！",
      "location": "sword_tomb",
      "objective": { "targetNpcId": "core:sword_spirit" },
      "nextStepId": "obtain_sword",
      "failStepId": "expelled"
    },
    {
      "id": "obtain_sword", "type": "cutscene",
      "name": "得到神剑",
      "description": "剑灵化作一道流光没入古剑之中，神兵认主！",
      "location": "sword_tomb",
      "autoAdvance": true,
      "rewards": { "items": [{ "itemId": "core:ancient_divine_sword", "count": 1 }], "exp": 1000 }
    },
    {
      "id": "expelled", "type": "cutscene",
      "name": "被驱逐",
      "description": "一股不可抗拒的力量将你传送出剑冢，看来实力还不够…",
      "anyLocation": true,
      "autoAdvance": true
    }
  ]
}
```

### 8. 与现有系统的关系

- **事件系统（T0007）**：复用效果值解析（`EffectValue`）和条件谓词（`buildCondition`），不替代随机事件
- **地图系统（T0021）**：依赖地图提供区域 ID，任务步骤通过 `location` 字段绑定
- **NPC 系统（T0025）**：Phase 2 增强，可选绑定 NPC 作为任务发布者/ 交互对象
- **对话系统（T0026）**：Phase 2 增强，`description` 可升级为对话树

## 涉及文件（预估）

### 新增
| 文件 | 用途 |
|------|------|
| `src/game/quest.ts` | 任务链系统逻辑（推进/分支/奖励/超时） |
| `src/game/quest-loader.ts` | JSON 任务链数据加载器 |
| `src/data/core-quests.json` | 核心任务链数据（2~3 条示例） |
| `src/components/panels/QuestPanel.tsx` | 任务面板 UI |

### 修改
| 文件 | 改动 |
|------|------|
| `src/game/types.ts` | 新增 QuestChainDef 等类型 |
| `src/game/registry/stores.ts` | 新增 questChainRegistry |
| `src/game/registry/dlc.ts` | registerDLC 支持 questChains |

## 依赖关系

- **前置**: T0007 ✅, T0012 ✅, T0042 ✅, **T0021 ⬜（地图系统，阻塞中）**
- **Phase 2 增强**: T0025（NPC）, T0026（对话）
- **后续**: 各 DLC 任务链内容包
