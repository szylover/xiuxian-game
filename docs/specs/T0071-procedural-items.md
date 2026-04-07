# 设计文档：程序化物品词缀系统（随机装备 + 品质变体）

任务：T0071
日期：2026-04-07
Issue：#182

## 概述

当前所有装备都是预定义的固定属性（`equips.json` 中的 `EquipDef`），数量有限且属性固定。玩家缺乏"刷装备"的动力。

本任务引入**类暗黑词缀系统**：基础装备模板（50+）+ 前缀/后缀词缀池（100+）+ 品质系统（凡品/灵器/法宝/仙器/太古），在运行时随机组合生成 25,000+ 种装备变体。每件生成的装备具有唯一 ID 和固定属性（由 seed 确定），存档时保存完整实例数据。

## 数据结构

### 装备基础模板（EquipBaseTemplate）

```ts
interface EquipBaseTemplate {
  id: string;                         // 'core:base_sword'
  baseName: string;                   // '剑' — 用于组合最终名称
  slot: EquipSlot;                    // 'weapon'
  baseStats: EquipStatBonus;          // 基础属性（最低值）
  minRealm: number;                   // 最低佩戴境界
  baseSellPrice: number;              // 基础售价
  allowedPrefixes?: string[];         // 限制可用前缀词缀池（空 = 全部可用）
  allowedSuffixes?: string[];         // 限制可用后缀词缀池
  techType?: TechniqueType[];         // 武器兼容功法类型（继承到生成的 EquipDef）
  descriptionPattern: string;         // '一把{prefix_desc}的{quality_adj}{baseName}，{suffix_desc}。'
}
```

### 词缀定义（AffixDef）

```ts
type AffixPosition = 'prefix' | 'suffix';

interface AffixDef {
  id: string;                         // 'core:affix_flame'
  position: AffixPosition;            // 'prefix' | 'suffix'
  name: string;                       // '烈焰' — 用于拼接装备名
  description: string;                // '附带灼热之力'
  statBonus: EquipStatBonus;          // 词缀提供的属性加成（与品质缩放相乘）
  weight: number;                     // 抽取权重
  minRealm?: number;                  // 最低境界门槛
  maxRealm?: number;
  slotRestriction?: EquipSlot[];      // 只能出现在哪些槽位（空 = 全槽位）
  excludeAffixes?: string[];          // 互斥词缀 ID 列表
  regionTags?: string[];              // 区域限制
}
```

### 装备品质系统（ProceduralEquipQuality）

```ts
type ProceduralEquipQuality = 'mortal' | 'spirit' | 'treasure' | 'immortal' | 'ancient';

interface QualityTier {
  quality: ProceduralEquipQuality;
  displayName: string;                // '凡品' | '灵器' | '法宝' | '仙器' | '太古'
  rarity: ItemRarity;                 // 映射到现有品质系统 common/uncommon/rare/epic/legendary
  statMultiplier: number;             // 属性缩放倍率：1.0 / 1.5 / 2.5 / 4.0 / 6.0
  affixSlots: { prefix: number; suffix: number }; // 词缀槽数量
  priceMultiplier: number;            // 售价缩放
  dropWeight: number;                 // 掉落权重（品质越高越稀有）
  nameColor: string;                  // CSS 颜色变量名（使用 App.css 中定义的）
}

const QUALITY_TIERS: QualityTier[] = [
  { quality: 'mortal',    displayName: '凡品', rarity: 'common',    statMultiplier: 1.0, affixSlots: { prefix: 0, suffix: 0 }, priceMultiplier: 1.0, dropWeight: 50, nameColor: '--color-quality-common' },
  { quality: 'spirit',    displayName: '灵器', rarity: 'uncommon',  statMultiplier: 1.5, affixSlots: { prefix: 1, suffix: 0 }, priceMultiplier: 2.0, dropWeight: 30, nameColor: '--color-quality-uncommon' },
  { quality: 'treasure',  displayName: '法宝', rarity: 'rare',      statMultiplier: 2.5, affixSlots: { prefix: 1, suffix: 1 }, priceMultiplier: 5.0, dropWeight: 12, nameColor: '--color-quality-rare' },
  { quality: 'immortal',  displayName: '仙器', rarity: 'epic',      statMultiplier: 4.0, affixSlots: { prefix: 2, suffix: 1 }, priceMultiplier: 12.0, dropWeight: 6, nameColor: '--color-quality-epic' },
  { quality: 'ancient',   displayName: '太古', rarity: 'legendary', statMultiplier: 6.0, affixSlots: { prefix: 2, suffix: 2 }, priceMultiplier: 25.0, dropWeight: 2, nameColor: '--color-quality-legendary' },
];
```

### 生成的装备实例（GeneratedEquipInstance）

```ts
interface GeneratedEquipInstance {
  instanceId: string;                 // 'proc-equip:<seed_hash>' 唯一实例 ID
  baseTemplateId: string;             // 关联的基础模板
  quality: ProceduralEquipQuality;    // 品质
  prefixIds: string[];                // 前缀词缀 ID 列表
  suffixIds: string[];                // 后缀词缀 ID 列表
  seed: number;                       // 生成种子（用于还原）
  // 以下为计算结果（缓存，也存档）
  finalName: string;                  // '烈焰·玄铁剑·破甲'
  finalStats: EquipStatBonus;         // 最终属性（基础 × 品质 + 词缀之和）
  finalSellPrice: number;
  description: string;
}
```

### 种子管理

```ts
interface ProceduralItemState {
  masterSeed: number;                 // 主种子
  equipCounter: number;               // 已生成装备计数
  generatedEquips: GeneratedEquipInstance[]; // 所有已生成装备（需存档）
}
```

## 生成算法

### 核心流程

1. **确定品质**：使用 `rollRarity(rng, luckBonus)` 按 `dropWeight` 加权随机，玩家 luck 属性提升高品质概率
2. **选基础模板**：从注册的 `EquipBaseTemplate[]` 中选择一个满足境界/区域条件的模板
3. **抽词缀**：根据品质的 `affixSlots` 数量，从 `AffixDef[]` 中按权重抽取前缀/后缀（不重复，排除互斥）
4. **计算属性**：`finalStats = baseStats × statMultiplier + Σ(affixBonus)`
5. **组装名称**：`{前缀1}·{前缀2}·{baseName}·{后缀1}·{后缀2}`，品质前缀：`[灵器] 烈焰·铁剑·破甲`
6. **生成 EquipDef**：转换为标准 `EquipDef` 格式，注入 `equipRegistry`

### 属性计算公式

```
finalStat[key] = floor(base[key] × qualityMultiplier) + Σ(affix[key])
finalSellPrice = floor(baseSellPrice × priceMultiplier × (1 + affixCount × 0.3))
```

### 品质抽取公式

```
adjustedWeight[i] = dropWeight[i] × (1 + luck × luckScaling[i])
luckScaling = [0, 0.005, 0.01, 0.015, 0.02]  // 品质越高 luck 加成越大
```

### 与现有 EquipDef 的桥接

生成的装备最终转换为标准 `EquipDef`：

```ts
function instanceToEquipDef(inst: GeneratedEquipInstance, template: EquipBaseTemplate): EquipDef {
  return {
    id: inst.instanceId,             // 使用实例 ID
    name: inst.finalName,
    slot: template.slot,
    rarity: QUALITY_TIERS[inst.quality].rarity,
    description: inst.description,
    stats: inst.finalStats,
    minRealm: template.minRealm,
    sellPrice: inst.finalSellPrice,
    techType: template.techType,
  };
}
```

## 与现有系统的集成方案

### 掉落入口

程序化装备通过以下方式进入游戏：

1. **战斗掉落**：`runCombat` 结果中的 `lootTable` 新增程序化装备生成概率
2. **事件奖励**：程序化事件模板（T0070）可引用装备生成器
3. **商店刷新**：商店系统定期生成一批程序化装备上架
4. **宝箱/秘境**：区域探索时随机生成

### 背包系统兼容

- 程序化装备以 `instanceId` 作为 `itemId` 存入背包
- 背包 `inventory` 数组中 `itemId` 字段存放 `proc-equip:xxx` 格式 ID
- `getItemDef(instanceId)` 和 `getEquipDef(instanceId)` 查询时，先查静态注册表，再查程序化装备缓存
- 由于每件程序化装备独立（不可堆叠），`stackable = false`，`maxStack = 1`

### 装备系统兼容

- `equipItem()` / `unequipItem()` 通过 `getEquipDef(id)` 获取定义，程序化装备返回转换后的 `EquipDef`，逻辑完全兼容
- `recalcStats()` 同样兼容

## 存档兼容性

### 存档内容

```ts
interface ProceduralItemSaveData {
  masterSeed: number;
  equipCounter: number;
  generatedEquips: GeneratedEquipInstance[]; // 完整实例列表（含属性快照）
}
```

- **必须存储完整实例**：因为程序化装备进入背包/装备栏后，属性已固定，不能读档后重新随机
- 实例数量有上限（背包容量 + 装备栏 = 最多几十件），存档体积可控

### 向后兼容

- 旧存档无 `proceduralItemState` 时，初始化空状态
- 已有的静态装备 ID（`core:iron_sword` 等）不受影响

## DLC 扩展性

- `DLCPack` 新增可选字段：

```ts
interface DLCPack {
  // ... 现有字段
  equipBaseTemplates?: EquipBaseTemplate[];  // 装备基础模板
  affixDefs?: AffixDef[];                    // 词缀定义
}
```

- DLC 注册时自动合并到全局模板池和词缀池
- 命名空间隔离：`core:base_sword`、`cp-01:base_spirit_blade`
- DLC 可注册专属词缀（如仙界 DLC 注册"仙灵"前缀），与基础模板自由组合

## JSON 数据格式示例

### equip-templates.json

```json
[
  {
    "id": "core:base_sword",
    "baseName": "剑",
    "slot": "weapon",
    "baseStats": { "atk": 8 },
    "minRealm": 0,
    "baseSellPrice": 20,
    "techType": ["sword"],
    "descriptionPattern": "一把{prefix_desc}的{quality_adj}{baseName}，{suffix_desc}。"
  },
  {
    "id": "core:base_blade",
    "baseName": "刀",
    "slot": "weapon",
    "baseStats": { "atk": 10, "speed": -1 },
    "minRealm": 0,
    "baseSellPrice": 22,
    "techType": ["blade"],
    "descriptionPattern": "一把{prefix_desc}的{quality_adj}{baseName}，{suffix_desc}。"
  },
  {
    "id": "core:base_robe",
    "baseName": "袍",
    "slot": "armor",
    "baseStats": { "def": 5, "hp": 30 },
    "minRealm": 0,
    "baseSellPrice": 18,
    "descriptionPattern": "一件{prefix_desc}的{quality_adj}{baseName}，{suffix_desc}。"
  },
  {
    "id": "core:base_ring",
    "baseName": "戒",
    "slot": "accessory1",
    "baseStats": { "mp": 15 },
    "minRealm": 0,
    "baseSellPrice": 25,
    "descriptionPattern": "一枚{prefix_desc}的{quality_adj}{baseName}，{suffix_desc}。"
  }
]
```

### affixes.json

```json
[
  {
    "id": "core:affix_flame",
    "position": "prefix",
    "name": "烈焰",
    "description": "附带灼热之力",
    "statBonus": { "atk": 5 },
    "weight": 10,
    "slotRestriction": ["weapon"]
  },
  {
    "id": "core:affix_ice",
    "position": "prefix",
    "name": "寒冰",
    "description": "寒气侵骨",
    "statBonus": { "atk": 3, "speed": 2 },
    "weight": 8,
    "slotRestriction": ["weapon"],
    "excludeAffixes": ["core:affix_flame"]
  },
  {
    "id": "core:affix_iron",
    "position": "prefix",
    "name": "玄铁",
    "description": "玄铁铸造，坚不可摧",
    "statBonus": { "def": 5 },
    "weight": 12
  },
  {
    "id": "core:affix_breaker",
    "position": "suffix",
    "name": "破甲",
    "description": "无视部分防御",
    "statBonus": { "atk": 3, "critRate": 2 },
    "weight": 6,
    "slotRestriction": ["weapon"]
  },
  {
    "id": "core:affix_guardian",
    "position": "suffix",
    "name": "守护",
    "description": "守护灵力，提升防御",
    "statBonus": { "def": 3, "hp": 20 },
    "weight": 10,
    "slotRestriction": ["armor", "helmet"]
  },
  {
    "id": "core:affix_swift",
    "position": "suffix",
    "name": "疾风",
    "description": "轻若无物，行动如风",
    "statBonus": { "speed": 5, "moveSpeed": 3 },
    "weight": 7
  }
]
```

## 新增/修改文件清单

### 新增文件

| 文件 | 用途 | 关键类/函数 |
|------|------|-------------|
| `src/game/procedural/equip-generator.ts` | 程序化装备生成器 | `generateEquip()`, `instanceToEquipDef()` |
| `src/game/procedural/affix-loader.ts` | JSON 模板/词缀加载器 | `loadEquipTemplates()`, `loadAffixDefs()` |
| `src/game/procedural/rarity.ts` | 品质抽取逻辑（T0070-T0073 共享） | `rollRarity()`, `QUALITY_TIERS` |
| `src/data/dlc/core/equip-templates.json` | 核心装备模板（50+） | — |
| `src/data/dlc/core/affixes.json` | 核心词缀（100+） | — |
| `src/data/texts/procedural-equip.ts` | 装备生成相关文案 | — |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | 新增 `EquipBaseTemplate`、`AffixDef`、`ProceduralEquipQuality`、`QualityTier`、`GeneratedEquipInstance`、`ProceduralItemState` | 类型定义 |
| `src/game/registry/stores.ts` | 新增 `equipTemplateRegistry`、`affixDefRegistry`、`generatedEquipRegistry` | 存储 |
| `src/game/registry/dlc.ts` | `registerDLC` 中注册 `equipBaseTemplates` 和 `affixDefs` | DLC 支持 |
| `src/game/registry/queries.ts` | 新增 `getEquipTemplate()`、`getAllAffixDefs()` 等查询 + 修改 `getEquipDef()` 回退查 generated | 查询兼容 |
| `src/game/registry/index.ts` | re-export | barrel |
| `src/game/events.ts` | 核心 DLC 注册时加载 equip-templates.json / affixes.json | 数据加载 |
| `src/hooks/useGameEngine.ts` | Player 状态中保存 `proceduralItemState` | 存档 |
| `src/hooks/useCoreActions.ts` | 战斗掉落时调用 `generateEquip()` | 掉落入口 |
| `src/game/player/types.ts` | Player 新增 `proceduralItemState` | 状态扩展 |

## 实现步骤拆分

1. **Phase 1 — 共享基础设施**（与 T0070 共享）
   - `src/game/procedural/seed.ts`（如已由 T0070 实现则跳过）
   - `src/game/procedural/rarity.ts` 品质抽取

2. **Phase 2 — 装备生成器**
   - 实现 `equip-generator.ts`
   - 实现 `affix-loader.ts`
   - 属性计算、名称组装、EquipDef 桥接

3. **Phase 3 — 数据制作**
   - 编写 50+ 装备基础模板 JSON
   - 编写 100+ 词缀 JSON

4. **Phase 4 — 系统集成**
   - 修改 `getEquipDef()` 支持程序化装备查询
   - 战斗掉落、商店上架集成
   - 存档/读档

5. **Phase 5 — UI 与调试**
   - 装备面板展示词缀信息（前缀/后缀小标签）
   - 品质名称颜色
   - Debug 面板：生成指定品质装备

## 共享基础设施

与 T0070/T0072/T0073 共享：

| 模块 | 文件 | 说明 |
|------|------|------|
| 确定性 PRNG | `seed.ts` | 同 T0070 |
| 品质抽取 | `rarity.ts` | `rollRarity()` 也被 T0073 功法词条使用 |
| 加权随机 | `seed.ts` | `weightedPick()` |

## 验证方式

- 战斗击败怪物后，验证是否有概率掉落程序化装备（日志显示带词缀的装备名）
- 在背包中查看程序化装备，确认属性、品质、槽位正确
- 装备/卸下程序化装备，验证属性加成正确
- 存档→读档后，已拥有的程序化装备属性不变
- 不同品质装备的属性差异明显（凡品 vs 仙器）

## 调试面板需求

- 新增"程序化装备"区域：
  - 选择品质下拉框 + 按钮"生成装备"：生成指定品质的随机装备到背包
  - 显示已生成装备总数
  - 按钮"清空程序化装备"：清除所有已生成的装备实例

## 依赖关系

- 前置：T0012（背包）✅, T0014（装备）✅
- 共享：T0070（PRNG 基础设施）
- 后续：EXP-02 无限秘境可使用程序化装备作为副本奖励
