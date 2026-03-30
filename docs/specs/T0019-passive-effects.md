# 设计文档：功法被动效果系统
任务：T0019
日期：2026-03-27

---

## 概述

当修炼者将功法熟练度（等级）提升到特定阈值时，自动解锁该功法的"永久被动加成"（如 +攻击、+防御、+暴击率等）。**所有已学功法**的已解锁被动效果会叠加到角色基础属性上，与当前激活功法无关——这是区别于 `statBonusPerLevel`（仅激活功法有效）的核心设计差异。被动效果通过 `recalcStats` 统一计算，保证属性一致性。

---

## 数据结构

### 新增类型：`PassiveEffect`（`src/game/types.ts`）

```typescript
/** 单条被动效果——对应一个熟练度阈值解锁的永久加成 */
export interface PassiveEffect {
  minLevel: number;           // 解锁所需最低等级（含）
  stat: keyof TechniqueStatBonus; // 作用的属性字段
  value: number;              // 加成数值（flat 绝对值）
  description: string;        // 展示给玩家的描述，如 "剑心初启：攻击 +10"
}
```

### 修改类型：`TechniqueDef`（`src/game/types.ts`）

在现有 `TechniqueDef` 末尾追加可选字段：

```typescript
export interface TechniqueDef {
  // ...（原有字段不变）...
  passiveEffects?: PassiveEffect[];  // 多级被动效果，按 minLevel 升序排列
}
```

> **字段语义说明**
> - `passiveEffects` 是一个数组，每个元素代表一个独立的解锁里程碑。
> - 同一功法可以有多条被动，分别在不同等级解锁（多级被动）。
> - 解锁条件：`slot.level >= passiveEffect.minLevel`。
> - 同一 `stat` 字段的多条被动效果会累加（例如同一功法在 3 级 +5攻、8 级再 +10攻，满足条件时总共 +15攻）。

---

## 属性字段映射

`passiveEffects` 中 `stat` 字段的合法取值与对应 `Player` 属性：

| stat 值 | 作用的 Player 属性 | 说明 |
|---------|--------------------|------|
| `atk` | `p.atk` | 攻击力 |
| `def` | `p.def` | 防御力 |
| `speed` | `p.speed` | 速度 |
| `critRate` | `p.critRate` | 暴击率（整数，‱ 单位）|
| `critDmgMultiplier` | `p.critDmgMultiplier` | 暴击伤害倍率（浮点，如 0.1 = +10%）|
| `hp` | `p.maxHp` | 最大生命值 |
| `mp` | `p.maxMp` | 最大灵力值 |

---

## 游戏逻辑方案（@Dev）

### 新增文件

无需新增文件，所有改动在现有文件内完成。

### 修改文件

| 文件 | 改动内容 | 原因 |
|------|----------|------|
| `src/game/types.ts` | 新增 `PassiveEffect` 接口；`TechniqueDef` 追加 `passiveEffects?` 字段 | 类型定义 |
| `src/game/technique.ts` | 新增 `getAllTechniquePassiveBonus(player)` 函数 | 聚合所有已解锁被动 |
| `src/game/player/stats.ts` | 在 `recalcStats` 中调用 `getAllTechniquePassiveBonus` 并叠加到属性 | 属性统一入口 |
| `src/data/core-techniques.json` | 为 12 条功法添加 `passiveEffects` 数据 | 内容扩充 |

---

### 核心函数：`getAllTechniquePassiveBonus`（新增至 `technique.ts`）

```
// 伪代码
function getAllTechniquePassiveBonus(player: Player): TechniqueStatBonus {
  累加器 bonus = {}

  for each slot in player.techniques:
    def = getTechniqueDef(slot.techniqueId)
    if (!def || !def.passiveEffects) continue

    for each pe in def.passiveEffects:
      if slot.level >= pe.minLevel:
        bonus[pe.stat] += pe.value

  return bonus
}
```

**边界处理**：
- `player.techniques` 为空时返回空对象 `{}`。
- `getTechniqueDef` 找不到定义时跳过（防御性处理）。
- `critDmgMultiplier` 使用 `toFixed(2)` 处理浮点精度（与 `getActiveTechniqueBonus` 一致）。

---

### 修改 `recalcStats`（`src/game/player/stats.ts`）

在现有"装备属性加成"代码块之后，**追加一个"功法被动加成"代码块**：

```
// 装备属性加成（现有代码，不动）
if (p.equipped) { ... }

// ── 功法被动加成（T0019 新增）──
import { getAllTechniquePassiveBonus } from '../technique';
const passiveBonus = getAllTechniquePassiveBonus(p);
if (passiveBonus.atk)               p.atk += passiveBonus.atk;
if (passiveBonus.def)               p.def += passiveBonus.def;
if (passiveBonus.speed)             p.speed += passiveBonus.speed;
if (passiveBonus.hp)                p.maxHp += passiveBonus.hp;
if (passiveBonus.mp)                p.maxMp += passiveBonus.mp;
if (passiveBonus.critRate)          p.critRate += passiveBonus.critRate;
if (passiveBonus.critDmgMultiplier) p.critDmgMultiplier += passiveBonus.critDmgMultiplier;

// hp/mp 上限变化后 clamp（现有代码，不动）
p.hp = Math.min(p.hp, p.maxHp);
p.mp = Math.min(p.mp, p.maxMp);
```

> ⚠️ **注意**：`recalcStats` 目前在突破后调用。需确认功法修炼升级后也触发 `recalcStats`（在 `practiceTechnique` 返回新 player 后，调用方 `useSystemActions` 的 `execAction` 已通过 `setPlayer` 更新状态，但不会自动触发 `recalcStats`）。
>
> **修复方案**：在 `practiceTechnique` 函数末尾，对返回的 player 调用 `recalcStats`（与 `attemptBreakthrough` 中的处理方式一致）。这样每次修炼完成后属性立即刷新。

---

### 功法数据：被动效果设计（`src/data/core-techniques.json`）

设计原则：
- **Common（maxLevel=10）**：在 3 级、7 级各解锁一次，体现早期成长。
- **Uncommon（maxLevel=15）**：在 3 级、8 级、12 级解锁，三级阶梯。
- **Rare（maxLevel=20）**：在 5 级、10 级、15 级解锁，强化专精回报。
- **Epic（maxLevel=25）**：在 5 级、10 级、18 级解锁，最高等级有显著跳跃。
- 被动数值低于 `statBonusPerLevel` 的单级收益，偏向鼓励深度修炼。

| 功法 ID | 品质 | 被动效果 |
|---------|------|----------|
| `core:basic_sword` | common | Lv3: atk+8「剑心初启」；Lv7: speed+5「剑意流动」 |
| `core:basic_blade` | common | Lv3: atk+10「刀势初成」；Lv7: def+5「铁骨精神」 |
| `core:basic_fist` | common | Lv3: hp+30「体魄强健」；Lv7: atk+6「拳意精通」 |
| `core:basic_palm` | common | Lv3: def+8「柔劲护体」；Lv7: mp+20「内力绵延」 |
| `core:basic_finger` | common | Lv3: critRate+2「指法精准」；Lv7: atk+8「一指锁喉」 |
| `core:basic_spear` | common | Lv3: atk+8「枪势初展」；Lv7: def+6「枪盾合一」 |
| `core:swift_sword` | uncommon | Lv3: speed+8「疾风步法」；Lv8: atk+12「风刃锋利」；Lv12: critRate+3「疾风暴击」 |
| `core:iron_fist` | uncommon | Lv3: hp+50「铁骨皮」；Lv8: atk+15「铁拳贯穿」；Lv12: def+12「金刚不坏」 |
| `core:thunder_blade` | rare | Lv5: atk+20「雷威」；Lv10: critRate+5「霆击必中」；Lv15: critDmgMultiplier+0.2「天雷斩杀」 |
| `core:phantom_palm` | rare | Lv5: speed+15「幻影身法」；Lv10: atk+18「幻掌虚实」；Lv15: def+15「幻盾护体」 |
| `core:heaven_sword` | epic | Lv5: atk+30「天罡锋锐」；Lv10: critRate+8「罡气贯心」；Lv18: critDmgMultiplier+0.3「剑道极意」 |
| `core:dragon_spear` | epic | Lv5: def+25「龙鳞护甲」；Lv10: atk+28「龙吟破甲」；Lv18: hp+150「龙血战体」 |

---

### JSON 示例（以 `core:swift_sword` 为例）

```json
{
  "id": "core:swift_sword",
  "passiveEffects": [
    { "minLevel": 3,  "stat": "speed",    "value": 8,  "description": "疾风步法：速度 +8" },
    { "minLevel": 8,  "stat": "atk",      "value": 12, "description": "风刃锋利：攻击 +12" },
    { "minLevel": 12, "stat": "critRate", "value": 3,  "description": "疾风暴击：暴击率 +3%" }
  ]
}
```

---

## UI 方案（@Designer）

### 修改已有界面：功法详情区域

功法面板（技法 Tab 内的功法卡片/详情展开区）需新增"被动效果"子区域。

#### 布局结构

```
┌─────────────────────────────────────────┐
│  [功法名称]  [品质徽章]  Lv.X / MaxLv   │
│  ─────────────────────────────────────  │
│  📖 描述文字…                            │
│  ─────────────────────────────────────  │
│  ⚔️ 每级加成：攻击+N 速度+M …           │
│  ─────────────────────────────────────  │
│  ✨ 被动效果（T0019 新增区块）           │
│    ● [已解锁] Lv3  剑心初启：攻击 +8   │
│    ● [已解锁] Lv7  剑意流动：速度 +5   │
│    ○ [未解锁] Lv12 疾风暴击：暴击 +3%  │
└─────────────────────────────────────────┘
```

#### 视觉规范

| 状态 | 图标 | 文字颜色 | 背景 |
|------|------|----------|------|
| 已解锁 | `●` 绿色实心 | 正常文字色 | 浅绿色高亮行 |
| 未解锁 | `○` 灰色空心 | 灰色 (`#9E9E9E`) | 无背景 |
| 本次修炼刚解锁 | `🌟` 星星 | 金色 | 短暂闪烁动画 |

- 被动区块标题："✨ 熟练被动" 或 "🔮 境界感悟"
- 未解锁条目同时显示解锁条件，如 `（需 Lv12）`
- 所有功法卡片在折叠状态下，已解锁被动数量显示为角标，如 `2/3`

### 新增：属性面板标注（可选，低优先级）

在角色属性面板（状态面板）中，`攻击`/`防御` 等数值旁可显示被动加成来源 tooltip：

```
攻击：358（基础 300 + 装备 42 + 被动 16）
```

如实现成本高，此条可推迟。

---

### 交互

1. **修炼时解锁被动**：`practiceTechnique` 升级后，如解锁了新被动效果，在日志消息中追加提示：
   - 示例：`🧘 修炼 疾风剑法，熟练度 +12。🎉 升至 3 级！✨ 解锁被动：疾风步法（速度 +8）`
2. **悬停 tooltip**：已解锁被动行悬停时，显示"已生效，当前叠加到属性中"
3. **未解锁被动行**：显示距解锁所需等级，如"还差 4 级解锁"

---

## 验证方式

### 测试流程

1. 新建存档，学习 `core:basic_sword`（基础剑法）
2. 初始 Lv1，被动效果全部为未解锁状态
3. 修炼至 Lv3：
   - 期望：日志出现 `✨ 解锁被动：剑心初启（攻击 +8）`
   - 期望：角色攻击属性 `atk` 增加 8（在境界基础值之上）
4. 继续修炼至 Lv7：
   - 期望：速度增加 5
5. 同时学习第二个功法（如基础拳法 `core:basic_fist`），修炼至 Lv3：
   - 期望：体质 `maxHp` 增加 30（与剑法被动叠加，不互相覆盖）
6. 激活/切换功法：
   - 期望：被动效果不随激活功法变化而消失（永久性验证）
7. 加载存档后重新进入：
   - 期望：被动效果正确恢复（`recalcStats` 在加载时重算）

### 预期行为

- 被动加成 **仅在 `recalcStats` 中计算**，不直接写入 Player 存档字段（避免存档污染）
- 切换激活功法不影响被动
- 同一属性多个来源（装备 + 被动A + 被动B）正确累加

### 测试用例（写入 `docs/test-guide.md`）

```
[T0019-01] 基础被动解锁
  - 前置：学习 core:basic_sword，初始 atk 记为 atk0
  - 操作：修炼至 Lv3
  - 断言：player.atk === atk0 + 8

[T0019-02] 多功法被动叠加
  - 前置：basic_sword Lv3（atk+8）已解锁，学习 core:swift_sword 修炼至 Lv3
  - 断言：player.atk 包含两者被动之和

[T0019-03] 被动不随激活切换消失
  - 前置：basic_sword Lv3 被动已解锁，当前激活 basic_blade
  - 操作：切换激活为 basic_sword 再切回 basic_blade
  - 断言：两次切换前后 player.atk 相同（被动永久生效）

[T0019-04] 多级被动按阈值逐级解锁
  - 前置：core:swift_sword
  - Lv3 断言：speed+8（1 条解锁）
  - Lv8 断言：speed+8, atk+12（2 条解锁）
  - Lv12 断言：speed+8, atk+12, critRate+3（3 条解锁）

[T0019-05] recalcStats 幂等性
  - 操作：连续调用 recalcStats 两次
  - 断言：属性值相同（不会重复叠加）
```

---

## 调试面板需求

在 Debug 面板中新增以下内容：

**新增按钮组："功法被动调试"**

| 按钮/字段 | 功能 |
|-----------|------|
| `强制升级当前功法 Lv+1` | 将激活功法等级 +1 并调用 `recalcStats`，方便快速触发被动解锁 |
| `强制满级全部功法` | 将所有已学功法设为 maxLevel，测试所有被动叠加后的属性峰值 |
| `显示当前被动加成汇总` | 控制台打印 `getAllTechniquePassiveBonus(player)` 的结果 |

**新增显示字段（属性调试区）**

```
[被动加成] atk: +XX  def: +XX  speed: +XX  critRate: +X%  ...
```

---

## 依赖关系

### 前置任务

- **T0017**（功法系统）✅ — 提供 `TechniqueSlot`、`learnTechnique`、`practiceTechnique`、`TechniqueDef` 基础结构
- **T0018**（技能战斗）✅ — `getActiveTechniqueBonus` 已有参考实现

### 后续任务

- **T0020**（神通/元素体系）— 神通可参考本任务的"里程碑解锁"模式
- **T0031**（成就系统）— 可新增"首次解锁功法被动"类成就

---

## 实现工作量估计

| 子任务 | 涉及文件 | 难度 |
|--------|----------|------|
| 新增类型定义 | `types.ts` | 低 |
| 实现 `getAllTechniquePassiveBonus` | `technique.ts` | 低 |
| 修改 `recalcStats` 接入被动 | `player/stats.ts` | 低 |
| `practiceTechnique` 触发 `recalcStats` 并生成解锁日志 | `technique.ts` | 中 |
| 填充 12 条功法的 JSON 数据 | `core-techniques.json` | 低 |
| UI：功法卡片被动区域 | 功法面板组件 | 中 |
| Debug 面板扩展 | Debug 组件 | 低 |
