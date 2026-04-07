# 设计文档：程序化事件生成引擎（模板 + 变量词库）

任务：T0070
日期：2026-04-07
Issue：#181

## 概述

当前游戏的所有事件（ `core:find_ore`、`core:elder_advice` 等）都是完整硬写在 `events.json` 中的固定条目。随着游戏体量增长，手写事件数量有限，玩家很快会重复看到相同文本。

本任务引入**程序化事件生成引擎**：用 300+ 个事件模板 × 多维度变量词库（地名、人物、物品、数量…），在运行时按需组合生成 50,000+ 种不重复事件文本和效果。生成过程使用确定性 Seed，确保存档可还原。

核心思路：模板定义事件骨架（分类、基础权重、效果公式），变量词库定义可替换片段（名字、描述、数值范围），生成器在触发时实时组合并缓存。

## 数据结构

### 事件模板（EventTemplate）

```ts
interface EventTemplate {
  id: string;                         // 'core:tpl_find_resource'
  category: EventCategory;            // explore / adventure / daily
  tone: EventTone;                    // good / bad / neutral
  weight: number;                     // 基础权重
  namePattern: string;                // '发现{resource}'
  messagePattern: string;             // '{emoji} 在{location}发现一处{resource}，获得 {amount} {unit}！'
  effectsPattern: Record<string, string>; // { "gold": "{amount}" } — 值为变量引用或固定值
  condition?: JsonEventCondition;     // 同现有事件条件
  once?: boolean;
  cooldown?: number;
  regionTags?: string[];
  variableSlots: string[];            // 该模板需要的变量名列表: ['resource', 'emoji', 'location', 'amount', 'unit']
  varConstraints?: Record<string, VarConstraint>; // 变量约束（可选）
}

interface VarConstraint {
  pool?: string;                      // 指定从哪个词库池抽取
  minRealm?: number;                  // 最低境界才出现此变量组合
  maxRealm?: number;
  linkedTo?: string;                  // 与另一个变量联动（如 resource→emoji 联动）
}
```

### 变量词库（VariablePool）

```ts
interface VariableEntry {
  value: string;                      // 替换值，如 '灵石矿'
  linkedValues?: Record<string, string>; // 联动值: { emoji: '💎', unit: '灵石' }
  weight?: number;                    // 抽取权重（默认 1）
  minRealm?: number;                  // 境界门槛
  maxRealm?: number;
  regionTags?: string[];              // 区域限制
}

interface VariablePool {
  id: string;                         // 'core:pool_resources'
  namespace: string;                  // 'core'
  variable: string;                   // 变量名 'resource'
  entries: VariableEntry[];
}
```

### 生成结果（GeneratedEvent）

生成后的事件完全兼容现有 `GameEvent` 接口，可直接进入事件引擎：

```ts
// 生成器输出标准 GameEvent，id 格式: 'proc:<template_id>:<seed_hash>'
// 例: 'proc:core:tpl_find_resource:a3f7b2'
```

### 种子管理

```ts
interface ProceduralEventState {
  masterSeed: number;                 // 主种子（新游戏时随机生成）
  eventCounter: number;               // 已生成事件计数（用于派生子种子）
  generatedCache: Map<string, string>; // eventId → 序列化 snapshot（可选，用于存档）
}
```

## 生成算法

### 核心流程

1. **选模板**：从注册表中的所有 `EventTemplate` 中，按 weight 加权随机选择一个满足条件的模板
2. **抽变量**：对模板的每个 `variableSlots`，从对应的 `VariablePool` 中按权重随机抽取一个 `VariableEntry`，处理联动（`linkedValues`）
3. **文本替换**：将 `namePattern`、`messagePattern` 中的 `{var}` 占位符替换为实际值
4. **效果计算**：将 `effectsPattern` 中的变量引用替换为数值，支持表达式（`{amount}` → 20, `{amount*2}` → 40）
5. **构建 GameEvent**：组装为标准 `GameEvent` 对象，id 含 seed 哈希，确保唯一
6. **缓存**：生成的事件缓存在内存中，避免同一 seed 重复计算

### Seed 机制

- 每次新游戏随机生成 `masterSeed`（32 位整数）
- 每次生成事件时 `eventCounter++`，子种子 = `hash(masterSeed, eventCounter)`
- 使用确定性 PRNG（如 Mulberry32），相同 seed 总是产生相同事件
- 存档只需保存 `masterSeed` + `eventCounter`，读档时可重新推导

### 伪代码

```
function generateEvent(player, templates, pools, state):
  subSeed = hash(state.masterSeed, state.eventCounter++)
  rng = createRNG(subSeed)
  
  eligible = templates.filter(t => meetsCondition(t, player))
  template = weightedPick(eligible, rng)
  
  vars = {}
  for slot in template.variableSlots:
    pool = findPool(slot, template.varConstraints)
    entry = weightedPick(pool.entries.filter(meetingRealmAndRegion), rng)
    vars[slot] = entry.value
    if entry.linkedValues:
      merge(vars, entry.linkedValues)
  
  name = interpolate(template.namePattern, vars)
  message = interpolate(template.messagePattern, vars)
  effects = resolveEffects(template.effectsPattern, vars)
  
  return buildGameEvent(template, name, message, effects, subSeed)
```

## 与现有系统的集成方案

### 与事件引擎无缝对接

- 生成的事件是标准 `GameEvent`，直接进入 `triggerEvent()` 流程
- `event-engine.ts` 无需修改，`triggerEvent` 从 `eventRegistry` 中选事件的逻辑不变
- 新增一个 **ProceduralEventProvider** 在 `triggerEvent` 调用前，按需向 `eventRegistry` 注入一批程序化事件（懒生成）

### 集成点

```
triggerEvent(player)
  ├── 1. 调用 proceduralEventProvider.ensureEvents(player) // 确保当前境界/区域有足够程序化事件
  ├── 2. 从 eventRegistry 中按权重选事件（现有逻辑不变）
  └── 3. 返回 EventResult
```

- `proceduralEventProvider` 在每次境界变化或区域切换时，预生成一批（如 20 个）程序化事件注入 `eventRegistry`
- 已触发的程序化事件从 registry 移除，下次需要时再生成新的

### 与手写事件共存

- 手写事件（`events.json`）和程序化事件**共存**于 `eventRegistry`
- 手写事件优先级可通过更高 weight 保证不被淹没
- 程序化事件 id 前缀 `proc:` 用于区分

## 存档兼容性

### 存档内容

```ts
interface ProceduralEventSaveData {
  masterSeed: number;
  eventCounter: number;
  // 不保存生成的事件缓存——读档时按 seed 重新生成
}
```

### 向后兼容

- 旧存档没有 `proceduralEvent` 字段时，读档自动初始化新的 `masterSeed` + `eventCounter = 0`
- 不影响已有手写事件的 `triggeredOnce` / `cooldowns` 状态

## DLC 扩展性

- DLC 可通过 `registerDLC()` 注册自己的 `EventTemplate[]` 和 `VariablePool[]`
- `DLCPack` 新增两个可选字段：

```ts
interface DLCPack {
  // ... 现有字段
  eventTemplates?: EventTemplate[];    // 程序化事件模板
  variablePools?: VariablePool[];      // 变量词库
}
```

- 模板和词库的 id 使用命名空间（`core:tpl_xxx`、`cp-01:tpl_xxx`）
- DLC 的词库条目自动合并到全局池，组合爆炸效应更强

## JSON 数据格式示例

### event-templates.json

```json
[
  {
    "id": "core:tpl_find_resource",
    "category": "explore",
    "tone": "good",
    "weight": 30,
    "namePattern": "发现{resource}",
    "messagePattern": "{emoji} 在{location}发现一处{resource}，获得 {amount} {unit}！",
    "effectsPattern": { "gold": "{amount}" },
    "variableSlots": ["resource", "emoji", "location", "amount", "unit"],
    "varConstraints": {
      "resource": { "pool": "core:pool_resources" },
      "location": { "pool": "core:pool_locations" },
      "amount":   { "pool": "core:pool_amounts_small" }
    }
  },
  {
    "id": "core:tpl_encounter_elder",
    "category": "explore",
    "tone": "good",
    "weight": 20,
    "namePattern": "{elder}指点",
    "messagePattern": "📖 偶遇{elder}，指点修炼要诀，获得 {exp} 修为！",
    "effectsPattern": { "exp": "{exp}" },
    "variableSlots": ["elder", "exp"],
    "varConstraints": {
      "elder": { "pool": "core:pool_elders" },
      "exp":   { "pool": "core:pool_exp_amounts" }
    },
    "condition": { "minRealm": 1 }
  },
  {
    "id": "core:tpl_ambush",
    "category": "explore",
    "tone": "bad",
    "weight": 15,
    "namePattern": "{enemy}伏击",
    "messagePattern": "⚔️ {enemy}从{hiding_spot}中窜出偷袭，损失 {hp_loss} 体力！",
    "effectsPattern": { "hp": "-{hp_loss}" },
    "variableSlots": ["enemy", "hiding_spot", "hp_loss"],
    "varConstraints": {
      "enemy":       { "pool": "core:pool_enemies" },
      "hiding_spot": { "pool": "core:pool_hiding_spots" },
      "hp_loss":     { "pool": "core:pool_damage_small" }
    }
  }
]
```

### variable-pools.json

```json
[
  {
    "id": "core:pool_resources",
    "namespace": "core",
    "variable": "resource",
    "entries": [
      { "value": "灵石矿", "linkedValues": { "emoji": "💎", "unit": "灵石" }, "weight": 3 },
      { "value": "铁矿", "linkedValues": { "emoji": "⛏️", "unit": "灵石" }, "weight": 2 },
      { "value": "灵草丛", "linkedValues": { "emoji": "🌿", "unit": "灵石" }, "weight": 2 },
      { "value": "玄铁矿脉", "linkedValues": { "emoji": "🔩", "unit": "灵石" }, "weight": 1, "minRealm": 2 },
      { "value": "星陨石", "linkedValues": { "emoji": "☄️", "unit": "灵石" }, "weight": 1, "minRealm": 4 }
    ]
  },
  {
    "id": "core:pool_locations",
    "namespace": "core",
    "variable": "location",
    "entries": [
      { "value": "山谷深处", "weight": 3, "regionTags": ["mountain", "valley"] },
      { "value": "密林之中", "weight": 3, "regionTags": ["wilderness"] },
      { "value": "河畔", "weight": 2 },
      { "value": "古洞穴内", "weight": 2, "regionTags": ["mountain"] },
      { "value": "废弃矿井中", "weight": 1, "regionTags": ["wasteland"] }
    ]
  },
  {
    "id": "core:pool_amounts_small",
    "namespace": "core",
    "variable": "amount",
    "entries": [
      { "value": "10", "weight": 3 },
      { "value": "20", "weight": 5 },
      { "value": "30", "weight": 3 },
      { "value": "50", "weight": 1, "minRealm": 2 }
    ]
  },
  {
    "id": "core:pool_elders",
    "namespace": "core",
    "variable": "elder",
    "entries": [
      { "value": "一位白发长老", "weight": 3 },
      { "value": "云游散仙", "weight": 2 },
      { "value": "龟仙前辈", "weight": 1 },
      { "value": "隐世剑修", "weight": 2, "minRealm": 2 },
      { "value": "上古遗魂", "weight": 1, "minRealm": 4 }
    ]
  }
]
```

## 新增/修改文件清单

### 新增文件

| 文件 | 用途 | 关键类/函数 |
|------|------|-------------|
| `src/game/procedural/seed.ts` | 确定性 PRNG + Seed 管理 | `createRNG()`, `hashSeed()`, `ProceduralState` |
| `src/game/procedural/event-generator.ts` | 程序化事件生成器 | `generateProceduralEvent()`, `ProceduralEventProvider` |
| `src/game/procedural/template-loader.ts` | JSON 模板/词库加载器 | `loadEventTemplates()`, `loadVariablePools()` |
| `src/game/procedural/index.ts` | barrel re-export | — |
| `src/data/dlc/core/event-templates.json` | 核心事件模板（300+） | — |
| `src/data/dlc/core/variable-pools.json` | 核心变量词库 | — |
| `src/data/texts/procedural.ts` | 程序化系统中文文案 | — |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | 新增 `EventTemplate`、`VariablePool`、`VarConstraint`、`VariableEntry`、`ProceduralEventState` 类型 | 类型定义 |
| `src/game/registry/stores.ts` | 新增 `eventTemplateRegistry`、`variablePoolRegistry` | 存储模板和词库 |
| `src/game/registry/dlc.ts` | `registerDLC` 中注册 `eventTemplates` 和 `variablePools` | DLC 扩展支持 |
| `src/game/registry/queries.ts` | 新增 `getEventTemplate()`、`getAllEventTemplates()`、`getVariablePool()` 等查询 | 查询 API |
| `src/game/registry/index.ts` | re-export 新增类型和查询 | barrel |
| `src/game/events.ts` | 在核心 DLC 注册时加载 `event-templates.json` 和 `variable-pools.json` | 数据加载 |
| `src/hooks/useGameEngine.ts` | 在 Player 状态中保存 `proceduralEventState` | 存档持久化 |
| `src/game/player/types.ts` | Player 类型新增 `proceduralEventState` 字段 | 状态扩展 |

## 实现步骤拆分

1. **Phase 1 — 基础设施**（与 T0071-T0073 共享）
   - 实现 `src/game/procedural/seed.ts`（确定性 PRNG：Mulberry32）
   - 实现模板加载器和变量替换引擎

2. **Phase 2 — 事件生成器**
   - 实现 `event-generator.ts`，支持模板选择、变量抽取、文本插值、效果计算
   - 注册到 `eventRegistry` 的集成逻辑

3. **Phase 3 — 数据制作**
   - 编写 300+ 事件模板 JSON
   - 编写变量词库 JSON（地名、人名、物品名、数值范围等）

4. **Phase 4 — 注册与存档**
   - 修改 `DLCPack` 和 `registerDLC` 支持模板/词库注册
   - 存档/读档支持 `ProceduralEventState`

5. **Phase 5 — 测试与调试**
   - Debug 面板新增：重置 Seed、强制触发程序化事件、查看已生成事件数

## 共享基础设施

本任务与 T0071/T0072/T0073 共享以下基础设施（统一放 `src/game/procedural/`）：

| 模块 | 文件 | 共享内容 |
|------|------|----------|
| 确定性 PRNG | `seed.ts` | `createRNG(seed)`、`hashSeed(master, counter)` |
| 文本插值 | `interpolate.ts` | `interpolate(pattern, vars)` 占位符替换 |
| 加权随机 | `seed.ts` | `weightedPick(entries, rng)` |
| 品质/稀有度抽取 | `rarity.ts` | `rollRarity(rng, luckBonus)` 品质抽取（T0071/T0073 使用） |

## 验证方式

- 开始新游戏后连续探索 50 次，观察是否出现由模板生成的不同事件文本
- 每次事件日志中显示的数值、名称应随变量词库变化
- 存档→读档后，重置种子计数并重新触发，验证同 seed 输出一致
- 手写事件（如 `core:find_ore`）仍正常触发，与程序化事件共存

## 调试面板需求

- 新增"程序化事件"区域：
  - 显示当前 masterSeed 和 eventCounter
  - 按钮"重置 Seed"：随机生成新种子
  - 按钮"生成一个程序化事件"：强制触发并显示结果
  - 显示已注册模板数量和词库数量

## 依赖关系

- 前置：T0007（事件引擎）✅
- 后续：CP-01 / CP-02 等内容包可注册自己的模板和词库
- 并行：T0071 / T0072 / T0073 共享 `src/game/procedural/seed.ts` 基础设施
