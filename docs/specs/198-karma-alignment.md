# 设计文档：正邪系统（善恶阵营）

任务：#198
日期：2026-04-08

## 概述

新增**正邪值（karma）**机制，为玩家引入一条善恶数值轴（−100 ~ +100），并根据数值区间映射到**阵营（alignment）**：正道 / 中立 / 邪道。正邪值影响 NPC 好感度、功法/神通学习门槛、商店交易、事件分支、战斗加成等多个现有系统，丰富角色扮演维度。所有与正邪相关的具体内容（NPC 阵营偏好、功法阵营门槛、阵营专属事件等）均通过 DLC 数据挂载，系统本身只提供通用逻辑壳子。

---

## 数据结构

### 1. 正邪值与阵营

```ts
// 正邪阵营枚举
type Alignment = 'righteous' | 'neutral' | 'evil';

// 阵营区间（可配置，利于 DLC 调整）
// karma ≥ 30   → righteous（正道）
// karma ≤ −30  → evil（邪道）
// 中间          → neutral（中立）
const ALIGNMENT_THRESHOLDS = { righteous: 30, evil: -30 };
```

### 2. Player 属性扩展

在 `Player` 接口中新增顶层字段：

```ts
interface Player {
  // ... 已有字段 ...
  karma: number;           // 正邪值 −100 ~ +100，初始 0
}
```

> **设计决策**：`karma` 作为顶层属性而非存入 `systems` record，理由与 `mood`/`health` 一致——它是角色核心数值，会被多个系统频繁读取，放顶层更直观、类型安全。

`alignment` 由 `karma` 实时推导（纯函数），不持久化：

```ts
function getAlignment(karma: number): Alignment;
```

### 3. 正邪值系统状态（可选，低优先级）

如需追踪正邪值变化历史（用于修仙履历 T0068），可在 `systems['karma']` 中存储：

```ts
interface KarmaSystemState {
  totalGained: number;        // 累计获得的正向 karma
  totalLost: number;          // 累计失去的正向 karma（即向邪变化的绝对量）
  lastChangeAge: number;      // 上次变化时的 age
  majorEvents: string[];      // 重大善恶事件 ID 列表（用于履历展示）
}
```

### 4. NPC 阵营偏好

扩展 `NpcDef` 接口，新增可选字段：

```ts
interface NpcDef {
  // ... 已有字段 ...
  alignment?: Alignment;                   // NPC 自身阵营（默认 'neutral'）
  karmaAffinityModifier?: {
    sameFaction: number;                   // 同阵营好感度加成系数（如 1.2 = +20%）
    oppositeFaction: number;               // 对立阵营好感度惩罚系数（如 0.5 = −50%）
  };
}
```

对应 `npcs.json` 中追加：

```json
{
  "id": "core:npc_qingyun_elder",
  "alignment": "righteous",
  "karmaAffinityModifier": {
    "sameFaction": 1.3,
    "oppositeFaction": 0.5
  }
}
```

### 5. 功法阵营门槛

扩展 `TechniqueDef` 接口：

```ts
interface TechniqueDef {
  // ... 已有字段 ...
  requiredAlignment?: Alignment;           // 学习门槛：仅该阵营可学
  karmaShift?: number;                     // 每次修炼此功法时的 karma 变化量（如邪功为 −1）
}
```

### 6. 神通阵营门槛

扩展 `DivineArtDef` 接口：

```ts
interface DivineArtDef {
  // ... 已有字段 ...
  requiredAlignment?: Alignment;           // 学习门槛
}
```

### 7. 事件正邪效果

事件的 `effect` 函数已经可以自由修改 Player，无需改类型。JSON 事件中新增 `karmaChange` effect 字段：

```json
{
  "effects": {
    "karmaChange": 10
  }
}
```

`event-loader.ts` 需识别此字段并在 effect 函数中执行 `changeKarma()`。

### 8. 对话选择正邪效果

扩展 `DialogueEffect` 接口：

```ts
interface DialogueEffect {
  // ... 已有字段 ...
  karmaChange?: number;                    // 选择此选项导致的 karma 变化
}
```

### 9. 对话/任务条件中的阵营检查

扩展 `DialogueChoiceCondition` / `QuestChainCondition`：

```ts
interface DialogueChoiceCondition {
  // ... 已有字段 ...
  requiredAlignment?: Alignment;           // 显示此选项的阵营要求
  minKarma?: number;
  maxKarma?: number;
}

interface QuestChainCondition {
  // ... 已有字段 ...
  requiredAlignment?: Alignment;
  minKarma?: number;
  maxKarma?: number;
}
```

### 10. 商店阵营限制

扩展 `ShopGoodsDef`：

```ts
interface ShopGoodsDef {
  // ... 已有字段 ...
  requiredAlignment?: Alignment;           // 仅该阵营玩家可购买
}
```

### 11. DLCPack 扩展

`DLCPack` 接口无需新增字段——正邪数据通过已有的 `npcs`、`techniques`、`events`、`questChains`、`dialogues` 等字段中的可选阵营属性自然挂载。

---

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键函数 |
|------|------|----------|
| `src/game/karma.ts` | 正邪系统核心逻辑 | `getAlignment()`, `changeKarma()`, `getKarmaState()`, `calcAffinityKarmaModifier()`, `getKarmaTitle()` |
| `src/data/texts/karma.ts` | 正邪系统中文文案 | `KARMA_TEXTS`, `ALIGNMENT_CN`, `KARMA_TITLES` |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/player/types.ts` | Player 接口新增 `karma: number` | 核心属性 |
| `src/game/player/create.ts` | `createPlayer()` 初始化 `karma: 0` | 新角色默认中立 |
| `src/game/types.ts` | `NpcDef` 加 `alignment?`, `karmaAffinityModifier?`；`TechniqueDef` 加 `requiredAlignment?`, `karmaShift?`；`DivineArtDef` 加 `requiredAlignment?`；`DialogueEffect` 加 `karmaChange?`；`DialogueChoiceCondition` / `QuestChainCondition` 加 `requiredAlignment?`, `minKarma?`, `maxKarma?`；`ShopGoodsDef` / `shop.ts` 加 `requiredAlignment?`；新增 `Alignment` 类型 | 各系统阵营扩展 |
| `src/game/npc.ts` | `changeAffinity()` 中加入 karma-based 修正 | 同阵营 NPC 好感加成，对立惩罚 |
| `src/game/technique.ts` | `learnTechnique()` 加阵营门槛检查；修炼时触发 `karmaShift` | 功法阵营限制 |
| `src/game/divine-arts.ts` | 学习神通时加阵营门槛检查 | 神通阵营限制 |
| `src/game/event-loader.ts` | 解析 JSON 中 `karmaChange` 字段 | 事件 karma 效果 |
| `src/game/dialogue.ts` | 执行 `DialogueEffect.karmaChange`；检查 `DialogueChoiceCondition.requiredAlignment` | 对话阵营分支 |
| `src/game/quest.ts` | `checkQuestCondition()` 加阵营/karma 检查 | 任务条件 |
| `src/game/shop.ts` | 过滤商品时检查 `requiredAlignment` | 商店阵营限制 |
| `src/game/player/stats.ts` | `recalcStats()` 内可选：正道加成 `def+2%`、邪道加成 `atk+2%` | 阵营被动加成 |
| `src/hooks/useCoreActions.ts` | 探索/战斗等行为后触发 karma 变化回调 | 行为驱动 karma 变化 |
| `src/hooks/useSystemActions.ts` | 修炼功法时触发 `karmaShift` | 功法修炼 karma 变化 |
| `src/data/texts/common.ts` | 新增 `ALIGNMENT_CN` 映射 | 中文显示 |
| `src/data/texts/index.ts` | re-export karma 文案 | 文案集中 |
| `src/data/dlc/core/npcs.json` | 现有 NPC 追加 `alignment` 字段 | 数据驱动 |
| `src/data/dlc/core/manifest.ts` | 无需改动（NPC 已注册，新字段自动生效） | — |

### 公式

#### 阵营判定

```
if karma ≥ 30  → righteous（正道）
if karma ≤ −30 → evil（邪道）
else           → neutral（中立）
```

#### NPC 好感度修正

当 `changeAffinity(player, npcId, delta)` 被调用时：

```
npcAlignment = npcDef.alignment ?? 'neutral'
playerAlignment = getAlignment(player.karma)

if npcAlignment == playerAlignment && npcAlignment != 'neutral':
  effectiveDelta = delta × (npcDef.karmaAffinityModifier?.sameFaction ?? 1.2)
elif npcAlignment 与 playerAlignment 对立（一正一邪）:
  effectiveDelta = delta × (npcDef.karmaAffinityModifier?.oppositeFaction ?? 0.5)
  // 如果 delta > 0（好事），缩减；如果 delta < 0（坏事），不额外修正
else:
  effectiveDelta = delta
```

#### 阵营被动加成（轻量）

```
if alignment == 'righteous':
  防御 +3%  // 正气护体
  恢复效果 +10%（丹药/休息回复量 ×1.1）
elif alignment == 'evil':
  攻击 +3%  // 煞气加身
  暴击伤害 +10%（critDmgMultiplier +0.15）
// neutral 无加成
```

#### karma 自然衰减（回归中立）

每次 `tickMonth` 时，karma 缓慢向 0 衰减：

```
衰减量 = sign(karma) × min(1, abs(karma) / 50)
karma = karma − 衰减量（向 0 靠拢）
```

即极端正邪衰减稍快，接近中立时几乎不衰减。衰减速度很慢，确保玩家需持续做善/恶行为才能维持阵营。

#### karma 边界

```
karma = clamp(karma, -100, +100)
```

### 正邪值称号

根据 karma 绝对值和符号，显示不同称号：

| karma 范围 | 称号 |
|-----------|------|
| 80 ~ 100 | 正道宗师 / 魔道至尊 |
| 50 ~ 79 | 正道高手 / 邪道强者 |
| 30 ~ 49 | 正道修士 / 邪道修士 |
| −29 ~ 29 | 中立散修 |

### karma 获取来源汇总

| 来源 | 方向 | 示例 |
|------|------|------|
| 事件选择 | ±5 ~ ±20 | 救人 +10 / 杀人夺宝 −15 |
| 对话选择 | ±3 ~ ±10 | "以德服人" +5 / "威逼利诱" −5 |
| 功法修炼 | karmaShift/次 | 正道功法 +1 / 邪道功法 −1 |
| 任务完成 | 奖励中含 karmaChange | 仁义任务 +15 / 恶行任务 −15 |
| 特殊物品使用 | ±10 | 使用"净世莲花" +10 / "噬魂珠" −10 |
| 战斗击杀 | 0（默认不变） | 预留：击杀平民 NPC −20（未来 PvP 系统） |

---

## UI 方案（@Designer）

### 新增界面/面板

| 元素 | 位置 | 内容 |
|------|------|------|
| **正邪指示器** | 左侧面板 `LeftPanel` / StatusBar 区域内 | 显示：阵营称号文字 + karma 数值 + 小型善恶条（左红右蓝，中间为 0） |
| **karma 变化 Toast** | 全局 Toast | karma 变化时弹出，如 "⚖️ 正邪值 +10（救助弱者）" |
| **功法阵营标记** | 功法面板 `TechniquePanel` | 有 `requiredAlignment` 的功法显示阵营徽标（⚔️正 / 💀邪） |
| **NPC 阵营标记** | NPC 面板 `NpcPanel` / SceneNpcs | NPC 名字旁显示阵营小标签 |
| **商品阵营标记** | 商店面板 `ShopPanel` | 有阵营限制的商品右上显示阵营图标 |

### 正邪条设计

```
邪 ←──────┼──────→ 正
   红色     灰色     蓝色
  -100      0       +100
        ▲ 当前位置
```

- 条形用 CSS 渐变：左侧 `var(--color-evil)` → 中间 `var(--color-neutral)` → 右侧 `var(--color-righteous)`
- 新增 CSS 变量：

```css
:root {
  --color-righteous: #5599ff;     /* 正道蓝 */
  --color-evil: #cc3333;          /* 邪道红 */
  --color-karma-neutral: #888;    /* 中立灰 */
}
```

### 交互

- 正邪条 hover 显示详细文字：`"正邪值：+45（正道修士）"`
- karma 变化时，正邪条有短暂闪动动画（CSS transition）
- 功法列表中阵营不符的功法显示为置灰 + 提示文字

---

## 验证方式

### 测试用例（初稿，将写入 `docs/test-guide.md`）

#### 21.1 正邪值基础

1. **新建角色**：新建角色后 karma = 0，阵营显示"中立散修"
2. **karma 变化**：通过 Debug 面板设置 karma = 50，阵营显示"正道修士"
3. **karma 边界**：通过 Debug 面板设 karma = 150 → 被 clamp 到 100；设 −150 → clamp 到 −100
4. **自然衰减**：karma = 80，执行多次 tick，观察 karma 缓慢向 0 衰减

#### 21.2 NPC 好感度修正

1. **同阵营加成**：玩家 karma = +50（正道），对正道 NPC 赠礼，好感度增量 > 对中立 NPC 赠礼的增量
2. **对立阵营惩罚**：玩家 karma = +50（正道），对邪道 NPC 赠礼，好感度增量 < 对中立 NPC 赠礼的增量
3. **中立不受影响**：玩家 karma = 0，赠礼增量正常

#### 21.3 功法/神通阵营门槛

1. **阵营不符**：玩家正道（karma +50），尝试学习 `requiredAlignment: 'evil'` 的功法 → 失败，提示"此功法需邪道修士方可修炼"
2. **阵营符合**：玩家邪道（karma −50），成功学习邪道功法
3. **karmaShift**：修炼标记 `karmaShift: -1` 的功法，每次修炼 karma −1

#### 21.4 商店阵营限制

1. **有限制的商品**：邪道商品仅邪道玩家可见/可购买
2. **无限制的商品**：正常显示

#### 21.5 事件/对话 karma 分支

1. **事件 karma**：触发含 `karmaChange: 10` 的事件，karma +10，Toast 显示变化
2. **对话选项**：对话中阵营选项仅在满足 `requiredAlignment` 时显示

---

## 调试面板需求

在 `DebugStatsTab` 中新增：

| 字段 | 类型 | 功能 |
|------|------|------|
| **正邪值** | 数值滑块 (−100 ~ +100) | 直接设置 karma |
| **当前阵营** | 只读文字 | 实时显示推导的阵营名称 |

---

## 依赖关系

### 前置任务

| 任务 | 原因 |
|------|------|
| T0001 属性系统 | Player 基础结构 |
| T0025 NPC 系统 | NPC 好感度修正集成 |
| T0017 功法系统 | 功法阵营门槛 |
| T0015 商店系统 | 商品阵营限制 |

以上均已完成（✅），**本任务无阻塞依赖**。

### 后续任务 / 建议

| 任务 | 关系 |
|------|------|
| T0027 门派系统 | 门派可有阵营属性，影响入门条件 |
| T0050 心魔系统 | 邪道玩家心魔触发几率更高？或正道玩家堕入邪道时触发心魔 |
| CP-05 魔道逆天（DLC） | 大量邪道功法/事件/NPC 内容 |
| T0051 NPC AI 生态 | NPC 之间也可有正邪互动 |

---

## 实现建议

### Phase 1（MVP）

- `karma.ts` 核心函数（getAlignment / changeKarma / getKarmaTitle / calcAffinityKarmaModifier）
- Player 类型 + createPlayer 扩展
- NPC 好感度修正
- 功法阵营门槛
- 左侧面板正邪指示器
- Debug 面板 karma 滑块
- 文案文件 `karma.ts`

### Phase 2（内容填充）

- 现有 NPC JSON 加阵营标记
- 新增阵营专属事件（数条"正道/邪道选择"探索事件）
- 对话系统 karma 分支
- 商店阵营限制
- 阵营被动加成（atk/def 微调）

### Phase 3（DLC 扩展）

- CP-05 魔道逆天内容包（邪道功法、事件、NPC）
- 可选 DLC：正道宗门内容包
- karma 自然衰减机制
- 修仙履历中记录重大善恶事件
