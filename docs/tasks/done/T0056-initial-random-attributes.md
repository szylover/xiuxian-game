# T0056 — 初始随机属性系统

- **状态**: ✅ 已完成
- **完成日期**: 2026-03-30
- **分类**: 核心循环
- **前置**: T0001（属性系统）
- **Spec**: —（待设计）

## 描述

新建角色时，通过一套完整的随机生成系统为玩家角色赋予独特的初始属性，包括灵根类型、灵根资质、基础属性、外貌/性别等。参考鬼谷八荒的开局随机灵根 + 命格设计，让每次开局都有不同体验。预留天赋系统（T0047）扩展点，以后天赋也在开局随机中一起抽取。

## 核心需求

### 1. 灵根类型系统（新增）

当前代码中 `getSpiritRootGrade()` 仅根据 6 元素资质平均值评定品级（单灵根/天灵根/异灵根/灵根/杂灵根/废灵根），但**没有明确的灵根类型**。新系统需要引入五行灵根类型概念：

#### 1.1 五行灵根

基础五行：**金**、**木**、**水**、**火**、**土**

> 设计决策：当前代码使用 6 元素（fire/water/thunder/wind/earth/wood），传统修仙体系使用五行（金木水火土）。建议：
> - 核心灵根类型基于五行（金木水火土），作为角色标签式属性
> - 现有 6 元素资质保留，作为修炼/战斗的细粒度资质（影响对应系功法修炼速度等）
> - 灵根类型与元素资质关联但不等价（如火灵根提升 fire 资质基础值）

#### 1.2 灵根组合与稀有度

| 灵根数量 | 名称 | 出现权重 | 修炼倍率参考 | 说明 |
|----------|------|----------|-------------|------|
| 1 | 单灵根 | 1%     | ×3.0 | 极其稀有，单一属性极强 |
| 2 | 双灵根 | 5%     | ×2.0 | 稀有，双属性互补 |
| 3 | 三灵根 | 15%    | ×1.2 | 较常见，中等资质 |
| 4 | 四灵根 | 35%    | ×0.8 | 常见，资质一般 |
| 5 | 五灵根 | 40%    | ×0.5 | 最常见，杂灵根 |
| 0 | 无灵根 | 4%     | ×0.1 | 凡人之体，极罕见的废柴开局 |

> 注：无灵根不是"废"，后期可能通过奇遇/天赋获得特殊灵根或走体修路线（预留扩展）。

#### 1.3 灵根亲和度

每个激活的灵根有一个**亲和度**值（1–100），表示该属性的天赋强弱：
- 亲和度影响对应系功法修炼速度、对应元素攻击/防御加成
- 单灵根的那个属性亲和度 ≥ 80（保底高亲和）
- 多灵根时各属性亲和度独立随机

#### 1.4 数据结构

```ts
interface SpiritRoot {
  type: SpiritRootType;     // 'metal' | 'wood' | 'water' | 'fire' | 'earth'
  affinity: number;         // 1-100 亲和度
}

type SpiritRootCombo = 'none' | 'single' | 'dual' | 'triple' | 'quad' | 'penta';

interface PlayerSpiritRoots {
  roots: SpiritRoot[];       // 激活的灵根列表（0-5个）
  combo: SpiritRootCombo;    // 组合类型
  cultivationMultiplier: number; // 修炼倍率（由 combo 决定）
}
```

扩展 Player 接口：
```ts
interface Player {
  // ...现有属性...
  spiritRoots: PlayerSpiritRoots;  // 新增：灵根信息
  gender: 'male' | 'female';       // 新增：性别
  appearance: number;               // 新增：外貌编号（对应头像资源）
}
```

### 2. 基础属性随机区间

当前 `createPlayer()` 中部分属性是固定值，需要改为有区间的随机：

| 属性 | 当前值 | 随机区间（建议） | 说明 |
|------|--------|-----------------|------|
| luck（气运） | `randInt(1,100)` | 保留，但改为加权随机（高值稀有） | 已有随机，优化分布 |
| comprehension（悟性） | `randInt(1,100)` | 保留，改为加权随机 | 同上 |
| charisma（魅力） | `randInt(1,100)` | 保留，改为加权随机 | 同上 |
| mood（心情） | 固定 70 | 50–90 | 开局心境有所不同 |
| health（健康） | 固定 100 | 80–100 | 体质差异 |

> 先天三属性（luck/comprehension/charisma）建议改为与 `rollAptitude()` 类似的加权随机分布，避免太容易出双百角色。

### 3. 资质随机（已有，优化）

现有 `rollAptitude()` 加权随机已较合理，保留现有逻辑。新增以下调整：

- **灵根类型影响资质基础值**：激活的灵根对应的元素资质获得 +20 ~ +40 加成（保底不低于 50）
- **单灵根角色**：对应属性资质保底 80+，其余属性不加成

### 4. 性别与外貌

#### 4.1 性别
- 随机 50/50（男/女）
- 影响：部分事件文本（称呼差异）、部分特殊奇遇触发条件
- 不影响战斗数值

#### 4.2 外貌/头像
- 根据性别从预设头像池中随机选一个
- 头像资源存放在 `public/avatars/`（当前已有该目录）
- 玩家可在开局界面手动切换头像

### 5. 开局角色创建流程（UI 改造）

当前开始界面只有道号输入框。改为多步骤角色创建：

```
第一步：输入道号 + 选择性别
第二步：展示随机结果（灵根类型 + 亲和度 + 先天属性 + 资质概览）
  → [确认] / [重新随机]
第三步（预留，T0047）：天赋选择（从天赋池中选择 1~2 个天赋）
  → [确认开始修炼]
```

### 6. 重新随机（洗点/重随）

- 开局创建时：**免费重随 3 次**，之后每次消耗「洗髓丹」×1（稀有物品）
- 游戏中：不允许重随初始属性（初始属性是永久的命运设定）
- 转世重修（T0030）时：重新随机全部初始属性，但可能继承部分天赋

#### 洗髓丹
- 需要在 `core-items.json` 中新增该物品定义
- 来源：极罕见奇遇/成就奖励/商店超高价
- 也可以设计为"开局免费 N 次重随"，不依赖物品（简化方案，建议采用）

### 7. 天赋扩展点（T0047 预留）

创建流程预留第三步"天赋选择"，但 T0056 阶段不实现天赋内容：

```ts
// createPlayer 签名预留 talents 参数
function createPlayer(options: CreatePlayerOptions): Player;

interface CreatePlayerOptions {
  name: string;
  gender: 'male' | 'female';
  appearance: number;
  // T0056 阶段：spiritRoots 和基础属性由系统随机生成
  spiritRoots?: PlayerSpiritRoots;   // 可选覆盖（重随时传入）
  // T0047 阶段：增加 talents 字段
  // talents?: string[];
}
```

### 8. 灵根对游戏性的影响

| 影响维度 | 说明 |
|----------|------|
| 基础修炼速度 | `cultivationMultiplier` 直接乘以基础修炼经验（灵根组合决定，原有逻辑） |
| **功法修炼速度** | `TechniqueDef.spiritRootElement` 字段标注功法的五行属性；玩家拥有对应灵根时，功法修炼速度 = 基础 × `(1 + affinity/100)`（亲和度越高倍率越高，最高 ×2.0） |
| **技能攻击强度** | 使用对应元素功法的主动技能时，攻击伤害倍率 = 资质加成（1.0~1.5）+ 灵根亲和度加成（0~+0.5）；单灵根角色对应功法技能伤害最高可达 ×2.0，比无对应灵根高出 50% |
| **功法上限（天花板）** | 灵根亲和度决定对应元素功法的有效最高等级（`effectiveMaxLevel`）。无对应灵根：基础最高等级的 50%；亲和 1–49：×1.0（基础上限）；亲和 50–79：×1.5；亲和 80+：×2.0。单灵根保底亲和 ≥ 80，故单灵根角色对应功法天花板是杂灵根的 4 倍 |
| **功法门槛** | `TechniqueDef.requiredSpiritRoot` 字段设置必须拥有的灵根类型才能习得此功法（高阶/元素专属功法使用）；普通功法此字段为空，全系别可学 |
| 突破概率 | 灵根品质影响突破成功率（目前 T0029 已有基础成功率，可叠加灵根修正） |
| 事件触发 | 部分奇遇需要特定灵根类型作为前置条件 |

#### 8.1 `TechniqueDef` 新增字段

```ts
interface TechniqueDef {
  // ...原有字段...
  spiritRootElement?: SpiritRootType;   // 功法的五行属性，决定哪种灵根能加速修炼
  requiredSpiritRoot?: SpiritRootType;  // 学习门槛：必须拥有此灵根才能习得（可选）
}
```

#### 8.2 五行功法示例

| 功法名 | 战斗类型 | 五行属性 | 必须灵根 | 说明 |
|--------|----------|----------|---------|------|
| 雷霆刀法 | blade | metal | 无 | 现有功法，金灵根加速修炼 |
| 天罡剑诀 | sword | fire | 无 | 现有功法，火灵根加速修炼 |
| 幻影掌 | palm | water | 无 | 现有功法，水灵根加速修炼 |
| 烈焰拳法 | fist | fire | fire | 新增：需要火灵根才能学习 |
| 流水剑法 | sword | water | water | 新增：需要水灵根才能学习 |
| 厚土掌法 | palm | earth | earth | 新增：需要土灵根才能学习 |
| 金煞刀法 | blade | metal | metal | 新增：需要金灵根才能学习 |
| 翠木枪法 | spear | wood | wood | 新增：需要木灵根才能学习 |

#### 8.3 有效最高等级公式

```ts
function getEffectiveMaxLevel(player: Player, def: TechniqueDef): number {
  if (!def.spiritRootElement) return def.maxLevel; // 无元素属性：直接用基础上限
  const root = player.spiritRoots?.roots.find(r => r.type === def.spiritRootElement);
  if (!root) return Math.max(1, Math.floor(def.maxLevel * 0.5)); // 无对应灵根：50%上限
  if (root.affinity >= 80) return def.maxLevel * 2;              // 高亲和：双倍上限
  if (root.affinity >= 50) return Math.floor(def.maxLevel * 1.5); // 中亲和：1.5倍
  return def.maxLevel;                                            // 低亲和：基础上限
}
```

### 9. 与现有系统的兼容

#### 9.1 与 `getSpiritRootGrade()` 的关系
- 现有 `getSpiritRootGrade()` 可能需要重构或作为兼容层保留
- 新系统的 `spiritRoots.combo` + `cultivationMultiplier` 取代旧的品级评定
- 旧的 6 元素资质仍保留在 `aptitudes` 中，但新增灵根类型与其关联

#### 9.2 存档兼容
- 老存档没有 `spiritRoots` / `gender` / `appearance` 字段
- 加载时需要兼容处理：为老存档补充默认值（根据现有 aptitudes 反推灵根类型，或给予随机默认值）

## 参考：鬼谷八荒

- 开局随机灵根：金/木/水/火/土，单灵根极稀有
- 开局随机命格：影响角色成长曲线和特殊能力
- 灵根决定可学功法的系别
- 可以"重开"多次直到满意（类似本任务的重新随机）

## 涉及文件（预估）

### 新增
| 文件 | 用途 |
|------|------|
| `src/game/spirit-root.ts` | 灵根类型定义、随机生成算法、亲和度计算 |
| `src/game/character-creation.ts` | 角色创建总入口，整合所有随机逻辑 |

### 修改
| 文件 | 改动 |
|------|------|
| `src/game/player/types.ts` | Player 接口新增 `spiritRoots`、`gender`、`appearance` |
| `src/game/player/create.ts` | 重构 `createPlayer()`，接受 `CreatePlayerOptions` |
| `src/game/player/stats.ts` | `getSpiritRootGrade()` 适配新灵根系统 |
| `src/components/screens/StartScreen.tsx` | 多步骤角色创建 UI |
| `src/components/panels/StatusPanel.tsx` | 展示灵根类型和亲和度 |
| `src/components/shared/constants.ts` | 新增灵根颜色/中文名常量 |
| `src/hooks/useGameEngine.ts` | 老存档兼容处理 |
| `src/data/core-items.json` | 新增洗髓丹物品（如采用物品方案） |

## 依赖关系

- **前置**: T0001（属性系统）✅
- **后续**: T0047（命格天赋系统）可在本任务基础上扩展开局第三步天赋选择

## 验证方式

- 多次新建角色，确认各灵根组合出现频率大致符合权重表
- 单灵根角色对应属性资质 ≥ 80
- 修炼速度随灵根倍率变化（单灵根 > 双灵根 > ... > 五灵根）
- 老存档加载后不报错，灵根字段有合理默认值
- 重新随机功能正常工作，次数限制生效
