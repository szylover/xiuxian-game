# 设计文档：瓶颈系统（Bottleneck System）

任务：T0064  
日期：2026-04-01

---

## 概述

瓶颈是修炼道路上的"天花板"，在特定境界节点或功法修炼到关键等级时自动触发。触发后，玩家的修为/功法经验照常累积，但**无法发起突破**，直到以特定方式打破瓶颈。

瓶颈系统的设计目标：
1. **叙事节奏感**：在金丹、元婴、化神等关键节点制造停顿，强化修炼进阶的仪式感
2. **多样化解锁**：5 种解锁方式（任务、战斗、论道、顿悟、坚韧修炼），玩家可自选路线
3. **DLC 友好**：`BottleneckDef` 通过 `registerDLC()` 注册，核心数据是 `core` DLC 的一部分
4. **与现有系统正交集成**：在 `attemptBreakthrough()` 前插入一次检查，不侵入突破/功法/体修核心逻辑

---

## 数据结构

### 1. 瓶颈解锁方式 `BottleneckUnlockMethod`

```ts
// 解锁方式联合类型
type BottleneckUnlockMethod =
  | { type: 'quest';       questId: string }          // 完成指定任务链节点
  | { type: 'combat';      monsterId: string; minRealmIndex?: number }  // 击败特定妖兽/Boss
  | { type: 'discourse';   npcId: string; cost: { itemId: string; count: number }[] } // 与 NPC 论道
  | { type: 'epiphany';    locationTag: string; baseChance: number }    // 在特定地图闲逛灵光一闪
  | { type: 'persistence'; cultivationCount: number }                   // 累计修炼 N 次自然突破
```

### 2. 瓶颈定义 `BottleneckDef`

```ts
interface BottleneckDef {
  id: string;               // 'core:bn_jindanqingyuan' 等，命名空间约定 core:bn_*

  // ── 触发范围 ──
  targetType: 'realm' | 'technique' | 'body_realm';
                            // 境界瓶颈 / 功法瓶颈 / 体修瓶颈

  // 当 targetType === 'realm' 时：阻止从 fromRealmIndex 向更高境界突破
  fromRealmIndex?: number;

  // 当 targetType === 'body_realm' 时：阻止体修从 fromBodyRealmIndex 向更高境界突破
  fromBodyRealmIndex?: number;

  // 当 targetType === 'technique' 时：阻止功法 techniqueId 在 atLevel 继续升级
  techniqueId?: string;
  atLevel?: number;

  // ── 展示 ──
  name: string;             // '金丹清缘瓶颈'
  description: string;      // 给玩家的叙述文本（"金丹既成，然道心未圆，感灵气阻隔……"）
  hint: string;             // 解锁提示（"或许需要寻访高人，或在奇境中寻求灵光"）

  // ── 解锁方式（至少一种，玩家满足任意一种即可解锁）──
  unlockMethods: BottleneckUnlockMethod[];

  // ── 可选：解锁时的奖励（除正常突破外的额外奖励）──
  unlockBonus?: {
    expBonus?: number;           // 解锁时额外修为
    statBonus?: Partial<Record<'atk' | 'def' | 'comprehension' | 'luck', number>>;
    items?: { itemId: string; count: number }[];
  };

  // ── DLC 扩展性 ──
  condition?: (player: Player) => boolean; // 该瓶颈是否对当前玩家生效（默认始终生效）
}
```

### 3. 玩家状态扩展 `BottleneckState`

挂载在 `player.systems.bottleneck`，不修改顶层 `Player` 接口：

```ts
// player.systems.bottleneck
interface BottleneckState {
  // 已激活的瓶颈（正在被卡住）
  active: Record<string, {
    bottleneckId: string;
    activatedAt: number;       // 激活时的游戏年份（player.year）
    // 各解锁方式进度（根据 type 记录不同字段）
    progress: {
      persistenceCultivationCount?: number; // 坚韧修炼累计次数
    };
  }>;

  // 已解锁（历史记录，可用于成就/叙事）
  unlocked: Record<string, {
    bottleneckId: string;
    unlockedAt: number;         // 解锁时的游戏年份
    method: BottleneckUnlockMethod['type']; // 用哪种方式解锁的
  }>;
}
```

### 4. `TechniqueDef` 扩展

在现有 `TechniqueDef` 上追加可选字段（向后兼容）：

```ts
interface TechniqueDef {
  // ... 现有字段 ...
  levelBottlenecks?: number[];  // 哪些等级会触发瓶颈，例如 [5, 10]
                                // 触发的具体 BottleneckDef 由 id 约定推导：
                                // core:bn_technique_<techniqueId>_lv<level>
}
```

### 5. DLC 注册表扩展

```ts
// DLCPack 新增可选字段
interface DLCPack {
  // ... 现有字段 ...
  bottlenecks?: BottleneckDef[];  // 新增
}

// registry.ts 新增
const bottleneckRegistry = new Map<string, BottleneckDef>(); // key = id
```

---

## 核心数据：境界瓶颈配置（core DLC）

> 以下是 `src/data/core-bottlenecks.ts` 的初始数据设计，共 6 个境界瓶颈节点。

| 瓶颈 ID | 触发节点 | 名称 | 解锁方式（任选其一） |
|---------|---------|------|---------------------|
| `core:bn_jinji` | 金丹期（realmIndex=3）→ 元婴 | 金丹清缘瓶颈 | ① 完成奇遇任务"问道峰顶"；② 击败金丹后期 Boss"黑蛟"；③ 在仙灵山脉探索触发顿悟（8%）；④ 累计修炼 80 次 |
| `core:bn_yuanying` | 元婴期（realmIndex=4）→ 化神 | 元婴凝神瓶颈 | ① 完成任务"元婴渡世论"；② 与 NPC 太虚真人论道（消耗"论道符"×1）；③ 在归墟秘境顿悟（5%）；④ 累计修炼 120 次 |
| `core:bn_huashen` | 化神期（realmIndex=5）→ 渡劫 | 化神证道瓶颈 | ① 完成任务"道心铸就"；② 击败道境强敌"化神试炼傀儡"；③ 与 NPC 天机老人论道（消耗"虚道玉简"×1）；④ 在混沌灵地顿悟（3%）；⑤ 累计修炼 200 次 |
| `core:bn_body_yusui` | 体修玉髓（bodyRealmIndex=3）→ 金刚 | 玉髓凝血瓶颈 | ① 完成任务"以血化刚"；② 击败体修强敌"玄铁傀儡"；③ 累计修炼 60 次 |
| `core:bn_body_jingang` | 体修金刚（bodyRealmIndex=4）→ 龙象 | 金刚化龙瓶颈 | ① 击败龙族妖兽"蛟龙"；② 与 NPC 论道消耗"龙血精华"×2；③ 在龙脉地带顿悟（5%）；④ 累计修炼 100 次 |
| `core:bn_tech_basic_lv5` | 基础吐纳功第 5 级 | 吐纳入微瓶颈 | ① 顿悟（10%，在任意地图）；② 累计修炼 40 次 |

---

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键类/函数 |
|------|------|-------------|
| `src/game/bottleneck.ts` | 瓶颈状态管理核心逻辑 | `checkBottleneck()`, `activateBottleneck()`, `unlockBottleneck()`, `getActiveBottlenecks()`, `tickPersistenceCultivation()` |
| `src/data/core-bottlenecks.ts` | 核心 DLC 瓶颈数据（BottleneckDef[]） | 6 个境界/功法瓶颈定义 |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | 新增 `BottleneckDef`、`BottleneckUnlockMethod`、`BottleneckState` 类型；`TechniqueDef` 追加 `levelBottlenecks?` | 类型基础 |
| `src/game/registry.ts` | 新增 `bottleneckRegistry: Map<string, BottleneckDef>`；`registerDLC()` 中处理 `bottlenecks` 字段；新增 `getBottleneckDef(id)`、`getAllBottlenecksForRealm(fromRealmIndex)`、`getAllBottlenecksForTechnique(techniqueId, level)` | 数据查询 API |
| `src/game/breakthrough/attempt.ts` | 在 `attemptBreakthrough()` 开头插入 `checkBottleneck(player, 'realm', realmIndex)` 检查，若返回 `{ blocked: true }` 则提前返回带瓶颈信息的失败结果 | 突破前门卫 |
| `src/game/technique.ts` | 在功法升级逻辑中，升到 `levelBottlenecks[]` 的等级时调用 `activateBottleneck()` | 功法瓶颈触发 |
| `src/game/breakthrough/attempt.ts`（体修路径） | 同理，体修突破前检查 `checkBottleneck(player, 'body_realm', bodyRealmIndex)` | 体修瓶颈 |
| `src/game/events.ts` | 新增"灵光一闪"事件类型 `epiphany_bottleneck`，触发时调用 `tryEpiphanyUnlock()` | 顿悟解锁途径 |
| `src/hooks/useGameEngine.ts` | 修炼 tick 时调用 `tickPersistenceCultivation()`；探索事件后检查顿悟触发条件；论道 action 调用 `tryDiscourseUnlock()` | 解锁触发时机 |
| `src/data/dlc-core.ts` | 导入并注册 `core-bottlenecks.ts` 数据到 `core` DLC pack | DLC 注册 |

### 核心逻辑伪代码

```
// ── bottleneck.ts ──

// 检查玩家是否被某个瓶颈卡住
function checkBottleneck(
  player: Player,
  targetType: 'realm' | 'body_realm' | 'technique',
  index: number,         // realmIndex / bodyRealmIndex / techniqueLevel
  techniqueId?: string
): { blocked: boolean; bottleneckDef?: BottleneckDef }

逻辑：
  1. 从 registry 查询匹配的 BottleneckDef（targetType + index/techniqueId）
  2. 如果没有定义 → blocked = false（该节点无瓶颈）
  3. 如果有定义：
     a. 检查 player.systems.bottleneck.unlocked 是否已包含该 id → 已解锁则 blocked = false
     b. 检查 player.systems.bottleneck.active 是否已包含该 id → 已激活则 blocked = true
     c. 两者均无 → 首次触碰，调用 activateBottleneck() → blocked = true

// 激活瓶颈（首次卡住时记录）
function activateBottleneck(player: Player, bottleneckId: string): Player
  → 写入 player.systems.bottleneck.active[bottleneckId]
  → 生成日志："【瓶颈】你感到修炼之路仿佛遇到了一道无形屏障……"

// 尝试解锁瓶颈（通用入口，由具体事件调用）
function unlockBottleneck(
  player: Player,
  bottleneckId: string,
  method: BottleneckUnlockMethod['type']
): { success: boolean; player: Player; log: string }
  → 从 active 移除，写入 unlocked
  → 发放 unlockBonus（如有）
  → 返回成功日志："【瓶颈突破】道心豁然开朗，修炼之路畅通无阻！"

// 修炼 tick 时调用：累计坚韧修炼次数
function tickPersistenceCultivation(player: Player, bottleneckId: string): Player
  → 找到 active[bottleneckId].progress.persistenceCultivationCount
  → +1；若 >= BottleneckDef.unlockMethods[persistence].cultivationCount
  → 自动调用 unlockBottleneck(…, 'persistence')

// 探索时调用：顿悟触发检查
function tryEpiphanyUnlock(
  player: Player,
  locationTag: string
): { triggered: boolean; bottleneckId?: string; player?: Player }
  → 遍历 active 瓶颈
  → 找到 unlockMethods 中 type==='epiphany' && locationTag 匹配的
  → Math.random() < baseChance * (1 + player.luck * 0.002 + player.comprehension * 0.003)
  → 触发则调用 unlockBottleneck(…, 'epiphany')

// 论道时调用
function tryDiscourseUnlock(
  player: Player,
  npcId: string
): { success: boolean; player: Player; log: string }
  → 找到匹配 npcId 的瓶颈解锁方式
  → 检查背包道具
  → 消耗道具 → 调用 unlockBottleneck(…, 'discourse')

// 战斗胜利后调用（在 combat result 处理中）
function tryBattleUnlock(
  player: Player,
  killedMonsterId: string
): { triggered: boolean; player?: Player }
  → 遍历 active 瓶颈，检查 type==='combat' && monsterId 匹配
  → 调用 unlockBottleneck(…, 'combat')

// 任务完成后调用（由 QuestSystem 调用，T0057 后接入）
function tryQuestUnlock(player: Player, questId: string): Player
```

### 初始化与存档兼容

```
// 加载存档时若无 player.systems.bottleneck 字段，自动初始化：
player.systems.bottleneck = player.systems.bottleneck ?? { active: {}, unlocked: {} }
```

### 修炼 tick 集成点（`useGameEngine.ts`）

```
// 每次点击"修炼"后（cultivate action）：
for (const bottleneckId of Object.keys(player.systems.bottleneck.active)) {
  const def = getBottleneckDef(bottleneckId)
  if (def?.unlockMethods.some(m => m.type === 'persistence')) {
    player = tickPersistenceCultivation(player, bottleneckId)
  }
}
```

---

## UI 方案（@Designer）

### 新增界面/面板

| 元素 | 位置 | 内容 |
|------|------|------|
| **瓶颈提示条** | 修炼面板 / 突破按钮区域顶部 | 橙色警告条：「⚠️ 你的修炼遭遇瓶颈：<瓶颈名称>」；点击展开详情 |
| **瓶颈详情弹窗** | 点击提示条触发，居中模态 | 瓶颈描述文本 + 解锁方式列表（每种方式显示进度/状态） |
| **论道入口** | NPC 对话面板（T0025 完成后接入） | NPC 对话选项中增加「论道」按钮；展示道具消耗 + 确认 |
| **顿悟事件卡片** | 探索事件日志 | 金色高亮事件条：「✨ 灵光一闪！你对修炼的感悟豁然开朗……」 |
| **坚韧修炼进度** | 瓶颈详情弹窗内 | 进度条：「坚韧修炼 XX / YY 次」 |
| **瓶颈突破特效** | 突破成功时 | Toast 通知（金色）：「【瓶颈突破】道心通畅，修为再无阻碍！」；可叠加突破成功动效 |

### 解锁方式列表（弹窗内）

每种解锁方式显示为一行：

```
✅ / ⬜  [方式图标]  [方式描述]  [进度/条件]
────────────────────────────────
⬜  ⚔️  击败特定强敌：黑蛟（金丹后期）        [未完成]
⬜  📜  完成奇遇任务：问道峰顶                  [未触发]
⬜  💬  与 太虚真人 论道（论道符 ×1）            [背包: 0/1]
⬜  ✨  在 仙灵山脉 探索中灵光一闪（8% 概率）   [持续探索…]
⬜  🔁  坚韧修炼 80 次                          [进度: 12/80]
```

任意一行变为 ✅ 后，整个弹窗底部出现「瓶颈已解除」提示，下次突破正常进行。

### 交互流程

1. **触发瓶颈**：玩家点击突破按钮 → 系统检测到瓶颈 → 突破被拦截 → 在日志中输出橙色警告「你感到修炼之路遇到无形阻碍……」，修炼面板顶部出现瓶颈提示条
2. **查看详情**：点击提示条 → 打开瓶颈详情弹窗（显示解锁方式 + 进度）
3. **坚韧修炼**：继续点击修炼 → 进度条每次 +1 → 满格后自动解锁，生成 Toast
4. **论道**：进入 NPC 对话 → 点击「论道」→ 弹出确认框（显示消耗道具）→ 确认 → 解锁，关闭弹窗
5. **顿悟**：探索时有概率触发 → 事件日志出现金色顿悟卡片 → 自动解锁，Toast 通知
6. **战斗解锁**：击败特定 Boss → 战斗结算弹窗追加一行「瓶颈解除」提示
7. **任务解锁**（T0057 后接入）：完成任务链节点 → 任务完成弹窗追加瓶颈解除通知

---

## 与现有系统的集成点

| 系统 | 集成方式 | 时序 |
|------|---------|------|
| `breakthrough/attempt.ts` | 突破前调用 `checkBottleneck()`，blocked 时返回错误 | T0064-A |
| `technique.ts` 功法升级 | 升到 `levelBottlenecks` 等级时激活功法瓶颈 | T0064-B |
| `events.ts` 探索事件 | 新增 `epiphany_bottleneck` 事件，触发 `tryEpiphanyUnlock()` | T0064-B |
| 战斗结算（`useGameEngine.ts`） | 战斗胜利后调用 `tryBattleUnlock()` | T0064-A |
| NPC 系统（T0025） | 论道 action → 调用 `tryDiscourseUnlock()` | T0064-C（依赖 T0025） |
| 任务链系统（T0057） | 任务完成时调用 `tryQuestUnlock()` | T0064-C（依赖 T0057） |

---

## 实现任务拆分

### T0064-A：核心数据结构 + 境界瓶颈（最小可玩）

**范围：**
- `BottleneckDef` / `BottleneckUnlockMethod` / `BottleneckState` 类型定义（`types.ts`）
- `bottleneckRegistry` 注册表 + DLC pack 扩展（`registry.ts`）
- `src/game/bottleneck.ts` 核心逻辑（`checkBottleneck`, `activateBottleneck`, `unlockBottleneck`, `tickPersistenceCultivation`, `tryBattleUnlock`）
- `src/data/core-bottlenecks.ts`：3 个境界瓶颈（金丹/元婴/化神各一个），每个提供 2 种解锁方式（战斗 + 坚韧修炼）
- `breakthrough/attempt.ts` 集成：突破前检查境界瓶颈
- UI：修炼面板瓶颈提示条 + 简单详情弹窗（只显示文字描述 + 坚韧修炼进度）

**验收：** 角色到达金丹期后，突破被拦截，提示瓶颈名称；修炼足够次数后自动解锁；击败指定 Boss 后解锁。

---

### T0064-B：功法瓶颈 + 顿悟事件（探索解锁）

**范围：**
- `TechniqueDef.levelBottlenecks` 字段，功法升级时触发
- `src/data/core-bottlenecks.ts` 追加功法瓶颈数据（≥2 个功法 × 关键等级）
- `technique.ts` 修改：升级到瓶颈等级时调用 `activateBottleneck()`
- 体修瓶颈数据（玉髓→金刚、金刚→龙象）+ `body_realm` 检查集成
- `tryEpiphanyUnlock()` 函数
- `events.ts`：新增 `epiphany_bottleneck` 事件类型（含 locationTag 判断）
- UI：解锁方式列表完整版（含顿悟进度提示文字）

**验收：** 功法升到瓶颈等级时被卡住；在对应地图探索有概率顿悟解锁；体修突破前检查体修瓶颈。

---

### T0064-C：论道 NPC + 瓶颈任务（依赖 T0025 / T0057）

**范围：**（此阶段依赖 T0025 NPC 系统）
- NPC 对话面板追加「论道」选项
- `tryDiscourseUnlock()` 函数
- `tryQuestUnlock()` 函数（供 T0057 任务链调用）
- 核心瓶颈数据补充：为每个瓶颈添加 `discourse` 和 `quest` 解锁方式
- UI：完整弹窗（5 种解锁方式全部可见，包含论道道具需求、任务链接入口）

**验收：** 与特定 NPC 对话时出现论道选项；消耗道具后解锁；任务链完成时自动解锁（与 T0057 集成）。

---

## 验证方式

### 基础流程（T0064-A）

1. 新存档，把修为刷到金丹期最大值，点击突破 → **预期：突破被拦截**，日志出现橙色瓶颈提示
2. 修炼面板出现「⚠️ 金丹清缘瓶颈」提示条
3. 点击提示条 → **预期：瓶颈详情弹窗打开**，显示解锁方式列表
4. 连续点击修炼，坚韧修炼进度增加 → 满 80 次后 **预期：自动解锁**，Toast 提示「瓶颈突破」
5. 解锁后再次点击突破 → **预期：正常进入突破流程**（不再被拦截）

### 战斗解锁

6. 击败 Boss「黑蛟」→ **预期：战斗结算弹窗出现「瓶颈解除」额外提示**
7. 解锁后检查 `player.systems.bottleneck.unlocked` 有对应记录

### 功法瓶颈（T0064-B）

8. 功法升到第 5 级 → **预期：功法经验继续累积但无法升到 6 级**，功法列表该功法显示瓶颈标记
9. 在任意地图探索，有概率出现顿悟事件卡片 → 解锁后功法可继续升级

### 存档兼容

10. 加载旧存档（无 `systems.bottleneck` 字段）→ **预期：不报错**，自动初始化为 `{ active: {}, unlocked: {} }`
11. 旧存档角色已在金丹期 → 首次点击突破时激活瓶颈（不追溯激活）

### 边界情况

- 同时有多个激活瓶颈（境界 + 功法）→ 各自独立显示，互不干扰
- 瓶颈已解锁的境界再次进入（如：转世后重新到达金丹期）→ `unlocked` 中有记录，直接放行（不重新激活）
- DLC 未注册某境界的 BottleneckDef → 该境界无瓶颈，突破正常进行

---

## 调试面板需求

在现有 Debug 面板（DevPanel）新增「瓶颈」分区：

| 控件 | 类型 | 功能 |
|------|------|------|
| 当前激活瓶颈列表 | 只读文本 | 显示 `player.systems.bottleneck.active` 的 key 列表 |
| 已解锁瓶颈列表 | 只读文本 | 显示 `player.systems.bottleneck.unlocked` 的 key 列表 |
| 「激活指定瓶颈」下拉 + 按钮 | 选择 + 点击 | 从所有注册的 BottleneckDef 中选一个强制激活 |
| 「解锁指定瓶颈」下拉 + 按钮 | 选择 + 点击 | 强制解锁选中的瓶颈（跳过条件检查，method 标记为 'debug'） |
| 「清除所有瓶颈」按钮 | 点击 | 清空 active，用于快速测试 |

---

## 依赖关系

### 前置任务

| 任务 | 状态 | 原因 |
|------|------|------|
| T0029 突破系统重构 | ✅ | 瓶颈插入 `attemptBreakthrough()` 前 |
| T0017 功法系统 | ✅ | 功法瓶颈需修改 `technique.ts` |
| T0059 体修系统核心 | ✅ | 体修瓶颈需体修突破路径存在 |
| T0007 事件引擎 | ✅ | 顿悟事件通过事件池触发 |

### T0064-C 额外前置

| 任务 | 状态 | 原因 |
|------|------|------|
| T0025 NPC 系统 | ⬜ | 论道功能需要 NPC 对话框架 |
| T0057 任务链系统 | ⬜ | `tryQuestUnlock()` 需要任务链完成钩子 |

### 后续任务

| 任务 | 关联 |
|------|------|
| T0030 转世重修 | 转世后瓶颈状态清空策略（unlocked 保留或重置？待设计） |
| T0049 悟道顿悟系统 | 顿悟系统完整实现后，`epiphany` 解锁方式可升级为更丰富的事件 |
| T0050 心魔系统 | 心魔发作可阻碍瓶颈解锁（坚韧修炼进度被心魔重置） |
| CP-01/CP-02 内容包 | 可通过 DLC 注册额外瓶颈定义，无需修改系统代码 |
