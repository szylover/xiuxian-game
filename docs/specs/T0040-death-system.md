# 设计文档：死亡与复活系统

任务：T0040
日期：2026-03-27

## 概述

当前游戏只有"寿元耗尽→游戏结束"一种死法，战斗失败仅扣健康和 HP，缺乏危险感和策略深度。本系统引入完整的**死亡/后果/复活**框架：

1. 多种死亡触发源（寿元、战斗、渡劫、心魔等），通过 DLC 注册
2. 后果分级（轻/中/重），不同死因对应不同惩罚等级
3. 护命机制（护身道具可拦截一次致命伤害）
4. 复活手段（还魂丹、散仙化、转世重修等），通过 DLC 注册

核心原则：**系统 ≠ 内容**。`death.ts` 是纯逻辑壳子，所有死亡条件（`DeathTriggerDef`）、复活手段（`RevivalDef`）、护命道具（`LifeSaverDef`）均通过 `registerDLC()` 挂载，核心包也是 DLC（namespace: `core`）。

---

## 数据结构

### 1. 死亡触发定义 `DeathTriggerDef`

注册到全局注册表，每种死亡方式对应一条记录。系统在关键节点调用 `checkDeathTriggers()` 判断是否触发死亡。

```ts
type DeathSeverity = 'light' | 'moderate' | 'severe';

interface DeathTriggerDef {
  id: string;                        // 'core:death_lifespan'
  name: string;                      // '寿元耗尽'
  description: string;               // '大限将至，油尽灯枯…'
  severity: DeathSeverity;           // 后果等级
  check: (p: Player) => boolean;     // 触发条件谓词
  canBeBlocked: boolean;             // 是否可被护命道具阻挡
  bypassRevival: boolean;            // 是否跳过复活判定（true = 直接游戏结束）
  priority: number;                  // 检查优先级（数值小的先检查，0~100）
}
```

### 2. 后果等级 `DeathPenaltyDef`

每个等级对应一组默认惩罚，可被死亡触发定义或复活手段覆盖。

```ts
interface DeathPenaltyDef {
  severity: DeathSeverity;
  expLossRate: number;               // 修为损失比例
  goldLossRate: number;              // 灵石损失比例
  inventoryLossCount: number;        // 随机丢失物品数量
  healthLoss: number;                // 健康损失
  moodLoss: number;                  // 心情损失
  realmDrop: number;                 // 降境界数（0=不降）
  gameOver: boolean;                 // 是否游戏结束
}

// 默认后果表（系统内置，DLC 可覆盖）
const DEFAULT_PENALTIES: Record<DeathSeverity, DeathPenaltyDef> = {
  light: {
    severity: 'light',
    expLossRate: 0.1,
    goldLossRate: 0.1,
    inventoryLossCount: 0,
    healthLoss: 20,
    moodLoss: 15,
    realmDrop: 0,
    gameOver: false,
  },
  moderate: {
    severity: 'moderate',
    expLossRate: 0.3,
    goldLossRate: 0.3,
    inventoryLossCount: 2,
    healthLoss: 40,
    moodLoss: 30,
    realmDrop: 1,
    gameOver: false,
  },
  severe: {
    severity: 'severe',
    expLossRate: 1.0,
    goldLossRate: 1.0,
    inventoryLossCount: 0,
    healthLoss: 0,
    moodLoss: 0,
    realmDrop: 0,
    gameOver: true,              // 默认游戏结束
  },
};
```

### 3. 护命道具定义 `LifeSaverDef`

当致命伤害发生（`canBeBlocked === true` 的死因），系统按优先级检查玩家背包中的护命道具。

```ts
interface LifeSaverDef {
  id: string;                        // 'core:life_talisman'
  itemId: string;                    // 对应背包中的物品 ID
  name: string;                      // '护身符'
  description: string;
  priority: number;                  // 检查优先级（多个护命道具时）
  consumeOnUse: boolean;             // 是否使用后消耗
  blockSeverities: DeathSeverity[];  // 能阻挡哪些等级的死亡
  afterEffect?: (p: Player) => Player; // 触发后的副作用（如 HP 回满、临时无敌等）
  condition?: (p: Player) => boolean;  // 额外生效条件
}
```

### 4. 复活手段定义 `RevivalDef`

当玩家死亡且后果为 `gameOver === true`（severe 级）时，系统检查是否存在可用的复活手段。若有，则替代游戏结束，应用复活效果。

```ts
interface RevivalMethodDef {
  id: string;                        // 'core:revival_nine_turn_pill'
  name: string;                      // '九转还魂丹'
  description: string;
  type: 'item' | 'passive' | 'realm'; // 触发方式
  itemId?: string;                   // type='item' 时需要的物品 ID
  passiveId?: string;                // type='passive' 时需要的被动效果 ID
  consumeOnUse: boolean;             // 是否使用后消耗（物品类）
  priority: number;                  // 多个复活手段时的检查优先级
  condition?: (p: Player) => boolean; // 额外条件
  effect: (p: Player) => Player;      // 复活效果（恢复 HP/修为等）
  penalty?: Partial<DeathPenaltyDef>; // 复活代价（覆盖默认 severe 惩罚）
}
```

### 5. Player 扩展字段

利用现有 `player.systems` 动态扩展，无需修改 `Player` 接口：

```ts
// player.systems.death
interface DeathSystemState {
  deathCount: number;                    // 累计死亡次数
  lastDeathCause: string | null;         // 最近一次死因 ID
  revivalCount: number;                  // 累计复活次数
  lifeSaverTriggered: string[];          // 已触发过的护命道具 ID 列表
  isLooseImmortal: boolean;              // 是否为散仙（与 T0029 联动）
}
```

### 6. 注册表扩展

`DLCPack` 新增可选字段：

```ts
interface DLCPack {
  // ...existing fields...
  deathTriggers?: DeathTriggerDef[];     // 死亡触发条件
  lifeSavers?: LifeSaverDef[];           // 护命道具定义
  revivalMethods?: RevivalMethodDef[];   // 复活手段定义
}
```

`registry.ts` 新增三个 Map：

```ts
const deathTriggerRegistry = new Map<string, DeathTriggerDef>();
const lifeSaverRegistry = new Map<string, LifeSaverDef>();
const revivalRegistry = new Map<string, RevivalMethodDef>();
```

---

## 死亡判定流程

```
致命事件发生（战斗失败 / 寿元耗尽 / 渡劫失败 / 心魔入体 / …）
  │
  ▼
checkDeathTriggers(player, context)
  → 匹配 DeathTriggerDef（check 谓词 + 上下文）
  → 确定 severity
  │
  ▼
canBeBlocked === true ?
  │ Yes                          │ No
  ▼                              ▼
checkLifeSavers(player)       applyDeath()
  → 有护命道具？
  │ Yes            │ No
  ▼                ▼
consumeLifeSaver   applyDeath()
  → 免死一次
  → afterEffect()
  → 日志提示
  │
  ▼
结束（未死亡）

applyDeath(player, trigger):
  │
  ▼
severity === 'severe' && !bypassRevival ?
  │ Yes                          │ No
  ▼                              ▼
checkRevivalMethods(player)   applyPenalty(severity)
  → 有复活手段？
  │ Yes            │ No
  ▼                ▼
applyRevival()    gameOver = true
  → effect(player)
  → 扣除复活代价
  → 日志提示
  │
  ▼
applyPenalty(revival.penalty ?? default)
```

---

## 核心死亡触发条件（core DLC 数据）

| ID | 名称 | 严重度 | 可阻挡 | 跳过复活 | 触发条件 |
|----|------|--------|--------|----------|----------|
| `core:death_lifespan` | 寿元耗尽 | severe | 否 | 是 | `age >= lifespan` |
| `core:death_combat` | 战斗阵亡 | light | 是 | 否 | 战斗中 HP 降至 0（低境界） |
| `core:death_combat_boss` | Boss 击杀 | moderate | 是 | 否 | 被高 2 个境界以上妖兽击败 |
| `core:death_tribulation` | 渡劫失败 | severe | 否 | 否 | 渡劫战斗失败（联动 T0029） |
| `core:death_inner_demon` | 心魔入体 | moderate | 是 | 否 | 心情长期 ≤ 10 + 连续突破失败 ≥ 3 |
| `core:death_health` | 气血耗尽 | moderate | 是 | 否 | 健康降至 0 |
| `core:death_alchemy_fail` | 炼丹走火 | light | 是 | 否 | 炼丹大失败（极低概率） |

### 具体触发规则

**寿元耗尽**（severity: severe, bypassRevival: true）
- 天道法则，无法逆转。唯一的"真死亡"。
- 只能通过延寿丹/奇遇预防，不能事后复活。

**战斗阵亡**（severity: light / moderate）
- 普通战斗 HP≤0：severity=light，损失 10% 修为 + 20 健康。
- 被高 2+ 境界妖兽击败：severity=moderate，损失 30% 修为 + 降 1 境界。
- 护命道具可拦截：HP 归 1，免除本次死亡。

**渡劫失败**（severity: severe, canBeBlocked: false）
- 联动 T0029 天劫系统。渡劫失败默认 severe。
- 不可被护命道具阻挡（天劫超越凡力），但可触发复活判定。
- 复活方式：九转还魂丹（复活 + 降 1 境界）或散仙化（保留属性但走散仙路线）。

**心魔入体**（severity: moderate）
- 条件：`mood ≤ 10` 持续超过 5 次行动 **且** 连续突破失败 ≥ 3 次。
- 在时间推进时检查。可被护命道具（如定心符）阻挡。
- 后果：降 1 境界 + 损失 30% 修为 + mood 归零。

**气血耗尽**（severity: moderate）
- 条件：`health === 0`。
- 可被护命道具阻挡。修炼/战斗/探索时扣健康到 0 触发。

**炼丹走火**（severity: light）
- 炼丹大失败时 1% 概率触发。
- 轻度惩罚：损失 10% 修为 + 20 健康。

---

## 核心护命道具（core DLC 数据）

| ID | 物品 ID | 名称 | 可挡等级 | 消耗 | 效果 | 获取 |
|----|---------|------|----------|------|------|------|
| `core:saver_talisman` | `core:life_talisman` | 护身灵符 | light, moderate | 是 | HP 回满 30%，免死一次 | 商店 200 灵石、探索 |
| `core:saver_jade` | `core:jade_shield` | 玉碎护身 | light, moderate | 是 | HP 回 1，3 回合无敌（战斗中） | 奇遇、高级商店 |
| `core:saver_soul_lamp` | `core:soul_lamp` | 魂灯 | moderate | 是 | 免死 + 保留当前境界 | 特殊奇遇 |

---

## 核心复活手段（core DLC 数据）

| ID | 名称 | 类型 | 触发 | 复活效果 | 代价 |
|----|------|------|------|----------|------|
| `core:revival_nine_turn_pill` | 九转还魂丹 | item | 持有 `core:nine_turn_pill` | HP/MP 全满，保留当前境界 | 消耗丹药，修为 -20% |
| `core:revival_loose_immortal` | 散仙化 | passive | 化神期以上且未成散仙 | 保留 80% 属性，标记散仙 | 无法走正统突破路线 |
| `core:revival_reincarnation` | 转世重修 | passive | 金丹期以上 + 死亡次数 ≤ 3 | 重开角色，保留 10% 修为 | 重置境界/装备/背包（联动 T0030） |

---

## 核心新增物品（追加到 `core-items.json`）

| ID | 名称 | 品质 | 分类 | 描述 | 获取途径 |
|----|------|------|------|------|----------|
| `core:life_talisman` | 护身灵符 | uncommon | consumable | 蕴含灵力的护身符，可抵消一次致命伤害 | 商店 200 灵石、探索 5% |
| `core:jade_shield` | 玉碎护身 | rare | consumable | 灵玉打造的护盾，危急时碎裂护主 | 奇遇、高级探索 2% |
| `core:soul_lamp` | 魂灯 | epic | consumable | 封印一缕魂火的灯盏，可免一死 | 特殊奇遇 |
| `core:nine_turn_pill` | 九转还魂丹 | legendary | consumable | 传说中的仙丹，可令亡者复生 | 高级炼丹（需专用配方）、终极奇遇 |
| `core:calming_talisman` | 定心符 | uncommon | consumable | 安定心神的符箓，可防心魔入侵 | 商店 100 灵石 |
| `core:longevity_pill` | 延寿丹 | rare | consumable | 延长寿命 50 年的珍贵丹药 | 炼丹、奇遇 |

---

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键类型/函数 |
|------|------|---------------|
| `src/game/death.ts` | 死亡系统逻辑壳子 | `checkDeathTriggers()`, `applyDeath()`, `checkLifeSavers()`, `checkRevivalMethods()`, `getDeathSystemState()` |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/registry.ts` | 新增 `deathTriggerRegistry` + `lifeSaverRegistry` + `revivalRegistry` 三个 Map，`registerDLC()` 注册逻辑，查询 API | DLC 扩展支持 |
| `src/hooks/useGameEngine.ts` | 重写死亡判定：`advanceTime` 中调用 `checkDeathTriggers()`；战斗失败调用 `applyDeath()`；新增 `gameOverReason` 细化 | 核心流程替换 |
| `src/game/combat.ts` | `runCombat()` 返回值新增 `deathContext?: { triggerId: string }` 字段，标记是否触发战斗死亡 | 死亡信息传递 |
| `src/data/core-items.json` | 追加 6 个护命/复活/延寿物品定义 | 新物品数据 |
| `src/game/events.ts` | 新增护命道具获取相关的探索事件 | 物品获取途径 |
| `src/components/ActionPanel.tsx` | 游戏结束时显示死因详情 + 复活选项按钮（如有可用复活手段） | UI 适配 |

### 核心逻辑：`death.ts`

```
// ── 检查死亡触发 ──
function checkDeathTriggers(player: Player, context: DeathContext): DeathCheckResult

参数:
  context: { source: 'combat' | 'time' | 'tribulation' | 'alchemy' | 'other', data?: any }

返回值:
  DeathCheckResult {
    triggered: boolean
    trigger: DeathTriggerDef | null
    blocked: boolean                  // 是否被护命道具阻挡
    blockedBy: LifeSaverDef | null
    player: Player                    // 更新后的 player（可能消耗了护命道具）
    logs: string[]
  }

逻辑:
  1. 按 priority 排序所有注册的 DeathTriggerDef
  2. 逐个执行 check(player)，找到第一个为 true 的
  3. 如果 canBeBlocked === true，调用 checkLifeSavers()
  4. 如果被阻挡：消耗护命道具 + 记录日志 + 返回 blocked=true
  5. 如果未被阻挡：返回 triggered=true + trigger 信息

// ── 检查护命道具 ──
function checkLifeSavers(player: Player, severity: DeathSeverity): LifeSaverCheckResult

逻辑:
  1. 按 priority 排序所有注册的 LifeSaverDef
  2. 对每个：检查 blockSeverities 包含当前 severity
  3. 检查背包是否持有 itemId
  4. 检查 condition（如有）
  5. 找到第一个满足的 → 消耗物品 + afterEffect → 返回

// ── 应用死亡后果 ──
function applyDeath(player: Player, trigger: DeathTriggerDef): DeathResult

返回值:
  DeathResult {
    player: Player
    gameOver: boolean
    revived: boolean
    revivedBy: RevivalMethodDef | null
    logs: string[]
    gameOverReason: string
  }

逻辑:
  1. 查找 severity 对应的 DeathPenaltyDef
  2. 如果 severity === 'severe' 且 !bypassRevival：
     - 调用 checkRevivalMethods()
     - 如有可用：应用复活效果 + 复活代价 → gameOver=false
     - 如无：gameOver=true
  3. 如果 severity !== 'severe'：
     - 应用 penalty（扣修为/灵石/物品/降境界）
     - gameOver=false
  4. 更新 deathCount / lastDeathCause
  5. 返回结果

// ── 检查复活手段 ──
function checkRevivalMethods(player: Player): RevivalCheckResult

逻辑:
  1. 按 priority 排序所有注册的 RevivalMethodDef
  2. 对每个：
     - type='item' → 检查背包是否持有 itemId
     - type='passive' → 检查 player.passives 中是否有 passiveId
     - type='realm' → 检查条件
  3. 检查 condition（如有）
  4. 返回第一个满足的
```

### 与现有系统集成

**advanceTime 改造（useGameEngine.ts）**：

```
// 寿元耗尽 → 调用 checkDeathTriggers(player, { source: 'time' })
// 心魔检查 → 调用 checkDeathTriggers(player, { source: 'other' })
// 健康为0 → 调用 checkDeathTriggers(player, { source: 'other' })
```

**战斗失败改造（useGameEngine.ts）**：

```
// 战斗 HP≤0 → 调用 checkDeathTriggers(player, { source: 'combat', data: { monster } })
// 如果 triggered=true 且 blocked=false → applyDeath()
// 如果 gameOver=false → 继续游戏（带惩罚）
// 如果 gameOver=true → 设置 gameOver 状态
```

**渡劫失败联动（T0029）**：

```
// runTribulation 失败 → checkDeathTriggers(player, { source: 'tribulation' })
// 复活选项包含散仙化 → 标记 isLooseImmortal
```

---

## UI 方案（@Designer）

### 新增界面/面板

| 元素 | 位置 | 内容 |
|------|------|------|
| 死亡弹窗 | 全屏模态 | 显示死因、死亡描述文案、角色生涯回顾（境界/寿命/击杀数） |
| 复活选择面板 | 死亡弹窗内 | 列出可用复活手段，每个显示名称+代价+确认按钮 |
| 护命触发提示 | 游戏日志 + toast 通知 | 「💎 护身灵符碎裂！抵消了致命伤害！」 |
| 死亡统计 | 状态面板（StatusPanel） | 显示死亡次数、复活次数、护命道具触发记录 |

### 交互

- 护命道具触发：屏幕闪烁金光特效 + 日志提示，玩家无需操作
- 死亡发生：全屏变暗 + 死亡弹窗淡入，显示角色信息和死因
- 有复活手段：弹窗底部出现复活选项按钮，玩家点击选择
- 无复活手段：弹窗显示"游戏结束" + 重新开始/删档按钮
- 轻度/中度死亡：无弹窗，日志中显示惩罚信息 + toast 提示

---

## 验证方式

### 基础验证
1. 战斗中 HP 降至 0 → 触发 light 级死亡 → 扣 10% 修为 + 20 健康 → 继续游戏
2. 被高境界妖兽击败 → 触发 moderate 级死亡 → 降境界
3. 寿元耗尽 → severe + bypassRevival → 直接游戏结束

### 护命道具验证
4. 背包有护身灵符 + 战斗死亡 → 符碎裂 → 免死 + HP 回 30% → 符被消耗
5. 背包无护命道具 + 战斗死亡 → 正常走死亡流程

### 复活验证
6. severe 死亡（渡劫失败）+ 持有九转还魂丹 → 弹窗显示复活选项 → 点击后复活、降 1 境界、丹药消耗
7. severe 死亡 + 化神期以上 → 散仙化选项出现 → 选择后标记散仙
8. severe 死亡 + 无复活手段 → 游戏结束

### 心魔验证
9. 心情 ≤ 10 持续 5 次行动 + 连续突破失败 ≥ 3 → 触发心魔入体
10. 持有定心符时心魔被阻挡

### DLC 扩展验证
11. 通过 `registerDLC()` 注册自定义 DeathTriggerDef → 系统正确检查新死因
12. 通过 `registerDLC()` 注册自定义 RevivalMethodDef → 死亡时出现新复活选项

---

## 与现有任务的关系

### 前置任务
- **T0001**（属性系统）— Player 接口、基础属性
- **T0003**（战斗系统）— 战斗失败死亡判定
- **T0012**（背包系统）— 护命/复活道具存储和消耗

### 联动任务
- **T0029**（突破重构 + 渡劫）— 渡劫失败 → 死亡触发；共享 `isLooseImmortal` 状态
- **T0013**（炼丹）— 炼丹走火死亡触发；九转还魂丹/延寿丹配方

### 后续任务
- **T0030**（转世重修）— 转世是一种复活手段，依赖本系统框架

---

## Player.tracking 扩展

在现有 `PlayerTracking` 基础上新增字段，用于心魔判定：

```ts
interface PlayerTracking {
  // ...existing fields...
  lowMoodStreak: number;           // 心情 ≤ 10 连续行动次数
  consecutiveBreakthroughFails: number; // 连续突破失败次数
}
```

> 注：`deathCount` / `revivalCount` 等存储在 `player.systems.death` 中（DeathSystemState），不扩展 tracking 接口。
