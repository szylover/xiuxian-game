# 设计文档：仙道境界（飞升）

- **任务**: T0033
- **Issue**: [#103](https://github.com/szylover/xiuxian-game/issues/103)
- **日期**: 2026-04-07
- **状态**: 📐 设计完成，待实现
- **前置**: T0029（突破系统重构+渡劫）✅、T0058（境界表 DLC 化）✅
- **下游**: T0034（洪荒终局）、CP-03（仙道飞升内容包）、CP-04（洪荒天地）

---

## 概述

仙道境界是凡界修炼体系（凡人→大乘）的延伸。当修士突破大乘期（index 7）的极限后，触发"飞升"事件，进入仙界修炼体系。飞升是整个后期内容管线的瓶颈节点——T0034 洪荒终局、CP-03 仙道飞升内容包、CP-04 洪荒天地均依赖此系统壳子。

**核心原则：系统 ≠ 内容。**

T0033 只负责建造"飞升系统壳子"——即从凡界到仙界的转换机制、仙道境界注册表扩展点、飞升触发逻辑、以及 UI 适配。具体仙界内容（仙道境界数值、仙界区域、仙界妖兽、仙界事件、仙界物品/装备/配方等）全部由 **CP-03 仙道飞升内容包** 通过 `registerDLC()` 挂载，T0033 不硬编码任何仙界数值数据。

### 飞升意味着什么

| 维度 | 凡界 | 仙界 |
|------|------|------|
| 境界范围 | index 0–7（凡人→大乘） | index 8+（由 CP-03 定义） |
| 寿命 | 有限（几千年） | 极长甚至无限（由数据定义） |
| 活动区域 | 凡界区域 | 仙界区域（由 CP-03 注册） |
| 数值量级 | 万级 HP、千级攻防 | 十万～百万级（指数增长） |
| 突破机制 | 突破+渡劫 | 仙劫（更强的天劫变体） |
| 内容来源 | core DLC | CP-03 / CP-04 DLC |

---

## 一、RealmDef 扩展

### 1.1 新增字段

当前 `RealmDef`（定义在 `src/game/types.ts`）只有基础属性字段，无法区分凡界和仙界境界。需要扩展以下字段：

```ts
export interface RealmDef {
  // ── 现有字段（保持不变）──
  id: string;
  name: string;
  index: number;
  expReq: number;
  lifespanBonus: number;
  hpBase: number;
  mpBase: number;
  atkBase: number;
  defBase: number;
  speedBase: number;
  mentalBase: number;

  // ── T0033 新增字段（全部可选，向后兼容）──
  tier?: 'mortal' | 'immortal' | 'primordial';
    // 境界阶层：'mortal'=凡界(默认)、'immortal'=仙界、'primordial'=洪荒（T0034 预留）
    // 未设置时默认为 'mortal'，Core 的 8 个凡界境界无需修改
  ascensionRequired?: boolean;
    // 是否需要飞升才能进入此境界（仙界境界 = true）
  tierTransition?: 'ascension' | 'primordial_ascension';
    // 从上一个境界到当前境界的跨阶转换类型
    // 'ascension' = 飞升（凡→仙），'primordial_ascension' = 洪荒飞升（仙→洪荒）
    // 无值 = 同阶层内的普通突破
}
```

### 1.2 设计考量

- **向后兼容**：所有新字段均为 `optional`，core 的 8 个凡界境界无需修改 `realms.json`
- **三阶体系预留**：`tier` 字段用 union type 预留 `'primordial'`（T0034 洪荒终局），但本次只实现 `'mortal' | 'immortal'`
- **数据驱动判断**：系统通过 `tier` 和 `ascensionRequired` 判断是否需要飞升流程，而非硬编码 index 阈值
- 旧代码中用 `REALMS[player.realmIndex]` 或 `getRealmDef(index)` 访问境界的地方，在飞升前行为完全不变

---

## 二、飞升触发机制

### 2.1 飞升条件

飞升不是普通的"突破"，它是一个独立的特殊事件流程。触发条件由 **飞升定义 `AscensionDef`** 描述（数据驱动，通过 DLC 注册）：

```ts
export interface AscensionDef {
  id: string;                         // 'core:ascension_mortal_to_immortal'
  name: string;                       // '飞升仙界'
  description: string;                // '大乘圆满，天道感应，飞升仙界…'
  fromTier: 'mortal' | 'immortal';    // 源阶层
  toTier: 'immortal' | 'primordial';  // 目标阶层
  fromRealmIndex: number;             // 源阶层最高境界 index（大乘=7）
  toRealmIndex: number;               // 目标阶层最低境界 index（仙人=8）

  // ── 飞升前置条件 ──
  minExp: number;                     // 修为下限（大乘圆满修为）
  itemCosts: { itemId: string; count: number }[];  // 消耗物品
  conditions: {                       // 额外谓词条件
    id: string;
    description: string;
    check: (p: Player) => boolean;
  }[];

  // ── 飞升天劫（可选）──
  tribulationId?: string;             // 飞升时绑定的飞升天劫 ID（由 TribulationDef 注册）

  // ── 飞升结算 ──
  rewards: {
    bonusExp: number;                 // 飞升后额外修为
    lifespanBonus: number;            // 额外寿命加成
    items: { itemId: string; count: number }[];
  };
  statReset?: {                       // 飞升时的属性变化（可选）
    hpMultiplier?: number;            // HP 乘数（飞升后 HP 按新境界重算）
    mpMultiplier?: number;
    expReset?: boolean;               // 是否清零修为（通常 true，从仙界 0 开始修炼）
  };
}
```

### 2.2 飞升流程

```
玩家在大乘期（index 7）修炼 → 修为达到飞升门槛
  → 系统检测到 AscensionDef 匹配
  → UI 显示「飞升」按钮（替代/附加在突破按钮旁）
  → 玩家点击飞升
  → 检查前置条件（物品/修为/谓词）
  → 消耗物品
  → [可选] 触发飞升天劫（走 tribulation 流程）
  → 天劫通过 / 无天劫
  → realmIndex 设为 toRealmIndex（如 8）
  → 属性按新境界 RealmDef 重算（recalcStats）
  → [可选] 修为清零
  → 寿命 += 新境界 lifespanBonus + 飞升奖励 lifespanBonus
  → 发放飞升奖励物品
  → 日志输出飞升文案
  → UI 播放飞升动画/特效
  → 自动解锁仙界区域（如果 CP-03 注册了对应区域）
```

### 2.3 飞升失败

如果飞升天劫失败，后果由 `TribulationDef.failureType` 决定（复用现有渡劫失败逻辑）：
- `death`：形神俱灭（游戏结束）
- `realm_drop`：跌回大乘初期
- `become_loose_immortal`：散仙——保留大部分属性但无法走正统飞升路线（需要另找契机）

### 2.4 散仙机制

散仙是飞升天劫失败的后果之一（复用 `breakthrough.isLooseImmortal` 字段）：
- 散仙无法再次正常飞升
- 但可以通过特殊途径（DLC 事件/任务链提供）重新获得飞升资格
- 散仙的属性上限略低于正式仙人（具体数值由 CP-03 决定）
- 这给了玩家"失败但不死"的软失败路径

---

## 三、Player 状态扩展

### 3.1 现有字段复用

| 字段 | 现有位置 | 飞升后行为 |
|------|----------|-----------|
| `player.realmIndex` | `Player` 接口 | 跳到仙界境界 index（如 8） |
| `player.exp` | `Player` 接口 | 可选清零，按仙界重新积累 |
| `player.lifespan` | `Player` 接口 | 加上仙界境界的 lifespanBonus |
| `player.systems.breakthrough` | `Player.systems` | 失败次数等继续沿用 |

### 3.2 新增 Player.systems.ascension

```ts
interface AscensionState {
  hasAscended: boolean;               // 是否已飞升（至少一次）
  currentTier: 'mortal' | 'immortal' | 'primordial';  // 当前所在阶层
  ascensionHistory: {                  // 飞升记录
    fromTier: string;
    toTier: string;
    atAge: number;                     // 飞升时玩家年龄（月）
    realmIndexBefore: number;
  }[];
  ascensionFailCount: number;          // 飞升天劫失败次数
}
```

- 用 `player.systems.ascension` 存储，走现有的 `systems: Record<string, unknown>` 动态扩展路线
- **存档兼容**：旧存档无 `ascension` 字段，系统读取时默认为 `{ hasAscended: false, currentTier: 'mortal', ascensionHistory: [], ascensionFailCount: 0 }`

---

## 四、注册表扩展

### 4.1 新增注册表

| 注册表 | key 类型 | value 类型 | 用途 |
|--------|----------|-----------|------|
| `ascensionRegistry` | `string` (id) | `AscensionDef` | 飞升定义 |

### 4.2 DLCPack 扩展

```ts
export interface DLCPack {
  // ...现有字段...
  ascensions?: AscensionDef[];    // T0033 飞升定义
}
```

### 4.3 registerDLC 变更

`registry/dlc.ts` 注册/注销 `ascensions`（与其他内容类型同模式）：

```
if (pack.ascensions)
  for (const asc of pack.ascensions) ascensionRegistry.set(asc.id, asc);
```

### 4.4 查询 API

`registry/queries.ts` 新增：

```
getAscensionDef(id: string): AscensionDef | undefined
getAscensionForRealm(fromRealmIndex: number): AscensionDef | undefined
  // 查找 fromRealmIndex 匹配的飞升定义（凡界飞升 = 7→8）
getAllAscensionDefs(): AscensionDef[]
```

---

## 五、与现有系统的交互

### 5.1 突破系统（breakthrough/）

**变更点**：`getBreakthroughStatus()` 需要增加飞升检测。

当 `player.realmIndex` 等于当前阶层最高境界（如凡界 7=大乘），且没有更高的同阶层境界时：
- `nextRealm` 应返回下一阶层的首个境界（如仙人 index 8）
- 如果该跨阶层跳转需要飞升（`RealmDef.ascensionRequired === true`），设置一个标志 `requiresAscension: true`
- 突破按钮此时不走普通突破流程，而是提示"需要飞升"

**修改文件**：`src/game/breakthrough/status.ts`  
**新增返回字段**：`BreakthroughStatus.requiresAscension: boolean`、`BreakthroughStatus.ascensionDef: AscensionDef | null`

### 5.2 渡劫系统（tribulation/）

**无需修改渡劫系统核心逻辑。** 飞升天劫直接复用 `TribulationDef`，只是 `forRealmIndex` 设为 7（大乘期的渡劫），或使用独立的 `AscensionDef.tribulationId` 指向一条专用天劫定义。

飞升天劫的 wave 数据由 CP-03 注册，强度远超凡界天劫。

### 5.3 瓶颈系统（bottleneck.ts）

**无需修改瓶颈系统核心逻辑。** CP-03 可为仙界境界注册瓶颈（`targetType: 'realm'`），系统自动生效。

飞升前的最后一个凡界瓶颈（如大乘瓶颈）由 core DLC 或 CP-03 注册。

### 5.4 体修系统（body-cultivation.ts）

**无需修改。** 体修境界和气修境界独立。飞升后体修继续按自己的体系走。

CP-03 可选择注册更高阶的体修境界（bodyRealms index 7+），但这不在 T0033 范围内。

### 5.5 地图系统（map.ts）

**无需修改核心逻辑。** 仙界区域由 CP-03 通过 `registerDLC({ regions: [...] })` 注册，设 `minRealm: 8` 确保凡界玩家无法进入。

飞升后，系统自动解锁 `minRealm <= player.realmIndex` 的新区域。

### 5.6 死亡系统（death.ts）

**无需修改。** 飞升后死亡触发条件由 CP-03 注册新的 `DeathTriggerDef`（如"仙劫陨落"）。

### 5.7 修仙履历（chronicle.ts）

飞升事件应自动记录到修仙履历。

**修改文件**：飞升逻辑中调用 `recordChronicleEvent()` 记录飞升里程碑。

### 5.8 成就系统

CP-03 可注册飞升相关成就（如"首次飞升"），复用现有 `AchievementDef` 机制。

---

## 六、数据结构变更汇总

### 6.1 types.ts 变更

| 变更类型 | 内容 |
|----------|------|
| 修改 | `RealmDef` 增加 `tier?`、`ascensionRequired?`、`tierTransition?` |
| 新增 | `AscensionDef` 接口 |
| 新增 | `AscensionState` 接口 |
| 修改 | `DLCPack` 增加 `ascensions?` |

### 6.2 realms.json 变更

Core 的 8 个凡界境界 **不需要修改**（`tier` 字段缺省默认 `'mortal'`）。

CP-03 注册的仙界境界示例（不在 T0033 实现范围内，仅为验证设计）：

```json
[
  { "id": "cp-03:realm_immortal",      "name": "仙人", "index": 8,  "tier": "immortal", "ascensionRequired": true, "tierTransition": "ascension", "expReq": 2000000,  "lifespanBonus": 120000, "hpBase": 80000,  "mpBase": 30000,  "atkBase": 5000,  "defBase": 2800,  "speedBase": 140, "mentalBase": 5000  },
  { "id": "cp-03:realm_golden_immortal","name": "金仙", "index": 9,  "tier": "immortal", "expReq": 10000000, "lifespanBonus": 600000, "hpBase": 200000, "mpBase": 80000,  "atkBase": 12000, "defBase": 7000,  "speedBase": 200, "mentalBase": 12000 },
  { "id": "cp-03:realm_daluo",          "name": "大罗金仙", "index": 10, "tier": "immortal", "expReq": 50000000, "lifespanBonus": 0, "hpBase": 500000, "mpBase": 200000, "atkBase": 30000, "defBase": 18000, "speedBase": 300, "mentalBase": 30000 }
]
```

> 以上数值仅为示意，实际数值由 @Content 设计。

---

## 七、游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键函数/类型 |
|------|------|---------------|
| `src/game/ascension.ts` | 飞升系统核心逻辑壳子 | `checkAscensionReady()`、`attemptAscension()`、`getAscensionStatus()`、`getAscensionState()`、`setAscensionState()` |
| `src/game/ascension-loader.ts` | JSON→AscensionDef 的 Loader（编译谓词条件） | `loadAscensionDefs()`，模式同 `breakthrough-loader.ts` |
| `src/data/texts/ascension.ts` | 飞升相关中文文案 | `ASCENSION_TEXTS`（飞升成功/失败/条件不足等文案） |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | `RealmDef` 加 3 个可选字段；新增 `AscensionDef`、`AscensionState`；`DLCPack` 加 `ascensions?` | 类型扩展 |
| `src/game/registry/stores.ts` | 新增 `ascensionRegistry: Map<string, AscensionDef>` | 注册表 |
| `src/game/registry/dlc.ts` | 注册/注销 `ascensions` | DLC 流程 |
| `src/game/registry/queries.ts` | 新增 `getAscensionDef()`、`getAscensionForRealm()`、`getAllAscensionDefs()` | 查询 API |
| `src/game/registry/index.ts` | re-export 新增类型和查询函数 | barrel |
| `src/game/breakthrough/status.ts` | `BreakthroughStatus` 增加 `requiresAscension`、`ascensionDef` 字段；`getBreakthroughStatus()` 增加飞升检测逻辑 | 突破→飞升引导 |
| `src/game/player/stats.ts` | `getNextRealm()` 需正确处理跨阶层的下一境界（含 `ascensionRequired` 标记） | 属性系统适配 |
| `src/hooks/useSystemActions.ts` | 新增 `ascend()` 回调：调用 `attemptAscension()` → 处理结果 → 日志/Toast/动画 | 用户交互 |
| `src/data/texts/index.ts` | re-export `ASCENSION_TEXTS` | 文案集中管理 |

### 核心逻辑：`ascension.ts`

```
function getAscensionState(player) → AscensionState
  // 从 player.systems.ascension 读取，缺省返回默认值

function setAscensionState(player, state) → Player

function getAscensionStatus(player) → AscensionStatus
  // 返回 { canAscend, ascDef, expReady, itemsReady[], conditionsReady[], currentTier }
  // 查询 ascensionRegistry 中 fromRealmIndex === player.realmIndex 的定义
  // 如果没有匹配的飞升定义 → canAscend = false

function attemptAscension(player) → AscensionResult
  // 1. 检查 getAscensionStatus
  // 2. 消耗物品
  // 3. 如果 ascDef.tribulationId 存在 → 返回 triggerTribulation = true
  // 4. realmIndex = ascDef.toRealmIndex
  // 5. 可选清零 exp
  // 6. recalcStats()
  // 7. 发放奖励
  // 8. 更新 AscensionState
  // 9. 记录修仙履历
  // 10. 返回 AscensionResult { success, player, logs, triggerTribulation }
```

### 飞升天劫的特殊处理

飞升天劫与普通渡劫区别：
- 普通渡劫由突破流程触发（`BreakthroughReqDef.requiresTribulation`）
- 飞升天劫由飞升流程触发（`AscensionDef.tribulationId`）

两者都复用 `tribulation/run.ts` 的 `runTribulation()` 执行战斗，但查找方式不同：
- 普通渡劫：`getTribulationDef(player.realmIndex)` —— 按 `forRealmIndex` 查
- 飞升天劫：直接用 `AscensionDef.tribulationId` 从注册表取

**需要修改 `getTribulationDef()` 支持按 ID 查询**，或新增 `getTribulationById(id: string)` 查询函数。推荐后者（新增函数，不破坏现有接口）。

---

## 八、UI 方案（@Designer）

### 8.1 飞升按钮

| 元素 | 位置 | 描述 |
|------|------|------|
| 飞升按钮 | ActionPanel 或 StatusPanel，突破按钮旁 | 当 `requiresAscension` 为 true 时显示（金色/彩色高亮），替代灰色的"突破"按钮 |
| 飞升条件面板 | 突破面板底部的子区域 | 列出飞升所需物品、修为、前置条件的完成情况 |

### 8.2 飞升动画/特效

飞升是游戏中极少触发的重大里程碑事件，需要有仪式感：

- **飞升弹窗**：全屏半透明遮罩 + 居中卡片，展示飞升文案、境界变化、奖励列表
- **境界阶层标识**：飞升后，状态栏的境界名称旁可加一个「仙」字样的小标签，表明已进入仙界
- **日志高亮**：飞升日志使用特殊颜色（金色）和格式

### 8.3 境界阶层 UI 标识

在 StatusBar 和 LeftPanel 的境界名显示中，如果当前 tier 不是 'mortal'，显示阶层前缀标签：

| tier | 标签 | 颜色 |
|------|------|------|
| `mortal` | （无） | 默认 |
| `immortal` | 「仙」 | 金色 |
| `primordial` | 「洪荒」 | 紫色（T0034 预留） |

### 8.4 开始界面 DLC 选择

CP-03（仙道飞升）作为可选 DLC，在开始界面的 DLC 选择区域显示。启用后凡界大乘即可飞升仙界。未启用则大乘为终点。

---

## 九、文案集中管理

新增 `src/data/texts/ascension.ts`，导出 `ASCENSION_TEXTS`：

```ts
export const ASCENSION_TEXTS = {
  // 飞升按钮
  ascendButton: '飞升',
  ascendButtonTooltip: '突破凡界极限，飞升仙界',

  // 条件检查
  expInsufficient: (realmName: string, required: number, current: number) =>
    `修为不足，${realmName}飞升需要 ${required} 修为（当前 ${current}）`,
  materialInsufficient: (name: string, need: number, have: number) =>
    `飞升材料不足：${name} 需要 ${need}，当前 ${have}`,
  conditionNotMet: (desc: string) => `飞升条件未满足：${desc}`,
  looseImmortalBlocked: '散仙之身无法正常飞升，需寻求特殊契机',

  // 飞升过程
  consumeItem: (name: string, count: number) =>
    `消耗 ${name} ×${count}`,
  tribulationRequired: '天道感应，飞升天劫降临！',
  ascensionBegin: (name: string) =>
    `天地法则共鸣，${name} 开始飞升…`,

  // 成功
  success: (realmName: string) =>
    `✨ 飞升成功！踏入${realmName}，超脱凡尘！`,
  successBonus: (lifespanBonus: number) =>
    `寿元大增 +${lifespanBonus} 月`,
  rewardItem: (name: string, count: number) =>
    `飞升奖励：获得 ${name} ×${count}`,

  // 失败
  failed: (desc: string) => `飞升失败！${desc}`,
  realmDrop: (realmName: string) =>
    `飞升天劫失败，跌落至${realmName}`,
  looseImmortal: '飞升天劫失败，化为散仙…修仙之路另辟蹊径',
  annihilated: '飞升天劫失败，形神俱灭！',

  // 修仙履历
  chronicleAscension: (fromRealm: string, toRealm: string) =>
    `突破凡界极限，从${fromRealm}飞升至${toRealm}，踏入仙道`,
};
```

---

## 十、DLC 扩展性设计

### 10.1 CP-03 仙道飞升内容包挂载方式

CP-03 只需调用 `registerDLC()`，挂载以下数据即可无缝扩展仙界内容：

```ts
registerDLC({
  id: 'cp-03',
  name: '仙道飞升',
  description: '仙界境界 · 仙界区域 · 仙界妖兽 · 仙界事件 · 仙界物品',
  version: '1.0.0',
  // 仙道境界（index 8–10+）
  realms: [ /* 仙人、金仙、大罗金仙… */ ],
  // 飞升定义
  ascensions: [{
    id: 'cp-03:ascension_to_immortal',
    fromTier: 'mortal', toTier: 'immortal',
    fromRealmIndex: 7, toRealmIndex: 8,
    // ...条件定义...
  }],
  // 飞升天劫
  tribulations: [{
    id: 'cp-03:trib_ascension',
    forRealmIndex: 7,   // 或使用独立查找
    // ...天劫定义...
  }],
  // 仙界突破需求
  breakthroughReqs: [ /* 仙人→金仙突破条件 */ ],
  // 仙界区域
  regions: [ /* 仙界各区域 */ ],
  // 仙界妖兽
  monsters: [ /* 仙界妖兽 */ ],
  // 仙界事件
  events: [ /* 仙界事件池 */ ],
  // 仙界物品/装备/配方
  items: [ /* 仙界物品 */ ],
  equips: [ /* 仙界装备 */ ],
  recipes: [ /* 仙界炼丹配方 */ ],
  // 仙界功法
  techniques: [ /* 仙界功法 */ ],
  // 仙界任务链
  questChains: [ /* 仙界任务 */ ],
  // 仙界瓶颈
  bottlenecks: [ /* 仙界境界瓶颈 */ ],
  // 仙界成就
  achievements: [ /* 飞升相关成就 */ ],
});
```

### 10.2 CP-04 洪荒天地扩展

CP-04 依赖 CP-03 + T0034，通过注册 `tier: 'primordial'` 的境界 + `fromTier: 'immortal', toTier: 'primordial'` 的飞升定义，实现仙→洪荒的第二次飞升。T0033 的三阶层设计天然支持此扩展。

### 10.3 核心包（core）的 AscensionDef

**core 包不注册任何 AscensionDef。** 只有启用了 CP-03 后，飞升系统才有实际内容。Core 大乘为终点。

这确保了：
- 不启用 CP-03 的玩家：大乘是最高境界，突破面板显示"已达巅峰"
- 启用 CP-03 的玩家：大乘后出现"飞升"按钮

---

## 十一、实现步骤拆分

本任务可分为以下子步骤，按顺序实现：

| 步骤 | 内容 | 工作量 |
|------|------|--------|
| 1 | `types.ts`：扩展 `RealmDef`（3 个可选字段）+ 新增 `AscensionDef`、`AscensionState` + `DLCPack.ascensions` | 小 |
| 2 | `registry/`：新增 `ascensionRegistry`（stores.ts + dlc.ts + queries.ts + index.ts） | 小 |
| 3 | `ascension.ts`：飞升系统核心逻辑（`getAscensionStatus`、`attemptAscension`、状态读写） | 中 |
| 4 | `ascension-loader.ts`：JSON 飞升定义 Loader（编译条件谓词），模式同 `breakthrough-loader.ts` | 小 |
| 5 | `breakthrough/status.ts`：增加飞升检测字段 `requiresAscension` + `ascensionDef` | 小 |
| 6 | `queries.ts`：新增 `getTribulationById(id)` 查询（飞升天劫按 ID 查找） | 小 |
| 7 | `data/texts/ascension.ts`：飞升文案 + index.ts re-export | 小 |
| 8 | `hooks/useSystemActions.ts`：新增 `ascend()` 回调 | 中 |
| 9 | UI 适配：ActionPanel 飞升按钮 + 飞升条件面板 + 飞升弹窗 + 境界阶层标签 | 中 |
| 10 | 调试面板：Debug 中添加"设为大乘满修为"+"直接飞升"按钮 | 小 |
| 11 | 集成测试 + 文档更新（test-guide.md + changelog.ts） | 小 |

---

## 十二、验证方式

### 在浏览器中测试

1. **无 CP-03 时**：大乘为终点，突破面板显示"已达巅峰"，无飞升按钮。确认不影响现有玩法。
2. **有 CP-03 时**：
   - Debug 面板将境界设为大乘，修为设满
   - 确认飞升按钮出现
   - 点击飞升，检查前置条件面板是否正确显示
   - 满足条件后飞升，确认 realmIndex 变为 8
   - 确认属性按仙界境界重算
   - 确认日志输出飞升文案
   - 确认修仙履历记录飞升事件
3. **飞升天劫**：
   - Debug 降低玩家属性使天劫失败
   - 确认失败后果（跌落/散仙/死亡）正确执行
4. **存档兼容**：
   - 加载旧存档（无 ascension 字段），确认不报错
   - 飞升后存档→读档，确认状态正确恢复

### 测试用例（初稿，将写入 test-guide.md）

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|----------|
| 1 | 无 CP-03 大乘终点 | 不启用仙道 DLC，Debug 设为大乘 | 突破面板显示"已达巅峰"，无飞升按钮 |
| 2 | 飞升按钮出现 | 启用 CP-03，Debug 设为大乘 + 满修为 | 出现金色"飞升"按钮 |
| 3 | 飞升条件不足 | 点击飞升但缺少物品 | 提示缺少的物品和条件 |
| 4 | 飞升成功 | 满足全部条件后飞升 | realmIndex=8，属性重算，寿命增加，日志金色文案 |
| 5 | 飞升修为清零 | 飞升成功后 | exp 归零（如配置了 expReset） |
| 6 | 飞升天劫成功 | 足够强的属性通过天劫 | 飞升成功，发放奖励 |
| 7 | 飞升天劫失败→散仙 | 属性不足导致天劫失败 | 化为散仙，无法再次正常飞升 |
| 8 | 飞升天劫失败→死亡 | 天劫 failureType=death | 游戏结束画面 |
| 9 | 修仙履历记录 | 飞升成功后打开履历 | 显示飞升里程碑记录 |
| 10 | 存档兼容 | 加载无 ascension 字段的旧存档 | 正常运行，默认凡界状态 |

---

## 十三、调试面板需求

需要更新 `src/components/debug/` 下的调试面板，新增以下内容：

| 调试功能 | 位置 | 描述 |
|----------|------|------|
| "设为大乘满修为" 按钮 | DebugStatsTab | 一键设置 realmIndex=7 + exp=飞升门槛修为，快速测试飞升 |
| "直接飞升" 按钮 | DebugStatsTab | 跳过条件检查直接执行飞升（需有 CP-03 已注册的飞升定义） |
| "切换散仙状态" 按钮 | DebugStatsTab | 切换 isLooseImmortal 标志 |
| 当前阶层显示 | DebugStatsTab | 显示 currentTier（凡/仙/洪荒） |

---

## 十四、依赖关系

```
T0029（突破系统重构+渡劫）✅
T0058（境界表 DLC 化）✅
      ↓
  ┌─ T0033 仙道境界（飞升）← 本任务
  │
  ├─→ CP-03 仙道飞升内容包（仙界境界+区域+妖兽+事件+装备+任务）
  ├─→ T0034 洪荒终局（洪荒阶层 + 圣人系统壳子）
  └─→ CP-04 洪荒天地（洪荒内容包，依赖 T0034 + CP-03）
```

---

## 附录：Core realms.json 不变性承诺

Core 的 8 个凡界境界（index 0–7）**不做任何修改**。新增的 `tier`、`ascensionRequired`、`tierTransition` 字段全部可选，缺省值等价于 `{ tier: 'mortal', ascensionRequired: false, tierTransition: undefined }`。

这确保：
- 老存档 100% 兼容
- Core DLC 无需更新 `realms.json`
- 不启用 CP-03 的玩家完全无感知
