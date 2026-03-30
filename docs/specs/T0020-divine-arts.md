# 设计文档：神通·元素体系
任务：T0020
日期：2025-01-27

---

## 概述

神通是独立于功法的**高级战斗技能系统**。玩家拥有六种元素灵根资质（火/水/雷/风/土/木，存储于 `player.aptitudes`），当某系资质 ≥ 30 且境界达标时，可学习对应元素神通。神通在战斗中与功法主动技能**独立触发**（同一回合可同时生效），并引入元素克制/元素抗性机制，丰富战斗策略层。

---

## 数据结构

### 1. 新增基础类型

```typescript
// ── 元素类型 ──
export type ElementType = 'fire' | 'water' | 'thunder' | 'wind' | 'earth' | 'wood';

// ── 元素克制表（攻击元素 → 克制的防御元素，伤害 ×1.3）──
// 存储为常量对象，不是运行时计算
export const ELEMENT_COUNTER_TABLE: Record<ElementType, ElementType[]> = {
  water:   ['fire'],           // 水克火
  fire:    ['wood'],           // 火克木
  wood:    ['earth'],          // 木克土
  earth:   ['water'],          // 土克水
  thunder: ['water'],          // 雷克水（双克：雷也克水）
  wind:    ['fire'],           // 风克火（辅助克制）
};

export const ELEMENT_COUNTER_MULTIPLIER = 1.3; // 克制加成系数
```

### 2. DivineArtSkillEffect

```typescript
export interface DivineArtSkillEffect {
  type: 'dot'           // 持续伤害（每回合扣 HP）
      | 'debuff_def'    // 降低防御
      | 'debuff_atk'    // 降低攻击
      | 'heal_self'     // 恢复玩家 HP
      | 'shield_self';  // 护盾（每回合减免固定伤害）
  value: number;        // 效果量
  duration: number;     // 持续回合数
}
```

> `shield_self` 是新效果类型，在战斗中以 `playerEffects[]` 数组管理（类似现有 `monsterEffects[]`）。

### 3. DivineArtDef

```typescript
export interface DivineArtDef {
  id: string;                       // 命名空间 ID，如 'core:divine_fire_blast'
  name: string;                     // 显示名称，如 '烈焰斩'
  element: ElementType;             // 所属元素系
  description: string;              // 技能描述
  minRealm: number;                 // 最低学习境界（realmIndex）
  minAptitude: number;              // 最低对应灵根资质（默认 30）
  mpCost: number;                   // 每次释放消耗灵力
  dmgMultiplier: number;            // 基础伤害倍率（相对普通攻击）
  hitCount: number;                 // 攻击段数（每段独立判定暴击/闪避）
  cooldown: number;                 // 冷却回合数
  triggerRate: number;              // 战斗中随机触发概率（0~1）
  defPenetration?: number;          // 防御穿透系数 0~1（仅雷系；无视怪物防御的比例）
  effects?: DivineArtSkillEffect[]; // 附加效果列表（支持多效果并发）
  aptitudeScaling: number;          // 资质加成系数（见公式）
}
```

### 4. DivineArtSlot（Player 侧存储）

```typescript
export interface DivineArtSlot {
  artId: string;   // 对应 DivineArtDef.id
}
```

### 5. Player 侧存储位置

神通状态存储到 `player.systems['divineArts']`，利用现有 `systems: Record<string, unknown>` 扩展字段，**无需修改 Player 接口**：

```typescript
// 约定结构（runtime type-guard 辅助）
interface DivineArtsSystemState {
  learned: DivineArtSlot[];     // 已学神通列表
  activeArtId: string | null;   // 当前激活神通（战斗中触发该神通）
}
```

### 6. MonsterDef 扩展（可选字段）

```typescript
// 在现有 MonsterDef 末尾追加两个可选字段：
interface MonsterDef {
  // ...现有字段...
  element?: ElementType;                            // 怪物元素属性
  elementResists?: Partial<Record<ElementType, number>>; // 各系元素抗性 0~1（减免比例）
}
```

### 7. DLCPack 扩展

```typescript
interface DLCPack {
  // ...现有字段...
  divineArts?: DivineArtDef[];  // 该 DLC 提供的神通定义
}
```

---

## 关键公式

### 神通伤害公式

```
// 资质加成系数（资质越高，伤害越强）
aptitudePower = 1.0 + max(0, aptitude - 30) / 140 * artDef.aptitudeScaling
// 资质30 → 1.0x，资质100 → 1.5x（aptitudeScaling=1.0时）

// 雷系穿透防御（无视部分防御）
effectiveDef = monster.def * (1 - (artDef.defPenetration ?? 0))

// 单段伤害
baseDmg = max(1, player.atk * artDef.dmgMultiplier * aptitudePower - effectiveDef)

// 元素克制判定（仅当怪物有 element 字段时生效）
elementMultiplier = isCountered(artDef.element, monster.element) ? ELEMENT_COUNTER_MULTIPLIER : 1.0

// 玩家元素抗性（对怪物神通/元素攻击）
playerElementResist(element) = player.aptitudes[element] / 200  // 最高 0.5 (50% 减免)

// 最终单段伤害（含暴击判定，复用现有 calcDamage 的暴击逻辑）
finalDmg = baseDmg * elementMultiplier * critMultiplier
```

### 元素抗性公式

```
// 玩家受到对应元素攻击时的减免
resist = player.aptitudes[element] / 200
// 资质 0 → 0% 减免；资质 100 → 50% 减免
```

---

## 神通数据设计（六系各一）

| 系别 | ID | 名称 | 境界要求 | 最低资质 | MP | 倍率 | 段数 | 冷却 | 触发率 | 穿透 | 附加效果 | 特色 |
|------|----|------|---------|---------|-----|------|-----|-----|------|-----|---------|------|
| 🔥 火 | `core:divine_fire_blast` | 烈焰斩 | 炼气(1) | 30 | 40 | 2.5x | 1 | 3 | 40% | — | dot: 15/3回合 | 高爆发+灼烧 |
| 💧 水 | `core:divine_water_wave` | 寒冰波 | 炼气(1) | 30 | 35 | 1.4x | 2 | 3 | 40% | — | heal_self: 25 + debuff_atk: 12/2回合 | 回血+削弱 |
| ⚡ 雷 | `core:divine_thunder_strike` | 雷霆击 | 筑基(2) | 40 | 50 | 2.8x | 1 | 3 | 40% | 0.5 | debuff_atk: 15/2回合 | 穿透+高伤 |
| 🌪️ 风 | `core:divine_wind_slash` | 疾风连斩 | 炼气(1) | 30 | 40 | 0.7x | 5 | 2 | 45% | — | — | 五段多击，每段独立暴击 |
| 🪨 土 | `core:divine_earth_shield` | 磐石护身 | 筑基(2) | 35 | 30 | 1.2x | 1 | 4 | 35% | — | shield_self: 25/3回合 + debuff_def: 10/2回合 | 格挡+破甲 |
| 🌿 木 | `core:divine_wood_bind` | 藤蔓束缚 | 炼气(1) | 30 | 30 | 1.0x | 1 | 2 | 45% | — | dot: 28/5回合 | 高持续伤害 |

**aptitudeScaling 默认值均为 1.0**（资质 30~100 对应伤害倍率加成 0%~50%）。

---

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键类/函数 |
|------|------|-------------|
| `src/game/divine-arts.ts` | 神通系统核心逻辑 | `learnDivineArt(player, artId)`, `activateDivineArt(player, artId)`, `getLearnableDivineArts(player)`, `getDivineArtsState(player)`, `calcAptitudePower(player, artDef)`, `calcElementMultiplier(artElement, targetElement)` |
| `src/game/data/divine-arts-data.ts` | 六系神通数据定义（DLC data） | 导出六个 `DivineArtDef` 对象组成的数组 |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | 新增 `ElementType`, `ELEMENT_COUNTER_TABLE`, `ELEMENT_COUNTER_MULTIPLIER`, `DivineArtSkillEffect`, `DivineArtDef`；`MonsterDef` 末尾新增可选字段 `element?` / `elementResists?`；`DLCPack` 新增可选字段 `divineArts?` | 类型扩展 |
| `src/game/combat/types.ts` | `StatusEffect.type` 联合类型新增 `'shield_self'`；新增 `playerEffects: StatusEffect[]` 到战斗内部状态（非 CombatResult，仅 run.ts 内部） | 支持玩家护盾效果 |
| `src/game/combat/run.ts` | ① 战斗开始前从 `player.systems['divineArts']` 读取激活神通；② 玩家行动阶段新增神通触发逻辑（独立 cooldown/mp 追踪）；③ 回合末处理 `playerEffects`（shield减免/dot对怪物）；④ 神通伤害使用新公式（含穿透、元素克制） | 战斗集成 |
| `src/game/registry/stores.ts` | 新增 `export const divineArtRegistry = new Map<string, DivineArtDef>()` | 注册表存储 |
| `src/game/registry/queries.ts` | 新增 `getDivineArtDef`, `getAllDivineArtDefs`, `getDivineArtsByElement`；`registerDLC` 中处理 `dlc.divineArts` 注册 | 注册表查询 |
| `src/game/registry/index.ts` | re-export 新增类型和查询函数 | Barrel 文件 |
| `src/game/data.ts` 或 DLC core pack | 将 `divine-arts-data.ts` 中的神通数据注册到 core DLC pack | 数据接入 |

### `src/game/divine-arts.ts` 关键函数签名

```typescript
// 获取玩家神通系统状态（读取 systems['divineArts']，不存在时返回初始值）
export function getDivineArtsState(player: Player): DivineArtsSystemState

// 学习神通（检查境界+资质，写入 systems['divineArts'].learned）
export function learnDivineArt(player: Player, artId: string): { player: Player; message: string }

// 激活神通
export function activateDivineArt(player: Player, artId: string): { player: Player; message: string }

// 获取可学神通列表（境界达标 + 资质达标 + 未已学）
export function getLearnableDivineArts(player: Player): DivineArtDef[]

// 计算资质加成系数
export function calcAptitudePower(player: Player, artDef: DivineArtDef): number
// 公式：1.0 + max(0, aptitude - 30) / 140 * artDef.aptitudeScaling

// 判断元素克制（攻击方element是否克制防御方element）
export function isElementCountered(attackElement: ElementType, defendElement: ElementType | undefined): boolean

// 计算神通对指定怪物的总伤害（含穿透/克制/多段/暴击）
// 返回值供 run.ts 使用
export function calcDivineArtDamage(
  player: Player,
  artDef: DivineArtDef,
  monster: MonsterDef,
  currentMonsterHp: number
): { totalDamage: number; logs: string[] }
```

### 战斗循环集成（`run.ts` 改动细节）

```
// 战斗开始前，新增以下初始化：
const divineArtsState = getDivineArtsState(player);
const activeArt = divineArtsState.activeArtId
  ? getDivineArtDef(divineArtsState.activeArtId)
  : null;
const divineSkillState: SkillState = { cooldownLeft: 0, totalMpUsed: 0, totalStaminaUsed: 0, useCount: 0 };
const playerEffects: StatusEffect[] = [];  // 玩家身上的持续效果（护盾）

// 玩家行动阶段（在现有 usedSkill 逻辑之前插入）：
if (activeArt && tryUseSkill(activeArt, divineSkillState, availableMp, 0)) {
  // 触发神通
  availableMp -= activeArt.mpCost;
  divineSkillState.totalMpUsed += activeArt.mpCost;
  divineSkillState.useCount++;
  divineSkillState.cooldownLeft = activeArt.cooldown;

  const { totalDamage, logs: artLogs } = calcDivineArtDamage(buffedPlayer, activeArt, monster, mHp);
  mHp -= totalDamage;
  logs.push(`✨ 你施展【${activeArt.name}】（${activeArt.element}系），造成 ${totalDamage} 点元素伤害！（灵力-${activeArt.mpCost}）`);
  logs.push(...artLogs);

  // 处理 effects[]
  for (const eff of activeArt.effects ?? []) {
    if (eff.type === 'heal_self') { ... }
    else if (eff.type === 'shield_self') {
      playerEffects.push({ type: 'shield_self', value: eff.value, remainingRounds: eff.duration, sourceName: activeArt.name });
      logs.push(`🛡️ 你获得磐石护盾，每回合减免 ${eff.value} 点伤害（${eff.duration}回合）`);
    }
    else { // dot / debuff_def / debuff_atk → 施加到怪物
      monsterEffects.push(...);
    }
  }
}
// 继续执行原有功法技能逻辑（不互相替代）

// 怪物攻击玩家后，处理玩家护盾（在 pHp -= result.damage 之前）：
// 若 playerEffects 中有 shield_self，减免伤害
let actualDamage = result.damage;
for (const eff of playerEffects) {
  if (eff.type === 'shield_self') {
    actualDamage = Math.max(0, actualDamage - eff.value);
  }
}
pHp -= actualDamage;

// 回合末：处理 playerEffects 递减（类似 monsterEffects）
```

### tryUseSkill 复用方式

`DivineArtDef` 具备 `mpCost / cooldown / triggerRate` 字段，结构上与 `TechniqueActiveSkill` 的触发判断字段一致，可直接传给 `tryUseSkill()`（需确认签名兼容，或提取独立函数 `tryUseDivineArt()`）。

---

## UI 方案（@Designer）

### 新增界面/面板

| 元素 | 位置 | 内容 |
|------|------|------|
| **DivineArtsPanel** 神通面板 | 主界面导航，与功法面板同级，新增"神通"标签页 | 已学神通列表 + 可学神通列表 + 当前激活神通 |
| 已学神通卡片 | Panel 上半区 | 元素 emoji + 名称 + 描述 + 资质显示 + 激活按钮 |
| 可学神通卡片 | Panel 下半区 | 同上，加"学习"按钮（不满足条件时置灰+提示） |
| 激活标记 | 已激活神通卡片 | 边框高亮 + "已激活" badge |

### DivineArtsPanel 面板布局

```
┌──────────────────────────────────────┐
│  🌟 神通面板                          │
│  当前激活：【烈焰斩】🔥 火系           │
├──────────────────────────────────────┤
│  已学神通（2/6）                       │
│  ┌─────────────────┐ ┌─────────────┐ │
│  │ 🔥 烈焰斩        │ │ 🌿 藤蔓束缚 │ │
│  │ 资质: 火系 65    │ │ 资质: 木系45│ │
│  │ MP: 40 | CD: 3  │ │ MP: 30|CD:2 │ │
│  │ [✅ 已激活]      │ │ [激活]      │ │
│  └─────────────────┘ └─────────────┘ │
├──────────────────────────────────────┤
│  可学神通（需满足条件）                 │
│  ┌─────────────────┐                  │
│  │ ⚡ 雷霆击        │                  │
│  │ 需: 筑基境界     │                  │
│  │ 需: 雷灵根 ≥ 40  │                  │
│  │ [🔒 境界不足]   │                  │
│  └─────────────────┘                  │
└──────────────────────────────────────┘
```

### 交互

- **学习神通**：点击可学神通卡片的"学习"按钮 → 调用 `learnDivineArt()` → 神通移至已学区域 + toast 提示
- **激活神通**：点击已学神通卡片的"激活"按钮 → 调用 `activateDivineArt()` → 更新当前激活标记
- **不满足条件**：学习按钮置灰，hover/点击显示具体原因（"雷灵根不足（当前 25 / 需要 40）"）
- **元素颜色标识**：每系使用固定配色（🔥红、💧蓝、⚡黄、🌪️青、🪨棕、🌿绿）

### 战斗日志显示

- 神通触发：`✨ 你施展【烈焰斩】（🔥 火系），造成 320 点元素伤害！（灵力-40）`
- 克制触发：在伤害行追加 `（🔥克🌿 伤害+30%）`
- 护盾激活：`🛡️ 磐石护盾激活，减免 25 点伤害！`

---

## 验证方式

### 在浏览器中测试

1. 打开 Debug 面板 → 设置 `player.aptitudes.fire = 65`，`player.realmIndex = 1`
2. 在神通面板应能看到 `烈焰斩` 可学习
3. 学习后激活，进入战斗，观察战斗日志是否出现神通触发行
4. 设置 `aptitudes.thunder = 25`，确认 `雷霆击` 按钮置灰（资质不足）
5. 设置 `realmIndex = 1`，确认 `雷霆击`（需筑基=2）按钮显示"境界不足"
6. 设置对应怪物 `element = 'wood'`，使用火系神通，验证伤害 ×1.3 克制加成

### 预期行为

- 神通与功法技能可在同一回合同时触发（各自独立冷却/MP）
- 资质 30 学习，资质 100 时伤害较资质 30 强 50%
- 土系神通激活后，玩家受到的怪物攻击有减免效果（持续 3 回合）
- 木系 dot 持续 5 回合，总伤害高但单次低

### 测试用例（写入 docs/test-guide.md）

| # | 测试项 | 前置条件 | 预期结果 |
|---|--------|---------|---------|
| 1 | 资质不足无法学习神通 | fire aptitude = 20 | 烈焰斩"学习"按钮置灰，显示"火灵根不足" |
| 2 | 资质满足可学习 | fire = 35, realmIndex = 1 | 烈焰斩可学习，点击后移至已学区 |
| 3 | 神通独立触发 | 激活烈焰斩 + 有功法主动技能 | 战斗中可同回合看到两行技能触发日志 |
| 4 | 元素克制加成 | 怪物 element='wood'，使用火系神通 | 伤害数值 ×1.3，日志显示"🔥克🌿" |
| 5 | 土系护盾减伤 | 激活磐石护身，战斗中触发 | 玩家受到攻击后日志显示"护盾减免 25 点" |
| 6 | 神通 MP 独立消耗 | availableMp = 30, 神通mpCost=40 | 神通未触发（MP 不足），功法技能正常触发 |
| 7 | 雷系穿透防御 | 怪物 def=100，defPenetration=0.5 | 雷霆击按 effectiveDef=50 计算伤害 |
| 8 | 资质加成伤害曲线 | fire=30 vs fire=100 | fire=100 时烈焰斩伤害约为 fire=30 时的 1.5 倍 |

---

## 调试面板需求

需在 Debug 面板新增以下内容：

**神通系统区块**
- 字段显示：当前已学神通列表（artId + element）
- 字段显示：当前激活神通 ID
- 字段显示：六系灵根资质当前数值（fire/water/thunder/wind/earth/wood）
- 按钮：`学习全部神通`（将六系神通一键学习，方便测试）
- 按钮：`设置火系资质=100 / 雷系资质=60`（快速设置测试值）
- 数值输入：快速修改指定元素资质（select 选择系别 + number input）

---

## 修改文件清单汇总

### 新增文件

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| `src/game/divine-arts.ts` | 逻辑 | 神通系统核心：学习/激活/计算 |
| `src/game/data/divine-arts-data.ts` | 数据 | 六系神通 DivineArtDef 数组 |
| `src/components/DivineArtsPanel.vue` | UI | 神通面板组件 |

### 修改文件

| 文件路径 | 改动类型 | 关键改动 |
|----------|---------|---------|
| `src/game/types.ts` | 类型扩展 | 新增 `ElementType`、`ELEMENT_COUNTER_TABLE`、`ELEMENT_COUNTER_MULTIPLIER`、`DivineArtSkillEffect`、`DivineArtDef`；`MonsterDef` 新增 `element?`、`elementResists?`；`DLCPack` 新增 `divineArts?` |
| `src/game/combat/types.ts` | 类型扩展 | `StatusEffect.type` 新增 `'shield_self'` |
| `src/game/combat/run.ts` | 逻辑扩展 | 神通触发逻辑、playerEffects 管理、护盾减伤 |
| `src/game/registry/stores.ts` | 新增 Map | `divineArtRegistry` |
| `src/game/registry/queries.ts` | 新增函数 | `getDivineArtDef`、`getAllDivineArtDefs`、`getDivineArtsByElement`；DLC 注册时处理 `divineArts` |
| `src/game/registry/index.ts` | Barrel 导出 | re-export 新类型和函数 |
| `src/game/data.ts` 或 core DLC | 数据接入 | 将 `divine-arts-data.ts` 的数据注册到 core DLC pack |
| Debug 面板组件 | UI 扩展 | 新增神通相关调试字段和按钮 |

---

## 不涉及的内容（明确边界）

以下内容**本任务不实现**，留待后续任务扩展：

| 不实现的内容 | 说明 |
|------------|------|
| 神通升级系统 | `DivineArtSlot.level` 预留字段但本期固定 level=1，无升级逻辑 |
| 神通组合/连招 | 多神通联动效果（如火+木=大火）不在本期范围 |
| 怪物使用神通 | 怪物仅有 `element` 属性（影响受到克制），不主动释放神通 |
| 玩家元素攻击被克制 | 本期只实现玩家攻击克制怪物，不实现怪物反克制玩家的逻辑 |
| 神通商店/掉落 | 神通通过面板直接学习，不作为物品掉落/购买 |
| 神通被动属性加成 | 神通不提供站外被动属性（如功法的 statBonusPerLevel）|
| 多个神通同时激活 | 本期只能激活一个神通 |
| 神通熟练度/修炼 | 神通无需修炼，学了即可使用 |

---

## 依赖关系

- **前置任务**：T0017（功法·主动技能）、T0018（功法·被动技能/资质系统）
- **后续任务**：可扩展"神通升级"、"元素组合技"、"怪物元素属性完善"
