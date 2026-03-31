# T0056 — 初始随机属性系统

- **状态**: ✅ 已完成
- **完成日期**: 2026-03-30
- **分类**: 核心循环
- **前置**: T0001（属性系统）
- **Spec**: —（待设计）

## 描述

新建角色时，通过随机生成 + **锁定重随**机制为玩家角色赋予独特的初始属性。参考鬼谷八荒的开局设计：玩家可以**无限次重随**，同时拥有 **3 把锁**，可以把满意的属性栏锁住，再次随机时锁住的属性保持不变，只重随未锁定的部分。让玩家在"慢慢凑出完美开局"和"差不多就出发"之间自由选择。

## 核心需求

### 1. 灵根类型系统（新增）

当前代码中 `getSpiritRootGrade()` 仅根据 6 元素资质平均值评定品级，但**没有明确的灵根类型**。新系统引入五行灵根概念。

#### 1.1 五行灵根

基础五行：**金**、**木**、**水**、**火**、**土**

> 设计决策：
> - 核心灵根类型基于五行（金木水火土），作为角色标签式属性
> - 现有 6 元素资质（fire/water/thunder/wind/earth/wood）保留，作为修炼/战斗的细粒度资质
> - 灵根类型与元素资质关联但不等价（如火灵根提升 fire 资质基础值）

#### 1.2 灵根组合与稀有度

| 灵根数量 | 名称 | 出现权重 | 修炼倍率 | 说明 |
|----------|------|----------|---------|------|
| 1 | 单灵根 | 1%     | ×3.0 | 极其稀有，单一属性极强 |
| 2 | 双灵根 | 5%     | ×2.0 | 稀有，双属性互补 |
| 3 | 三灵根 | 15%    | ×1.2 | 较常见，中等资质 |
| 4 | 四灵根 | 35%    | ×0.8 | 常见，资质一般 |
| 5 | 五灵根 | 40%    | ×0.5 | 最常见，杂灵根 |
| 0 | 无灵根 | 4%     | ×0.1 | 凡人之体，极罕见的废柴开局 |

> 无灵根不是"废"，后期可通过奇遇/天赋获得特殊灵根或走体修路线（预留扩展）。

#### 1.3 灵根亲和度

每个激活的灵根有一个**亲和度**值（1–100）：
- 亲和度影响对应系功法修炼速度、对应元素攻防加成
- 单灵根的属性亲和度 ≥ 80（保底高亲和）
- 多灵根时各属性亲和度独立随机

#### 1.4 数据结构

```ts
interface SpiritRoot {
  type: SpiritRootType;     // 'metal' | 'wood' | 'water' | 'fire' | 'earth'
  affinity: number;         // 1-100 亲和度
}

type SpiritRootCombo = 'none' | 'single' | 'dual' | 'triple' | 'quad' | 'penta';

interface PlayerSpiritRoots {
  roots: SpiritRoot[];
  combo: SpiritRootCombo;
  cultivationMultiplier: number;
}
```

扩展 Player 接口：
```ts
interface Player {
  // ...现有属性...
  spiritRoots: PlayerSpiritRoots;
  gender: 'male' | 'female';
  appearance: number;  // 头像编号
}
```

### 2. 基础属性随机区间

当前 `createPlayer()` 中部分属性固定值，改为有区间的随机：

| 属性 | 当前值 | 随机区间 | 说明 |
|------|--------|---------|------|
| luck（气运） | `randInt(1,100)` | 改为加权随机（高值稀有） | 优化分布 |
| comprehension（悟性） | `randInt(1,100)` | 改为加权随机 | 同上 |
| charisma（魅力） | `randInt(1,100)` | 改为加权随机 | 同上 |
| mood（心情） | 固定 70 | 50–90 | 开局心境差异 |
| health（健康） | 固定 100 | 80–100 | 体质差异 |

> 先天三属性（luck/comprehension/charisma）改为与 `rollAptitude()` 类似的加权分布，避免太容易出双百。

### 3. 资质随机（已有，优化）

现有 `rollAptitude()` 加权随机保留，新增调整：

- **灵根类型影响资质基础值**：激活灵根对应的元素资质 +20~+40 加成（保底不低于 50）
- **单灵根角色**：对应属性资质保底 80+，其余不加成

### 4. 性别与外貌

#### 4.1 性别
- 随机 50/50（男/女）
- 影响：部分事件文本（称呼差异）、部分奇遇触发条件
- 不影响战斗数值

#### 4.2 外貌/头像
- 根据性别从 `public/avatars/` 预设头像池中随机选取
- 玩家可在创建界面手动切换

---

### 5. 锁定重随机制（核心玩法）

这是本任务的核心设计，参考鬼谷八荒的开局洗属性。

#### 5.1 随机属性栏分组

角色创建时，以下属性被分为**独立的可锁定栏位**，每个栏位可以单独锁定：

| 栏位 | 包含内容 | 说明 |
|------|---------|------|
| **灵根** | 灵根组合（类型 + 数量 + 亲和度） | 整组一起随机/锁定 |
| **先天属性** | 气运、悟性、魅力 | 三个值一起随机/锁定 |
| **元素资质** | 16 项资质（火/水/雷/风/土/木/炼丹/炼器/…） | 全组一起随机/锁定 |
| **体质** | 心情、健康 | 一起随机/锁定 |
| **性别外貌** | 性别 + 头像 | 一起随机/锁定 |

> 共 **5 个栏位**，玩家有 **3 把锁**，最多同时锁定 3 个栏位。

#### 5.2 交互流程

```
1. 进入角色创建界面 → 输入道号
2. 系统自动执行一次完整随机，展示 5 个栏位的结果
3. 玩家可以：
   - 点击任意栏位的 🔒 图标 → 锁定该栏位（消耗 1 把锁，已锁时点击解锁、归还锁）
   - 点击 [重新随机] → 未锁定的栏位全部重随，锁定的保持不变
   - 点击 [确认开始] → 用当前属性创建角色
4. 锁的数量显示在界面上：「剩余锁：🔒🔒🔒」→ 用掉一个变灰
5. 重随次数无限，不消耗任何资源
```

#### 5.3 UI 布局示意

```
┌─────────────────────────────────────────┐
│           创 建 角 色                    │
│  道号：[_______________]                │
├─────────────────────────────────────────┤
│                                         │
│  剩余锁：🔒 🔒 🔒                       │
│                                         │
│  ┌─ 灵根 ──────────────── [🔒]─┐      │
│  │  双灵根（火·木）              │      │
│  │  火亲和 78  木亲和 45         │      │
│  │  修炼倍率 ×2.0               │      │
│  └──────────────────────────────┘      │
│                                         │
│  ┌─ 先天属性 ──────────── [🔓]─┐      │
│  │  气运 72   悟性 45   魅力 88  │      │
│  └──────────────────────────────┘      │
│                                         │
│  ┌─ 元素资质 ──────────── [🔓]─┐      │
│  │  火 85  水 23  雷 41  风 12   │      │
│  │  土 67  木 71  ...            │      │
│  └──────────────────────────────┘      │
│                                         │
│  ┌─ 体质 ────────────── [🔓]─┐        │
│  │  心情 75   健康 92           │        │
│  └──────────────────────────────┘      │
│                                         │
│  ┌─ 性别外貌 ─────────── [🔓]─┐      │
│  │  [头像]  男                   │      │
│  └──────────────────────────────┘      │
│                                         │
│       [重新随机]    [确认开始]           │
└─────────────────────────────────────────┘
```

#### 5.4 锁定状态数据结构

```ts
/** 角色创建阶段的临时状态（不进入存档） */
interface CharacterCreationState {
  name: string;
  totalLocks: number;            // 初始 3
  lockedSlots: Set<CreationSlot>; // 当前锁定的栏位集合

  // 各栏位当前随机结果
  spiritRoots: PlayerSpiritRoots;
  innateStats: { luck: number; comprehension: number; charisma: number };
  aptitudes: Aptitudes;
  constitution: { mood: number; health: number };
  identity: { gender: 'male' | 'female'; appearance: number };
}

type CreationSlot = 'spiritRoots' | 'innateStats' | 'aptitudes' | 'constitution' | 'identity';
```

#### 5.5 重随逻辑伪代码

```ts
function reroll(state: CharacterCreationState): CharacterCreationState {
  return {
    ...state,
    spiritRoots:  state.lockedSlots.has('spiritRoots')  ? state.spiritRoots  : rollSpiritRoots(),
    innateStats:  state.lockedSlots.has('innateStats')   ? state.innateStats  : rollInnateStats(),
    aptitudes:    state.lockedSlots.has('aptitudes')      ? state.aptitudes    : rollAptitudes(),
    constitution: state.lockedSlots.has('constitution')   ? state.constitution : rollConstitution(),
    identity:     state.lockedSlots.has('identity')       ? state.identity     : rollIdentity(),
  };
}

function toggleLock(state: CharacterCreationState, slot: CreationSlot): CharacterCreationState {
  const locked = new Set(state.lockedSlots);
  if (locked.has(slot)) {
    locked.delete(slot);  // 解锁，归还一把锁
  } else {
    if (locked.size >= state.totalLocks) return state; // 锁已用完，不可再锁
    locked.add(slot);
  }
  return { ...state, lockedSlots: locked };
}
```

### 6. 开局创建流程（UI 改造）

当前开始界面只有道号输入框。改为单页创建界面（非多步骤分页）：

```
1. 输入道号
2. 一次性展示所有 5 个栏位的随机结果
3. 锁定/解锁 + 无限重随
4. 点击 [确认开始] 创建角色
```

> 预留：T0047 天赋系统完成后，在创建界面底部新增「天赋」栏位（也可以作为第 6 个可锁定栏位，但不额外给锁）。

### 7. 天赋扩展点（T0047 预留）

```ts
function createPlayer(options: CreatePlayerOptions): Player;

interface CreatePlayerOptions {
  name: string;
  gender: 'male' | 'female';
  appearance: number;
  spiritRoots: PlayerSpiritRoots;
  innateStats: { luck: number; comprehension: number; charisma: number };
  aptitudes: Aptitudes;
  constitution: { mood: number; health: number };
  // T0047 阶段增加：
  // talents?: string[];
}
```

### 8. 灵根对游戏性的影响（核心机制）

| 影响维度 | 说明 |
|----------|------|
| 基础修炼速度 | `cultivationMultiplier` 直接乘以基础修炼经验（灵根组合决定，原有逻辑） |
| **功法修炼速度** | `TechniqueDef.spiritRootElement` 字段标注功法的五行属性；玩家拥有对应灵根时，功法修炼速度 = 基础 × `(1 + affinity/100)`（亲和度越高倍率越高，最高 ×2.0） |
| **技能攻击强度** | 使用对应元素功法的主动技能时，攻击伤害倍率 = 资质加成（1.0~1.5）+ 灵根亲和度加成（0~+0.5）；单灵根角色对应功法技能伤害最高可达 ×2.0，比无对应灵根高出 50% |
| **功法上限（天花板）** | 灵根亲和度决定对应元素功法的有效最高等级（`effectiveMaxLevel`）。无对应灵根：基础最高等级的 50%；亲和 1–49：×1.0（基础上限）；亲和 50–79：×1.5；亲和 80+：×2.0。单灵根保底亲和 ≥ 80，故单灵根角色对应功法天花板是杂灵根的 4 倍 |
| **功法门槛** | `TechniqueDef.requiredSpiritRoot` 字段设置必须拥有的灵根类型才能习得此功法（高阶/元素专属功法使用）；普通功法此字段为空，全系别可学 |
| 突破概率 | 灵根品质影响突破成功率（目前 T0029 已有基础成功率，可叠加灵根修正） |
| 事件触发 | 部分奇遇需要特定灵根类型作为前置条件 |

### 9. 与现有系统的兼容

#### 9.1 与 `getSpiritRootGrade()` 的关系
- 新系统的 `spiritRoots.combo` + `cultivationMultiplier` 取代旧的品级评定
- 旧的 6 元素资质仍保留在 `aptitudes` 中，新增灵根类型与其关联

#### 9.2 存档兼容
- 老存档没有 `spiritRoots` / `gender` / `appearance` 字段
- 加载时兼容处理：为老存档补充默认值（根据现有 aptitudes 反推灵根类型或随机）

## 涉及文件（预估）

### 新增
| 文件 | 用途 |
|------|------|
| `src/game/spirit-root.ts` | 灵根类型定义、随机生成算法、亲和度计算 |
| `src/game/character-creation.ts` | 角色创建状态管理、锁定/重随逻辑 |

### 修改
| 文件 | 改动 |
|------|------|
| `src/game/player/types.ts` | Player 接口新增 `spiritRoots`、`gender`、`appearance` |
| `src/game/player/create.ts` | 重构 `createPlayer()`，接受 `CreatePlayerOptions` |
| `src/game/player/stats.ts` | `getSpiritRootGrade()` 适配新灵根系统 |
| `src/components/screens/StartScreen.tsx` | 锁定重随创建界面 |
| `src/components/panels/StatusPanel.tsx` | 展示灵根类型和亲和度 |
| `src/components/shared/constants.ts` | 新增灵根颜色/中文名常量 |
| `src/hooks/useGameEngine.ts` | 老存档兼容处理 |

## 依赖关系

- **前置**: T0001（属性系统）✅
- **后续**: T0047（命格天赋系统）可扩展为第 6 个可锁定栏位
