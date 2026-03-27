# 设计文档：技能战斗

任务：T0018
日期：2026-03-27

## 概述

当前战斗系统（`combat.ts`）中，功法仅以**被动加成**方式生效——`getActiveTechniqueBonus()` 在战斗开始时将攻防速暴等属性叠加到玩家身上，战斗回合本身仍是普通攻击的交换。

本任务为战斗回合引入**主动技能释放**机制：
- 玩家每回合有概率使用当前激活功法的主动技能，消耗灵力（MP），造成更高伤害或附带特殊效果
- 功法类型与玩家武器资质匹配时获得额外加成
- Phase 1 采用随机释放策略；预留智能策略接口供后续扩展

## 数据结构

### 1. 新增 `TechniqueActiveSkill` 接口（`types.ts`）

```ts
/** 功法主动技能定义 */
export interface TechniqueActiveSkill {
  name: string;                     // 技能名称，如"疾风三剑"
  description: string;              // 技能描述
  mpCost: number;                   // 基础灵力消耗
  staminaCost: number;              // 基础精力消耗（每次释放额外扣精力）
  dmgMultiplier: number;            // 伤害倍率（相对普通攻击，如 1.5 = 150%）
  hitCount: number;                 // 攻击段数（多段攻击，每段独立判定暴击/闪避）
  cooldown: number;                 // 冷却回合数（0 = 无冷却）
  triggerRate: number;              // AI 随机释放概率（0~1，Phase 1 使用）
  effect?: {                        // 附加效果（可选）
    type: 'dot' | 'debuff_def' | 'debuff_atk' | 'heal_self';
    value: number;                  // 效果值（dot=每回合伤害, debuff=减少值, heal=恢复量）
    duration: number;               // 持续回合数
  };
}
```

### 2. 扩展 `TechniqueDef`（`types.ts`）

在现有 `TechniqueDef` 接口末尾新增可选字段：

```ts
export interface TechniqueDef {
  // ...现有字段不变...
  activeSkill?: TechniqueActiveSkill;  // 主动技能定义（无则该功法只有被动加成）
}
```

### 3. 新增 `SkillState` 内部类型（`combat.ts`）

战斗循环内部使用，不导出：

```ts
/** 战斗中的技能状态 */
interface SkillState {
  cooldownLeft: number;             // 剩余冷却回合
  totalMpUsed: number;              // 本场战斗累计消耗灵力
}
```

### 4. 扩展 `CombatResult`

```ts
export interface CombatResult {
  // ...现有字段不变...
  mpUsed: number;                   // 本场战斗消耗的灵力总量
  skillUseCount: number;            // 技能释放次数
}
```

## 游戏逻辑方案（@Dev）

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | 新增 `TechniqueActiveSkill` 接口；`TechniqueDef` 增加 `activeSkill?` 字段 | 数据驱动，功法可选挂载主动技能 |
| `src/game/combat.ts` | 重构 `runCombat()`，新增 `calcSkillDamage()`、`tryUseSkill()` | 核心战斗逻辑改造 |
| `src/game/technique.ts` | 新增 `getActiveSkillInfo()` 辅助函数 | 提供战斗模块查询当前激活功法的主动技能信息 |
| `src/hooks/useCoreActions.ts` | `fight()` 回调处理 `CombatResult.mpUsed` | 战斗后扣减玩家 MP |
| `src/data/core-techniques.json` | 为现有功法添加 `activeSkill` 字段 | 填充技能数据 |

### 关键函数设计

#### `getActiveSkillInfo(player)`（technique.ts）

```
输入: Player
输出: { def: TechniqueDef, slot: TechniqueSlot, skill: TechniqueActiveSkill } | null
逻辑:
  1. 查找 activeTechniqueId 对应的 TechniqueDef
  2. 若 def.activeSkill 存在，返回三元组
  3. 否则返回 null
```

#### `calcAptitudeBonus(player, techniqueDef)`（technique.ts 或 combat.ts）

```
输入: Player, TechniqueDef
输出: number（资质加成系数，1.0~2.0）
逻辑:
  aptitude = player.aptitudes[def.aptitudeKey]    // 0~100
  bonus = 1.0 + aptitude / 200                    // 50资质→1.25, 100资质→1.5
  return bonus
```

资质加成说明：
- 资质 0 → 系数 1.0（无加成）
- 资质 50 → 系数 1.25（+25%）
- 资质 100 → 系数 1.50（+50%）

#### `tryUseSkill(player, skillState, combatant)`（combat.ts 内部）

```
输入: 玩家 Combatant（含 mp 信息）, SkillState, TechniqueActiveSkill
输出: { useSkill: boolean, reason?: string }
逻辑:
  1. 若 skillState.cooldownLeft > 0 → 冷却中，不使用
  2. 若 remainingMp < skill.mpCost → 灵力不足，不使用
  3. 以 skill.triggerRate 概率决定是否释放
  4. 返回是否使用
```

#### `calcSkillDamage(attacker, defender, skill, aptitudeBonus)`（combat.ts 内部）

```
输入: 攻击者 Combatant, 防御者 Combatant, TechniqueActiveSkill, aptitudeBonus
输出: DamageResult（复用现有结构）
逻辑:
  for each hit in skill.hitCount:
    baseDmg = attacker.atk × rand(0.85, 1.15) × skill.dmgMultiplier × aptitudeBonus
    减防 → 暴击判定 → 闪避判定（复用现有 calcDamage 思路）
  累加伤害，生成日志
```

#### `runCombat(player, monster)` 改造

```
现有流程:
  1. 叠加功法被动加成 ← 保留不变
  2. 先手判定 ← 保留不变
  3. 每回合双方交替普通攻击 ← 改造

改造后每回合玩家行动:
  1. tryUseSkill() 判定是否使用技能
  2a. 若使用技能:
      - 消耗 MP（从 availableMp 扣减）
      - 消耗精力（从 availableStamina 扣减，但不影响行动，精力耗尽时技能不可用）
      - calcSkillDamage() 计算伤害
      - 进入冷却
      - 处理附加效果（dot/debuff）
      - 日志输出：「你使出 [功法名·技能名]，造成 X 点伤害！（灵力-Y）」
  2b. 若不使用技能:
      - calcDamage() 正常普通攻击 ← 现有逻辑不变
  3. 怪物行动 ← 现有逻辑不变
  4. 处理持续效果（dot 伤害、debuff 到期移除等）
  5. 回合结束，冷却减 1

结算:
  - CombatResult 携带 mpUsed、skillUseCount
  - 战斗结束后，上层 Hook 从 player.mp 中扣减 mpUsed
```

### 公式汇总

| 公式 | 表达式 | 说明 |
|------|--------|------|
| 技能基础伤害 | `atk × rand(0.85, 1.15) × dmgMultiplier × aptitudeBonus` | 每段独立浮动 |
| 资质加成 | `1.0 + aptitude / 200` | 0~100 → 1.0~1.5 |
| 减防 | `max(1, dmg - def × 0.6)` | 复用现有 |
| 暴击 | `dmg × critDmgMultiplier`，概率 = `max(0, critRate - critResist)` | 复用现有，每段独立判定 |
| 闪避 | `moveSpeed / (moveSpeed + 100)` | 复用现有，每段独立判定 |
| MP 消耗 | `skill.mpCost`（固定值，不随等级变化） | 简单模型，后续可扩展 |
| 精力消耗 | `skill.staminaCost`（释放技能额外消耗） | 精力归零后技能不可释放 |

### 边界情况

- **无激活功法或功法无主动技能**：退化为现有逻辑，无行为变化
- **MP 不足**：自动降级为普通攻击，日志不提示
- **精力不足**：技能不可释放，降级为普通攻击
- **多段攻击中目标死亡**：剩余段数不再计算（提前跳出）
- **冷却中**：普通攻击替代，无日志提示
- **战斗超时（30 回合）**：技能的 MP/精力消耗仍然计入
- **附加效果（dot/debuff）**：dot 伤害无视防御直接扣 HP；debuff 到期自动恢复

### 智能策略预留

Phase 1 使用 `triggerRate` 随机决策。预留 `SkillStrategy` 接口供后续 T0020（神通）扩展：

```ts
// 预留，Phase 1 不实现
type SkillStrategy = 'random' | 'smart';  
// 'smart' 策略：MP 低时不放技能、boss 战优先大招、多段攻击用于残血收割等
```

## UI 方案（@Designer）

### 日志展示

无需新增面板。战斗日志中自然呈现技能使用信息：

| 场景 | 日志示例 |
|------|----------|
| 释放技能 | `⚔️ 你使出【疾风剑法·疾风三剑】，连斩 3 次，造成 156 点伤害！（灵力-15）` |
| 暴击段 | `💥 第 2 段暴击！造成 78 点伤害！` |
| 被闪避段 | `💨 第 3 段被闪避！` |
| 普通攻击（MP 不足） | 现有日志不变 |
| 持续伤害 | `🔥 [野狼] 受到灼烧伤害 20 点！` |

### 战斗结算

在战斗结果消息中增加一行，展示灵力消耗和技能使用情况：

```
🎉 你击败了 野狼！
获得 15 修为，5 灵石。
📖 本场使用技能 3 次，消耗灵力 45 点。
```

### 状态栏

现有 StatusBar 中已展示 MP，战斗后 MP 自动减少即可，无需额外 UI 改动。

## 技能数据设计（@Content）

为 `core-techniques.json` 中的现有功法添加 `activeSkill` 字段。参考数值：

| 功法 | 技能名 | MP消耗 | 精力消耗 | 倍率 | 段数 | 冷却 | 触发率 | 附加效果 |
|------|--------|--------|----------|------|------|------|--------|----------|
| 基础剑法 | 三才剑诀 | 8 | 3 | 1.3 | 1 | 0 | 0.35 | — |
| 基础刀法 | 劈山斩 | 10 | 4 | 1.5 | 1 | 1 | 0.30 | — |
| 基础拳法 | 连环拳 | 8 | 3 | 1.0 | 3 | 1 | 0.30 | — |
| 基础掌法 | 柔云掌 | 8 | 3 | 1.2 | 1 | 0 | 0.35 | heal_self: 15, 1回合 |
| 基础指法 | 一阳指 | 10 | 3 | 1.4 | 1 | 1 | 0.30 | — |
| 基础枪法 | 破阵枪 | 10 | 4 | 1.4 | 1 | 0 | 0.30 | debuff_def: 3, 2回合 |
| 疾风剑法 | 疾风三剑 | 15 | 5 | 1.2 | 3 | 2 | 0.35 | — |
| 铁拳功 | 崩山拳 | 15 | 5 | 1.8 | 1 | 2 | 0.30 | debuff_def: 5, 2回合 |
| 雷霆刀法 | 天雷斩 | 25 | 8 | 2.0 | 1 | 3 | 0.25 | dot: 30, 3回合 |
| 幻影掌 | 幻影连击 | 20 | 6 | 1.0 | 5 | 3 | 0.25 | — |
| 天罡剑诀 | 万剑归宗 | 40 | 12 | 1.5 | 4 | 4 | 0.20 | dot: 50, 3回合 |
| 龙吟枪法 | 龙吟贯日 | 35 | 10 | 2.5 | 1 | 4 | 0.20 | debuff_atk: 20, 3回合 |

设计原则：
- **低品质功法**：低消耗、低倍率、低/无冷却，高触发率 → 频繁使用
- **高品质功法**：高消耗、高倍率、长冷却，低触发率 → 关键时刻爆发
- **段数 > 1 的技能**：单段倍率偏低，但总伤害可观 + 多次暴击/闪避判定增加随机性
- **附加效果**：掌法偏回复，刀法/枪法偏破防，剑法偏持续伤害

## 验证方式

1. **无功法战斗**：未学功法或激活功法无 `activeSkill` → 战斗行为与当前完全一致（回归测试）
2. **技能释放**：学习并激活有 `activeSkill` 的功法 → 战斗日志出现技能名称和灵力消耗
3. **MP 扣减**：战斗结束后检查 StatusBar 中的灵力值是否减少
4. **MP 耗尽降级**：将 MP 降至 0 后战斗 → 全程普通攻击，无技能释放
5. **冷却验证**：冷却 > 0 的技能 → 释放后连续若干回合不再触发
6. **多段攻击**：使用连环拳/疾风三剑 → 日志显示多段伤害
7. **资质加成**：高资质 vs 低资质角色同一功法 → 对比技能伤害应有明显差异
8. **附加效果**：使用破阵枪 → 日志显示敌方防御降低；使用天雷斩 → 日志显示每回合持续伤害
9. **精力消耗**：精力耗尽后技能不再释放

## 依赖关系

- **前置任务**：T0003（战斗 v2）✅、T0017（功法系统）✅
- **后续任务**：T0020（神通/元素体系）依赖本任务
