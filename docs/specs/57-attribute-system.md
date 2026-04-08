# 属性系统设计文档

> 版本：v0.1  
> 状态：草稿  
> 作者：@Architect

---

## 1. 概述

修仙小游戏的属性系统分为 **四大类**，共计 **30+ 属性维度**。  
设计目标：用属性驱动所有游戏行为——修炼、战斗、探索、炼丹、奇遇，让每次随机事件都有迹可循。

```
┌─────────────────────────────────────────────────┐
│                  属性系统总览                      │
├──────────┬──────────┬──────────┬─────────────────┤
│ 基础属性  │ 战斗属性  │ 先天属性  │  资质类属性      │
│ (生存)   │ (对抗)   │ (随机灵魂) │  (成长上限)     │
├──────────┼──────────┼──────────┼─────────────────┤
│ 寿命     │ 攻击     │ 幸运      │ 技艺资质        │
│ 心情     │ 防御     │ 悟性      │ 功法资质        │
│ 健康     │ 脚力     │ 魅力      │ 灵根资质        │
│ 精力     │ 功法抗性  │          │                │
│ 体力(HP) │ 神通抗性  │          │                │
│ 灵力(MP) │ 会心     │          │                │
│ 念力     │ 护心     │          │                │
│          │ 移速     │          │                │
└──────────┴──────────┴──────────┴─────────────────┘
```

---

## 2. 基础属性（生存与节奏）

基础属性决定角色的 **生存能力** 和 **行动节奏**，是所有系统的地基。

| 属性 | 标识符 | 类型 | 范围 | 说明 |
|------|--------|------|------|------|
| **寿命** | `age` / `lifespan` | 双值 | `age`: 0–∞, `lifespan`: 100–∞ | 当前年龄 / 寿限。`age >= lifespan` 时触发寿元耗尽判定。突破境界 & 服用延寿丹可提升 `lifespan`。太乙金仙及以上或获得「长生久视」被动时 `lifespan = Infinity`。 |
| **心情** | `mood` | 百分比 | 0–100 | 影响奇遇触发率、修炼效率的隐性乘数。高心情：好事件概率 +20%；低心情（<30）：可能触发"心魔"负面事件。 |
| **健康** | `health` | 百分比 | 0–100 | 低于 30 获得「虚弱」debuff（攻击/修炼效率 -25%）；低于 10 获得「重伤」（无法战斗/探索）。由战斗、事件、丹药影响。 |
| **精力** | `stamina` | 整数 | 0–`maxStamina` | 每次操作消耗精力，精力耗尽则本轮无法行动。每"天"自动回复。模拟体力感，防止无限刷操作。 |
| **体力 (HP)** | `hp` / `maxHp` | 整数 | 0–∞ | 战斗核心。归零触发死亡/重伤流程。由境界 `hpBase` + 装备 + buff 决定上限。 |
| **灵力 (MP)** | `mp` / `maxMp` | 整数 | 0–∞ | 释放功法/神通消耗。由境界 `mpBase` + 灵根资质影响上限和回复速率。 |
| **念力** | `mentalPower` | 整数 | 0–∞ | 消耗资源：使用丹药消耗念力、查看他人背包消耗念力、部分特殊事件需要念力门槛。由境界和悟性影响上限。 |

### 2.1 精力系统详设

```
maxStamina = 基础值(100) + 境界加成(realmIndex * 10) + 体修buff
每次操作消耗:
  修炼:  10 精力
  探索:  15 精力
  战斗:  20 精力
  炼丹:  10 精力
  休息:   0 精力 (回复 30% maxStamina)
每日自然回复: 50% maxStamina
```

### 2.2 寿命系统详设

```
初始寿限: 100岁 (凡人)
每个境界突破增加寿限:
  ── 凡人修仙阶段 ──
  炼气: +50    筑基: +100   金丹: +200
  元婴: +500   化神: +1000  渡劫: +2000  大乘: +5000
  ── 仙道阶段（参考《佛本是道》洪荒体系） ──
  散仙/地仙: +10000   天仙: +50000   金仙: +200000
  ── 洪荒终局阶段 ──
  太乙金仙: +∞（不死不灭）  大罗金仙: ∞  准圣: ∞  圣人: ∞

每次操作推进时间:
  修炼 = 0.1 年    探索 = 0.05 年
  战斗 = 0.02 年   休息 = 0.01 年

寿元耗尽: age >= lifespan → 游戏结束（可用延寿丹续命）
注：太乙金仙及以上寿元无限，不再触发寿元耗尽判定。
```

---

## 3. 战斗属性（数值对抗）

战斗属性决定 **战斗中的数值计算**，是 PvE/PvP 的核心。

| 属性 | 标识符 | 计算方式 | 说明 |
|------|--------|----------|------|
| **攻击** | `atk` | `atkBase + weapon + buffAtk` | 基础由境界决定，装备和 buff 叠加。 |
| **防御** | `def` | `defBase + armor + buffDef` | 战斗伤害公式：`damage = max(1, atk - def) * multiplier`。 |
| **脚力** | `speed` | `speedBase + boots + buff` | 探索效率乘数：`exploreYield *= 1 + speed/100`。战斗中决定先手。 |
| **功法抗性** | `skillResist` | 百分比 0–80% | 减少受到的功法类伤害（近战技能）。 |
| **神通抗性** | `spellResist` | 百分比 0–80% | 减少受到的神通类伤害（灵力技能）。 |
| **会心（暴击）** | `critRate` | 百分比 0–100% | 暴击触发率。暴击伤害 = `damage * critDmgMultiplier(1.5–3.0)`。 |
| **护心（抗暴）** | `critResist` | 百分比 0–100% | 实际暴击率 = `max(0, critRate - critResist)`。 |
| **移速** | `moveSpeed` | 整数 | 战斗中的灵活度，影响闪避率：`dodgeChance = moveSpeed / (moveSpeed + 100)`。 |

### 3.1 战斗伤害公式

```
// 1. 基础伤害
baseDmg = attacker.atk * random(0.85, 1.15)

// 2. 减防
reducedDmg = max(1, baseDmg - defender.def * 0.6)

// 3. 暴击判定
effectiveCrit = max(0, attacker.critRate - defender.critResist)
if (random() < effectiveCrit / 100):
    reducedDmg *= attacker.critDmgMultiplier  // 默认 1.5

// 4. 抗性
if (isSkillDmg):
    reducedDmg *= (1 - defender.skillResist / 100)
elif (isSpellDmg):
    reducedDmg *= (1 - defender.spellResist / 100)

// 5. 闪避判定
dodgeChance = defender.moveSpeed / (defender.moveSpeed + 100)
if (random() < dodgeChance):
    reducedDmg = 0  // "闪避！"

finalDmg = floor(reducedDmg)
```

### 3.2 先手规则

```
先手方 = speed 高的一方先攻击
speed 相同时随机决定
```

---

## 4. 先天/特殊属性（随机灵魂）

先天属性在角色创建时**随机生成**，后期极难提升，是运气和个性的体现。

| 属性 | 标识符 | 范围 | 生成方式 | 对游戏的影响 |
|------|--------|------|----------|-------------|
| **幸运** | `luck` | 1–100 | 创建时 `randInt(1,100)` | **最核心的随机引擎属性**。影响所有随机事件的偏向。幸运 > 70：好事件权重 ×1.5，坏事件权重 ×0.5；幸运 < 30：反之。影响战利品品质、炼丹成功率、奇遇概率。 |
| **悟性** | `comprehension` | 1–100 | 创建时 `randInt(1,100)` | 学习功法速度 = `baseLearningTime / (1 + comprehension/50)`。洗练属性消耗 = `baseCost / (1 + comprehension/100)`。影响突破瓶颈的成功率。 |
| **魅力** | `charisma` | 1–100 | 创建时 `randInt(1,100)` | NPC 初始好感度 = `baseAffinity + charisma * 0.5`。触发特殊奇遇（仙子/仙尊传法）的门槛。高魅力可在交易中获得折扣。 |

### 4.1 幸运对随机引擎的影响

```javascript
/**
 * 按幸运值调整事件权重
 * @param {number} luck       玩家幸运值 (1-100)
 * @param {object[]} events   事件列表，每个 { weight, type, isGood }
 * @returns {object[]}        调整后的事件列表
 */
function adjustEventWeights(luck, events) {
  const luckFactor = luck / 50; // 0.02 ~ 2.0, 中位数 1.0
  return events.map(e => ({
    ...e,
    weight: e.isGood
      ? e.weight * (0.5 + luckFactor * 0.5)    // 好事件: luck高→权重大
      : e.weight * (1.5 - luckFactor * 0.5)    // 坏事件: luck高→权重小
  }));
}
```

### 4.2 先天属性提升途径（稀有）

| 途径 | 提升量 | 条件 |
|------|--------|------|
| 天命奇遇 | +1~5 | 探索低概率触发 |
| 洗髓丹 | +3~10 | 极稀有丹药 |
| 渡劫成功 | 全属性 +5 | 渡劫境界突破 |
| 转世重修 | 重新随机（保留 50% 修为） | 大乘期特殊选项 |

---

## 5. 资质类属性（成长上限）

资质决定角色在各领域的 **天赋上限** 和 **学习效率**。

### 5.1 技艺资质

| 资质 | 标识符 | 说明 |
|------|--------|------|
| 炼丹 | `alchemy` | 炼丹成功率 & 丹药品质。公式：`successRate = 0.3 + alchemy/200` |
| 炼器 | `smithing` | 打造装备的品质加成 |
| 风水 | `fengshui` | 探索时发现隐藏地点的概率 |
| 采矿 | `mining` | 获取灵石/矿石的效率乘数 |

### 5.2 功法资质

每种武器/技能类型有独立资质，决定该类功法的学习速度和伤害加成。

| 资质 | 标识符 | 伤害加成公式 |
|------|--------|-------------|
| 刀 | `blade` | `dmg *= 1 + blade/100` |
| 枪 | `spear` | `dmg *= 1 + spear/100` |
| 剑 | `sword` | `dmg *= 1 + sword/100` |
| 拳 | `fist` | `dmg *= 1 + fist/100` |
| 掌 | `palm` | `dmg *= 1 + palm/100` |
| 指 | `finger` | `dmg *= 1 + finger/100` |

### 5.3 灵根资质

灵根决定对应属性的 **功法学习门槛** 和 **元素伤害/抗性**。

| 灵根 | 标识符 | 特性 |
|------|--------|------|
| 火 | `fire` | 攻击向，高爆发 |
| 水 | `water` | 回复向，治疗加成 |
| 雷 | `thunder` | 速度向，暴击加成 |
| 风 | `wind` | 闪避向，移速加成 |
| 土 | `earth` | 防御向，生命加成 |
| 木 | `wood` | 续航向，精力/健康回复加成 |

### 5.4 资质生成规则

```javascript
/**
 * 角色创建时随机生成资质
 * 每项资质 1-100，但分品级:
 *   1-20   废灵根 (40% 概率)
 *   21-50  普通   (30%)
 *   51-80  良好   (20%)
 *   81-95  优秀   (8%)
 *   96-100 天灵根 (2%)
 */
function rollAptitude() {
  const roll = Math.random() * 100;
  if (roll < 40)  return randInt(1, 20);
  if (roll < 70)  return randInt(21, 50);
  if (roll < 90)  return randInt(51, 80);
  if (roll < 98)  return randInt(81, 95);
  return randInt(96, 100);
}

function generateAptitudes() {
  return {
    // 技艺
    alchemy: rollAptitude(), smithing: rollAptitude(),
    fengshui: rollAptitude(), mining: rollAptitude(),
    // 功法
    blade: rollAptitude(), spear: rollAptitude(),
    sword: rollAptitude(), fist: rollAptitude(),
    palm: rollAptitude(), finger: rollAptitude(),
    // 灵根
    fire: rollAptitude(), water: rollAptitude(),
    thunder: rollAptitude(), wind: rollAptitude(),
    earth: rollAptitude(), wood: rollAptitude(),
  };
}
```

### 5.5 灵根品级评定

```
总灵根值 = fire + water + thunder + wind + earth + wood
平均值 = 总灵根值 / 6

品级:
  天灵根 (平均 > 85): 极稀有，修炼速度 ×2.0
  异灵根 (平均 > 65): 稀有，修炼速度 ×1.5
  灵根   (平均 > 40): 普通，修炼速度 ×1.0
  杂灵根 (平均 > 20): 较差，修炼速度 ×0.7
  废灵根 (平均 ≤ 20): 极差，修炼速度 ×0.4

特殊: 单属性 > 90 且其余 < 30 → "单灵根"，该属性修炼 ×3.0
```

---

## 6. 属性之间的联动

属性不是孤立的，它们组成一个相互影响的网络：

```
幸运 ──→ 随机事件偏向 ──→ 获得灵石/丹药/奇遇
  │
  └──→ 暴击触发时的额外伤害加成 (+luck/200)

悟性 ──→ 修炼效率 ──→ 突破速度
  │
  └──→ 功法学习 ──→ 解锁更强技能

魅力 ──→ NPC 好感 ──→ 商店折扣、任务奖励
  │
  └──→ 奇遇触发 ──→ 特殊剧情/传承

灵根 ──→ 修炼速度乘数
  │
  └──→ 元素伤害/抗性 ──→ 战斗优势

心情 ──→ 修炼效率 (×0.5 ~ ×1.5)
  │
  └──→ 心魔事件 (mood < 30)

健康 ──→ debuff 系统
  │
  └──→ 战斗属性折扣 (health < 50 → atk/def * health/100)
```

---

## 7. 数据结构（代码参考）

```javascript
// Player 属性扩展
const playerAttributes = {
  // === 基础属性 ===
  age: 16,               // 当前年龄
  lifespan: 100,          // 寿限
  mood: 70,               // 心情 0-100
  health: 100,            // 健康 0-100
  stamina: 100,           // 精力
  maxStamina: 100,
  hp: 100,
  maxHp: 100,
  mp: 50,
  maxMp: 50,
  mentalPower: 30,        // 念力
  maxMentalPower: 30,

  // === 战斗属性 ===
  atk: 10,
  def: 5,
  speed: 10,              // 脚力
  skillResist: 0,         // 功法抗性 %
  spellResist: 0,         // 神通抗性 %
  critRate: 5,            // 会心 %
  critDmgMultiplier: 1.5, // 暴击伤害倍率
  critResist: 0,          // 护心 %
  moveSpeed: 10,          // 移速

  // === 先天属性 ===
  luck: 50,               // 幸运 1-100
  comprehension: 50,      // 悟性 1-100
  charisma: 50,           // 魅力 1-100

  // === 资质 ===
  aptitudes: {
    // 技艺
    alchemy: 30, smithing: 30, fengshui: 30, mining: 30,
    // 功法
    blade: 30, spear: 30, sword: 30, fist: 30, palm: 30, finger: 30,
    // 灵根
    fire: 30, water: 30, thunder: 30, wind: 30, earth: 30, wood: 30,
  },

  // === 小说奇遇事件扩展（详见 65-novel-events.md）===
  items: {},       // 已获得道具：zhangTianPing, xianFu, ziFu, guiYan, zhiRen, duTianArray, jiuHuLu
  passives: {},    // 已激活被动：changSheng, guiXi, hunter
  systems: {},     // 已解锁系统：zhuangbi, caiji, offlineGrind, zhuShen
  tracking: {},    // 特殊条件追踪计数器（killCount, bossKillCount, consecutiveRests…）
};
```

---

## 8. UI 展示建议

状态栏（顶部常驻）只显示最核心的属性：

```
[道号] [境界] ❤️ HP  🔮 MP  ⚡ 精力  💎 灵石  📅 年龄/寿限
```

完整面板（点击「📋 状态」展开）分四栏：

```
┌─ 基础 ─────────────────────────────────────┐
│ 寿命: 16/100岁  心情: 😊 70  健康: 💚 100  │
│ 精力: ⚡ 100/100  念力: 🧠 30/30           │
├─ 战斗 ─────────────────────────────────────┤
│ 攻击: 10  防御: 5  脚力: 10  移速: 10      │
│ 会心: 5%  护心: 0%  功法抗性: 0%           │
├─ 先天 ─────────────────────────────────────┤
│ 🍀 幸运: 50  🧠 悟性: 50  💫 魅力: 50     │
├─ 灵根 ─────────────────────────────────────┤
│ 🔥 火: 30  💧 水: 30  ⚡ 雷: 30            │
│ 🌪️ 风: 30  🪨 土: 30  🌿 木: 30            │
└─────────────────────────────────────────────┘
```

---

## 9. 后续扩展预留

- **装备系统**：武器/防具/饰品，每件装备给 `atk/def/speed/...` 加成
- **buff/debuff 系统**：时限性属性修改器列表
- **功法系统**：学习的功法提供被动属性加成 + 主动技能
- **NPC 好感度系统**：基于 `charisma` 的 NPC 交互

---

*本文档供开发 Agent 参考，实现时以此为准。*
