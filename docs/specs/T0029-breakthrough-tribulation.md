# 设计文档：突破系统重构 + 渡劫子系统

阶段：G-1（关联 A-4 突破重构 + C 物品系统）
日期：2026-03-27

---

## 概述

当前突破系统过于"自然"——只要修为够了就可以掷骰突破，缺乏仪式感和策略性。本次重构将突破改为 **有条件突破**：每个境界需要消耗特定物品（突破丹、天材地宝）、满足经验要求、甚至完成特定奇遇。同时新增独立的 **渡劫子系统**：化神→渡劫期必须经历天劫战斗（多波次 Boss 连战），失败有严重后果。

核心设计原则：**系统 ≠ 内容**。突破逻辑（`breakthrough.ts`）是纯壳子，所有突破条件、渡劫 Boss 数据、物品需求均通过 `registerDLC()` 注册，核心数据也是 DLC（`core`）。

---

## 数据结构

### 1. 突破需求定义 `BreakthroughReqDef`

注册到全局注册表，每个境界跳跃对应一条记录。

```ts
interface BreakthroughItemCost {
  itemId: string;   // 如 'core:foundation_pill'
  count: number;    // 需要数量
}

interface BreakthroughCondition {
  id: string;             // 条件唯一 ID，如 'core:cond_kill_boss_3'
  description: string;    // 给玩家看的描述文本
  check: (p: Player) => boolean;  // 谓词函数
}

interface BreakthroughFailurePenalty {
  expLossRate: number;    // 修为损失比例，默认 0.1
  moodLoss: number;       // 心情损失，默认 20
  healthLoss: number;     // 健康损失，默认 10
  realmDrop: boolean;     // 是否降一个境界（仅高境界天劫失败）
}

interface BreakthroughReqDef {
  id: string;                        // 'core:bt_0_1' (from_to)
  fromRealmIndex: number;            // 当前境界 index
  toRealmIndex: number;              // 目标境界 index

  // ── 核心条件 ──
  itemCosts: BreakthroughItemCost[]; // 物品消耗列表（突破时扣除）
  conditions: BreakthroughCondition[];// 前置条件列表（全部满足才可尝试）
  requiresTribulation: boolean;      // 是否需要经历渡劫（触发天劫战斗）

  // ── 成功率调节 ──
  baseSuccessRate?: number;          // 覆盖全局基础成功率（默认 0.5）
  compBonusMult?: number;            // 悟性加成系数覆盖（默认 0.003）
  luckBonusMult?: number;            // 幸运加成系数覆盖（默认 0.002）

  // ── 失败惩罚覆盖 ──
  failurePenalty?: Partial<BreakthroughFailurePenalty>;

  // ── 展示 ──
  description?: string;              // 突破描述文案（UI 展示）
}
```

### 2. 天劫定义 `TribulationDef`

独立于突破需求，注册到 `tribulationRegistry`。当 `BreakthroughReqDef.requiresTribulation === true` 时，系统查找对应境界的天劫定义。

```ts
interface TribulationWave {
  name: string;       // '第一道天雷'
  hp: number;
  atk: number;
  def: number;
  speed: number;
  moveSpeed: number;
  critRate: number;
  critResist: number;
  // 特殊效果（可选）
  specialEffect?: {
    type: 'dot' | 'debuff_atk' | 'debuff_def' | 'heal_block';
    value: number;
    description: string;  // '天雷附带灼烧，每回合额外受到 X 伤害'
  };
}

interface TribulationReward {
  bonusExp: number;
  bonusStats: {
    luck?: number;
    comprehension?: number;
    charisma?: number;
  };
  items: Array<{ itemId: string; count: number }>;
}

type TribulationFailureType = 'death' | 'realm_drop' | 'become_loose_immortal';

interface TribulationDef {
  id: string;                      // 'core:tribulation_huashen'
  name: string;                    // '一九天劫'
  description: string;             // '九道天雷降下，考验修士道心…'
  forRealmIndex: number;           // 对应突破的 fromRealmIndex

  waves: TribulationWave[];        // 天劫波次（按顺序），波间不回血

  rewards: TribulationReward;      // 成功奖励

  failure: {
    type: TribulationFailureType;
    description: string;           // '渡劫失败，形神俱灭！'
    // become_loose_immortal: 变成散仙，保留大部分属性但无法继续突破正统路线
    // realm_drop: 退回上一个境界
    // death: 游戏结束
  };
}
```

### 3. Player 扩展字段

利用现有 `player.systems` 动态扩展，无需修改 `Player` 接口：

```ts
// player.systems.breakthrough
interface BreakthroughState {
  tribulationsPassed: string[];     // 已通过的天劫 ID 列表
  isLooseImmortal: boolean;         // 是否为散仙
  failedAttempts: Record<number, number>; // 各境界失败次数（可用于怜悯机制）
}
```

### 4. 注册表扩展

`DLCPack` 新增两个可选字段：

```ts
interface DLCPack {
  // ...existing fields...
  breakthroughReqs?: BreakthroughReqDef[];   // 突破需求
  tribulations?: TribulationDef[];           // 天劫定义
}
```

`registry.ts` 新增两个 Map：

```ts
const breakthroughReqRegistry = new Map<string, BreakthroughReqDef>(); // key = id
const tribulationRegistry = new Map<number, TribulationDef>();          // key = forRealmIndex
```

### 5. 新增突破物品（追加到 `core-items.json`）

| ID | 名称 | 品质 | 分类 | 描述 | 获取途径 |
|----|------|------|------|------|----------|
| `core:breakthrough_lianqi` | 练气散 | common | consumable | 引导灵气入体的散剂 | 探索（20%）、商店 |
| `core:foundation_pill` | 筑基丹（突破） | uncommon | consumable | 凝聚筑基所需的丹药 | 探索（5%）、炼丹 |
| `core:golden_core_stone` | 金丹凝结石 | rare | material | 蕴含天地精华的奇石，助金丹成形 | 奇遇、高级探索（2%） |
| `core:nascent_soul_pill` | 元婴化形丹 | rare | consumable | 引导元婴化形的珍贵丹药 | 奇遇（化神境）、高级妖兽掉落 |
| `core:spirit_transform_dew` | 化神仙露 | epic | consumable | 传说中的仙家露水，可助化神 | 特定奇遇 |
| `core:millennium_lingzhi` | 千年灵芝 | epic | material | 生长千年的灵芝，灵气充沛 | 特定奇遇、极稀有探索 |
| `core:tribulation_pill` | 渡劫丹 | epic | consumable | 渡劫前服用，增强抗雷体质 | 高级炼丹 |
| `core:thunder_lure` | 天雷引 | epic | material | 引动天劫降下的特殊法器 | 特定奇遇 |
| `core:mahayana_scroll` | 大乘心法残卷 | legendary | material | 记载大乘奥义的残卷，集齐可悟大道 | 终极奇遇、渡劫奖励 |
| `core:chaos_stone` | 混沌精石 | legendary | material | 混沌之力凝结的奇石，蕴含创世之力 | 终极奇遇 |

---

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键类型/函数 |
|------|------|---------------|
| `src/game/breakthrough.ts` | 突破系统逻辑壳子 | `checkBreakthroughReady()`, `attemptBreakthrough()`, `getBreakthroughStatus()` |
| `src/game/tribulation.ts` | 渡劫系统逻辑壳子 | `runTribulation()`, `getTribulationDef()` |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/registry.ts` | 新增 `breakthroughReqRegistry` + `tribulationRegistry` 两个 Map，`registerDLC()` 注册逻辑，查询 API | 系统扩展 |
| `src/hooks/useGameEngine.ts` | 重写 `breakthrough` 回调：调用 `checkBreakthroughReady()` → 消耗物品 → 掷骰/渡劫 → 结算 | 核心流程替换 |
| `src/data/core-items.json` | 追加 10 个突破材料物品定义 | 新物品数据 |
| `src/game/events.ts` | 新增若干突破材料获取相关的探索/奇遇事件 | 物品获取途径 |
| `src/game/data.ts` | 导出 `BREAKTHROUGH_ITEM_COSTS`（可选，也可全放 JSON） | 常量定义 |

### 核心逻辑：`breakthrough.ts`

```
// ── 查询突破状态 ──
function getBreakthroughStatus(player: Player): BreakthroughStatus

返回值:
  BreakthroughStatus {
    canAttempt: boolean           // 是否满足所有条件
    nextRealm: Realm | null       // 下一个境界
    req: BreakthroughReqDef | null // 突破需求定义
    expReady: boolean             // 修为是否足够
    itemsReady: ItemCheckResult[] // 每个物品是否足够
    conditionsReady: CondCheckResult[] // 每个前置条件是否满足
    requiresTribulation: boolean  // 是否需要渡劫
    successRate: number           // 预计成功率
  }

逻辑:
  1. 从 REALMS 取 nextRealm
  2. 从 breakthroughReqRegistry 查找 req (by fromRealmIndex)
  3. 如果没有找到 req（凡人→炼气无需求），按旧逻辑只检查 exp
  4. 逐项检查：exp >= expReq、hasItem(各物品)、condition.check(player)
  5. 计算成功率：req.baseSuccessRate + 悟性×compBonus + 幸运×luckBonus
  6. 怜悯机制：每次失败 +5% 累加（从 player.systems.breakthrough.failedAttempts 读取）

// ── 执行突破 ──
function attemptBreakthrough(player: Player): BreakthroughResult

返回值:
  BreakthroughResult {
    success: boolean
    player: Player                // 更新后的 player
    logs: string[]                // 日志消息列表
    triggerTribulation: boolean   // 是否需要触发渡劫（由 UI 处理）
  }

逻辑:
  1. 调用 getBreakthroughStatus 验证
  2. 如果 canAttempt === false，返回失败 + 原因日志
  3. 消耗 itemCosts（调用 removeItem）
  4. 如果 requiresTribulation === true：
     - 不立即突破，返回 triggerTribulation = true
     - 由 useGameEngine 转入渡劫流程
  5. 否则掷骰：
     - roll < successRate → 成功：realmIndex++, recalcStats, 满血满蓝
     - roll >= successRate → 失败：扣修为/心情/健康，累加 failedAttempts
  6. 返回结果
```

### 核心逻辑：`tribulation.ts`

```
// ── 渡劫战斗 ──
function runTribulation(player: Player, tribDef: TribulationDef): TribulationResult

返回值:
  TribulationResult {
    success: boolean
    player: Player
    logs: string[]
    wavesCleared: number         // 通过了几波
    totalWaves: number
  }

逻辑:
  1. 从 tribulationRegistry 查找当前境界的 TribulationDef
  2. 逐波次战斗（复用 combat.ts 的 calcDamage 函数，但不是完整 runCombat）
     - 每波次是 Player vs TribulationWave（当作 Monster 处理）
     - **波间不回血不回蓝**（核心难点）
     - 特殊效果（dot/debuff）在战斗回合中生效
  3. 全部波次通过 → 成功：
     - 境界提升
     - 发放 rewards（经验、属性加成、物品）
     - 记录 tribulationsPassed
  4. 任一波次失败 → 失败：
     - 根据 failure.type 处理后果
     - death → 游戏结束
     - realm_drop → realmIndex -= 1, recalcStats
     - become_loose_immortal → 标记 isLooseImmortal，保留属性但走散仙路线
```

### 成功率公式

```
// 普通突破（非渡劫）
baseRate = req.baseSuccessRate ?? BREAKTHROUGH_BASE_RATE  // 默认 0.5
compBonus = player.comprehension * (req.compBonusMult ?? 0.003)
luckBonus = player.luck * (req.luckBonusMult ?? 0.002)
failBonus = failedAttempts * 0.05   // 怜悯机制，每次失败 +5%（最多 +25%）

successRate = min(0.95, baseRate + compBonus + luckBonus + min(0.25, failBonus))

// 渡劫突破
渡劫不使用概率，而是实战对抗。成功与否取决于：
  - 玩家当前属性 vs 天劫波次属性
  - 战前可使用物品（渡劫丹 = 临时属性加成）
  - 战斗策略（后续可扩展功法选择）
```

### 各境界突破需求（核心 DLC 数据）

| 突破 | 修为要求 | 物品消耗 | 前置条件 | 渡劫 | 基础成功率 |
|------|----------|----------|----------|------|-----------|
| 凡人→炼气 | 100 | 无 | 无 | 否 | 0.7 |
| 炼气→筑基 | 500 | 练气散 ×1 | 无 | 否 | 0.6 |
| 筑基→金丹 | 2000 | 筑基丹（突破）×1, 灵芝草 ×3 | 无 | 否 | 0.5 |
| 金丹→元婴 | 8000 | 金丹凝结石 ×1, 妖丹 ×5 | 击杀妖兽 ≥ 50 | 否 | 0.4 |
| 元婴→化神 | 30000 | 元婴化形丹 ×1, 雪莲花 ×5, 千年灵芝 ×1 | 击败高境界敌人 | 否 | 0.35 |
| 化神→渡劫 | 100000 | 渡劫丹 ×1, 天雷引 ×1 | 完成引雷奇遇 | **是** | N/A（实战） |
| 渡劫→大乘 | 500000 | 大乘心法残卷 ×3, 混沌精石 ×1 | 通过天劫 | **是** | N/A（实战） |

### 天劫波次定义（核心 DLC 数据）

#### 一九天劫（化神→渡劫）— 3 波

| 波次 | 名称 | HP | ATK | DEF | SPD | 特殊效果 |
|------|------|-----|-----|-----|-----|----------|
| 1 | 第一道天雷 | 5000 | 350 | 150 | 40 | 无 |
| 2 | 第二道天雷 | 6000 | 450 | 180 | 45 | 灼烧 DOT（每回合 50 伤害） |
| 3 | 第三道天雷 | 8000 | 600 | 200 | 50 | 碎甲（降低玩家 DEF 30%） |

失败后果：`realm_drop`（退回元婴期）+ 健康归零 + 重伤

#### 二九天劫（渡劫→大乘）— 6 波

| 波次 | 名称 | HP | ATK | DEF | SPD | 特殊效果 |
|------|------|------|------|-----|-----|----------|
| 1 | 第一道紫雷 | 10000 | 800 | 400 | 60 | 无 |
| 2 | 第二道紫雷 | 12000 | 900 | 420 | 62 | 灼烧 DOT 80/回合 |
| 3 | 第三道紫雷 | 14000 | 1000 | 450 | 65 | 碎甲 -40% DEF |
| 4 | 天火劫 | 16000 | 1100 | 480 | 68 | 禁疗（无法回血） |
| 5 | 心魔劫 | 12000 | 1300 | 350 | 72 | 降攻 -30% ATK |
| 6 | 混元雷罚 | 20000 | 1500 | 500 | 75 | 灼烧 + 碎甲 |

失败后果：`become_loose_immortal`（沦为散仙，保留属性，走散仙突破路线）

### useGameEngine 突破回调重写

```
// 伪代码
const breakthrough = () => {
  const status = getBreakthroughStatus(player);

  if (!status.nextRealm) → '已到最高境界'
  if (!status.canAttempt) → 显示缺少条件清单

  if (status.requiresTribulation) {
    // 先消耗物品
    player = consumeBreakthroughItems(player, status.req);
    // 触发渡劫战斗
    const tribResult = runTribulation(player, tribDef);
    if (tribResult.success) {
      // 突破成功 + 渡劫奖励
    } else {
      // 渡劫失败后果
    }
  } else {
    // 消耗物品 → 掷骰
    player = consumeBreakthroughItems(player, status.req);
    roll → success or fail
  }
}
```

---

## UI 方案（@Designer）

### 突破面板重设计

| 元素 | 位置 | 内容 |
|------|------|------|
| 突破需求清单 | 突破按钮旁弹出面板 / 点击展开 | 列出所有需求项，已满足的标绿 ✅，未满足的标红 ❌ |
| 物品需求行 | 清单内 | 图标 + 名称 + (当前数量/需要数量) |
| 条件需求行 | 清单内 | 描述 + ✅/❌ 状态 |
| 成功率显示 | 清单底部 | '预计成功率：XX%' |
| 突破按钮 | 清单底部 | 全部满足时高亮可点击，否则灰色禁用 |

### 渡劫战斗界面

| 元素 | 位置 | 内容 |
|------|------|------|
| 天劫背景 | 全屏遮罩 | 像素风暴雨/雷电背景（可渐进实现，初期纯文字） |
| 波次指示 | 顶部 | '一九天劫 — 第 X/N 波' |
| 战斗日志 | 中央 | 复用 GameLog 样式，实时显示每回合战报 |
| 玩家状态 | 左侧 | HP/MP 条（注意：波间不回复） |
| 天雷状态 | 右侧 | 当前波次 HP 条 + 特殊效果标签 |
| 结算面板 | 战斗结束后 | 成功：奖励清单；失败：后果描述 |

### 交互

1. **突破按钮**：点击后展开需求清单面板（而不是直接尝试突破）
2. **清单内确认**：清单底部有「开始突破」按钮，全部条件满足才可点击
3. **渡劫流程**：突破触发渡劫时，界面切换到渡劫战斗界面（模态全屏）
4. **渡劫中禁止其他操作**：渡劫期间其他按钮置灰
5. **逐波展示**：每波结束后短暂停顿显示「第 X 波通过！」
6. **失败提示**：渡劫失败弹出醒目的结果面板，说明后果

---

## 验证方式

### 功能验证

1. **基础突破流程**
   - 凡人→炼气：修为够即可突破（无物品需求），成功率 70%
   - 炼气→筑基：背包有练气散 ×1 + 修为 ≥ 500，突破后练气散被消耗
   - 缺少物品时点击突破，显示需求清单并标红缺少项

2. **物品条件验证**
   - 筑基→金丹：需要筑基丹 ×1 + 灵芝草 ×3，背包只有灵芝 ×2 时显示 (2/3) 红色
   - 突破成功后背包中对应物品数量正确减少
   - 物品不可堆叠时占多格的情况正确处理

3. **前置条件验证**
   - 金丹→元婴：杀怪数 < 50 时条件显示红色，>= 50 时绿色
   - 元婴→化神：未击败高境界敌人时无法突破

4. **渡劫战斗验证**
   - 化神→渡劫：满足物品 + 条件后触发天劫战斗
   - 波间不回血：第一波结束后 HP 保持战后值进入第二波
   - 特殊效果生效：灼烧 DOT 每回合正确扣血，碎甲正确降低 DEF
   - 全部波次通过：境界提升 + 奖励物品到背包
   - 中途失败：按 failure.type 正确处理（降级/散仙/死亡）

5. **怜悯机制验证**
   - 同境界连续失败 3 次，成功率应为 base + 15%（3 × 5%）
   - 怜悯加成上限 25%
   - 突破成功后 failedAttempts 该境界计数清零

6. **散仙路线验证**（后续扩展，本期仅需标记）
   - 渡劫失败变散仙后，isLooseImmortal = true
   - 后续系统可根据此标记提供散仙专属突破路线

### 边界情况

- 存档兼容：旧存档无 `systems.breakthrough` 字段，加载时默认初始化
- 突破物品在突破失败时是否消耗 → **是**（已消耗，失败代价的一部分）
- 渡劫中途关闭浏览器 → 状态丢失，视为渡劫失败（或可考虑渡劫前存档）
- 满背包时渡劫成功获得奖励物品 → 溢出物品提示并丢弃（addItem 的 overflow 处理）
- DLC 未注册某境界的 BreakthroughReqDef → 回退旧逻辑（仅需 exp）

---

## 依赖关系

### 前置

| 阶段 | 原因 |
|------|------|
| A-4 突破（已完成） | 本设计在其基础上重构 |
| C-1 背包系统（已完成） | 突破需要消耗物品，依赖 `inventory.ts` 的 `hasItem()` / `removeItem()` |
| B-1 ~ B-5 事件引擎（已完成） | 突破材料通过事件获取，需要事件系统支持 |

### 后续

| 阶段 | 关联 |
|------|------|
| C-2 丹药系统 v2 | 突破丹/渡劫丹可通过炼丹获得 |
| C-4 商店系统 | 低级突破材料可在商店购买 |
| D 功法与技能 | 渡劫战斗可选用功法技能 |
| G-2 转世重修 | 大乘后转世系统 |
| G-5 仙道境界 | 大乘之后的境界扩展，复用同一突破框架 |
| G-6 洪荒终局 | 后续天劫（三九、四九…）扩展 |
