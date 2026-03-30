# 设计文档：死亡与复活系统

任务：T0040
日期：2026-03-27（初稿）→ 2026-03-30（更新）

## 概述

当前游戏只有"寿元耗尽→游戏结束"一种死法，战斗失败仅扣健康和 HP，缺乏危险感和策略深度。本系统引入完整的**死亡/后果/复活**框架：

1. 多种死亡触发源（寿元、战斗、渡劫、心魔等），通过 DLC 注册
2. 后果分级（轻/中/重），不同死因对应不同惩罚等级
3. 护命机制（护身道具可拦截一次致命伤害）
4. 复活手段（还魂丹、散仙化、转世重修等），通过 DLC 注册

核心原则：**系统 ≠ 内容**。`death.ts` 是纯逻辑壳子，所有死亡条件（`DeathTriggerDef`）、复活手段（`RevivalDef`）、护命道具（`LifeSaverDef`）均通过 `registerDLC()` 挂载，核心包也是 DLC（namespace: `core`）。

### 更新记录（2026-03-30）

- 适配 T0044（CombatModal 两阶段弹窗）：战斗死亡需与 CombatModal 协同编排
- 适配 T0018（技能战斗）：战斗系统已拆分为 `src/game/combat/` 目录
- 修正文件路径：registry.ts → `src/game/registry/` 目录
- 移除 `CombatResult.deathContext` 提案——死亡检查在 Hook 层进行，不修改战斗引擎
- 新增 `src/hooks/useCoreActions.ts`、`src/hooks/useSystemActions.ts` 到修改文件列表
- `applyDeath` 返回值改为提供可用复活选项列表，由玩家在 UI 中选择（与 UI 方案一致）
- 新增"与 CombatModal 集成流程"小节

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

`registry/stores.ts` 新增三个 Map：

```ts
const deathTriggerRegistry = new Map<string, DeathTriggerDef>();
const lifeSaverRegistry = new Map<string, LifeSaverDef>();
const revivalRegistry = new Map<string, RevivalMethodDef>();
```

### 7. CombatModal 状态扩展（适配 T0044）

在 `useGameEngine.ts` 中扩展 `CombatModalState`，传递死亡信息给 CombatModal：

```ts
// 死亡信息附着在战斗结果上
interface CombatDeathInfo {
  blocked: boolean;                      // 是否被护命道具阻挡
  saverName?: string;                    // 阻挡道具名称
  triggered: boolean;                    // 是否触发了死亡
  severity?: DeathSeverity;              // 死亡等级
  penaltyLogs?: string[];               // 惩罚描述
  availableRevivals?: RevivalMethodDef[]; // severe 时可用复活手段
  triggerDef?: DeathTriggerDef;          // 触发的死亡定义
}

interface CombatModalState {
  phase: 'battle' | 'loot';
  monsterName: string;
  result: CombatResult;
  loot: LootEntry[];
  deathInfo?: CombatDeathInfo;           // 新增：死亡信息
}
```

### 8. DeathModal 状态（新增组件用）

```ts
interface DeathModalState {
  triggerDef: DeathTriggerDef;           // 死因定义
  severity: DeathSeverity;
  availableRevivals: RevivalMethodDef[]; // 可选复活手段
  playerSnapshot: {                      // 死亡时的角色快照（用于生涯回顾）
    name: string;
    realmIndex: number;
    age: number;
    killCount: number;
    deathCount: number;
  };
}
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
| `src/game/types.ts` | `DLCPack` 新增 `deathTriggers` / `lifeSavers` / `revivalMethods` 可选字段；新增死亡系统类型定义（`DeathTriggerDef` / `LifeSaverDef` / `RevivalMethodDef` / `DeathPenaltyDef` 等） | 类型扩展 |
| `src/game/registry/stores.ts` | 新增 `deathTriggerRegistry` / `lifeSaverRegistry` / `revivalRegistry` 三个 Map | DLC 扩展存储 |
| `src/game/registry/dlc.ts` | `registerDLC()` / `unregisterDLC()` 中处理三类新注册项 | DLC 注册逻辑 |
| `src/game/registry/queries.ts` | 新增查询 API：`getDeathTrigger()` / `getAllDeathTriggers()` / `getLifeSaver()` / `getRevivalMethod()` 等 | 查询接口 |
| `src/game/registry/index.ts` | re-export 新增查询 API | barrel export |
| `src/game/player/types.ts` | `PlayerTracking` 新增 `lowMoodStreak` / `consecutiveBreakthroughFails` | 心魔判定追踪 |
| `src/hooks/useCoreActions.ts` | `fight()` 中战斗失败后调用 `checkDeathTriggers()`，将死亡结果一并传给弹窗回调（扩展 `onCombatResult` 参数） | 战斗死亡集成 |
| `src/hooks/useGameEngine.ts` | `advanceTime()` 中替换硬编码寿元检查为 `checkDeathTriggers()`；新增 `DeathModalState` + 死亡/复活弹窗状态管理；新增 `handleRevival()` 回调 | 核心流程替换 |
| `src/hooks/useSystemActions.ts` | `breakthrough()` 中替换直接 `setGameOver` 为 `checkDeathTriggers({ source: 'tribulation' })` 调用 | 渡劫死亡集成 |
| `src/game/breakthrough/attempt.ts` | 突破失败时递增 `tracking.consecutiveBreakthroughFails`，成功时重置为 0 | 心魔追踪联动 |
| `src/components/shared/CombatModal.tsx` | 战斗失败时：如护命道具阻挡则显示护命提示；如 light/moderate 死亡则显示惩罚摘要 | 战斗弹窗适配 |
| `src/components/shared/DeathModal.tsx`（新增） | severe 死亡专用弹窗：显示死因 + 角色生涯 + 复活选项（玩家点选） | 死亡/复活 UI |
| `src/App.tsx` | 渲染 DeathModal；DeathModal 关闭后若无复活则切 GameOverScreen | 编排适配 |
| `src/data/core-items.json` | 追加 6 个护命/复活/延寿物品定义 | 新物品数据 |
| `src/game/events.ts` | 新增护命道具获取相关的探索事件 | 物品获取途径 |

> **注意**：不修改 `src/game/combat/` 下的文件。死亡检查在 Hook 层（`useCoreActions` / `useGameEngine`）进行，战斗引擎只负责返回 `CombatResult`（winner / playerHpLeft）。

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
    player: Player                    // 已应用惩罚后的 player
    gameOver: boolean                 // 是否需要进入游戏结束
    availableRevivals: RevivalMethodDef[] // severe 时可用的复活手段列表（玩家选择）
    logs: string[]
    severity: DeathSeverity
    gameOverReason: string
  }

逻辑:
  1. 查找 severity 对应的 DeathPenaltyDef
  2. 如果 severity !== 'severe'：
     - 应用 penalty（扣修为/灵石/物品/降境界/扣健康/扣心情）
     - gameOver=false, availableRevivals=[]
  3. 如果 severity === 'severe' 且 !bypassRevival：
     - 调用 checkRevivalMethods(player) → 获取所有可用复活手段
     - 如有：gameOver=true（暂定），availableRevivals=[...]
       → 展示 DeathModal，等玩家选择
     - 如无：gameOver=true, availableRevivals=[]
  4. 如果 severity === 'severe' 且 bypassRevival：
     - gameOver=true, availableRevivals=[]（不检查复活）
  5. 更新 deathCount / lastDeathCause
  6. 返回结果

// ── 应用复活（玩家在 DeathModal 中选择后调用）──
function applyRevival(player: Player, method: RevivalMethodDef): RevivalResult

返回值:
  RevivalResult {
    player: Player                    // 复活后的 player
    logs: string[]
  }

逻辑:
  1. 执行 method.effect(player) → 恢复 HP/属性
  2. 如果 method.consumeOnUse 且 type='item' → 消耗物品
  3. 如果 method.penalty → 应用复活代价
  4. 更新 revivalCount
  5. 返回

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

**战斗失败改造（useCoreActions.ts `fight()`）**：

当前代码在 `fight()` 的 `setPlayer` 回调中，`result.winner === 'monster'` 时硬编码 `health -= 20, hp = max(1, 10%maxHp)`。改为：

```
if (result.winner === 'monster') {
  p.hp = result.playerHpLeft;       // 战斗引擎返回的残余 HP（≤ 0）
  const deathCheck = checkDeathTriggers(p, { source: 'combat', data: { monsterRealmIndex: monster.realmIndex } });
  if (deathCheck.triggered) {
    if (deathCheck.blocked) {
      // 护命道具拦截：消耗道具 + hp 恢复 + 标记 blocked 信息
      p = deathCheck.player;
    } else {
      // 死亡触发：应用惩罚
      const death = applyDeath(p, deathCheck.trigger);
      p = death.player;
      // 暂存死亡结果，setTimeout 中消费
      deathResultRef.current = death;
    }
  } else {
    // 兜底（理论上 hp≤0 时 combat 死亡触发一定命中）
    p.health = Math.max(0, p.health - 20);
    p.hp = Math.max(1, Math.floor(p.maxHp * 0.1));
  }
}
```

战斗结果暂存后，在 `setTimeout` 中：
- 如果有 `deathResultRef`：
  - severity=severe 且 availableRevivals.length > 0 → 打开 DeathModal
  - severity=severe 且无复活 → setGameOver
  - severity=light/moderate → 惩罚已应用，打开 CombatModal 显示惩罚摘要
  - blocked → 打开 CombatModal 显示护命触发提示
- 如果无死亡结果：走现有 CombatModal 流程

**advanceTime 改造（useGameEngine.ts）**：

```
// 替换硬编码寿元检查：
if (updated.lifespan !== Infinity && updated.age >= updated.lifespan) {
  const deathCheck = checkDeathTriggers(updated, { source: 'time' });
  // core:death_lifespan 的 bypassRevival=true → 直接 gameOver
  if (deathCheck.triggered && !deathCheck.blocked) {
    const death = applyDeath(updated, deathCheck.trigger);
    updated = death.player;
    // severe + bypassRevival → 直接 setGameOver
    setGameOver(true);
    setGameOverReason(death.gameOverReason);
  }
}

// 新增：心魔检查
if (updated.mood <= 10) {
  updated.tracking.lowMoodStreak++;
} else {
  updated.tracking.lowMoodStreak = 0;
}
// 心魔触发由 checkDeathTriggers 的 core:death_inner_demon check 函数处理

// 新增：健康耗尽检查
if (updated.health === 0) {
  const deathCheck = checkDeathTriggers(updated, { source: 'other' });
  // ... 同上流程
}
```

**渡劫失败改造（useSystemActions.ts `breakthrough()`）**：

当前代码：
```
if (!tribResult.success && finalPlayer.hp <= 0) {
  setGameOver(true);
  setGameOverReason('渡劫失败，形神俱灭！');
}
```

改为：
```
if (!tribResult.success) {
  const deathCheck = checkDeathTriggers(finalPlayer, { source: 'tribulation' });
  if (deathCheck.triggered && !deathCheck.blocked) {
    const death = applyDeath(finalPlayer, deathCheck.trigger);
    finalPlayer = death.player;
    if (death.availableRevivals.length > 0) {
      // 打开 DeathModal，显示复活选项（散仙化/九转还魂丹等）
      setDeathModal({ trigger: deathCheck.trigger, death, ... });
    } else {
      setGameOver(true);
      setGameOverReason(death.gameOverReason);
    }
  }
}
```

**突破失败追踪（breakthrough/attempt.ts）**：

```
// 突破失败时：
p.tracking.consecutiveBreakthroughFails = (p.tracking.consecutiveBreakthroughFails ?? 0) + 1;

// 突破成功时：
p.tracking.consecutiveBreakthroughFails = 0;
```

---

## UI 方案（@Designer）

### 新增组件

| 组件 | 文件 | 内容 |
|------|------|------|
| DeathModal | `src/components/shared/DeathModal.tsx` | severe 死亡专用全屏弹窗：死因描述 + 角色生涯回顾 + 复活选项列表 |

### 现有组件修改

| 组件 | 改动 |
|------|------|
| CombatModal | 战斗失败时：如护命道具触发，battle phase 末尾追加护命提示行；如 light/moderate 死亡，关闭时显示惩罚摘要 toast |
| GameOverScreen | 显示死因详情（从 `gameOverReason` 获取，已有支持） |

### 与 CombatModal（T0044）集成流程

当前战斗弹窗流程：`fight()` → `onCombatResult()` → `CombatModal`（battle → loot 两阶段）→ `handleCombatClose()` → 写日志。

死亡系统集成后的完整流程：

```
fight() [useCoreActions.ts setPlayer 回调内]
  │ result.winner === 'monster'
  │ p.hp = result.playerHpLeft (≤ 0)
  │ checkDeathTriggers(p, { source: 'combat' })
  │
  ├─ blocked=true（护命道具拦截）
  │   → p = deathCheck.player（HP 恢复、道具消耗）
  │   → 标记 combatResultRef.deathInfo = { blocked: true, saverName: '护身灵符' }
  │   → CombatModal battle phase 末尾追加：「💎 护身灵符碎裂！抵消了致命伤害！」
  │   → 关闭弹窗后正常继续游戏
  │
  ├─ triggered=true, severity=light/moderate
  │   → p = applyDeath().player（惩罚已扣）
  │   → 标记 combatResultRef.deathInfo = { severity, penaltyLogs }
  │   → CombatModal 关闭时 → toast 显示惩罚摘要（「失去 X 修为、Y 健康…」）
  │   → 继续游戏
  │
  ├─ triggered=true, severity=severe, availableRevivals > 0
  │   → p = applyDeath().player
  │   → CombatModal 关闭后 → 打开 DeathModal
  │   → DeathModal 显示死因 + 复活选项列表
  │   → 玩家点选复活 → applyRevival() → 关闭 DeathModal → 继续游戏
  │
  └─ triggered=true, severity=severe, 无复活
      → p = applyDeath().player
      → CombatModal 关闭后 → setGameOver(true)
      → App.tsx 切换到 GameOverScreen
```

### DeathModal 弹窗设计

- **触发条件**：severity=severe 且 availableRevivals.length > 0
- **视觉**：全屏半透明黑底 + 居中面板（与 CombatModal 风格一致）
- **内容**：
  1. 标题：「💀 身死道消」
  2. 死因描述（从 DeathTriggerDef.description 获取）
  3. 角色生涯回顾：姓名、境界、寿命、击杀数、死亡次数
  4. 复活选项列表：每项显示 `名称 | 代价描述 | [选择] 按钮`
  5. 如无复活选项：显示「游戏结束」+ 重新开始按钮

### 交互

- 护命道具触发：CombatModal 战斗日志末尾高亮显示 + toast 通知，玩家无需额外操作
- 轻度/中度死亡：惩罚静默应用，CombatModal 关闭后 toast 提示惩罚摘要
- 重度死亡（有复活）：CombatModal 关闭 → DeathModal 淡入 → 玩家选择复活方式
- 重度死亡（无复活）：CombatModal 关闭 → 切换到 GameOverScreen
- 非战斗死亡（寿元/渡劫/心魔）：直接打开 DeathModal 或切 GameOverScreen（无 CombatModal 前置）
- 死亡统计：StatusPanel 显示死亡次数/复活次数（从 `player.systems.death` 读取）

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
- **T0018**（技能战斗）— 战斗系统拆分为 `src/game/combat/` 目录，CombatResult 类型在 `combat/types.ts`
- **T0044**（战斗弹窗）— CombatModal 两阶段流程，死亡系统需与之协同编排

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
