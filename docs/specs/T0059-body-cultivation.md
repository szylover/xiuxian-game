# 设计文档：体修路线（武器 · 拳法 · 指法）
任务：T0059（主任务），子任务 T0059–T0062
日期：2026-04-01

---

## 概述

"体修"是区别于气修（灵力修炼）的第二条成长路线。气修依靠灵根汲取天地灵气，以灵力为核心；体修则以肉身为炉鼎，淬炼筋骨皮肉，以**体魄**为核心资源。体修者不依赖灵力，战斗时以近身重击制敌，抗打击能力极强。

本设计新增：
1. **体魄（physique）属性** — 衡量肉身淬炼程度的独立数值
2. **体修境界（Body Realm）** — 7 阶肉身强化路线，与气修境界并行
3. **体修专属武器** — 拳套（gauntlets）、指环（fingerguards）、手甲（hand-armor）
4. **高阶拳法功法** — 炼体拳法系列（3 稀有度 × 4 等阶 = 12 条）
5. **高阶指法功法** — 穿金指法系列（3 稀有度 × 4 等阶 = 12 条）
6. **体修强化被动** — 体魄带来物理减伤、强化 HP 上限、提升暴击伤害倍率

---

## 一、与气修路线的对比

| 维度 | 气修（现有） | 体修（新增） |
|------|-------------|-------------|
| 核心资源 | 灵力（MP） | 体魄（Physique） |
| 修炼消耗 | 精力（stamina）+ 灵力（mp） | 精力（stamina）+ 体魄（physique） |
| 主要功法类型 | sword / blade / palm / spear | fist / finger（强化版） |
| 境界提升 | realmIndex（气修境界） | bodyRealmIndex（体修境界） |
| 战斗核心属性 | 攻击（atk）、暴击率（critRate） | 攻击（atk）、体魄减伤（physiqueDmgReduce） |
| 武器偏好 | 剑、刀、枪 | 拳套、指环 |
| 被动优势 | 高爆发技能伤害、MP 持续恢复 | 高 HP、物理减伤、体魄加速恢复 |

---

## 二、数据结构

### 2.1 Player 属性扩展

在 `src/game/player/types.ts` 的 `Player` 接口新增以下字段：

```typescript
// ─── 体修专属属性 ───
physique: number;               // 当前体魄值（0 起，上限由体修境界决定）
maxPhysique: number;            // 体魄上限（由 bodyRealmIndex + 功法被动叠加）
bodyRealmIndex: number;         // 体修境界索引（0=凡躯，1–6 见 BODY_REALMS，默认 0）
bodyRealmExp: number;           // 当前体修修为（升阶累积）
physiqueDmgReduce: number;      // 体魄减伤（%），战斗中直接扣除伤害百分比，上限 50
bodyTempering: number;          // 淬体次数（每次完整修炼一个体修功法 +1，用于成就/解锁）
```

### 2.2 体修境界定义（BodyRealmDef）

```typescript
interface BodyRealmDef {
  id: string;                   // 'core:body_mortal'
  name: string;                 // '凡躯' | '铜皮' | '铁骨' | '玉髓' | '金刚' | '龙象' | '不灭'
  index: number;                // 0–6
  maxPhysique: number;          // 该境界体魄上限
  expReq: number;               // 升阶所需体修修为
  physiqueDmgReduce: number;    // 提供的减伤百分比（0/2/5/10/18/28/40）
  hpBonus: number;              // 额外 HP 加成（叠加到 recalcStats）
  atkBonus: number;             // 额外攻击加成
  defBonus: number;             // 额外防御加成
  description: string;
}
```

**7 阶体修境界数据：**

| Index | 名称 | 体魄上限 | 体修修为要求 | 减伤% | HP加成 | ATK加成 | DEF加成 |
|-------|------|---------|------------|------|-------|--------|--------|
| 0 | 凡躯 | 50 | 0 | 0 | 0 | 0 | 0 |
| 1 | 铜皮 | 150 | 100 | 2 | +50 | +5 | +5 |
| 2 | 铁骨 | 400 | 500 | 5 | +150 | +15 | +15 |
| 3 | 玉髓 | 1000 | 2000 | 10 | +400 | +40 | +35 |
| 4 | 金刚 | 2500 | 8000 | 18 | +1000 | +90 | +80 |
| 5 | 龙象 | 6000 | 30000 | 28 | +2500 | +200 | +180 |
| 6 | 不灭 | 15000 | 100000 | 40 | +6000 | +450 | +400 |

> 设计意图：顶阶"不灭"减伤 40%，与极高 HP 叠加后体修者拥有极强的生存能力，但攻击爆发不如气修（无高倍技能加成），形成路线差异化。

### 2.3 TechniqueStatBonus 扩展

在 `TechniqueStatBonus` 接口新增：
```typescript
physique?: number;       // 提升体魄上限
bodyRealmExp?: number;   // 每次修炼额外获得的体修修为
physiqueDmgReduce?: number; // 额外减伤%（累加，总上限 50%）
```

### 2.4 体修武器槽位与 EquipStatBonus 扩展

武器槽位（slot = `'weapon'`）本身不变，通过 `techType` 字段标记兼容功法类型：

```typescript
interface EquipDef {
  // 现有字段...
  techType?: TechniqueType[];  // 武器兼容的功法类型；undefined = 通用
                               // 如 ['fist'] 表示只与拳法搭配时触发加成
  physiqueBonusRate?: number;  // 当激活拳法/指法时，额外按体魄值的 N% 追加攻击
                               // 例：0.05 表示 atk += physique * 0.05
}
```

在 `EquipStatBonus` 新增：
```typescript
physique?: number;             // 装备直接提供的体魄上限加成
physiqueDmgReduce?: number;    // 装备提供的减伤%
```

### 2.5 Aptitudes 无需改动

`fist` 和 `finger` 资质已在现有 `Aptitudes` 接口中定义，无需新增字段。

---

## 三、体修境界系统（@Dev）

### 3.1 体修修为的获得来源

| 来源 | 获得量 | 触发条件 |
|------|--------|---------|
| 修炼拳法/指法功法 | `5 + comprehension/20 + fist/10`（拳法）或`finger/10`（指法）| `practiceTechnique()` |
| 赢得战斗（装备拳套类武器） | `floor(monsterRealmIndex * 10 + 10)` | `runCombat()` 胜利结算 |
| 特定奇遇事件 | 固定值（50–500） | 事件触发 |
| 服用淬体丹 | 固定值（100–2000） | 丹药效果 |

### 3.2 体修境界突破条件

体修境界突破与气修境界**独立**，通过新函数 `tryBodyRealmBreakthrough(player)` 判断：

```
条件：
  bodyRealmExp >= BODY_REALMS[bodyRealmIndex + 1].expReq
  AND physique >= maxPhysique * 0.8   // 体魄需达到当前上限的 80%
  AND bodyRealmIndex < 6              // 未达上限

效果：
  bodyRealmIndex += 1
  bodyRealmExp = 0
  maxPhysique = BODY_REALMS[bodyRealmIndex].maxPhysique + 功法加成
  physiqueDmgReduce = BODY_REALMS[bodyRealmIndex].physiqueDmgReduce + 功法加成
  recalcStats()
  返回突破消息
```

> 体修突破不需要渡劫，但需要持续消耗 **淬体丹** 或通过战斗积累。

### 3.3 体魄值的消耗与恢复

| 操作 | 体魄变化 |
|------|---------|
| 修炼体修功法（每次） | -10（主动消耗） |
| 战斗胜利 | +`floor(physique * 0.05)` 自然回复 |
| 休息/冥想 | +`floor(maxPhysique * 0.1)` |
| 服用淬体丹 | 恢复至满 |
| 战斗受伤（受到伤害 > maxHp * 0.3） | -5（肉身应激） |

---

## 四、体修武器内容（@Content）

### 4.1 武器分类与设计原则

体修武器划分为三种形态：

| 武器形态 | 对应功法类型 | 特性 |
|---------|------------|------|
| **拳套**（gauntlets） | fist | 高攻击、体魄 physiqueBonusRate 高 |
| **指环/手甲**（fingerguards） | finger | 高暴击率、附加穿透减防效果 |
| **重手甲**（iron-gauntlets） | fist + finger 通用 | 均衡型，体魄上限加成 |

### 4.2 体修武器数据（12 件）

**拳套系列（techType: ['fist']）：**

| ID | 名称 | 品质 | ATK | 体魄上限 | physiqueBonusRate | 减伤% | 要求 | 价格 |
|----|------|------|-----|---------|------------------|------|------|------|
| `core:iron_fist_gloves` | 铁拳套 | common | 6 | +30 | 0.03 | — | 凡躯(0) | 20 |
| `core:bronze_gauntlets` | 铜制手甲 | uncommon | 14 | +80 | 0.05 | — | 铜皮(1) | 60 |
| `core:jade_fist_gloves` | 玉髓拳套 | rare | 32 | +200 | 0.08 | 2 | 铁骨(2) | 180 |
| `core:dragon_iron_fists` | 龙象铁拳 | epic | 70 | +500 | 0.12 | 5 | 玉髓(3) | 600 |

**指环/手甲系列（techType: ['finger']）：**

| ID | 名称 | 品质 | ATK | 暴击率 | 暴击倍率加成 | 减伤% | 要求 | 价格 |
|----|------|------|-----|--------|------------|------|------|------|
| `core:bone_finger_ring` | 骨制指环 | common | 4 | +3 | — | — | 凡躯(0) | 18 |
| `core:spirit_finger_guard` | 灵纹指甲 | uncommon | 10 | +5 | +0.1 | — | 铜皮(1) | 55 |
| `core:gold_piercing_ring` | 穿金指环 | rare | 24 | +8 | +0.2 | — | 铁骨(2) | 160 |
| `core:void_finger_claws` | 虚空指爪 | epic | 55 | +12 | +0.3 | 3 | 玉髓(3) | 550 |

**重手甲系列（techType: ['fist', 'finger']，通用）：**

| ID | 名称 | 品质 | ATK | DEF | 体魄上限 | 减伤% | 要求 | 价格 |
|----|------|------|-----|-----|---------|------|------|------|
| `core:iron_hand_armor` | 铁制手甲 | common | 5 | 3 | +20 | — | 凡躯(0) | 22 |
| `core:steel_hand_armor` | 精钢手甲 | uncommon | 12 | 8 | +60 | 1 | 铜皮(1) | 65 |
| `core:black_iron_gauntlets` | 玄铁手甲 | rare | 28 | 18 | +180 | 3 | 铁骨(2) | 200 |
| `core:ancient_war_gauntlets` | 古战手甲 | epic | 60 | 40 | +450 | 6 | 玉髓(3) | 650 |

---

## 五、拳法功法内容（@Content）

### 5.1 设计原则

拳法功法（type: `'fist'`）以 **高 HP、高 ATK、体魄加速** 为核心被动方向；主动技能以多段重击、破防为主。

现有功法（保留不变）：
- `core:basic_fist`（基础拳法，凡人，common）
- `core:iron_fist`（铁拳功，炼气，uncommon）

**新增 10 条拳法功法：**

#### 第一梯队（筑基+，rare）

| ID | 名称 | 稀有度 | 境界 | 最大等级 | 主动技能 | 核心被动 |
|----|------|------|------|---------|---------|---------|
| `core:tiger_roar_fist` | 虎啸拳法 | rare | 2(筑基) | 20 | 虎啸连击 ×3 段 | Lv5:体魄+100; Lv12:ATK+25; Lv18:DEF+20 |
| `core:mountain_crush_fist` | 碎山拳诀 | rare | 2 | 20 | 碎山一击（高倍单段） | Lv5:HP+200; Lv12:体魄+200; Lv18:减伤+3% |

#### 第二梯队（金丹+，epic）

| ID | 名称 | 稀有度 | 境界 | 最大等级 | 主动技能 | 核心被动 |
|----|------|------|------|---------|---------|---------|
| `core:diamond_body_fist` | 金刚伏魔拳 | epic | 3(金丹) | 25 | 金刚怒目 （debuff_def -30, 3回合） | Lv8:体魄+300; Lv15:ATK+50; Lv22:减伤+5% |
| `core:dragon_elephant_fist` | 龙象般若拳 | epic | 3 | 25 | 龙象冲击（×4 段 + DOT） | Lv8:HP+500; Lv15:体魄+600; Lv22:ATK+80 |

#### 第三梯队（元婴+，legendary）

| ID | 名称 | 稀有度 | 境界 | 最大等级 | 主动技能 | 核心被动 |
|----|------|------|------|---------|---------|---------|
| `core:immortal_body_fist` | 不灭体拳经 | legendary | 4(元婴) | 30 | 不灭反击（受击后下回合伤害×2） | Lv10:减伤+8%; Lv20:体魄+1000; Lv28:ATK+120 |
| `core:primal_chaos_fist` | 混元一气拳 | legendary | 4 | 30 | 混元归一（heal_self 恢复 20% 最大HP） | Lv10:HP+1000; Lv20:ATK+150; Lv28:体魄+1500 |

#### 补全低阶（掌法/拳法补充，common/uncommon）

| ID | 名称 | 稀有度 | 境界 | 主要属性方向 |
|----|------|------|------|------------|
| `core:hard_qigong` | 硬气功 | uncommon | 1(炼气) | 体魄+体修修为加速 |
| `core:iron_shirt` | 铁布衫 | uncommon | 1 | 减伤+DEF |
| `core:stone_body` | 石化功 | rare | 2 | 极高 DEF，速度略降 |
| `core:eight_drunken_fists` | 醉八拳 | rare | 2 | 高闪避+高暴击（moveSpeed+critRate）|

### 5.2 拳法主动技能参数模板

| 技能类型 | dmgMultiplier | hitCount | mpCost | staminaCost | cooldown | triggerRate |
|---------|--------------|---------|--------|------------|---------|------------|
| 多段连击（×3） | 0.6/段 | 3 | 12 | 8 | 2 | 0.35 |
| 重型单击 | 2.0 | 1 | 18 | 12 | 3 | 0.25 |
| 四段+DOT | 0.5/段 | 4 | 20 | 15 | 3 | 0.30 |
| 自愈型 | 1.0 | 1 | 8 | 5 | 4 | 0.20 |
| 反击型（特殊） | 2.0 | 1 | 25 | 20 | 5 | 0.15 |

> 拳法功法使用 **精力（stamina）** 为主要资源，mp 消耗偏低，体现体修"不依赖灵力"的特色。

---

## 六、指法功法内容（@Content）

### 6.1 设计原则

指法功法（type: `'finger'`）以 **高暴击率、穿透减防、点穴制敌** 为核心方向；主动技能以单点高伤、持续削弱为主。

现有功法（保留不变）：
- `core:basic_finger`（基础指法，凡人，common）

**新增 11 条指法功法：**

#### 第一梯队（炼气/筑基，uncommon/rare）

| ID | 名称 | 稀有度 | 境界 | 最大等级 | 主动技能 | 核心被动 |
|----|------|------|------|---------|---------|---------|
| `core:iron_finger` | 铁指功 | uncommon | 1(炼气) | 15 | 点穴指（debuff_atk -15, 2回合） | Lv5:暴击率+3; Lv10:ATK+10 |
| `core:void_pierce_finger` | 虚空穿刺指 | rare | 2(筑基) | 20 | 穿刺一指（无视 30% 防御） | Lv5:暴击率+5; Lv12:暴击倍率+0.2; Lv18:ATK+20 |
| `core:willow_leaf_finger` | 柳叶点穴手 | rare | 2 | 20 | 连点七穴（×7 段低倍） | Lv5:速度+5; Lv12:暴击率+8; Lv18:moveSpeed+5 |

#### 第二梯队（金丹+，epic）

| ID | 名称 | 稀有度 | 境界 | 最大等级 | 主动技能 | 核心被动 |
|----|------|------|------|---------|---------|---------|
| `core:sunflower_finger` | 葵花点穴手 | epic | 3(金丹) | 25 | 致命一指（暴击率+50% 本次） | Lv8:暴击率+12; Lv15:暴击倍率+0.3; Lv22:ATK+40 |
| `core:thunder_finger` | 雷霆点指 | epic | 3 | 25 | 雷霆连指（×5 段 + DOT 雷伤） | Lv8:暴击率+10; Lv15:DOT效果延长1回合; Lv22:ATK+35 |

#### 第三梯队（元婴+，legendary）

| ID | 名称 | 稀有度 | 境界 | 最大等级 | 主动技能 | 核心被动 |
|----|------|------|------|---------|---------|---------|
| `core:one_finger_chan` | 一指禅 | legendary | 4(元婴) | 30 | 禅指（debuff_def -60, 持续5回合） | Lv10:暴击率+20; Lv20:暴击倍率+0.5; Lv28:ATK+100 |
| `core:heaven_piercing_finger` | 穿天指 | legendary | 4 | 30 | 穿天一指（单段 ×3.0 倍，穿防御60%）| Lv10:暴击率+15; Lv20:ATK+120; Lv28:暴击倍率+0.6 |

#### 补全低阶（common/uncommon）

| ID | 名称 | 稀有度 | 境界 | 主要属性方向 |
|----|------|------|------|------------|
| `core:bone_press_finger` | 骨压指 | common | 0(凡人) | 基础暴击率+DEF |
| `core:steel_finger` | 钢铁指 | uncommon | 1 | ATK+暴击倍率 |
| `core:nimble_finger` | 灵动指法 | uncommon | 1 | 速度+moveSpeed |
| `core:wind_finger` | 疾风指 | rare | 2 | 速度+暴击率+moveSpeed |

### 6.2 指法主动技能参数模板

| 技能类型 | dmgMultiplier | hitCount | mpCost | staminaCost | cooldown | triggerRate |
|---------|--------------|---------|--------|------------|---------|------------|
| 单点高伤 | 2.5 | 1 | 20 | 10 | 3 | 0.25 |
| 多段连点（×5–7） | 0.4/段 | 5–7 | 15 | 8 | 2 | 0.30 |
| DOT+弱化 | 1.0 | 1 | 18 | 12 | 3 | 0.20 |
| 致命一指（临时暴击强化） | 1.5 | 1 | 22 | 15 | 4 | 0.18 |

---

## 七、战斗系统影响

### 7.1 体魄减伤机制

在 `src/game/combat/damage.ts` 的 `calcDamage()` 函数新增第 5 层：

```
// 5. 体魄减伤（体修被动，上限 50%）
reduceRate = min(0.50, defender.physiqueDmgReduce / 100)
dmg = floor(dmg * (1 - reduceRate))
```

计算顺序（完整 5 层）：
```
baseDmg = atk * random(0.85, 1.15)
dmg = max(1, baseDmg - def * 0.6)        // 减防
if crit: dmg *= critDmgMultiplier         // 暴击
if dodge: dmg = 0                         // 闪避
dmg = floor(dmg * (1 - physiqueDmgReduce/100))  // ← 新增体魄减伤
finalDmg = dmg
```

### 7.2 体修武器的 physiqueBonusRate 触发

在 `runCombat()` 准备战斗属性阶段，检测激活功法与武器的 `techType` 匹配：

```
weaponDef = getEquippedDef(player, 'weapon')
activeTechniqueDef = getActiveTechniqueDef(player)

if weaponDef.techType 包含 activeTechniqueDef.type:
    extraAtk += floor(player.physique * weaponDef.physiqueBonusRate)
    combatant.atk += extraAtk
    log: `[体修加持] 体魄×${rate} = +${extraAtk} 攻击`
```

### 7.3 Combatant 接口扩展

```typescript
interface Combatant {
  // 现有字段...
  physiqueDmgReduce: number;   // 新增：体魄减伤（%），来自 player.physiqueDmgReduce
}
```

### 7.4 体修修为的战斗结算

在 `runCombat()` 胜利结算中新增：

```typescript
// 若玩家装备了拳套/指环类武器
if (player 装备体修武器) {
  const bodyExpGain = floor(monster.realmIndex * 10 + 10);
  player.bodyRealmExp += bodyExpGain;
  result.logs.push(`[体修] 获得体修修为 +${bodyExpGain}`);
  // 检查是否可突破
  tryBodyRealmBreakthrough(player);
}
```

---

## 八、UI 方案（@Designer）

### 8.1 体修境界展示

**位置**：状态面板（StatusPanel）的角色信息区块，在气修境界下方追加一行：

```
[气修] 筑基（修为: 850/2000）
[体修] 铁骨（体修修为: 320/2000）  ←新增行
```

**颜色主题**：体修相关元素使用暖橙色/棕铜色（区别于气修的蓝/紫色系）。

### 8.2 体魄值条

**位置**：战斗弹窗（CombatModal）和状态面板，在 HP/MP 条下方新增：

```
HP  ████████░░  450/500
MP  ██████░░░░  60/100
体  ██████████  400/400    ←新增：体魄条，橙色
```

### 8.3 新增 Debug 面板字段

在调试面板新增以下可读/写字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `physique` | 数字输入 | 当前体魄值 |
| `maxPhysique` | 数字输入 | 体魄上限（只读，或强制设置） |
| `bodyRealmIndex` | 下拉选择 0–6 | 强制设置体修境界 |
| `bodyRealmExp` | 数字输入 | 体修修为 |
| `physiqueDmgReduce` | 数字输入（0–50） | 减伤% |
| 按钮：`+体修修为 +1000` | 按钮 | 快速添加体修修为 |
| 按钮：`体修满体魄` | 按钮 | 补满体魄值 |

### 8.4 武器选择提示

装备体修武器时，若当前激活功法与武器 `techType` 不匹配，显示提示（黄色警告 Toast）：
> "当前激活功法「天罡剑诀」与「铁拳套」不兼容，physiqueBonusRate 未生效，建议切换拳法。"

---

## 九、新增文件与修改文件

### 9.1 新增文件

| 文件 | 用途 | 关键函数 |
|------|------|---------|
| `src/game/body-cultivation.ts` | 体修核心逻辑 | `tryBodyRealmBreakthrough()`, `gainBodyRealmExp()`, `recalcBodyStats()`, `getBodyRealmDef()` |
| `src/data/core-body-realms.json` | 体修 7 境界数据 | — |
| `src/data/body-techniques.json` | 拳法+指法新功法数据（22 条） | — |
| `src/data/body-equips.json` | 体修武器数据（12 件） | — |

### 9.2 修改文件

| 文件 | 改动摘要 | 原因 |
|------|---------|------|
| `src/game/player/types.ts` | 新增 6 个体修字段（physique 等） | 扩展玩家属性 |
| `src/game/player/create.ts` | 创建角色时初始化体修字段 | 保持 Player 数据完整 |
| `src/game/player/stats.ts` | `recalcStats()` 中叠加 bodyRealm 加成 | 统一属性计算入口 |
| `src/game/combat/damage.ts` | `calcDamage()` 新增第 5 层体魄减伤 | 战斗公式扩展 |
| `src/game/combat/run.ts` | 武器匹配判断 + 体修修为战斗结算 | 体修武器效果触发 |
| `src/game/combat/types.ts` | `Combatant` 新增 `physiqueDmgReduce` | 战斗快照包含体修属性 |
| `src/game/technique.ts` | 无需改动，现有函数已支持 fist/finger | — |
| `src/game/equipment.ts` | `equipItem()` 兼容 `techType` 匹配提示 | 武器类型提示 |
| `src/data/core-equips.json` | 新增 12 件体修武器 | 扩展装备内容池 |
| `src/data/core-techniques.json` | 新增 22 条拳法/指法功法 | 扩展功法内容池 |
| `src/game/data.ts` | 注册 body realm + 体修武器 + 新功法 | DLC 注册 |

---

## 十、任务分解

### T0059（主任务）— 体修系统核心

**目标**：实现体修数据结构、体魄值系统、体修境界突破逻辑。

| 子任务 | 说明 | 负责 |
|------|------|------|
| T0059-A | Player 扩展（6 个新字段 + create 初始化） | @Dev |
| T0059-B | body-cultivation.ts（核心逻辑：修为、突破、重算） | @Dev |
| T0059-C | recalcStats() 叠加体修境界加成 | @Dev |
| T0059-D | 战斗系统扩展（减伤层 + 武器匹配 + 修为结算） | @Dev |

---

### T0060 — 体修武器内容

**目标**：12 件体修武器数据 + EquipDef 扩展字段 + 商店上架。

| 子任务 | 说明 | 负责 |
|------|------|------|
| T0060-A | EquipDef 新增 `techType` + `physiqueBonusRate` 字段 | @Dev |
| T0060-B | 12 件武器 JSON 数据（body-equips.json） | @Content |
| T0060-C | 装备提示（不兼容警告 Toast） | @Dev + @Designer |
| T0060-D | 商店上架（按体修境界解锁） | @Content |

---

### T0061 — 拳法 + 指法功法内容

**目标**：22 条新功法数据 + 功法面板展示体修修为信息。

| 子任务 | 说明 | 负责 |
|------|------|------|
| T0061-A | 22 条功法 JSON 数据（body-techniques.json） | @Content |
| T0061-B | 功法面板新增"体修修为"显示 | @Designer |
| T0061-C | practiceTechnique() 中拳法/指法触发 bodyRealmExp 积累 | @Dev |

---

### T0062 — 体修 UI 展示

**目标**：状态面板体修境界行 + 体魄条 + Debug 面板字段。

| 子任务 | 说明 | 负责 |
|------|------|------|
| T0062-A | 状态面板追加体修境界 + 体修修为进度 | @Designer |
| T0062-B | HP/MP 条下方新增橙色体魄条 | @Designer |
| T0062-C | 战斗弹窗体魄条 | @Designer |
| T0062-D | Debug 面板新增体修字段 + 按钮 | @Dev + @Designer |

---

## 十一、任务依赖关系

```
T0059（体修系统核心）
  ├── 前置：T0001 ✅、T0003 ✅、T0017 ✅、T0019 ✅
  └── 后续：T0060、T0061、T0062 都依赖 T0059

T0060（体修武器）
  ├── 前置：T0059、T0014 ✅
  └── 后续：T0061（武器+功法联动）

T0061（功法内容）
  ├── 前置：T0059
  └── 后续：T0062（UI展示）

T0062（UI 展示）
  └── 前置：T0059、T0060、T0061
```

---

## 十二、验证方式

### 12.1 浏览器测试步骤

1. **新游戏**：创建角色，控制台输出 `player.physique` 初始值（应为 `50`），`player.bodyRealmIndex` 应为 `0`（凡躯）。
2. **装备测试**：从商店购买「铁拳套」并装备，激活「基础拳法」，进入战斗，日志中应出现 `[体修加持] 体魄×0.03 = +N 攻击`。
3. **减伤测试**：使用 Debug 面板将 `physiqueDmgReduce` 设为 `40`，进入战斗，观察受到伤害是否减少 40%。
4. **体修修为**：使用 Debug 按钮 `+体修修为 +1000`，累加至铜皮境界（100），触发突破，`bodyRealmIndex` 变为 `1`，`maxPhysique` 变为 150。
5. **功法修炼**：修炼「虎啸拳法」到 Lv5，被动`体魄+100`解锁，`maxPhysique` 相应增加。
6. **武器不匹配警告**：装备「铁拳套」，激活「天罡剑诀」，进入战斗，无 physiqueBonusRate 加成，且应出现 Toast 提示。

### 12.2 预期边界行为

| 场景 | 预期 |
|------|------|
| physiqueDmgReduce 超过 50% 上限 | 强制截断为 50% |
| 体修境界已最高（6，不灭）时再获体修修为 | 修为溢出不计入，提示"已至体修极境" |
| 未装备体修武器时战斗胜利 | 不结算 bodyRealmExp |
| 体修武器装备到 accessory 槽（不可能） | 武器只能进 weapon 槽，无此情况 |

### 12.3 测试用例（写入 docs/test-guide.md）

- `[T0059] 新建角色 → player.physique === 50`
- `[T0059] 新建角色 → player.bodyRealmIndex === 0`
- `[T0059] bodyRealmExp 满足条件 → 突破成功，bodyRealmIndex +1`
- `[T0059] physiqueDmgReduce=40 → 受到 100 伤害实际扣 60`
- `[T0060] 装备铁拳套+激活基础拳法 → 战斗 atk 有 physiqueBonusRate 加成`
- `[T0060] 激活不匹配功法 → physiqueBonusRate 不触发 + Toast 警告`
- `[T0061] 修炼虎啸拳法至 Lv5 → 体魄上限 +100`
- `[T0062] 状态面板显示体修境界行`
- `[T0062] 体魄条橙色显示，值随修炼正确变化`

---

## 十三、与现有系统的集成点总结

| 集成点 | 现有系统 | 集成方式 |
|--------|---------|---------|
| 属性重算 | `recalcStats()` in player/stats.ts | 在末尾追加 bodyRealm 加成叠加 |
| 功法修炼 | `practiceTechnique()` in technique.ts | 检测 type===fist/finger 时追加体修修为 |
| 战斗伤害 | `calcDamage()` in combat/damage.ts | 新增第 5 层减伤计算 |
| 战斗准备 | `runCombat()` in combat/run.ts | 武器匹配判断 + physiqueBonusRate 追加 atk |
| 战斗结算 | `runCombat()` 胜利处理 | 体修武器判断 + bodyRealmExp 结算 |
| DLC 注册 | `registerDLC()` in data.ts | 体修境界/武器/功法均通过 DLC 挂载 |
| 成就系统 | `achievement.ts` | 新增体修相关成就（淬体次数、境界突破） |
| 商店 | `core-shop.json` | 体修武器和丹药（淬体丹）按体修境界解锁 |
