# 设计文档：程序化妖兽变体系统（境界缩放 + 属性变异）

任务：T0072
日期：2026-04-07
Issue：#183

## 概述

当前妖兽通过 `MonsterDef` 预定义在 DLC JSON 中，每种妖兽属性固定。玩家在同一境界反复战斗时只会遇到相同的几只怪物，缺乏新鲜感。

本任务引入**程序化妖兽变体系统**：30+ 个妖兽基础模板 × 境界缩放 × 区域变异 × 属性变异 × 精英/Boss 变异，在战斗时按需生成 1,000+ 种妖兽变体。生成的变体完全兼容现有 `MonsterDef` 接口，战斗系统无需修改。

## 数据结构

### 妖兽基础模板（MonsterTemplate）

```ts
interface MonsterTemplate {
  id: string;                         // 'core:tmpl_wolf'
  baseName: string;                   // '狼'
  emoji: string;                      // '🐺'
  baseStats: {                        // 基准属性（以 realmIndex=0 为基准）
    hp: number;
    atk: number;
    def: number;
    speed: number;
    moveSpeed: number;
    critRate: number;
    critResist: number;
    critDmgMultiplier?: number;
  };
  baseExpReward: number;              // 基准经验奖励
  baseGoldReward: number;             // 基准灵石奖励
  element?: ElementType;              // 固有元素属性（可被变异覆盖）
  elementResists?: Partial<Record<ElementType, number>>;
  regionTags?: string[];              // 出没区域标签
  minRealm?: number;                  // 最低出现境界
  maxRealm?: number;                  // 最高出现境界
  allowedMutations?: string[];        // 限制可用的变异类型（空 = 全部可用）
  lootChance?: number;                // 基础掉落概率（0~1）
  description?: string;               // 描述模板 '{name}是{region}中常见的{adjective}妖兽'
}
```

### 境界缩放配置（RealmScaling）

```ts
interface RealmScalingConfig {
  // 每个境界的属性缩放倍率（指数增长）
  // realmIndex: 0=凡人, 1=炼气, 2=筑基, ...
  statMultiplier: (realmIndex: number) => number;  // 1.0, 1.8, 3.2, 5.6, 10...
  expMultiplier: (realmIndex: number) => number;
  goldMultiplier: (realmIndex: number) => number;
}

// 默认缩放公式：base × (1.8 ^ realmIndex)
const DEFAULT_REALM_SCALING: RealmScalingConfig = {
  statMultiplier: (r) => Math.pow(1.8, r),
  expMultiplier: (r) => Math.pow(2.0, r),
  goldMultiplier: (r) => Math.pow(1.5, r),
};
```

### 变异定义（MutationDef）

```ts
type MutationType = 'element' | 'stat_boost' | 'elite' | 'boss' | 'region_adapt';

interface MutationDef {
  id: string;                         // 'core:mut_fire'
  type: MutationType;
  name: string;                       // '火焰' — 用于名称前缀
  weight: number;                     // 抽取权重
  statModifiers: Partial<Record<keyof MonsterTemplate['baseStats'], number>>; // 属性倍率加成（如 { atk: 1.3 } = 攻击×1.3）
  expBonus?: number;                  // 额外经验倍率
  goldBonus?: number;                 // 额外灵石倍率
  element?: ElementType;              // 覆盖元素属性
  elementResists?: Partial<Record<ElementType, number>>;
  emojiOverride?: string;             // 覆盖 emoji（可选）
  namePrefix?: string;                // 名称前缀 '火焰'
  nameSuffix?: string;                // 名称后缀 '王'
  minRealm?: number;
  maxRealm?: number;
  regionTags?: string[];              // 特定区域才出现
  exclusive?: boolean;                // 独占型变异（与其他同类互斥）
  lootBonus?: number;                 // 掉落概率加成
}
```

### 预定义变异类型

| 类型 | 说明 | 属性影响 | 名称效果 |
|------|------|----------|---------|
| `element` | 元素变异（火/水/雷/风/土/木/金） | 覆盖元素 + 对应抗性 | 前缀：火焰/寒冰/雷电… |
| `stat_boost` | 属性强化（蛮力/坚甲/迅捷/狂暴） | 单属性 ×1.3~1.5 | 前缀：蛮力/坚甲… |
| `elite` | 精英变异 | 全属性 ×1.5，HP ×2 | 前缀：精英 |
| `boss` | Boss 变异 | 全属性 ×2.5，HP ×5 | 后缀：王 |
| `region_adapt` | 区域适应 | 小幅属性偏移 | 前缀：山地/沼泽/幽谷… |

### 生成结果

生成的妖兽直接输出为标准 `MonsterDef`：

```ts
// 生成的 id 格式: 'proc-mon:<template_id>:<seed_hash>'
// 例: 'proc-mon:core:tmpl_wolf:b4e2c9'
```

## 生成算法

### 核心流程

1. **选模板**：从注册的 `MonsterTemplate[]` 中，按区域标签和境界范围筛选，随机选一个
2. **境界缩放**：用玩家当前 `realmIndex` 计算缩放倍率，应用到所有基础属性
3. **变异抽取**：按概率决定是否附加变异（0~2 个），从 `MutationDef[]` 中按权重抽取
4. **精英/Boss 判定**：低概率（5% 精英，1% Boss）触发特殊变异
5. **属性合成**：`finalStat = floor(baseStat × realmScale × Π(mutationModifiers) × randomJitter)`
6. **名称组装**：`{变异前缀}{baseName}{变异后缀}`，如"火焰精英狼王"
7. **输出 MonsterDef**：完全兼容现有接口

### 属性合成公式

```
finalHp   = floor(baseHp × realmScale × mutMod_hp × jitter(0.9, 1.1))
finalAtk  = floor(baseAtk × realmScale × mutMod_atk × jitter(0.9, 1.1))
finalDef  = floor(baseDef × realmScale × mutMod_def × jitter(0.9, 1.1))
finalSpeed = floor(baseSpeed × realmScale × mutMod_speed × jitter(0.95, 1.05))

finalExp  = floor(baseExp × expScale × Σ(mutExpBonus))
finalGold = floor(baseGold × goldScale × Σ(mutGoldBonus))

jitter(min, max) = min + rng.next() × (max - min)  // ±10% 随机浮动
```

### 精英/Boss 概率

```
eliteChance = 0.05 + luck × 0.001   // 5%~10%
bossChance  = 0.01 + luck × 0.0005  // 1%~5%
// 精英和 Boss 互斥，Boss 优先判定
```

## 与现有系统的集成方案

### 战斗入口集成

当前 `useCoreActions.ts` 中战斗选怪逻辑：

```ts
const eligible = getAllMonsters().filter(m => { ... });
const monster = eligible[Math.floor(Math.random() * eligible.length)];
const result = runCombat(p, monster);
```

改为：

```ts
// 先查静态怪物，再生成程序化变体
const staticEligible = getAllMonsters().filter(m => { ... });
const proceduralMonster = generateMonsterVariant(p.realmIndex, regionTags, rng);
// 按权重混合：50% 概率使用程序化怪物
const monster = rng.next() < 0.5 && proceduralMonster
  ? proceduralMonster
  : staticEligible[Math.floor(rng.next() * staticEligible.length)];
const result = runCombat(p, monster);
```

### 战斗系统零修改

- `runCombat(player, monster: MonsterDef)` 接口不变
- 生成的 `MonsterDef` 包含所有必要字段
- 战斗日志中自动显示带变异名称的怪物（"遭遇了 🔥 火焰精英狼"）

### 掉落系统集成

- 精英变异提升掉落概率（lootBonus ×1.5）
- Boss 变异保证掉落 + 额外灵石奖励
- 可触发 T0071 程序化装备掉落

## 存档兼容性

### 无需存档

- 程序化妖兽是**临时生成**的，战斗结束后即丢弃
- 不需要在存档中保存妖兽实例
- 唯一需要保存的：`ProceduralMonsterState.masterSeed` + `monsterCounter`（可合并到 T0070 的统一 `ProceduralState` 中）

### 向后兼容

- 旧存档缺少 seed 时自动初始化
- 静态怪物（`core:wild_wolf` 等）继续正常工作

## DLC 扩展性

- `DLCPack` 新增可选字段：

```ts
interface DLCPack {
  // ... 现有字段
  monsterTemplates?: MonsterTemplate[];  // 妖兽基础模板
  mutations?: MutationDef[];             // 变异定义
}
```

- DLC 注册时合并到全局模板池和变异池
- DLC 可注册特殊变异（如仙界 DLC 的"天劫"变异，CP-04 的"上古"变异）

## JSON 数据格式示例

### monster-templates.json

```json
[
  {
    "id": "core:tmpl_wolf",
    "baseName": "狼",
    "emoji": "🐺",
    "baseStats": {
      "hp": 50, "atk": 12, "def": 5, "speed": 10,
      "moveSpeed": 8, "critRate": 5, "critResist": 2
    },
    "baseExpReward": 15,
    "baseGoldReward": 8,
    "regionTags": ["wilderness", "mountain"],
    "maxRealm": 4
  },
  {
    "id": "core:tmpl_serpent",
    "baseName": "蛇",
    "emoji": "🐍",
    "baseStats": {
      "hp": 40, "atk": 15, "def": 3, "speed": 14,
      "moveSpeed": 12, "critRate": 10, "critResist": 1
    },
    "baseExpReward": 18,
    "baseGoldReward": 10,
    "element": "wood",
    "regionTags": ["herb", "valley", "wilderness"],
    "maxRealm": 5
  },
  {
    "id": "core:tmpl_bear",
    "baseName": "熊",
    "emoji": "🐻",
    "baseStats": {
      "hp": 100, "atk": 10, "def": 12, "speed": 5,
      "moveSpeed": 3, "critRate": 3, "critResist": 5,
      "critDmgMultiplier": 2.0
    },
    "baseExpReward": 25,
    "baseGoldReward": 15,
    "regionTags": ["mountain", "valley"]
  },
  {
    "id": "core:tmpl_spirit_crane",
    "baseName": "灵鹤",
    "emoji": "🦩",
    "baseStats": {
      "hp": 35, "atk": 8, "def": 4, "speed": 18,
      "moveSpeed": 15, "critRate": 8, "critResist": 8
    },
    "baseExpReward": 20,
    "baseGoldReward": 12,
    "element": "wind",
    "regionTags": ["herb", "valley"],
    "minRealm": 1
  }
]
```

### mutations.json

```json
[
  {
    "id": "core:mut_fire",
    "type": "element",
    "name": "火焰",
    "namePrefix": "火焰",
    "weight": 10,
    "element": "fire",
    "elementResists": { "fire": 0.5 },
    "statModifiers": { "atk": 1.2 },
    "expBonus": 1.1,
    "emojiOverride": "🔥"
  },
  {
    "id": "core:mut_ice",
    "type": "element",
    "name": "寒冰",
    "namePrefix": "寒冰",
    "weight": 8,
    "element": "water",
    "elementResists": { "water": 0.5 },
    "statModifiers": { "def": 1.3 },
    "expBonus": 1.1
  },
  {
    "id": "core:mut_brute",
    "type": "stat_boost",
    "name": "蛮力",
    "namePrefix": "蛮力",
    "weight": 12,
    "statModifiers": { "atk": 1.4, "speed": 0.9 },
    "expBonus": 1.15
  },
  {
    "id": "core:mut_armored",
    "type": "stat_boost",
    "name": "坚甲",
    "namePrefix": "坚甲",
    "weight": 10,
    "statModifiers": { "def": 1.5, "hp": 1.2 },
    "expBonus": 1.2
  },
  {
    "id": "core:mut_elite",
    "type": "elite",
    "name": "精英",
    "namePrefix": "精英",
    "weight": 0,
    "statModifiers": { "hp": 2.0, "atk": 1.5, "def": 1.5, "speed": 1.2 },
    "expBonus": 2.0,
    "goldBonus": 2.5,
    "exclusive": true,
    "lootBonus": 1.5
  },
  {
    "id": "core:mut_boss",
    "type": "boss",
    "name": "王",
    "nameSuffix": "王",
    "weight": 0,
    "statModifiers": { "hp": 5.0, "atk": 2.5, "def": 2.0, "speed": 1.5 },
    "expBonus": 5.0,
    "goldBonus": 5.0,
    "exclusive": true,
    "lootBonus": 3.0
  }
]
```

## 新增/修改文件清单

### 新增文件

| 文件 | 用途 | 关键类/函数 |
|------|------|-------------|
| `src/game/procedural/monster-generator.ts` | 程序化妖兽生成器 | `generateMonsterVariant()` |
| `src/game/procedural/monster-loader.ts` | JSON 模板/变异加载器 | `loadMonsterTemplates()`, `loadMutationDefs()` |
| `src/data/dlc/core/monster-templates.json` | 核心妖兽模板（30+） | — |
| `src/data/dlc/core/mutations.json` | 核心变异定义 | — |
| `src/data/texts/procedural-monster.ts` | 妖兽生成文案 | — |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | 新增 `MonsterTemplate`、`MutationDef`、`MutationType`、`RealmScalingConfig` | 类型定义 |
| `src/game/registry/stores.ts` | 新增 `monsterTemplateRegistry`、`mutationDefRegistry` | 存储 |
| `src/game/registry/dlc.ts` | `registerDLC` 中注册 `monsterTemplates` 和 `mutations` | DLC 支持 |
| `src/game/registry/queries.ts` | 新增 `getMonsterTemplate()`、`getAllMutationDefs()` 等 | 查询 API |
| `src/game/registry/index.ts` | re-export | barrel |
| `src/game/events.ts` | 核心 DLC 注册时加载 monster-templates.json / mutations.json | 数据加载 |
| `src/hooks/useCoreActions.ts` | 战斗选怪逻辑中集成程序化妖兽生成 | 战斗入口 |

## 实现步骤拆分

1. **Phase 1 — 基础设施**（与 T0070 共享）
   - 确认 `src/game/procedural/seed.ts` 已就绪

2. **Phase 2 — 生成器**
   - 实现 `monster-generator.ts`：模板选择、境界缩放、变异抽取、属性合成
   - 实现 `monster-loader.ts`

3. **Phase 3 — 数据制作**
   - 编写 30+ 妖兽模板 JSON
   - 编写变异定义 JSON

4. **Phase 4 — 战斗集成**
   - 修改 `useCoreActions.ts` 的战斗选怪逻辑
   - 精英/Boss 掉落奖励增强

5. **Phase 5 — 调试与测试**
   - Debug 面板：强制生成精英/Boss
   - 验证不同境界的属性缩放合理性

## 共享基础设施

| 模块 | 文件 | 说明 |
|------|------|------|
| 确定性 PRNG | `seed.ts` | 同 T0070 |
| 加权随机 | `seed.ts` | `weightedPick()` |

## 验证方式

- 同一区域连续战斗 20 次，观察是否出现不同名称/属性的妖兽变体
- 升到高境界后，验证妖兽属性明显缩放（炼气期怪物 vs 筑基期怪物属性倍差）
- 精英怪出现时名称带"精英"前缀，属性明显高于普通怪
- Boss 出现时名称带"王"后缀，属性远高于普通怪，奖励丰厚
- 静态怪物（`core:wild_wolf` 等）仍正常出现，与程序化怪物混合

## 调试面板需求

- 新增"程序化妖兽"区域：
  - 按钮"生成普通变体"：触发一次战斗，使用程序化怪物
  - 按钮"生成精英"：强制精英变异
  - 按钮"生成Boss"：强制 Boss 变异
  - 显示当前已注册模板数 + 变异数

## 依赖关系

- 前置：T0003（战斗系统）✅
- 共享：T0070（PRNG 基础设施）
- 可选联动：T0071（精英/Boss 击杀可触发程序化装备掉落）
- 后续：EXP-02 无限秘境可定制境界缩放曲线
