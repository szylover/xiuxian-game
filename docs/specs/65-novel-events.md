# 小说奇遇事件系统设计文档

> 版本：v0.1  
> 状态：草稿  
> 作者：@Architect

---

## 1. 概述

游戏中的 **奇遇事件** 从各大修仙小说中提取标志性元素，作为低概率高回报的特殊事件。  
每个事件与一本小说对应，触发后赋予玩家 **专属道具/被动/机制**，改变核心玩法循环。

设计原则：
- 每个事件 **独立可用**，不依赖其他小说事件
- 同一分类下的事件可以叠加，但不会冲突
- **系统流互斥**：系统流（`category: 'system'`）事件 **最多只能拥有一个**。触发新系统时，玩家必须选择替换旧系统或放弃新系统，旧系统的所有累积效果清零
- 事件触发条件与角色 **境界 / 幸运 / 属性** 挂钩，可在 `src/game/data.js` 中配置

### 境界索引对照表

| 索引 | 境界 | 寿限增加 | 阶段 |
|------|------|----------|------|
| 0 | 凡人 | — | 凡 |
| 1 | 炼气 | +50 | 凡 |
| 2 | 筑基 | +100 | 凡 |
| 3 | 金丹 | +200 | 凡 |
| 4 | 元婴 | +500 | 凡 |
| 5 | 化神 | +1000 | 凡 |
| 6 | 渡劫 | +2000 | 凡 |
| 7 | 大乘 | +5000 | 凡 |
| 8 | 散仙/地仙 | +10000 | 仙 |
| 9 | 天仙 | +50000 | 仙 |
| 10 | 金仙 | +200000 | 仙 |
| 11 | 太乙金仙 | +1000000 | 洪荒 |
| 12 | 大罗金仙 | ∞（不死不灭） | 洪荒 |
| 13 | 准圣 | ∞ | 洪荒 |
| 14 | 圣人（混元大罗金仙） | ∞ | 洪荒 |

> `triggerCondition.minRealm` 中的数字对应上表索引。  
> 索引 0–7 为「凡人修仙」阶段（Milestone A–G），8–10 为「仙道」阶段，11–14 为「洪荒」终局阶段。  
> 参考来源：《佛本是道》洪荒体系。

---

## 2. 事件完成度总览

| # | 分类 | 小说 | 事件名 | 数据设计 | 逻辑实现 | UI 展示 | 状态 |
|---|------|------|--------|----------|----------|---------|------|
| 1 | 凡人流 | 《凡人修仙传》 | 掌天瓶 | ⬜ | ⬜ | ⬜ | 未开始 |
| 2 | 凡人流 | 《仙府之缘》 | 随身仙府 | ⬜ | ⬜ | ⬜ | 未开始 |
| 3 | 凡人流 | 《紫府仙缘》 | 识海紫府 | ⬜ | ⬜ | ⬜ | 未开始 |
| 4 | 系统流 | 《最强装逼打脸系统》 | 装逼值 | ⬜ | ⬜ | ⬜ | 未开始 |
| 5 | 系统流 | 《神级采集系统》 | 神级采集 | ⬜ | ⬜ | ⬜ | 未开始 |
| 6 | 系统流 | 《最强修炼系统》 | 离线挂机 | ⬜ | ⬜ | ⬜ | 未开始 |
| 7 | 苟道流 | 《我师兄实在太稳健了》 | 纸人分身 | ⬜ | ⬜ | ⬜ | 未开始 |
| 8 | 苟道流 | 《长生从娶妻开始》 | 长生久视 | ⬜ | ⬜ | ⬜ | 未开始 |
| 9 | 苟道流 | 《苟在妖武乱世修仙》 | 龟息大法 | ⬜ | ⬜ | ⬜ | 未开始 |
| 10 | 无限流 | 《神秘复苏》 | 鬼眼 | ⬜ | ⬜ | ⬜ | 未开始 |
| 11 | 无限流 | 《轮回乐园》 | 猎杀者 | ⬜ | ⬜ | ⬜ | 未开始 |
| 12 | 无限流 | 《无限恐怖》 | 主神空间 | ⬜ | ⬜ | ⬜ | 未开始 |
| 13 | 洪荒流 | 《佛本是道》 | 都天神煞大阵 | ⬜ | ⬜ | ⬜ | 未开始 |
| 14 | 洪荒流 | 《青葫剑仙》 | 酒葫芦 | ⬜ | ⬜ | ⬜ | 未开始 |

---

## 3. 分类详细设计

### 3.1 凡人流（稳健、资源收集、炼丹）

> 核心体验：初期弱小，靠丹药和算计跨级杀敌。

#### ① 《凡人修仙传》—— 掌天瓶

| 字段 | 值 |
|------|----|
| 事件 ID | `novel_fanren_bottle` |
| 触发条件 | 境界 ≥ 炼气期；探索事件随机触发（基础概率 2%，受 `luck` 加成） |
| 获得效果 | 获得道具【掌天瓶】 |
| 机制描述 | 缩短草药生长时间；或 **每 5 轮额外获得 1 颗随机丹药** |
| 影响属性 | 间接提升丹药产出效率 |
| 数据键 | `player.items.zhangTianPing: true` |
| 被动实现 | 在 `useGameEngine` 的轮次计数器中检测：`turnCount % 5 === 0 && hasZhangTianPing → grantRandomPill()` |

#### ② 《仙府之缘》—— 随身仙府

| 字段 | 值 |
|------|----|
| 事件 ID | `novel_xianfu_mansion` |
| 触发条件 | 境界 ≥ 筑基期；探索秘境时触发（基础概率 3%） |
| 获得效果 | 开启【随身仙府】 |
| 机制描述 | 背包容量 **+20 格**；仙府内挂机经验加成 **+20%** |
| 影响属性 | `maxInventory += 20`；修炼经验乘数 `× 1.2` |
| 数据键 | `player.items.xianFu: true` |
| 被动实现 | 背包上限检测 + 修炼收益公式加入 `xianFu` 乘数项 |

#### ③ 《紫府仙缘》—— 识海紫府

| 字段 | 值 |
|------|----|
| 事件 ID | `novel_zifu_sea` |
| 触发条件 | 境界 ≥ 炼气期；打坐 / 修炼时随机触发（基础概率 1.5%，受 `comprehension` 加成） |
| 获得效果 | 获得【识海紫府】 |
| 机制描述 | 大幅提升 **神识（`mentalPower`）** 属性上限 **+50%**；战斗前 **可预知敌方全部属性** |
| 影响属性 | `maxMentalPower *= 1.5`；战斗 UI 显示敌人完整面板 |
| 数据键 | `player.items.ziFu: true` |
| 被动实现 | 战斗开始时检测 `hasZiFu`，若为 `true` 则不隐藏敌方属性面板 |

---

### 3.2 系统流（任务驱动、强行改命）

> 核心体验：不讲道理的奖励，任务失败有惩罚。  
> **互斥规则：系统流事件只能拥有一个。** 触发第二个系统时，弹出「系统替换」确认框，玩家可选择替换或放弃。替换后旧系统的累积效果（如装逼值、采集加成、离线经验）全部清零。

#### ④ 《最强装逼打脸系统》—— 装逼值

| 字段 | 值 |
|------|----|
| 事件 ID | `novel_zhuangbi_system` |
| 触发条件 | 首次击败比自己高 1 个大境界的敌人时自动触发 |
| 获得效果 | 解锁【装逼值】货币系统 |
| 机制描述 | 触发特定对话 / 击败高阶敌人 / 完成成就 → 获得装逼值；可兑换 **顶级功法**（随机） |
| 影响属性 | 新增货币 `player.zhuangbiPoints`；功法商店 UI |
| 数据键 | `player.systems.zhuangbi: { unlocked: true, points: 0 }` |
| 被动实现 | 战斗胜利 hook 中检测境界差 → 奖励装逼值；新增兑换商店面板 |

#### ⑤ 《神级采集系统》—— 神级采集

| 字段 | 值 |
|------|----|
| 事件 ID | `novel_caiji_system` |
| 触发条件 | 境界 ≥ 炼气期；击杀第 10 只妖兽后自动觉醒 |
| 获得效果 | 获得【神级采集】被动 |
| 机制描述 | 击败任何敌人后，额外触发一次 `collect()` 逻辑，**随机获得对方一项属性的 5% 作为永久加成** |
| 影响属性 | 随机 +atk / +def / +speed / +hp 等 |
| 数据键 | `player.systems.caiji: true` |
| 被动实现 | 在 `combat.js` 的胜利回调中追加 `collectEnemyStat(enemy)` |

#### ⑥ 《最强修炼系统》—— 离线挂机

| 字段 | 值 |
|------|----|
| 事件 ID | `novel_offline_system` |
| 触发条件 | 境界 ≥ 筑基期；连续修炼 20 次后触发 |
| 获得效果 | 开启【离线挂机】 |
| 机制描述 | 关闭网页后，下次登录时根据 **离线时长** 补偿经验（`localStorage` 记录离开时间戳） |
| 影响属性 | 离线经验 = `offlineMinutes × baseExpRate × 0.3` |
| 数据键 | `player.systems.offlineGrind: true` |
| 被动实现 | `useGameEngine` 初始化时检测 `lastActiveTimestamp`，计算差值，弹窗展示离线收益 |

---

### 3.3 苟道 / 稳健流（防御、逃生、低调）

> 核心体验：叠最厚的甲，跑最快的路。

#### ⑦ 《我师兄实在太稳健了》—— 纸人分身

| 字段 | 值 |
|------|----|
| 事件 ID | `novel_zhiren_clone` |
| 触发条件 | HP 首次低于 10% 时自动触发（一次性解锁） |
| 获得效果 | 获得道具【纸人分身】 |
| 机制描述 | **免疫一次致死伤害**（HP 归零时触发，HP 恢复至 30%），并 **随机传送至安全区域**；触发后进入冷却（50 轮后重新生效） |
| 影响属性 | 死亡保护 + 强制脱战 |
| 数据键 | `player.items.zhiRen: { active: true, cooldown: 0 }` |
| 被动实现 | 在 `combat.js` 死亡判定前插入 `checkZhiRenClone()` 拦截逻辑 |

#### ⑧ 《长生从娶妻开始》—— 长生久视

| 字段 | 值 |
|------|----|
| 事件 ID | `novel_changsheng_immortal` |
| 触发条件 | 寿元超过当前寿限的 80% 时有概率触发（10%） |
| 获得效果 | 获得【长生久视】被动 |
| 机制描述 | **寿元无限**（`lifespan = Infinity`），但每轮修炼速度 **降低 60%**（靠时间磨死对手） |
| 影响属性 | `lifespan → ∞`；`cultivationRate *= 0.4` |
| 数据键 | `player.passives.changSheng: true` |
| 被动实现 | 寿命检测跳过；修炼经验公式加入 `changSheng` 惩罚系数 |

#### ⑨ 《苟在妖武乱世修仙》—— 龟息大法

| 字段 | 值 |
|------|----|
| 事件 ID | `novel_guixi_stealth` |
| 触发条件 | 连续 10 轮选择「休息」时触发 |
| 获得效果 | 学会【龟息大法】 |
| 机制描述 | **降低被高级 NPC / 妖兽主动攻击的概率**（遭遇高阶敌人概率 −50%）；探索时优先触发低风险事件 |
| 影响属性 | 探索事件权重表偏移 |
| 数据键 | `player.passives.guiXi: true` |
| 被动实现 | `events.js` 随机事件加权时检测 `hasGuiXi`，高危事件权重减半 |

---

### 3.4 诸天 / 无限流（跨界、技能混搭）

> 核心体验：世界观碰撞，获得非修仙体系的技能。

#### ⑩ 《神秘复苏》—— 鬼眼

| 字段 | 值 |
|------|----|
| 事件 ID | `novel_guiyan_eye` |
| 触发条件 | 夜间（游戏内时间 18:00–06:00）探索时触发（基础概率 2%） |
| 获得效果 | 获得【鬼眼】 |
| 机制描述 | 攻击附带 **"压制"效果**（敌方攻击力降低 15%），但 **每轮扣除 2% 最大 HP** |
| 影响属性 | 攻击附加 debuff；自身持续掉血 |
| 数据键 | `player.items.guiYan: true` |
| 被动实现 | 战斗回合逻辑追加：命中后给敌方添加 `suppressed` 状态；回合结束扣除自身 HP |

#### ⑪ 《轮回乐园》—— 猎杀者

| 字段 | 值 |
|------|----|
| 事件 ID | `novel_lunhui_hunter` |
| 触发条件 | 累计击杀 BOSS 类敌人 ≥ 3 后自动觉醒 |
| 获得效果 | 获得【猎杀者】身份 |
| 机制描述 | 对阵 BOSS 类敌人时 **伤害翻倍**（`× 2.0`），且 BOSS **掉落物必为极品品质** |
| 影响属性 | BOSS 战伤害倍率 + 掉落品质锁定 |
| 数据键 | `player.passives.hunter: true` |
| 被动实现 | `combat.js` 伤害计算检测 `enemy.isBoss && hasHunter → dmg *= 2`；战利品生成强制最高品质 |

#### ⑫ 《无限恐怖》—— 主神空间

| 字段 | 值 |
|------|----|
| 事件 ID | `novel_zhushen_space` |
| 触发条件 | 境界 ≥ 金丹期；探索事件（基础概率 1%，不受 `luck` 影响） |
| 获得效果 | 触发【主神空间】—— 强制进入高难度副本 |
| 机制描述 | 强制进入一场 **3 连战**（敌人等级 = 当前境界 +1），通关后 **随机获得一项异能**（超感官 / 念动力 / 时间减速 / 肉体强化，各有独立被动效果） |
| 影响属性 | 异能列表随机抽取，永久生效 |
| 数据键 | `player.systems.zhuShen: { completed: 0, abilities: [] }` |
| 被动实现 | 触发后切换到副本战斗流程；通关后调用 `grantRandomAbility()` |

**异能表：**

| 异能 | ID | 效果 |
|------|----|------|
| 超感官 | `ability_supersense` | 闪避率 +15% |
| 念动力 | `ability_telekinesis` | 攻击力 +10%，无视部分防御 |
| 时间减速 | `ability_timeslow` | 先手值 +30 |
| 肉体强化 | `ability_bodyforge` | HP 上限 +25%，防御 +10% |

---

### 3.5 洪荒 / 古典流（因果、法宝、位阶）

> 核心体验：血统压制，法宝大于一切。

#### ⑬ 《佛本是道》—— 都天神煞大阵

| 字段 | 值 |
|------|----|
| 事件 ID | `novel_dutian_array` |
| 触发条件 | 境界 ≥ 元婴期；击败特定 BOSS（十二祖巫系列任一）后获得 |
| 获得效果 | 获得阵法【十二都天神煞大阵】 |
| 机制描述 | 群体攻击时伤害倍率 **× 10**；单体战斗无效 |
| 影响属性 | 群体战 AoE 伤害爆炸级提升 |
| 数据键 | `player.items.duTianArray: true` |
| 被动实现 | `combat.js` 群体战伤害计算追加 `hasDuTianArray → aoeDmg *= 10`；需要群体战系统支撑 |

#### ⑭ 《青葫剑仙》—— 酒葫芦

| 字段 | 值 |
|------|----|
| 事件 ID | `novel_jiuhulu_gourd` |
| 触发条件 | 境界 ≥ 筑基期；在商店 / 集市事件中随机获得（基础概率 5%） |
| 获得效果 | 获得法宝【酒葫芦】 |
| 机制描述 | 消耗灵石充能（每次 50 灵石），下一次攻击附带 **"醉酒"控制效果**：敌方 1 回合无法行动，攻击力降低 30% 持续 3 回合 |
| 影响属性 | 灵石消耗换控制 |
| 数据键 | `player.items.jiuHuLu: { owned: true, charged: false }` |
| 被动实现 | 战斗 UI 增加「灌酒」按钮（消耗灵石 → 充能）；攻击时检测充能状态 → 施加 `drunk` debuff |

---

## 4. 数据结构草案（`src/game/data.js`）

```js
export const NOVEL_EVENTS = [
  // ── 凡人流 ──
  {
    id: 'novel_fanren_bottle',
    name: '掌天瓶',
    novel: '凡人修仙传',
    category: 'fanren',        // 凡人流
    description: '获得掌天瓶，每5轮额外获得随机丹药',
    triggerCondition: { minRealm: 1, eventType: 'explore', baseChance: 0.02, luckAttr: 'luck' },
    effect: { type: 'periodic_item', interval: 5, itemPool: 'pills' },
    icon: '🏺',
  },
  {
    id: 'novel_xianfu_mansion',
    name: '随身仙府',
    novel: '仙府之缘',
    category: 'fanren',
    description: '开启随身仙府，背包+20格，挂机经验+20%',
    triggerCondition: { minRealm: 2, eventType: 'explore_dungeon', baseChance: 0.03 },
    effect: { type: 'passive', inventoryBonus: 20, expMultiplier: 1.2 },
    icon: '🏯',
  },
  {
    id: 'novel_zifu_sea',
    name: '识海紫府',
    novel: '紫府仙缘',
    category: 'fanren',
    description: '大幅提升神识，可预知敌方属性',
    triggerCondition: { minRealm: 1, eventType: 'cultivate', baseChance: 0.015, luckAttr: 'comprehension' },
    effect: { type: 'passive', mentalPowerBonus: 0.5, revealEnemy: true },
    icon: '🔮',
  },

  // ── 系统流 ──
  {
    id: 'novel_zhuangbi_system',
    name: '装逼值',
    novel: '最强装逼打脸系统',
    category: 'system',        // 系统流
    description: '解锁装逼值货币，可兑换顶级功法',
    triggerCondition: { special: 'defeat_higher_realm' },
    effect: { type: 'currency', currencyKey: 'zhuangbiPoints' },
    icon: '😎',
  },
  {
    id: 'novel_caiji_system',
    name: '神级采集',
    novel: '神级采集系统',
    category: 'system',
    description: '击败敌人后随机采集对方一项属性',
    triggerCondition: { special: 'kill_count_10' },
    effect: { type: 'on_kill', collectStatPercent: 0.05 },
    icon: '⛏️',
  },
  {
    id: 'novel_offline_system',
    name: '离线挂机',
    novel: '最强修炼系统',
    category: 'system',
    description: '关闭网页后下次登录补偿经验',
    triggerCondition: { minRealm: 2, special: 'cultivate_count_20' },
    effect: { type: 'offline', offlineExpRate: 0.3 },
    icon: '💤',
  },

  // ── 苟道流 ──
  {
    id: 'novel_zhiren_clone',
    name: '纸人分身',
    novel: '我师兄实在太稳健了',
    category: 'gou',           // 苟道流
    description: '免疫一次致死伤害并传送至安全区域',
    triggerCondition: { special: 'hp_below_10_percent' },
    effect: { type: 'death_save', hpRestore: 0.3, cooldown: 50 },
    icon: '🧻',
  },
  {
    id: 'novel_changsheng_immortal',
    name: '长生久视',
    novel: '长生从娶妻开始',
    category: 'gou',
    description: '寿元无限，但修炼速度大幅降低',
    triggerCondition: { special: 'age_above_80_percent_lifespan', baseChance: 0.10 },
    effect: { type: 'passive', infiniteLifespan: true, cultivationPenalty: 0.4 },
    icon: '♾️',
  },
  {
    id: 'novel_guixi_stealth',
    name: '龟息大法',
    novel: '苟在妖武乱世修仙',
    category: 'gou',
    description: '降低被高级NPC攻击的概率',
    triggerCondition: { special: 'rest_10_consecutive' },
    effect: { type: 'passive', dangerReduction: 0.5 },
    icon: '🐢',
  },

  // ── 无限流 ──
  {
    id: 'novel_guiyan_eye',
    name: '鬼眼',
    novel: '神秘复苏',
    category: 'infinite',      // 无限流
    description: '攻击带压制效果，但每轮扣除少量HP',
    triggerCondition: { eventType: 'explore_night', baseChance: 0.02 },
    effect: { type: 'combat_passive', suppressRate: 0.15, selfDmgPercent: 0.02 },
    icon: '👁️',
  },
  {
    id: 'novel_lunhui_hunter',
    name: '猎杀者',
    novel: '轮回乐园',
    category: 'infinite',
    description: '对BOSS伤害翻倍，掉落必为极品',
    triggerCondition: { special: 'boss_kill_3' },
    effect: { type: 'combat_passive', bossDmgMultiplier: 2.0, bossDropQuality: 'legendary' },
    icon: '🗡️',
  },
  {
    id: 'novel_zhushen_space',
    name: '主神空间',
    novel: '无限恐怖',
    category: 'infinite',
    description: '强制高难度副本，通关获得随机异能',
    triggerCondition: { minRealm: 3, eventType: 'explore', baseChance: 0.01, ignoreLuck: true },
    effect: { type: 'dungeon', waves: 3, realmOffset: 1, rewardPool: 'abilities' },
    repeatable: true,       // 可多次触发（每次获得不同异能）
    icon: '🌀',
  },

  // ── 洪荒流 ──
  {
    id: 'novel_dutian_array',
    name: '都天神煞大阵',
    novel: '佛本是道',
    category: 'honghuang',     // 洪荒流
    description: '群体攻击倍率×10',
    triggerCondition: { minRealm: 4, special: 'defeat_zuWu_boss' },
    effect: { type: 'combat_passive', aoeMultiplier: 10 },
    icon: '🌋',
  },
  {
    id: 'novel_jiuhulu_gourd',
    name: '酒葫芦',
    novel: '青葫剑仙',
    category: 'honghuang',
    description: '消耗灵石充能，下一次攻击附带醉酒控制',
    triggerCondition: { minRealm: 2, eventType: 'shop', baseChance: 0.05 },
    effect: { type: 'active_item', chargeCost: 50, debuff: 'drunk', stunTurns: 1, atkReduction: 0.3, duration: 3 },
    icon: '🍶',
  },
];

// 分类元数据
export const NOVEL_CATEGORIES = {
  fanren:   { name: '凡人流', desc: '稳健、资源收集、炼丹', color: '#4CAF50' },
  system:   { name: '系统流', desc: '任务驱动、强行改命', color: '#FF9800' },
  gou:      { name: '苟道流', desc: '防御、逃生、低调',     color: '#2196F3' },
  infinite: { name: '无限流', desc: '跨界、技能混搭',       color: '#9C27B0' },
  honghuang:{ name: '洪荒流', desc: '因果、法宝、位阶',     color: '#F44336' },
};
```

---

## 5. 触发流程

```
探索 / 修炼 / 战斗 结算
       │
       ▼
  遍历 NOVEL_EVENTS[]  （跳过已解锁且 repeatable !== true 的事件）
       │
       ├─ 若 category === 'system' 且已有其他系统 → 标记为「待替换」（命中后弹确认框）
       ├─ 检查 当前境界 ≥ minRealm？
       ├─ 检查 eventType 匹配当前操作？
       ├─ 检查 special 条件？（查询 player.tracking 中的计数器）
       │
       ▼
  通过条件 → roll(baseChance × luckMultiplier)
       │       └─ 若 ignoreLuck: true → 直接用 baseChance
       │       └─ 若 luckAttr 指定 → 用该属性代替 luck 计算乘数
       │
       ├─ 命中 → 弹出奇遇动画 → 写入 player 数据 → 日志记录
       └─ 未命中 → 静默跳过
```

---

## 6. Roadmap 前置依赖映射

每个小说事件的实现依赖于 roadmap 中的特定系统先完成：

| 事件 | 最低前置 | 可选增强前置 |
|------|----------|-------------|
| 掌天瓶 | A-1 属性, B-1 事件引擎 | C-2 丹药系统 |
| 随身仙府 | A-1 属性, B-1 事件引擎 | C-1 背包系统, E-3 秘境 |
| 识海紫府 | A-1 属性, A-3 战斗系统 | — |
| 装逼值 | A-3 战斗系统, A-4 境界突破 | D-1 功法系统, C-4 商店 |
| 神级采集 | A-3 战斗系统 | — |
| 离线挂机 | A-2 修炼系统 | — |
| 纸人分身 | A-3 战斗系统 | E-1 地图系统 |
| 长生久视 | A-5 寿命系统 | — |
| 龟息大法 | B-1 事件引擎 | — |
| 鬼眼 | A-3 战斗系统 | A-5 寿命系统 |
| 猎杀者 | A-3 战斗系统, E-3 秘境 BOSS | — |
| 主神空间 | A-3 战斗系统, E-3 秘境 | — |
| 都天神煞大阵 | A-3 战斗系统（需群体战扩展） | — |
| 酒葫芦 | A-3 战斗系统 | C-4 商店系统 |

> 标注为「可选增强前置」的系统不存在时，事件可降级运行（如背包系统不在时，随身仙府仅提供经验加成）。

---

## 7. 玩家追踪状态结构（`player.tracking`）

部分事件使用 `special` 条件触发，需要在玩家数据中维护对应计数器：

```js
// player.tracking — 特殊触发条件追踪
player.tracking = {
  killCount: 0,              // 总击杀数（神级采集: kill_count_10）
  bossKillCount: 0,          // BOSS 击杀数（猎杀者: boss_kill_3）
  consecutiveRests: 0,       // 连续休息轮数（龟息大法: rest_10_consecutive）
  consecutiveCultivates: 0,  // 连续修炼次数（离线挂机: cultivate_count_20）
  hasBeenBelow10Hp: false,   // 是否曾低于 10% HP（纸人分身: hp_below_10_percent）
  defeatedHigherRealm: false,// 是否击败过高境界敌人（装逼值: defeat_higher_realm）
};
```

> 每次操作结算后更新对应计数器。选择非连续操作时重置对应的 `consecutive*` 字段。

---

## 8. 后续扩展预留

- 每个分类可继续追加更多小说事件（目标：每类 5–8 个）
- 支持事件进阶/升级（如掌天瓶 Lv.1 → Lv.2 → Lv.3，效果递增）
- 部分事件可相互联动（如集齐同分类 3 个 → 解锁分类终极被动）
- 事件图鉴 UI：展示已解锁 / 未解锁事件，附带小说介绍和原著彩蛋
