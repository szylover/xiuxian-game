# 设计文档：瓶颈系统（Bottleneck System）
任务：T0064
日期：2025-01-27

---

## 概述

瓶颈系统为修炼进度在关键节点设置"卡点"：当玩家修为/功法等级触及特定阈值时，进入**瓶颈状态**（Bottleneck），无法继续突破，直到通过多样化的触发机制获得**机缘（契机）**方可解锁。这让修仙进度从"堆数值线性推进"变为"蓄势待机、缘法相遇"，呼应玄幻小说核心叙事节奏。

---

## 1. 背景与目标

### 问题
当前突破系统只受 exp / 物品 / 成功率三个维度控制，玩家只需不断点"修炼→突破"即可线性升级，缺少叙事节拍点和"寻求机缘"的张力感。

### 目标
1. 在关键境界大圆满（如炼气期满→筑基）和功法满级前插入瓶颈状态
2. 提供 ≥4 种异质化解锁路径（战斗、探索灵光一闪、论道、任务），让玩家主动探索世界
3. 所有瓶颈定义完全数据驱动，DLC 可自由挂载新的瓶颈节点与解锁条件
4. 对现有系统侵入最小：仅在突破逻辑入口和功法升级入口增加"瓶颈检查"开关

---

## 2. 核心概念与数据结构

### 2.1 BottleneckDef（数据层，注册到全局表）

```typescript
// src/game/bottleneck/types.ts

/** 解锁方式定义 */
export interface UnlockMethodDef {
  id: string;                        // 'combat' | 'explore_insight' | 'quest' | 'discuss' | 'item'
  type: 'combat' | 'explore' | 'quest' | 'discuss' | 'item';
  description: string;               // 展示给玩家的提示，如 "在生死战斗中感悟"
  // 以下字段供引擎判断是否触发
  triggerProbability?: number;       // 每次触发动作时随机概率（0-1），如战斗 0.04
  requiredProgress?: number;         // 需要先积累多少 progress 值才可解锁
  condition?: string;                // 条件标识符（引擎侧翻译为谓词），如 'defeated_higher_realm'
}

/** 瓶颈定义（数据驱动） */
export interface BottleneckDef {
  id: string;                        // 'core:bottle_realm_1' / 'core:bottle_technique_basic_sword'
  type: 'realm' | 'technique';
  // ── 对于境界瓶颈 ──
  blockedAtRealmIndex?: number;      // 玩家处于该境界大圆满时触发（exp >= realm.expReq * 0.9）
  // ── 对于功法瓶颈 ──
  blockedTechniqueId?: string;       // 目标功法 ID
  blockedAtLevel?: number;           // 功法升至此等级时触发（0 = effectiveMax）
  // ── 描述 ──
  name: string;                      // '炼气大圆满瓶颈'
  description: string;               // 叙事描述，展示在 UI 中
  // ── 解锁逻辑 ──
  unlockMethods: UnlockMethodDef[];  // 至少 1 种，玩家完成任意一种即可解锁
  // ── 积累机制 ──
  progressPerAction: Partial<Record<UnlockMethodDef['type'], number>>; // 每次对应行动增加的 progress
  unlockProgressThreshold: number;   // progress 积累到此值时，强制解锁（兜底，保证游戏不卡死）
}
```

> **数据驱动原则**：`BottleneckDef` 存储在 `src/data/core-bottlenecks.ts`，通过 `registerDLC()` 注册到全局表 `bottleneckDefsMap`，引擎不硬编码任何境界编号。

---

### 2.2 BottleneckSystemState（运行时，存入 player.systems.bottleneck）

```typescript
/** 单个激活中的瓶颈运行时状态 */
export interface ActiveBottleneck {
  defId: string;                          // 对应 BottleneckDef.id
  enteredAt: number;                      // 进入瓶颈时的 gameYear（用于超时强制解锁）
  progress: number;                       // 当前积累进度（0 → unlockProgressThreshold）
  methodProgress: Record<string, number>; // 按 UnlockMethodDef.id 分别记录进度
  unlocked: boolean;                      // true = 已获得机缘，可突破；false = 仍被封堵
  unlockedBy: string | null;             // 解锁时记录是哪种 type 触发的
}

/** 存入 player.systems.bottleneck 的完整状态 */
export interface BottleneckSystemState {
  activeBottlenecks: ActiveBottleneck[];  // 当前激活的瓶颈列表（通常 1 条）
  resolvedBottlenecks: string[];          // 已解决的 defId 列表（防止重复触发）
}
```

### 2.3 PlayerState 变更

`Player` 本身不新增顶层字段，借助已有的 `player.systems: Record<string, unknown>` 动态扩展：

```typescript
// 访问器（无需改 player/types.ts）
player.systems.bottleneck = {} as BottleneckSystemState;
```

仅在 `player/types.ts` 的 `PlayerTracking` 中追加一个辅助计数字段：

```typescript
// player/types.ts → PlayerTracking 新增
bottleneckTotalProgress: number;  // 全局积累进度（用于成就/统计）
```

---

### 2.4 DLCPack 扩展

在 `types.ts` 的 `DLCPack` 接口中增加：
```typescript
bottlenecks?: BottleneckDef[];  // T0064：瓶颈定义
```

在全局注册表 `registry/stores.ts` 中增加：
```typescript
export const bottleneckDefsMap = new Map<string, BottleneckDef>();
```

---

## 3. 瓶颈触发条件

### 3.1 境界瓶颈（Realm Bottleneck）

触发时机：在 `breakthrough/attempt.ts` 的 `attemptBreakthrough()` 执行**最前置检查**时，若满足以下所有条件则自动激活对应瓶颈：

```
条件 A：存在 blockedAtRealmIndex === player.realmIndex 的 BottleneckDef
条件 B：该 defId 不在 resolvedBottlenecks 列表中（只触发一次）
条件 C：player.exp >= REALMS[player.realmIndex].expReq * 0.9  // 修为达 90% 上限
条件 D：activeBottlenecks 中不存在同 defId 的条目（去重）
```

激活后的效果：
- 将 `ActiveBottleneck` 压入 `player.systems.bottleneck.activeBottlenecks`
- 每次修炼时若修为超过 `realm.expReq`，**修为上限卡在 `realm.expReq`**（不溢出）
- 每次点击突破时返回"🔒 感知到瓶颈，道路封闭，需寻得机缘方可突破"

### 3.2 功法瓶颈（Technique Bottleneck）

触发时机：在 `technique.ts` 的 `practiceTechnique()` 执行升级检查时，若 `newLevel === effectiveMax` 且存在匹配的 `BottleneckDef`：

```
条件 A：存在 blockedTechniqueId === techniqueId 的 BottleneckDef
条件 B：该 defId 不在 resolvedBottlenecks 列表中
条件 C：newLevel >= blockedAtLevel（或 blockedAtLevel === 0 表示 effectiveMax）
```

激活后的效果：
- 功法等级卡在 `blockedAtLevel - 1`（无法进入满级状态）
- 修炼时仍给熟练度但不升级，日志显示"📖 [功法名] 修炼陷入瓶颈，熟练度积累中（×/100）"
- `methodProgress.practice` 随每次修炼 +1（驱动兜底解锁）

### 3.3 核心瓶颈节点（core data 预设）

| 瓶颈 ID | 类型 | 封堵境界/功法 | 叙事 |
|---------|------|-------------|------|
| `core:bottle_realm_1` | realm | realmIndex=1（炼气大圆满） | "炼气期圆满，却感道路阻塞，需一番机缘方能叩响筑基之门" |
| `core:bottle_realm_3` | realm | realmIndex=3（筑基大圆满） | "筑基圆满，金丹之道隐隐可见却如隔纱" |
| `core:bottle_realm_5` | realm | realmIndex=5（金丹大圆满） | "金丹期巅峰，元婴之道需经生死大感悟" |
| `core:bottle_realm_7` | realm | realmIndex=7（元婴大圆满） | "元婴巅峰，化神机缘需以道论道方可得" |

> DLC 可通过 `registerDLC({ bottlenecks: [...] })` 在任意境界/功法插入自定义瓶颈。

---

## 4. 解锁机制（四种核心 + 两种扩展）

### 4.1 🗡️ 战斗感悟（Combat Insight）

**触发点**：`useCoreActions.ts` → `fight()` → 战斗胜利后结算段

**逻辑**：
```pseudocode
if (result.winner === 'player' && hasLockedBottleneck(p)) {
  const isToughBattle = monster.realmIndex >= p.realmIndex  // 同级及以上
  const baseProb = isToughBattle ? 0.07 : 0.02
  const progressBonus = bottleneck.progress / 2000  // 积累越多越容易触发
  if (Math.random() < baseProb + progressBonus) {
    p = resolveBottleneck(p, defId, 'combat')
    queueLog('⚔️ 生死边缘，道心震颤！瓶颈豁然开朗，突破契机到来！', 'breakthrough')
  } else {
    p = addBottleneckProgress(p, defId, 'combat', 3)
    // 不输出日志（静默积累，减少噪音）
  }
}
```

**设计意图**：鼓励玩家与同级/高级妖兽战斗；积累机制保证长期不卡死。

---

### 4.2 💡 灵光一闪（Explore Insight Events）

**触发点**：`triggerExploreEvent()` 事件池，新增 4 条专属事件

**事件定义**（新增到 `src/data/core-bottleneck-events.ts`，注册入 core DLC）：

| 事件 ID | 类型 | 条件 | 权重 | 效果 |
|--------|------|------|-----|------|
| `core:bottle_dawn_insight` | explore/good | hasLockedRealmBottleneck | 5 | 立即 resolve 境界瓶颈 |
| `core:bottle_ancient_stele` | explore/good | hasLockedRealmBottleneck + realmIndex>=3 | 3 | resolve 境界瓶颈 + exp+500 |
| `core:bottle_spirit_whisper` | explore/neutral | hasLockedBottleneck(any) | 8 | progress+15（不直接解锁） |
| `core:bottle_dream_vision` | daily/good | hasLockedTechniqueBottleneck + mood>=70 | 4 | 立即 resolve 功法瓶颈 |

事件 condition 函数在 `event-loader.ts` 扩展时通过 `condition.hasLockedBottleneck: true` 字段驱动，引擎侧翻译为：
```typescript
(p: Player) => getBottleneckState(p).activeBottlenecks.some(b => !b.unlocked)
```

> 这些事件权重较低（3-8 vs 普通事件 10-30），保证"可遇不可求"的稀缺感。

---

### 4.3 🗣️ 论道感悟（Discourse / Discuss）

**触发点**：预留 Hook，供 T0025 NPC 系统和 T0026 对话系统调用

**接口定义**（`src/game/bottleneck/engine.ts` 导出）：
```typescript
/** NPC 对话系统调用此函数通知瓶颈引擎 */
export function notifyBottleneckUnlock(
  player: Player,
  sourceType: 'discuss',
  npcId: string,
): { player: Player; unlocked: boolean; log?: string }
```

**核心瓶颈的"论道"描述**（供 NPC 系统使用）：
- `core:bottle_realm_3`：需要"与筑基期以上修士论道"（`condition: 'npc_realm_min_3'`）
- `core:bottle_realm_7`：需要"拜访化神期老祖"（`condition: 'npc_realm_min_7'`）

当前（T0025 未完成时）：`notifyBottleneckUnlock` 不对外暴露，仅在代码中留桩注释。

---

### 4.4 📜 任务解锁（Quest Completion）

**触发点**：T0057 任务链系统完成时，任务 effect 可调用：
```typescript
resolveBottleneck(player, 'core:bottle_realm_5')
```

**核心预设任务钩子**（只记录定义，等 T0057 实现时挂载）：
```typescript
// 任务链 "洗髓伐骨" 最终奖励：
effect: (p) => resolveBottleneck(p, 'core:bottle_realm_5', 'quest')
```

**接口**：
```typescript
export function resolveBottleneck(
  player: Player,
  defId: string,
  source: 'quest' | 'combat' | 'explore' | 'discuss' | 'item' | 'force',
): { player: Player; log: string }
```

---

### 4.5 💊 物品/丹药解锁（扩展机制）

新增物品 `core:enlightenment_stone`（顿悟石）：
```typescript
{
  id: 'core:enlightenment_stone',
  name: '顿悟石',
  category: 'consumable',
  usable: true,
  effect: (p) => resolveBottleneck(p, getFirstLockedBottleneck(p)?.defId, 'item').player,
  effectMessage: '🪨 顿悟石散发奇异光晕，心中陡然明悟，瓶颈消融！',
}
```

> 顿悟石可从稀有探索事件（weight=2）或特定商店（高价）获取，作为"氪金/运气"解锁路。

---

### 4.6 ⏳ 兜底机制（Progress-Based Force Unlock）

每次修炼 `cultivate()`、战斗 `fight()`、探索 `explore()` 均给活跃瓶颈的 `progress` 累加：

| 行动 | progress 增量 |
|-----|-------------|
| 修炼 | +1 |
| 战斗（胜利） | +3 |
| 战斗（失败） | +1 |
| 探索 | +2 |
| 休息 | 0 |

当 `progress >= unlockProgressThreshold`（默认 200）时，**强制解锁**并输出：
> "🌅 经年累月的积累，量变引发质变，道路终于豁然贯通！"

`unlockProgressThreshold` 在 `BottleneckDef` 中可按境界调大（如高境界瓶颈设 400），让高阶瓶颈更持久。

---

## 5. 与现有系统的集成方案

### 5.1 突破系统集成（`breakthrough/status.ts` + `attempt.ts`）

**修改 `getBreakthroughStatus()`**（status.ts）：
```diff
+ import { getFirstLockedRealmBottleneck } from '../bottleneck/engine';
+
  export function getBreakthroughStatus(player: Player): BreakthroughStatus {
+   // T0064：境界瓶颈检查
+   const realmBottleneck = getFirstLockedRealmBottleneck(player);
+   if (realmBottleneck) {
+     return {
+       canAttempt: false, bottleneckActive: true,
+       bottleneckDef: realmBottleneck, ...defaultStatus
+     };
+   }
    // ...原逻辑不变...
  }
```

**修改 `attemptBreakthrough()`**（attempt.ts）：
```diff
+ if (hasLockedRealmBottleneck(player)) {
+   return {
+     success: false, player, triggerTribulation: false,
+     logs: ['🔒 道路封闭，感知到瓶颈阻隔。需寻得机缘方可叩响晋升之门。']
+   };
+ }
```

**BreakthroughStatus 接口新增字段**：
```typescript
bottleneckActive?: boolean;
bottleneckDef?: BottleneckDef | null;
```

### 5.2 功法系统集成（`technique.ts`）

**修改 `practiceTechnique()`**：
```diff
  if (slot.level >= effectiveMax) {
+   // T0064：功法瓶颈检查
+   const techBottleneck = getLockedTechniqueBottleneck(player, techniqueId);
+   if (techBottleneck) {
+     const p2 = addBottleneckProgress(player, techBottleneck.defId, 'practice', 1);
+     const bar = `${Math.floor(techBottleneck.progress)}/${techBottleneck.unlockThreshold}`;
+     return { player: p2, message: `📖 ${def.name} 修炼触及瓶颈（进度 ${bar}），需机缘解锁` };
+   }
    return { player, message: `⚠️ ${def.name} 已满级...` };
  }
```

### 5.3 修炼行为集成（`useCoreActions.ts` → `cultivate()`）

```diff
  p.exp += expGain;
+ // T0064：修为溢出上限保护（境界瓶颈激活时不超过 realm.expReq）
+ const activeRealmBottleneck = getFirstLockedRealmBottleneck(p);
+ if (activeRealmBottleneck) {
+   const cap = REALMS[p.realmIndex]?.expReq ?? Infinity;
+   if (p.exp > cap) p.exp = cap;
+   p = addBottleneckProgress(p, activeRealmBottleneck.defId, 'cultivate', 1);
+ }
```

修炼日志追加（仅当 exp 已到上限时提示，减少噪音）：
```
"🔒 修为已至大圆满，感知到瓶颈，需寻得机缘方可突破！"  // 每 10 次修炼提示一次
```

### 5.4 战斗集成（`useCoreActions.ts` → `fight()`）

```diff
  if (result.winner === 'player') {
    p.tracking = { ...p.tracking, killCount: ... };
+   // T0064：战斗感悟瓶颈解锁检查
+   const { player: p2, unlocked, log } = checkCombatBottleneckUnlock(p, monster);
+   p = p2;
+   if (unlocked && log) queueLog(log, 'breakthrough');
  }
```

### 5.5 探索事件集成（`events.ts`）

新事件注册到 core DLC 包，通过 `condition` 字段引擎动态过滤：
```typescript
// event-loader.ts 新增条件谓词键
'hasLockedBottleneck': (p: Player) =>
  getBottleneckState(p).activeBottlenecks.some(b => !b.unlocked),
```

> 现有 `JsonEventCondition` 接口扩展 `hasLockedBottleneck?: boolean` 字段。

---

## 6. UI 展示方案（@Designer）

### 新增界面/面板

| 元素 | 位置 | 内容 |
|------|------|------|
| 🔒 瓶颈徽章 | 状态面板（StatusPanel）境界行右侧 | 红色小锁图标 + "瓶颈" 文字，点击展开详情 |
| 瓶颈详情卡 | 突破面板（BreakthroughPanel）顶部 | 叙事文字 + 解锁条件列表 + 积累进度条 |
| 进度条 | 瓶颈详情卡底部 | `progress / threshold`，灰色→橙色渐变 |
| 功法瓶颈指示 | 功法列表条目右侧 | 橙色小锁图标（与境界瓶颈颜色区分） |
| Toast 解锁提示 | 全局 Toast | "🌟 [境界/功法名] 瓶颈解除！突破契机已至！" |

### 交互细节

1. **突破按钮状态**：
   - 正常可突破：绿色「突破」按钮
   - 瓶颈锁定中：灰色「道路封闭 🔒」按钮，hover 显示 tooltip "需先解除瓶颈"
   - 瓶颈已解锁（unlocked=true）：金色「突破 ✨」按钮，带脉冲动画

2. **解锁条件列表**（在瓶颈详情卡）：
   ```
   解锁途径（满足一条即可）：
   ✅ ⚔️ 在生死战斗中感悟           [已解锁]
   ⬜ 💡 探索时偶获灵光             进度 23/200
   ⬜ 🗣️ 与高阶修士论道（T0025）    [前置未实现]
   ⬜ 📜 完成特殊任务               [前置未实现]
   ```

3. **瓶颈激活动画**：首次进入瓶颈时，状态面板境界区域出现"道路封闭"红色脉冲效果（2秒）

4. **兜底解锁动画**：`progress` 达满时，全屏短暂闪光 + "量变质变"文字

---

## 7. 数据结构变更汇总

### 7.1 新增文件

| 文件 | 用途 |
|------|------|
| `src/game/bottleneck/types.ts` | `BottleneckDef`、`ActiveBottleneck`、`BottleneckSystemState` 类型定义 |
| `src/game/bottleneck/engine.ts` | 核心引擎：`getBottleneckState`、`checkCombatBottleneckUnlock`、`resolveBottleneck`、`addBottleneckProgress`、`enterBottleneck`、`getFirstLockedRealmBottleneck`、`getLockedTechniqueBottleneck`、`hasLockedRealmBottleneck` |
| `src/game/bottleneck/index.ts` | barrel re-export |
| `src/data/core-bottlenecks.ts` | 核心境界瓶颈定义（4 条）+ 工具函数 |
| `src/data/core-bottleneck-events.ts` | 灵光一闪探索事件（4 条） |

### 7.2 修改文件

| 文件 | 改动 |
|------|------|
| `src/game/types.ts` | `DLCPack` 新增 `bottlenecks?: BottleneckDef[]` |
| `src/game/registry/stores.ts` | 新增 `bottleneckDefsMap: Map<string, BottleneckDef>` |
| `src/game/registry/index.ts` | 导出 `registerBottleneckDefs`、`getBottleneckDef`、`getAllBottleneckDefs` |
| `src/game/registry/dlc.ts` | `registerDLC()` 中遍历 `pack.bottlenecks` 调用 `registerBottleneckDefs` |
| `src/game/player/types.ts` | `PlayerTracking` 新增 `bottleneckTotalProgress: number`（默认 0） |
| `src/game/breakthrough/status.ts` | `getBreakthroughStatus()` 前置境界瓶颈检查；`BreakthroughStatus` 新增 `bottleneckActive?` 字段 |
| `src/game/breakthrough/attempt.ts` | `attemptBreakthrough()` 首行插入 `hasLockedRealmBottleneck` 拦截 |
| `src/game/technique.ts` | `practiceTechnique()` 满级检查段插入功法瓶颈拦截 |
| `src/game/events.ts` | `registerCoreEvents()` 中注册 `core-bottleneck-events` |
| `src/game/event-loader.ts` | `JsonEventCondition` 新增 `hasLockedBottleneck?: boolean`；`buildCondition()` 处理该字段 |
| `src/hooks/useCoreActions.ts` | `cultivate()` 修为上限保护；`fight()` 战斗感悟触发 |
| `src/components/BreakthroughPanel.tsx`（或对应组件） | 显示瓶颈状态、解锁条件列表、进度条 |
| `src/components/StatusPanel.tsx`（或对应组件） | 境界行右侧加瓶颈徽章 |
| `src/game/player/create.ts` | `createPlayer()` 初始化 `tracking.bottleneckTotalProgress = 0` |

### 7.3 关键公式

**战斗感悟概率**：
```
P = baseProbability + (bottleneck.progress / progressThreshold) * 0.15
- 同级妖兽：baseProbability = 0.05
- 高级妖兽（+1 realm）：baseProbability = 0.10
- 高级妖兽（+2 realm）：baseProbability = 0.15
```

**兜底解锁阈值（按境界）**：
```
realmIndex <= 3：threshold = 150
realmIndex 4-6：threshold = 250
realmIndex 7+： threshold = 400
功法瓶颈：      threshold = 100
```

---

## 8. 实现步骤清单（有序）

| 步骤 | 文件/操作 | 说明 |
|------|----------|------|
| Step 1 | 新建 `src/game/bottleneck/types.ts` | 定义所有接口类型 |
| Step 2 | 新建 `src/game/bottleneck/engine.ts` | 实现核心引擎函数（不依赖 React） |
| Step 3 | 新建 `src/game/bottleneck/index.ts` | barrel export |
| Step 4 | 修改 `src/game/registry/stores.ts` | 新增 bottleneckDefsMap |
| Step 5 | 修改 `src/game/registry/index.ts` | 导出注册/查询函数 |
| Step 6 | 修改 `src/game/registry/dlc.ts` | `registerDLC()` 中处理 `pack.bottlenecks` |
| Step 7 | 修改 `src/game/types.ts` | DLCPack 新增 bottlenecks 字段 |
| Step 8 | 修改 `src/game/player/types.ts` | PlayerTracking 新增 bottleneckTotalProgress |
| Step 9 | 修改 `src/game/player/create.ts` | 初始化新字段，设默认值 0 |
| Step 10 | 新建 `src/data/core-bottlenecks.ts` | 4 条核心境界瓶颈定义 |
| Step 11 | 新建 `src/data/core-bottleneck-events.ts` | 4 条灵光一闪探索事件 |
| Step 12 | 修改 `src/game/events.ts` | 注册瓶颈事件到 core DLC |
| Step 13 | 修改 `src/game/event-loader.ts` | 支持 `hasLockedBottleneck` 条件字段 |
| Step 14 | 修改 `src/game/breakthrough/status.ts` | 集成瓶颈检查到 `getBreakthroughStatus()` |
| Step 15 | 修改 `src/game/breakthrough/attempt.ts` | 集成拦截逻辑 |
| Step 16 | 修改 `src/game/technique.ts` | 集成功法瓶颈拦截 |
| Step 17 | 修改 `src/hooks/useCoreActions.ts` | cultivate() 修为上限 + fight() 战斗感悟 |
| Step 18 | UI：修改 StatusPanel | 瓶颈徽章 |
| Step 19 | UI：修改 BreakthroughPanel | 瓶颈详情卡 + 解锁条件列表 + 进度条 |
| Step 20 | UI：修改功法列表组件 | 功法瓶颈橙色小锁图标 |
| Step 21 | 存档兼容：`useGameEngine.ts` | save/load 时初始化缺失的 `systems.bottleneck` 字段 |

---

## 9. 验证方式

### 测试用例

| # | 场景 | 预期行为 |
|---|------|---------|
| TC-1 | 修炼到 realmIndex=1 的修为上限（炼气大圆满） | 自动进入瓶颈，修为不再增加，日志提示"道路封闭" |
| TC-2 | 瓶颈激活后点击突破按钮 | 突破按钮变灰，返回"🔒 感知到瓶颈"消息 |
| TC-3 | 战斗胜利多次后 | 有概率出现"⚔️ 瓶颈解除"Toast，此后突破按钮变金 |
| TC-4 | 探索触发 `core:bottle_dawn_insight` 事件 | 日志显示解锁消息，瓶颈徽章消失 |
| TC-5 | progress 积累到 threshold | 强制解锁，日志"量变质变" |
| TC-6 | 解锁后正常突破 | 突破流程与 T0029 完全一致，无干扰 |
| TC-7 | DLC 注册额外瓶颈 | 新瓶颈在指定 realmIndex 正确触发 |
| TC-8 | 旧存档载入（无 systems.bottleneck） | 自动初始化为空态，不报错 |
| TC-9 | 功法修炼到瓶颈等级 | 功法等级卡住，修炼给进度条 |
| TC-10 | 使用顿悟石 | 直接解锁当前最高优先级瓶颈 |

### Debug 面板需求

在 Debug 面板新增「瓶颈系统」区块：

```
[瓶颈系统]
当前瓶颈数：{activeBottlenecks.length}
境界瓶颈：{realmBottleneck?.defId ?? '无'}  进度：{progress}/{threshold}  已解锁：{unlocked}
功法瓶颈：{techniqueBottleneck?.defId ?? '无'}

[按钮] 强制解锁所有瓶颈   →  调用 resolveAllBottlenecks(player)
[按钮] 触发境界瓶颈（realmIndex=当前）  → 调用 enterBottleneck(player, 'realm')
[按钮] 重置瓶颈状态   → 清空 player.systems.bottleneck
```

---

## 10. 依赖关系

### 前置任务（已完成）
- T0002 修炼系统 ✅
- T0004/T0029 突破系统 ✅
- T0007 事件引擎 ✅
- T0017 功法系统 ✅
- T0058 境界表 DLC 化 ✅

### 可选集成（未完成时降级处理）
- T0025 NPC 系统（论道解锁降级为"功能预留"）
- T0057 任务链系统（任务解锁降级为"功能预留"）

### 后续任务（本任务完成后解锁）
- T0050 心魔系统：可利用 `tracking.bottleneckTotalProgress` 触发心魔
- T0049 悟道顿悟系统：与瓶颈解锁共享"进度积累→随机顿悟"模式，可统一抽象
- CP-01/CP-02 DLC 内容包：通过 `registerDLC({ bottlenecks: [...] })` 扩展各自流派的瓶颈节点
