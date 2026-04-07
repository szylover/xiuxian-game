# 设计文档：程序化功法词条系统（基础功法 + 随机被动词条）

任务：T0073
日期：2026-04-07
Issue：#184

## 概述

当前功法（`TechniqueDef`）的被动效果（`passiveEffects`）是预定义的固定列表。所有玩家学到同一功法的体验完全相同，缺乏个性化。

本任务引入**程序化功法词条系统**：功法本体（名称、主动技能、基础属性加成）保持固定，但附带的**被动词条**可随机组合。品质越高的功法，词条数量越多、词条强度越高。40 基础功法 × 60 词条 × 4+ 品质 = 数千种功法变体。

核心设计：玩家获得功法时（探索事件、商店购买、任务奖励），系统为功法实例随机附加词条。同一功法的不同实例可能具有截然不同的被动加成，增加"刷功法"的可玩性。

## 数据结构

### 功法词条定义（TechniqueTraitDef）

```ts
interface TechniqueTraitDef {
  id: string;                         // 'core:trait_atk_boost'
  name: string;                       // '刚猛'
  description: string;                // '攻击力提升 {value}'
  stat: keyof TechniqueStatBonus;     // 'atk' — 复用现有 TechniqueStatBonus 属性
  baseValue: number;                  // 基础值（凡品时的值）
  qualityScaling: number;             // 品质缩放系数(乘以品质倍率得最终值)
  weight: number;                     // 抽取权重
  minRealm?: number;                  // 最低出现境界
  maxRealm?: number;
  typeRestriction?: TechniqueType[];  // 限制功法类型（空 = 全类型）
  excludeTraits?: string[];           // 互斥词条 ID
  tier: 'minor' | 'major' | 'legendary'; // 词条等级：小词条/大词条/传奇词条
}
```

### 功法品质词条配置

```ts
interface TechniqueQualityConfig {
  rarity: TechniqueRarity;            // common/uncommon/rare/epic/legendary
  displayName: string;                // 凡品/灵品/地品/天品/仙品
  traitSlots: {                       // 各等级词条槽数量
    minor: number;                    // 小词条
    major: number;                    // 大词条
    legendary: number;                // 传奇词条
  };
  valueMultiplier: number;            // 词条数值缩放倍率
  dropWeight: number;                 // 掉落权重
}

const TECHNIQUE_QUALITY_CONFIG: TechniqueQualityConfig[] = [
  { rarity: 'common',    displayName: '凡品', traitSlots: { minor: 1, major: 0, legendary: 0 }, valueMultiplier: 1.0, dropWeight: 40 },
  { rarity: 'uncommon',  displayName: '灵品', traitSlots: { minor: 2, major: 1, legendary: 0 }, valueMultiplier: 1.3, dropWeight: 30 },
  { rarity: 'rare',      displayName: '地品', traitSlots: { minor: 2, major: 1, legendary: 1 }, valueMultiplier: 1.8, dropWeight: 18 },
  { rarity: 'epic',      displayName: '天品', traitSlots: { minor: 3, major: 2, legendary: 1 }, valueMultiplier: 2.5, dropWeight: 9 },
  { rarity: 'legendary', displayName: '仙品', traitSlots: { minor: 3, major: 2, legendary: 2 }, valueMultiplier: 4.0, dropWeight: 3 },
];
```

### 功法实例（TechniqueInstance）

```ts
interface TechniqueInstance {
  instanceId: string;                 // 'proc-tech:<base_id>:<seed_hash>'
  baseTechniqueId: string;            // 关联的基础功法 ID（如 'core:basic_sword'）
  qualityOverride: TechniqueRarity;   // 生成时的品质（可能覆盖基础功法的 rarity）
  traits: TechniqueTraitSlot[];       // 已附加的词条
  seed: number;                       // 生成种子
}

interface TechniqueTraitSlot {
  traitId: string;                    // 词条定义 ID
  tier: 'minor' | 'major' | 'legendary';
  finalValue: number;                 // 最终数值（baseValue × qualityMultiplier × jitter）
  stat: keyof TechniqueStatBonus;     // 冗余存储，方便快速计算
}
```

### 与现有 TechniqueDef 的关系

```
                ┌──────────────────┐
                │  TechniqueDef    │  ← 基础功法定义（JSON 预定义，不变）
                │  - id            │
                │  - name          │
                │  - passiveEffects│  ← 固定的等级被动（保留）
                │  - activeSkill   │
                └───────┬──────────┘
                        │
      ┌─────────────────┼─────────────────┐
      │                 │                 │
 ┌────▼─────┐    ┌─────▼────┐    ┌──────▼─────┐
 │Instance A│    │Instance B│    │Instance C  │
 │灵品 +刚猛│    │天品 +敏捷│    │凡品 +刚猛  │
 │   +铁壁  │    │   +暴击  │    │            │
 └──────────┘    │   +吸血  │    └────────────┘
                 └──────────┘
```

- 基础功法 `TechniqueDef` 保持原样，`passiveEffects` 按等级解锁的固定被动不变
- `TechniqueInstance` 在此基础上附加随机词条
- 词条加成与固定被动**叠加**（不冲突）

## 生成算法

### 核心流程

1. **确定品质**：使用 `rollRarity(rng, luckBonus)` 按 `dropWeight` 加权随机
2. **计算词条槽**：根据品质的 `traitSlots` 确定各等级词条数量
3. **抽取词条**：对每个等级，从对应 tier 的 `TechniqueTraitDef[]` 中按权重抽取（不重复，排除互斥）
4. **计算数值**：`finalValue = floor(baseValue × valueMultiplier × jitter(0.8, 1.2))`
5. **生成实例**：创建 `TechniqueInstance`，关联到基础功法

### 数值计算公式

```
traitFinalValue = floor(traitDef.baseValue × qualityConfig.valueMultiplier × jitter(0.8, 1.2))

// 示例：'刚猛' baseValue=5, 天品 valueMultiplier=2.5
// finalValue = floor(5 × 2.5 × rand(0.8, 1.2)) = 10~15
```

### 词条效果应用

在 `technique.ts` 的 `getActiveTechniqueBonus()` 中，除了计算原有 `statBonusPerLevel` 和 `passiveEffects`，还需叠加词条加成：

```ts
function getTraitBonus(player: Player): TechniqueStatBonus {
  const instance = getActiveTechniqueInstance(player);
  if (!instance) return {};
  
  const bonus: TechniqueStatBonus = {};
  for (const slot of instance.traits) {
    bonus[slot.stat] = (bonus[slot.stat] ?? 0) + slot.finalValue;
  }
  return bonus;
}
```

## 与现有系统的集成方案

### 功法获取入口

当前功法通过 `learnTechnique(player, techniqueId)` 学习，传入的是基础功法 ID。

引入词条系统后：

1. **学习时生成实例**：调用 `learnTechnique` 时，如果该功法支持词条（由配置决定），自动生成 `TechniqueInstance` 并关联
2. **事件/商店/任务**：掉落功法时生成实例，实例 ID 存入背包（作为 `technique` 类别物品）
3. **使用物品学习**：从背包使用功法物品时，将实例关联到 `player.techniques` 中对应的 `TechniqueSlot`

### TechniqueSlot 扩展

```ts
// 现有
interface TechniqueSlot {
  techniqueId: string;   // 基础功法 ID
  level: number;
  exp: number;
}

// 扩展后
interface TechniqueSlot {
  techniqueId: string;
  level: number;
  exp: number;
  instanceId?: string;   // 关联的词条实例 ID（可选，无则为无词条版本）
}
```

### 属性加成计算兼容

现有 `getActiveTechniqueBonus()` 返回 `TechniqueStatBonus`。扩展后在其内部叠加词条加成即可，外部调用者（`combat/run.ts`、`player.ts` 的 `recalcStats`）完全不感知。

### 向下兼容

- 没有 `instanceId` 的功法槽位行为与当前完全一致
- 基础功法的固定 `passiveEffects` 仍按等级解锁，不受词条影响
- 旧存档中所有功法无 `instanceId`，读档后作为无词条版本正常运行

## 存档兼容性

### 存档内容

```ts
interface ProceduralTechniqueState {
  masterSeed: number;
  techniqueCounter: number;
  instances: TechniqueInstance[];      // 所有已生成的功法实例
}
```

- 必须存储完整实例（含词条和数值），因为学习后词条已固定
- `TechniqueSlot.instanceId` 引用实例

### 向后兼容

- 旧存档无 `proceduralTechniqueState` 时初始化空状态
- 旧 `TechniqueSlot` 无 `instanceId` 字段，读档时视为无词条

## DLC 扩展性

- `DLCPack` 新增可选字段：

```ts
interface DLCPack {
  // ... 现有字段
  techniqueTraits?: TechniqueTraitDef[];  // 功法词条定义
}
```

- DLC 可注册特色词条（如仙界 DLC 的"仙灵"词条、体修 DLC 的"淬体"词条）
- 词条自动合并到全局池，与所有基础功法自由组合
- 命名空间：`core:trait_xxx`、`cp-01:trait_xxx`

## JSON 数据格式示例

### technique-traits.json

```json
[
  {
    "id": "core:trait_atk_boost",
    "name": "刚猛",
    "description": "攻击力提升 {value}",
    "stat": "atk",
    "baseValue": 5,
    "qualityScaling": 1.0,
    "weight": 15,
    "tier": "minor"
  },
  {
    "id": "core:trait_def_boost",
    "name": "铁壁",
    "description": "防御力提升 {value}",
    "stat": "def",
    "baseValue": 4,
    "qualityScaling": 1.0,
    "weight": 12,
    "tier": "minor"
  },
  {
    "id": "core:trait_speed_boost",
    "name": "敏捷",
    "description": "速度提升 {value}",
    "stat": "speed",
    "baseValue": 3,
    "qualityScaling": 1.0,
    "weight": 10,
    "tier": "minor"
  },
  {
    "id": "core:trait_hp_boost",
    "name": "强体",
    "description": "生命上限提升 {value}",
    "stat": "hp",
    "baseValue": 20,
    "qualityScaling": 1.0,
    "weight": 12,
    "tier": "minor"
  },
  {
    "id": "core:trait_crit_rate",
    "name": "锐眼",
    "description": "暴击率提升 {value}%",
    "stat": "critRate",
    "baseValue": 3,
    "qualityScaling": 0.8,
    "weight": 8,
    "tier": "major"
  },
  {
    "id": "core:trait_crit_dmg",
    "name": "暴戾",
    "description": "暴击伤害倍率提升 {value}%",
    "stat": "critDmgMultiplier",
    "baseValue": 0.1,
    "qualityScaling": 1.0,
    "weight": 6,
    "tier": "major",
    "excludeTraits": ["core:trait_def_boost"]
  },
  {
    "id": "core:trait_mp_boost",
    "name": "灵蕴",
    "description": "灵力上限提升 {value}",
    "stat": "mp",
    "baseValue": 15,
    "qualityScaling": 1.0,
    "weight": 10,
    "tier": "minor"
  },
  {
    "id": "core:trait_physique",
    "name": "淬体",
    "description": "体魄上限提升 {value}",
    "stat": "physique",
    "baseValue": 10,
    "qualityScaling": 1.2,
    "weight": 5,
    "tier": "major",
    "typeRestriction": ["fist", "palm", "spear"]
  },
  {
    "id": "core:trait_body_exp",
    "name": "练体",
    "description": "修炼时额外获得 {value} 体修修为",
    "stat": "bodyRealmExp",
    "baseValue": 3,
    "qualityScaling": 1.5,
    "weight": 4,
    "tier": "major",
    "typeRestriction": ["fist", "palm"]
  },
  {
    "id": "core:trait_dmg_reduce",
    "name": "金刚",
    "description": "减伤提升 {value}%",
    "stat": "physiqueDmgReduce",
    "baseValue": 2,
    "qualityScaling": 1.0,
    "weight": 3,
    "tier": "legendary",
    "typeRestriction": ["fist", "palm"]
  },
  {
    "id": "core:trait_all_round",
    "name": "全能",
    "description": "攻击+{value}，防御+{value}，速度+{value}",
    "stat": "atk",
    "baseValue": 3,
    "qualityScaling": 1.0,
    "weight": 2,
    "tier": "legendary"
  }
]
```

## 新增/修改文件清单

### 新增文件

| 文件 | 用途 | 关键类/函数 |
|------|------|-------------|
| `src/game/procedural/technique-generator.ts` | 程序化功法词条生成器 | `generateTechniqueInstance()`, `getTraitBonus()` |
| `src/game/procedural/technique-trait-loader.ts` | JSON 词条加载器 | `loadTechniqueTraits()` |
| `src/data/dlc/core/technique-traits.json` | 核心词条（60+） | — |
| `src/data/texts/procedural-technique.ts` | 功法词条文案 | — |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | 新增 `TechniqueTraitDef`、`TechniqueInstance`、`TechniqueTraitSlot`、`TechniqueQualityConfig`、`ProceduralTechniqueState` | 类型定义 |
| `src/game/player/types.ts` | `TechniqueSlot` 新增可选 `instanceId` 字段；Player 新增 `proceduralTechniqueState` | 状态扩展 |
| `src/game/technique.ts` | `getActiveTechniqueBonus()` 中叠加词条加成；`learnTechnique()` 中可选触发词条生成 | 核心集成 |
| `src/game/registry/stores.ts` | 新增 `techniqueTraitRegistry`、`techniqueInstanceRegistry` | 存储 |
| `src/game/registry/dlc.ts` | `registerDLC` 中注册 `techniqueTraits` | DLC 支持 |
| `src/game/registry/queries.ts` | 新增 `getTechniqueTraitDef()`、`getAllTechniqueTraitDefs()`、`getTechniqueInstance()` | 查询 API |
| `src/game/registry/index.ts` | re-export | barrel |
| `src/game/events.ts` | 核心 DLC 注册时加载 technique-traits.json | 数据加载 |
| `src/hooks/useGameEngine.ts` | Player 状态中保存 `proceduralTechniqueState` | 存档 |
| `src/components/panels/StatusPanel.tsx` | 功法详情中显示词条列表（只改数据绑定） | UI 展示 |

## 实现步骤拆分

1. **Phase 1 — 基础设施**（与 T0070 共享）
   - 确认 `seed.ts` 和 `rarity.ts` 已就绪

2. **Phase 2 — 词条生成器**
   - 实现 `technique-generator.ts`
   - 实现 `technique-trait-loader.ts`
   - 词条抽取、数值计算

3. **Phase 3 — 功法系统集成**
   - 修改 `TechniqueSlot` 支持 `instanceId`
   - 修改 `getActiveTechniqueBonus()` 叠加词条
   - 修改 `learnTechnique()` 触发词条生成

4. **Phase 4 — 数据制作**
   - 编写 60+ 词条 JSON
   - 各类型功法词条覆盖完整

5. **Phase 5 — UI 与调试**
   - 功法面板展示词条（小标签 + tooltip）
   - Debug 面板：生成指定品质功法实例

## 共享基础设施

| 模块 | 文件 | 说明 |
|------|------|------|
| 确定性 PRNG | `seed.ts` | 同 T0070 |
| 品质抽取 | `rarity.ts` | 同 T0071，`rollRarity()` |
| 加权随机 | `seed.ts` | `weightedPick()` |

## 验证方式

- 同一功法（如"基础剑法"）连续获取 5 次，验证每次词条组合不同
- 比较凡品和天品的同名功法，确认天品词条数量更多、数值更高
- 装备带词条的功法后，验证属性面板中叠加了词条加成
- 切换激活功法后，属性加成正确切换（词条加成随功法切换）
- 存档→读档后，功法词条不变

## 调试面板需求

- 新增"程序化功法"区域：
  - 选择品质下拉框 + 选择基础功法 + 按钮"生成功法实例"
  - 显示当前激活功法的词条详情
  - 按钮"重随词条"：重新随机当前功法的词条

## 依赖关系

- 前置：T0017（功法系统）✅, T0019（被动效果）✅
- 共享：T0070（PRNG 基础设施）, T0071（品质抽取 `rarity.ts`）
- 后续：CP-01 / CP-02 等内容包可注册专属词条

---

## 附录：四系统共享基础设施汇总

T0070-T0073 四个程序化生成系统共享以下公共模块，统一放在 `src/game/procedural/` 目录：

| 文件 | 功能 | 使用方 |
|------|------|--------|
| `seed.ts` | 确定性 PRNG（Mulberry32）+ `createRNG(seed)` + `hashSeed(master, counter)` + `weightedPick(entries, rng)` | T0070/T0071/T0072/T0073 |
| `interpolate.ts` | 模板字符串变量替换 `interpolate(pattern, vars)` | T0070（事件文本）, T0071（装备描述）, T0072（怪物描述） |
| `rarity.ts` | 品质抽取 `rollRarity(rng, luckBonus, tiers)` | T0071（装备品质）, T0073（功法品质） |
| `index.ts` | barrel re-export | 所有 |

### 建议实现顺序

```
T0070 Phase 1（seed.ts + interpolate.ts）
  ↓
T0071 Phase 1（rarity.ts）         ← 依赖 seed.ts
  ↓
T0070 Phase 2-5（事件生成器）       ← 并行
T0071 Phase 2-5（装备生成器）       ← 并行
T0072 Phase 2-5（妖兽生成器）       ← 并行
T0073 Phase 2-5（功法词条）         ← 并行
```

### Player 状态统一扩展

四个系统共享一个 `ProceduralState` 顶层对象，挂在 `Player` 上：

```ts
interface ProceduralState {
  masterSeed: number;                 // 全局主种子
  eventCounter: number;               // 事件生成计数器
  equipCounter: number;               // 装备生成计数器
  monsterCounter: number;             // 妖兽生成计数器
  techniqueCounter: number;           // 功法生成计数器
  generatedEquips: GeneratedEquipInstance[];
  techniqueInstances: TechniqueInstance[];
  // 妖兽无需持久化
}
```
