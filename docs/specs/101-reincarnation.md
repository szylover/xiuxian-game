# 设计文档：转世重修（New Game+）

任务：#101
状态：� 设计完成，待实现
日期：2026-04-08

## 概述

角色飞升或死亡后可选择"转世重修"，保留部分前世积累（永久加成、成就、修仙履历），以更强的起点开始新的修仙之路。这是游戏的 New Game+ 核心循环——每次转世通过**转世遗产（Legacy）**提供永久属性加成，让玩家以递增的优势挑战更高境界。

设计目标：
1. 为达到终局的玩家提供重复可玩性
2. 死亡后提供"不完全失败"的出路，降低挫败感
3. 与飞升系统形成闭环：飞升 → 转世 → 以更强起点重新修炼 → 再飞升
4. 转世遗产递增但有上限，避免无限膨胀

---

## 1. 触发条件

转世有三种触发路径：

| 路径 | 条件 | 遗产等级 | 说明 |
|------|------|----------|------|
| **飞升转世** | 飞升成功后，在结算画面选择"转世重修" | 满额遗产 | 最优路径，保留最多前世加成 |
| **死亡转世** | 角色 severe 死亡 + 无复活手段 + 转世次数 ≥ 1 | 半额遗产 | 前世有过转世经历才能在死后感悟转世。首次游玩（转世次数 = 0）死亡无此选项，只能 Game Over |
| **自愿转世** | 境界 ≥ 大乘（realmIndex ≥ 7）+ 持有「轮回珠」道具 | 满额遗产 | 大乘期可主动放弃当前进度转世，「轮回珠」为特殊消耗品 |

### 1.1 触发流程

```
飞升成功
  → 飞升结算画面
  → 显示「转世重修」按钮
  → 点击 → 转世确认弹窗（显示遗产预览）
  → 确认 → 执行转世

角色死亡（severe + 无复活）
  → 死亡弹窗（DeathModal）
  → 若 reincarnationCount ≥ 1：显示「转世重修」按钮（与 Game Over 并列）
  → 点击 → 转世确认弹窗（显示遗产预览，标注半额）
  → 确认 → 执行转世

自愿转世
  → 操作面板 ActionPanel 中，大乘期显示「转世重修」按钮（需有轮回珠）
  → 点击 → 转世确认弹窗
  → 确认 → 消耗轮回珠 → 执行转世
```

---

## 2. 保留 / 重置规则

### 2.1 保留项

| 数据 | 保留方式 | 说明 |
|------|----------|------|
| 转世次数 | 累加 | `reincarnationCount += 1` |
| 转世遗产 | 累加（有上限） | 永久属性加成，详见 §3 |
| 成就 | 完整保留 | 成就系统（T0031）跨转世保留，已解锁的成就和加成不重置 |
| 修仙履历 | 完整保留 | Chronicle 系统已有 incarnation 概念，转世时 `finalizeIncarnation()` 归档前世 |
| 先天属性记忆 | 部分保留 | 每项先天属性（luck/comprehension/charisma）取 `max(上世值 × 0.3, 新随机值)`，保底不低于新随机值 |
| DLC 选择 | 保留 | `enabledDLCs` 列表沿用 |

### 2.2 重置项

| 数据 | 重置方式 | 说明 |
|------|----------|------|
| 境界 | → 0（凡人） | 从头修炼 |
| 修为 (exp) | → 0 | 清零 |
| 年龄 | → 16×12 月 | 重新开始 |
| 寿命 | → 100×12 月 | 凡人寿限 |
| 心情/健康 | → 新随机值 | 同 createPlayer |
| 精力 | → 100 | 满精力 |
| HP/MP/念力 | → 凡人基础值 | 由 realm[0] 决定 |
| 战斗属性 | → 凡人基础值 + 遗产加成 | recalcStats 时叠加遗产 |
| 灵根 | → 新随机 | 重新 rollSpiritRoots()，转世遗产可提供灵根品质保底 |
| 资质 | → 新随机 | 重新 rollAptitudes()，遗产提供全资质 +N 加成 |
| 背包 | → 清空 | 不保留任何物品 |
| 装备 | → 清空 | 所有槽位 null |
| 金币 | → 0 | 清零 |
| 功法 | → 清空 | techniques = []，activeTechniqueId = null |
| NPC 好感度 | → 重置 | systems.npc 清空 |
| 地图状态 | → 初始区域 | systems.map 重置到起始区域 |
| 任务状态 | → 重置 | systems.quest 清空 |
| 瓶颈状态 | → 重置 | systems.bottleneck 清空 |
| 体修属性 | → 凡人初始值 | physique/bodyRealmIndex/bodyRealmExp 全部归零 |
| 死亡状态 | → 重置 | systems.death 清空（deathCount 归零） |
| 飞升状态 | → 重置 | systems.ascension 清空 |
| 追踪数据 | → 重置 | tracking 全部归零 |
| 历法 | → 年1月1 | gameYear = 1, gameMonth = 1（新的一世） |
| karma | → `floor(前世karma × 0.2)` | "前世因今世果"，保留 20% karma 倾向（若 T0077 已实现） |

### 2.3 信息流图

```
前世 Player ──┐
              │  calculateLegacy()
              ├──────────────────→ ReincarnationLegacy（永久加成）
              │
              │  finalizeIncarnation()
              ├──────────────────→ Chronicle（前世履历归档）
              │
              │  保留成就状态
              └──────────────────→ AchievementSystemState（原样保留）

新角色 ←── createReincarnatedPlayer(legacy, options)
  = createPlayer(options) + applyLegacy(legacy)
```

---

## 3. 转世遗产（Reincarnation Legacy）

### 3.1 数据结构

```ts
/** 单次转世产生的遗产快照 */
interface LegacySnapshot {
  incarnationNo: number;       // 第几世
  peakRealmIndex: number;      // 前世最高境界
  peakBodyRealmIndex: number;  // 前世最高体修境界
  outcome: 'died' | 'ascended' | 'voluntary'; // 结局
  age: number;                 // 终年（月）
}

/** 累计的转世遗产（存入 Player.systems.reincarnation） */
interface ReincarnationState {
  count: number;                   // 转世次数（0 = 从未转世）
  snapshots: LegacySnapshot[];     // 每世快照（最多保留 10 条，超出删最旧）
  legacy: ReincarnationLegacy;     // 当前累计遗产加成
}

/** 遗产加成（类 recalcStats 加成，转世后永久生效） */
interface ReincarnationLegacy {
  // ── 修炼加速 ──
  cultivationSpeedBonus: number;   // 修炼速度加成%（如 0.05 = +5%）
  bodyExpBonus: number;            // 体修修为获取加成%

  // ── 战斗属性 flat 加成 ──
  atkBonus: number;                // 额外攻击
  defBonus: number;                // 额外防御
  hpBonus: number;                 // 额外 HP
  mpBonus: number;                 // 额外 MP
  speedBonus: number;              // 额外速度

  // ── 先天加成 ──
  luckBonus: number;               // 额外幸运
  comprehensionBonus: number;      // 额外悟性
  charismaBonus: number;           // 额外魅力

  // ── 资质加成 ──
  aptitudeBonus: number;           // 所有资质 +N（flat）

  // ── 灵根保底 ──
  spiritRootFloor: number;         // 灵根亲和度下限（如 15 = 每个灵根至少 15）

  // ── 其他 ──
  inventoryCapacityBonus: number;  // 额外背包容量
  lifespanBonus: number;           // 额外初始寿限（月）
}
```

### 3.2 遗产计算公式

每次转世时，根据前世成就计算**本次新增遗产**，叠加到累计遗产上。

```
设 R = 前世最高境界 realmIndex（0=凡人 ~ 7=大乘 ~ 更高为仙道）
设 M = 遗产倍率（飞升/自愿 = 1.0，死亡 = 0.5）
设 N = 当前转世次数（转世前的值）

── 本次新增加成（乘以 M）──
cultivationSpeedBonus += 0.02 * (1 + R/10) * M     // 每次 +2%~3.4%
bodyExpBonus          += 0.01 * (1 + R/10) * M     // 每次 +1%~1.7%
atkBonus              += ceil(2 * (1 + R/5)) * M   // 每次 +2~5
defBonus              += ceil(2 * (1 + R/5)) * M
hpBonus               += ceil(10 * (1 + R/3)) * M  // 每次 +10~33
mpBonus               += ceil(5 * (1 + R/3)) * M
speedBonus            += ceil(1 * (1 + R/8)) * M   // 每次 +1~2
luckBonus             += ceil(2 * M)                // 每次 +1~2
comprehensionBonus    += ceil(2 * M)
charismaBonus         += ceil(2 * M)
aptitudeBonus         += ceil(1 * M)                // 每次 +0~1
spiritRootFloor       += ceil(3 * M)                // 每次 +1~3
inventoryCapacityBonus += ceil(2 * M)               // 每次 +1~2
lifespanBonus         += ceil(12 * (1 + R/5)) * M   // 每次 +12~24 月（1~2 年）
```

### 3.3 遗产上限

为防止无限膨胀，每项遗产有硬上限：

| 属性 | 上限 | 约需转世次数 |
|------|------|-------------|
| cultivationSpeedBonus | 0.50（+50%） | ~15次 |
| bodyExpBonus | 0.30（+30%） | ~20次 |
| atkBonus | 50 | ~15次 |
| defBonus | 50 | ~15次 |
| hpBonus | 300 | ~12次 |
| mpBonus | 150 | ~12次 |
| speedBonus | 20 | ~12次 |
| luckBonus | 20 | ~10次 |
| comprehensionBonus | 20 | ~10次 |
| charismaBonus | 20 | ~10次 |
| aptitudeBonus | 10 | ~10次 |
| spiritRootFloor | 30 | ~10次 |
| inventoryCapacityBonus | 20 | ~10次 |
| lifespanBonus | 240（20年） | ~12次 |

### 3.4 遗产生效方式

1. **修炼速度加成**：在修炼逻辑中，`expGain *= (1 + legacy.cultivationSpeedBonus)`
2. **战斗属性 flat 加成**：在 `recalcStats()` 中读取 `systems.reincarnation.legacy` 并叠加
3. **先天属性加成**：在 `createReincarnatedPlayer()` 时直接叠加到 luck/comprehension/charisma
4. **资质加成**：在 `createReincarnatedPlayer()` 时对所有资质 +aptitudeBonus（cap 100）
5. **灵根保底**：在 rollSpiritRoots 后，将每个灵根亲和度低于 spiritRootFloor 的值拉到 floor
6. **背包容量**：`inventoryCapacity = 20 + legacy.inventoryCapacityBonus`
7. **寿限加成**：初始寿限 = 100×12 + legacy.lifespanBonus

---

## 4. Player 数据结构扩展

**不新增顶层字段**，全部存入 `Player.systems.reincarnation`（类型为 `ReincarnationState`），保持 Player 接口稳定，与死亡/飞升/瓶颈系统的模式一致。

```ts
// 读取方式（与其他系统一致）
function getReincarnationState(player: Player): ReincarnationState {
  const raw = player.systems.reincarnation as ReincarnationState | undefined;
  return raw ?? {
    count: 0,
    snapshots: [],
    legacy: createEmptyLegacy(),
  };
}
```

---

## 5. 游戏逻辑方案（@Dev）

### 5.1 新增文件

| 文件 | 用途 | 关键函数 |
|------|------|----------|
| `src/game/reincarnation.ts` | 转世系统核心逻辑 | `canReincarnate()`, `calculateNewLegacy()`, `performReincarnation()`, `getReincarnationState()` |

### 5.2 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | 新增 `ReincarnationState`, `ReincarnationLegacy`, `LegacySnapshot` 类型；`DLCPack` 新增可选字段 `reincarnationEffects` | 类型定义 |
| `src/game/player/create.ts` | 新增 `createReincarnatedPlayer()` 函数 | 转世时创建新角色（复用 createPlayer + 叠加遗产） |
| `src/game/player.ts` (`recalcStats`) | 在 recalcStats 中读取 reincarnation legacy 并叠加战斗属性 | 遗产 flat 加成生效 |
| `src/game/chronicle.ts` | 新增 `ChronicleEventType: 'reincarnation'`；转世时调用 `finalizeIncarnation(outcome='died'\|'ascended')` + `createIncarnation()` | 履历记录 |
| `src/hooks/useGameEngine.ts` | 新增 `handleReincarnation()` 方法，协调转世流程 | 状态管理 |
| `src/hooks/useSystemActions.ts` | 新增 `reincarnate()` action | 暴露给 UI |
| `src/components/shared/ReincarnationModal.tsx` | 转世确认弹窗 + 遗产预览 | UI |
| `src/components/screens/GameOverScreen.tsx` | 增加转世按钮（条件：count ≥ 1） | 死亡转世入口 |
| `src/data/texts/reincarnation.ts` | 转世相关中文文案 | 文案集中管理 |
| `src/data/dlc/core/manifest.ts` | 注册转世相关成就、「轮回珠」道具定义 | DLC 内容 |
| `src/data/dlc/core/items.json` | 新增「轮回珠」道具数据 | 自愿转世消耗品 |

### 5.3 核心 API（`src/game/reincarnation.ts`）

```ts
// ── 状态读写 ──

/** 读取转世状态（纯函数） */
function getReincarnationState(player: Player): ReincarnationState;

/** 写入转世状态（返回新 Player） */
function setReincarnationState(player: Player, state: ReincarnationState): Player;

/** 创建空遗产 */
function createEmptyLegacy(): ReincarnationLegacy;

// ── 条件检查 ──

/** 转世可行性检查结果 */
interface ReincarnationCheck {
  canReincarnate: boolean;
  path: 'ascension' | 'death' | 'voluntary' | null;
  reason: string;          // 不可转世时的原因说明
  legacyPreview: ReincarnationLegacy; // 如果转世，将获得的累计遗产
  multiplier: number;      // 遗产倍率（1.0 或 0.5）
}

/** 检查当前是否可以转世 + 预览遗产 */
function checkReincarnation(
  player: Player,
  context: 'ascension' | 'death' | 'voluntary',
): ReincarnationCheck;

// ── 执行转世 ──

/** 转世执行结果 */
interface ReincarnationResult {
  newPlayer: Player;       // 新角色（含遗产加成）
  logs: string[];          // 日志消息
  legacySnapshot: LegacySnapshot; // 本次转世快照
}

/**
 * 执行转世。
 * 1. 计算本次遗产增量并累加
 * 2. 调用 createReincarnatedPlayer() 创建新角色
 * 3. 迁移系统状态（成就、遗产、履历）
 *
 * 注意：不处理 UI 和存档 IO，由 Hook 层负责。
 */
function performReincarnation(
  oldPlayer: Player,
  context: 'ascension' | 'death' | 'voluntary',
  newCharOptions: { name: string; gender: 'male' | 'female'; appearance: number },
): ReincarnationResult;
```

### 5.4 关键公式

#### 修炼速度加成接入点

在修炼逻辑（`useCoreActions.ts` 或对应修炼函数）中：

```
baseExpGain = ... // 原有计算
reincarnationBonus = 1 + legacy.cultivationSpeedBonus
finalExpGain = floor(baseExpGain * reincarnationBonus)
```

#### recalcStats 接入点

```
// 在 recalcStats() 末尾，叠加遗产 flat 加成
const legacy = getReincarnationState(player).legacy;
player.atk += legacy.atkBonus;
player.def += legacy.defBonus;
player.maxHp += legacy.hpBonus;
player.maxMp += legacy.mpBonus;
player.speed += legacy.speedBonus;
```

---

## 6. UI 方案（@Designer）

### 6.1 转世确认弹窗（ReincarnationModal）

| 元素 | 位置 | 内容 |
|------|------|------|
| 弹窗标题 | 顶部 | 「转世重修」 |
| 前世摘要 | 上半区 | 前世名/性别/最高境界/终年/结局 |
| 遗产预览 | 中部 | 列出本次转世将获得的新增加成（绿色）和累计加成 |
| 半额提示 | 遗产区顶部（仅死亡路径） | 黄色提示：「身陨转世，遗产减半」 |
| 新角色设置 | 下半区 | 姓名/性别/外貌选择（复用 StartScreen 的 reroll 组件） |
| 按钮 | 底部 | 「确认转世」「返回」 |

### 6.2 遗产面板（StatusPanel 内嵌）

在角色状态面板中增加「前世遗产」折叠栏（仅 `reincarnationCount > 0` 时显示）：
- 转世次数
- 各项遗产加成当前值 / 上限
- 前世列表（可展开查看每世摘要）

### 6.3 ActionPanel 转世按钮

- 仅在 `realmIndex ≥ 7` + 持有「轮回珠」时显示
- 按钮文案：「转世重修」
- 点击打开 ReincarnationModal

### 6.4 交互流程

```
用户点击「转世重修」
  → 弹出 ReincarnationModal
  → 上方展示前世摘要 + 遗产预览
  → 用户填写新角色姓名/性别/外貌
  → 点击「确认转世」
  → 过场：简短文字动画（"道消道长，轮回重始…"）
  → 画面刷新为新角色的 GameLayout
  → 日志："第 N 世修仙之路开启，前世遗产加持，道心更坚。"
```

---

## 7. 与存档的关系

- 转世**不创建新存档**，在当前存档内操作
- 转世时调用 `handleReincarnation()` → 替换当前 Player state → 自动存档
- 转世遗产存在 `Player.systems.reincarnation` 中，随 Player 一同序列化
- 修仙履历（Chronicle）独立于 Player 存档（存 `localStorage` 的 `xiuxian_chronicle` key），转世时归档前世 + 创建新世轮回，天然支持跨转世
- 成就状态存在 `Player.systems.achievement` 中，转世时原样迁移到新 Player

---

## 8. DLC 扩展点

### 8.1 新增 DLCPack 字段

```ts
interface DLCPack {
  // ... 已有字段 ...
  reincarnationEffects?: ReincarnationEffectDef[];  // 自定义转世效果
}

/** DLC 可注册的自定义转世效果 */
interface ReincarnationEffectDef {
  id: string;                     // 'cp-01:legacy_sword_memory'
  name: string;                   // '剑道残影'
  description: string;            // '前世剑道修为化为本能记忆…'
  condition: (oldPlayer: Player) => boolean;  // 触发条件（前世状态）
  apply: (newPlayer: Player, oldPlayer: Player) => Player; // 应用效果到新角色
  priority: number;               // 执行优先级（小的先执行）
}
```

### 8.2 扩展示例

DLC 可注册的自定义转世效果举例：
- **「剑道残影」**：前世剑法资质 ≥ 80 → 新角色剑法资质 +10
- **「丹道传承」**：前世炼丹次数 ≥ 100 → 新角色起始获得「入门丹方」
- **「宿命纠缠」**：前世 karma ≤ -50 → 新角色起始 karma = -10，触发特殊事件

### 8.3 注册与查询

```ts
// registry/stores.ts 新增
export const reincarnationEffectRegistry = new Map<string, ReincarnationEffectDef>();

// registry/dlc.ts 注册
if (pack.reincarnationEffects)
  for (const re of pack.reincarnationEffects)
    reincarnationEffectRegistry.set(re.id, re);

// registry/queries.ts 查询
function getAllReincarnationEffects(): ReincarnationEffectDef[];
```

---

## 9. 与现有系统的集成

### 9.1 死亡系统（T0040）

- 在 `DeathModal` / `GameOverScreen` 中，当 `reincarnationCount ≥ 1` 且 `severity === 'severe'` 且无复活手段时，增加「转世重修」按钮
- 按钮点击 → 打开 ReincarnationModal（context = 'death'）
- 死亡转世遗产倍率 = 0.5

### 9.2 飞升系统（T0033）

- 飞升成功结算后（`applyAscensionSuccess` 返回后），在飞升结果展示中增加「转世重修」选项
- 飞升转世遗产倍率 = 1.0

### 9.3 修仙履历（T0068）

- 转世时调用 `finalizeIncarnation(chronicle, oldPlayer, outcome)` 归档前世
- 然后 `createIncarnation(newPlayer, chronicle)` 开始新世
- 新增 `ChronicleEventType: 'reincarnation'`，记录转世事件
- 转世事件描述示例：`"轮回转世，第 N 世修仙之路开启"`

### 9.4 成就系统（T0031）

转世相关成就通过 `core` DLC 的 `achievements` 注册：

| 成就 ID | 名称 | 条件 | 奖励 |
|---------|------|------|------|
| `core:ach_first_reincarnation` | 轮回初启 | 首次转世（count ≥ 1） | luck +3 |
| `core:ach_three_lives` | 三世修仙 | 转世 3 次（count ≥ 3） | comprehension +5 |
| `core:ach_nine_lives` | 九世轮回 | 转世 9 次（count ≥ 9） | 全属性 +3, cultivationSpeedBonus 额外 +5% |
| `core:ach_ascend_reincarnate` | 仙人转世 | 飞升后转世（snapshot 中有 outcome='ascended'） | luck +5, charisma +5 |
| `core:ach_death_reincarnate` | 涅槃重生 | 死亡后转世（snapshot 中有 outcome='died'） | def +5, hp +20 |

### 9.5 瓶颈系统（T0064）

- 转世后 `systems.bottleneck` 完全重置
- 瓶颈需重新触发和突破，不保留前世进度

### 9.6 正邪系统（T0077，未实现）

- 若 `Player.karma` 字段存在：新角色 karma = `floor(前世karma × 0.2)`
- "前世因今世果"：保留微弱的善恶倾向，不至于完全归零

### 9.7 命格系统（#110，未实现）

- 若 `Player.destinyId` 字段存在：转世后命格**重新随机**
- 设计预留：未来可增加「命格继承」遗产效果（通过 DLC 的 reincarnationEffects 注册）

---

## 10. 「轮回珠」道具定义

```json
{
  "id": "core:reincarnation_orb",
  "name": "轮回珠",
  "category": "misc",
  "rarity": "legendary",
  "description": "蕴含轮回之力的神珠，可在大乘期主动转世重修，保留今世修行遗产。",
  "stackable": true,
  "maxStack": 3,
  "usable": false,
  "sellPrice": 0
}
```

获取途径（通过 core 事件/商店/掉落注册）：
- 大乘期特殊探索事件低概率获得
- 渡劫成功奖励低概率出

---

## 11. 中文文案示例

以下文案将定义在 `src/data/texts/reincarnation.ts`：

```ts
export const REINCARNATION_TEXTS = {
  // ── 弹窗 ──
  modalTitle: '转世重修',
  confirmButton: '确认转世',
  cancelButton: '返回',
  deathHalfLegacy: '身陨转世，前世遗产减半',

  // ── 前世摘要 ──
  previousLifeSummary: (name: string, realm: string, ageYears: number) =>
    `前世「${name}」，${realm}期，享年 ${ageYears} 岁`,
  outcomeAscended: '羽化飞升',
  outcomeDied: '道消魂灭',
  outcomeVoluntary: '主动转世',

  // ── 遗产 ──
  legacyTitle: '转世遗产',
  legacyNew: '本次新增',
  legacyTotal: '累计加成',
  legacyCultivationSpeed: (val: number) => `修炼速度 +${(val * 100).toFixed(0)}%`,
  legacyAtk: (val: number) => `攻击 +${val}`,
  legacyDef: (val: number) => `防御 +${val}`,
  legacyHp: (val: number) => `体力 +${val}`,
  legacyMp: (val: number) => `灵力 +${val}`,
  legacyLuck: (val: number) => `幸运 +${val}`,
  legacyComprehension: (val: number) => `悟性 +${val}`,
  legacyCharisma: (val: number) => `魅力 +${val}`,
  legacyAptitude: (val: number) => `全资质 +${val}`,
  legacySpiritRootFloor: (val: number) => `灵根下限 ${val}`,
  legacyInventory: (val: number) => `背包 +${val}`,
  legacyLifespan: (months: number) => `初始寿限 +${Math.floor(months / 12)} 年`,

  // ── 日志 ──
  reincarnationLog: (n: number) =>
    `✨ 第 ${n} 世修仙之路开启，前世遗产加持，道心更坚。`,
  reincarnationChronicle: (n: number) =>
    `轮回转世，第 ${n} 世修仙之路开启`,
  voluntaryReincarnation: '参悟轮回之理，化去今世道果，转世重修…',
  reincarnationOrbConsumed: '轮回珠碎裂，轮回之力涌入…',

  // ── 状态面板 ──
  reincarnationCount: (n: number) => `转世次数：${n}`,
  previousLives: '前世列表',
} as const;
```

---

## 12. 验证方式

### 12.1 基本流程测试

| # | 测试场景 | 操作 | 预期结果 |
|---|---------|------|---------|
| 1 | 首次死亡无转世选项 | Debug 设 HP=0 触发 severe 死亡 | 死亡弹窗显示 Game Over，无「转世重修」按钮 |
| 2 | 飞升后转世 | Debug 调到大乘 → 触发飞升 → 选择「转世重修」 | 弹出确认弹窗 → 显示遗产预览 → 确认后回到凡人状态，遗产加成生效 |
| 3 | 死亡后转世 | 先完成一次转世（count ≥ 1）→ Debug 触发 severe 死亡 | 死亡弹窗显示「转世重修」按钮 → 遗产半额 |
| 4 | 自愿转世 | Debug 调到大乘 + 给「轮回珠」→ 点击「转世重修」 | 消耗轮回珠 → 确认弹窗 → 满额遗产 |
| 5 | 遗产累加验证 | 连续转世 3 次，每次检查属性 | 每次转世后属性加成递增，不超过上限 |
| 6 | 成就解锁 | 首次转世后检查成就面板 | 「轮回初启」成就解锁 |
| 7 | 履历记录 | 转世后打开修仙履历 | 前世履历归档，新世开始，转世事件记录在案 |
| 8 | 存档一致性 | 转世后存档 → 刷新页面 → 加载存档 | 遗产和角色状态正确恢复 |

### 12.2 边界条件

| # | 场景 | 预期 |
|---|------|------|
| 1 | 遗产达到上限后再转世 | 加成不再增长，提示已达上限 |
| 2 | 转世 10 次后第 11 次 | snapshots 保留最近 10 条，最旧的被丢弃 |
| 3 | 未启用 T0077 时的 karma 处理 | 安全跳过，不报错 |
| 4 | 凡人境界死亡（realmIndex = 0）| 最低境界也能正确计算遗产（R=0） |

## 13. 调试面板需求

在 `DebugStatsTab` 中新增：

| 功能 | 类型 | 说明 |
|------|------|------|
| 转世次数 | 数值输入 | 直接设置 `reincarnationState.count` |
| 一键转世 | 按钮 | 执行 `performReincarnation(context='voluntary')`，无需轮回珠 |
| 重置遗产 | 按钮 | 将 `legacy` 清零 |
| 给予轮回珠 | 按钮 | 向背包添加 1 个 `core:reincarnation_orb` |

---

## 14. 依赖关系

- **前置**（全部已完成）：
  - T0029 突破渡劫 ✅
  - T0040 死亡系统 ✅
  - T0056 初始随机属性 ✅
  - T0033 仙道飞升 ✅
- **可选集成**（未实现时安全跳过）：
  - #198 正邪系统（karma 部分继承）
  - #110 命格天赋（命格重新随机）
- **后续任务**：
  - T0034 洪荒终局（多次转世攀登更高境界）
  - 转世专属事件内容包（DLC）
