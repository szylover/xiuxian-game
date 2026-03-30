# 设计文档：战斗弹窗 UI 重做（头像 + 血条 + 可视化）+ 妖兽 DLC 化

任务：T0046
日期：2026-03-30

## 概述

本任务包含两部分：

1. **战斗弹窗 UI 重做** — 从纯文本日志升级为可视化战斗 UI：顶部双方头像 + HP/MP 条对阵，中间保留回合日志，底部操作按钮。HP/MP 条按回合实时变化。设计需预留扩展性。
2. **妖兽数据 DLC 化重构** — 将 `data.ts` 中硬编码的 `MONSTERS[]` 迁移到 DLC 注册表，通过 `registerDLC()` 挂载，遵循项目"系统 ≠ 内容"原则。

---

## Part A：妖兽数据 DLC 化重构

### 现状问题

`src/game/data.ts` 中的 `MONSTERS` 数组是硬编码的，不符合项目"数据驱动 + DLC 扩展"原则。其他内容（物品/装备/配方/功法/死因等）均已通过 `registerDLC()` 注册，唯独妖兽还在用导出常量。

### 改动方案

#### 1. 新增 Monster 注册表

```ts
// registry/stores.ts 新增
export const monsterRegistry = new Map<string, MonsterDef>();
```

#### 2. DLCPack 新增 monsters 字段

```ts
// types.ts DLCPack 扩展
export interface DLCPack {
  // ... 现有字段 ...
  monsters?: MonsterDef[];    // 该 DLC 提供的妖兽定义
}
```

#### 3. MonsterDef 新类型（含 id + emoji）

```ts
// types.ts 或 data.ts 新增
export interface MonsterDef {
  id: string;           // 'core:wild_wolf'
  name: string;
  emoji: string;        // '🐺'
  realmIndex: number;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  moveSpeed: number;
  critRate: number;
  critResist: number;
  critDmgMultiplier: number;
  expReward: number;
  goldReward: number;
}
```

#### 4. 注册 & 查询 API

```ts
// registry/dlc.ts — registerDLC 新增
if (pack.monsters) for (const m of pack.monsters) monsterRegistry.set(m.id, m);

// registry/queries.ts 新增
export function getMonster(id: string): MonsterDef | undefined;
export function getAllMonsters(): MonsterDef[];
export function getMonstersByRealm(realmIndex: number): MonsterDef[];
```

#### 5. 核心 DLC 注册

将 `data.ts` 中的 `MONSTERS` 改为 `core-monsters` 数据文件（JSON 或 TS 常量），在 `events.ts` 的 `CORE_DLC_PACK` 中通过 `monsters: CORE_MONSTERS` 注册。

#### 6. 消费方迁移

| 消费方 | 改动 |
|--------|------|
| `useCoreActions.ts` fight() | `MONSTERS.filter(...)` → `getAllMonsters().filter(...)` |
| `combat/run.ts` | `Monster` 类型 → `MonsterDef` |
| `combat/damage.ts` | `Combatant` 接口兼容 `MonsterDef` 字段 |

#### 7. 保持 `data.ts` 中的非内容数据

`REALMS`、`ACTION_COSTS`、`MONTH_NAMES` 等系统级常量**保留**在 `data.ts`，不做 DLC 化——它们是系统规则而非内容。

### 改动文件汇总

| 文件 | 改动 |
|------|------|
| `src/game/types.ts` | 新增 `MonsterDef` 接口；`DLCPack` 增加 `monsters?` 字段 |
| `src/game/data.ts` | 移除 `MONSTERS` 导出；保留 `Monster` 接口为 `MonsterDef` 别名（向后兼容） |
| `src/game/registry/stores.ts` | 新增 `monsterRegistry` |
| `src/game/registry/dlc.ts` | `registerDLC` / `unregisterDLC` 处理 `monsters` |
| `src/game/registry/queries.ts` | 新增 `getMonster` / `getAllMonsters` / `getMonstersByRealm` |
| `src/game/registry/index.ts` | 导出新查询函数 |
| `src/game/events.ts` | `CORE_DLC_PACK` 增加 `monsters: CORE_MONSTERS` |
| `src/hooks/useCoreActions.ts` | `MONSTERS` → `getAllMonsters()` |

---

## Part B：战斗弹窗 UI 重做

## 现状分析

### 已有数据

| 数据 | 来源 | 说明 |
|------|------|------|
| 玩家战前 HP/MP | `CombatModalState.playerHpBefore/playerMpBefore` | ✅ 已有 |
| 玩家战后 HP | `CombatResult.playerHpLeft` | ✅ 已有 |
| 怪物初始 HP | `MonsterDef.hp`（注册表） | ✅ 通过 ID 查询 |
| 回合日志 | `CombatResult.logs[]` | ✅ 已有，按 `── 第 X 回合 ──` 分组 |
| 玩家头像 | `player.avatar` → Avatar 组件 | ✅ 已有 |
| 怪物头像 | `MonsterDef.emoji` | ✅ Part A 新增 |
| 每回合 HP/MP 快照 | ❌ combat engine 不产出 | **需新增** |

### 需新增的数据

1. **`RoundSnapshot[]`** — 每回合结束时的 HP/MP 快照，附加到 `CombatResult`

## 数据结构

### 新增类型：`RoundSnapshot`

```ts
// combat/types.ts 新增
interface RoundSnapshot {
  round: number;        // 回合序号（从 1 开始）
  playerHp: number;     // 该回合结束后玩家 HP
  playerMp: number;     // 该回合结束后玩家 MP（= availableMp）
  monsterHp: number;    // 该回合结束后怪物 HP
}
```

### 扩展 `CombatResult`

```ts
// combat/types.ts 修改
interface CombatResult {
  // ... 现有字段 ...
  snapshots: RoundSnapshot[];       // 新增：每回合结束快照
  monsterMaxHp: number;             // 新增：怪物最大 HP（用于血条百分比）
  playerMaxHp: number;              // 新增：玩家最大 HP（含功法加成）
  playerMaxMp: number;              // 新增：玩家最大 MP
}
```

> **注意**：Monster 的 `emoji` 字段和 DLC 化已在 Part A 中定义，此处不再重复。

## 游戏逻辑方案（@Dev）

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | 新增 `MonsterDef` 接口、`RoundSnapshot` 接口；`DLCPack` 增加 `monsters?`；`CombatResult` 增加 `snapshots`、`monsterMaxHp`、`playerMaxHp`、`playerMaxMp` | Part A + Part B 数据层 |
| `src/game/data.ts` | 移除 `MONSTERS` 导出常量；`Monster` 改为 `MonsterDef` 别名 | DLC 化迁移 |
| `src/game/registry/stores.ts` | 新增 `monsterRegistry` | 妖兽注册表 |
| `src/game/registry/dlc.ts` | `registerDLC` / `unregisterDLC` 处理 `monsters` | DLC 注册 |
| `src/game/registry/queries.ts` | 新增 `getMonster()` / `getAllMonsters()` / `getMonstersByRealm()` | 查询 API |
| `src/game/registry/index.ts` | 导出新查询函数 | barrel |
| `src/game/events.ts` | `CORE_DLC_PACK` 增加 `monsters: CORE_MONSTERS`（含 emoji 字段） | 核心 DLC 注册妖兽 |
| `src/game/combat/types.ts` | 新增 `RoundSnapshot` 接口；`CombatResult` 增加新字段 | 为 UI 提供每回合 HP/MP 数据 |
| `src/game/combat/run.ts` | 每回合末尾记录快照；返回值补充新字段；`Monster` → `MonsterDef` | 生产快照 + 类型迁移 |
| `src/game/combat/damage.ts` | `Combatant` 兼容 `MonsterDef` 字段 | 类型一致性 |
| `src/hooks/useGameEngine.ts` | `CombatModalState` 新增 `monsterEmoji`、`playerAvatar`、`playerName`、`playerMaxHp`、`playerMaxMp`、`monsterMaxHp`、`snapshots` 字段 | 传递给 CombatModal |
| `src/hooks/useCoreActions.ts` | `MONSTERS` → `getAllMonsters()`；`onCombatResult` 传递怪物 emoji、玩家信息 | DLC 化 + 数据桥接 |
| `src/components/shared/CombatModal.tsx` | **重写**为可视化战斗弹窗（分拆子组件） | 核心 UI 变更 |

### 新增文件

| 文件 | 用途 | 关键组件 |
|------|------|----------|
| `src/components/shared/combat/CombatHeader.tsx` | 顶部对阵区：双方头像 + 名字 + HP/MP 条 | `<CombatHeader>` |
| `src/components/shared/combat/CombatBattleLog.tsx` | 中间日志区：回合分组 + 逐回合显示 + 富文本 | `<CombatBattleLog>` |
| `src/components/shared/combat/CombatFooter.tsx` | 底部按钮区 | `<CombatFooter>` |
| `src/components/shared/combat/HpBar.tsx` | 通用 HP/MP 条组件（带动画过渡） | `<HpBar>` |

> CombatModal.tsx 保留为入口组件，组合上述子组件。日志富文本渲染函数 `renderLogLine` 和分组函数 `groupByRound` 迁移到 `CombatBattleLog.tsx`。

### 数据流

```
combat engine (run.ts)
  → CombatResult { logs[], snapshots[], monsterMaxHp, playerMaxHp, playerMaxMp }
  → useCoreActions (收集 hpBefore, mpBefore, monsterEmoji, playerAvatar, playerName)
  → useGameEngine (构造 CombatModalState)
  → CombatModal (消费 state)
    → CombatHeader (读 snapshots[visibleRound] 更新 HP/MP 条)
    → CombatBattleLog (读 logs 分组渲染)
    → CombatFooter (跳过/下一步/确认)
```

### run.ts 快照采集点

在 `run.ts` 的 while 循环中，每回合末尾（处理完持续效果、冷却递减之后）追加：

```ts
snapshots.push({
  round,
  playerHp: Math.max(0, pHp),
  playerMp: availableMp,
  monsterHp: Math.max(0, mHp),
});
```

初始快照（round=0）在循环前记录：

```ts
snapshots.push({
  round: 0,
  playerHp: pHp,
  playerMp: availableMp,
  monsterHp: mHp,
});
```

## UI 方案（@Designer）

### 战斗弹窗布局（Phase: battle）

```
┌──────────────────────────────────────────────────┐
│ ⚔️ 战斗                                          │
├──────────────────────────────────────────────────┤
│                                                  │
│  [玩家头像]  玩家名       VS     怪物名  [怪物emoji] │
│  ❤️ ████████░░ 85/100           ❤️ ██████░░ 60/80  │
│  🔮 ██████░░░░ 40/60                               │
│                                                  │
├──────────────────────────────────────────────────┤
│  ── 第 1 回合 ──                                  │
│  你 攻击 野狼，造成 12 点伤害！                     │
│  野狼 攻击 你，造成 8 点伤害！                      │
│  ── 第 2 回合 ──                                  │
│  你 使出【xxx】，造成 25 点伤害！暴击！              │
│  ...                                             │
├──────────────────────────────────────────────────┤
│              [ 跳过 ▶▶ ]                          │  ← 动画播放中
│    [ 查看战利品 ▶ ] 或 [ 确认 ]                    │  ← 动画结束后
└──────────────────────────────────────────────────┘
```

### 对阵区详细设计

- **左侧（玩家）**：复用 Avatar 组件（缩小版 size=56），下方显示道号，HP 条（红）+ MP 条（蓝）
- **中间**：`VS` 文字 + 闪光效果（CSS animation）
- **右侧（怪物）**：emoji 显示在圆形容器中（56×56），下方显示怪物名，HP 条（红）
- HP/MP 条使用 CSS `transition: width 0.5s ease` 实现平滑过渡
- 条上叠加文字 `当前/最大`

### HP/MP 条组件 `<HpBar>`

```
Props:
  current: number    — 当前值
  max: number        — 最大值
  color: string      — 条颜色（红/蓝）
  label?: string     — 可选标签（❤️ / 🔮）
  showText?: boolean — 是否显示数值文字（默认 true）
  animate?: boolean  — 是否启用过渡动画（默认 true）
```

### 逐回合驱动 HP 条

- `CombatHeader` 接收 `snapshots[]` 和 `currentRound`（= `visibleRounds`）
- `currentRound` 变化时读取对应快照，更新各 HP/MP 条的 `current` 值
- Round 0 = 初始状态（战斗开始前）
- CSS transition 自动产生动画效果

### 结果状态

- **胜利时**：怪物 HP 条归零，条颜色变灰，emoji 加灰度滤镜
- **失败时**：玩家 HP 条归零，条颜色变灰
- **平局时**：双方正常显示

### 战利品界面（Phase: loot）

保持现有设计不变（已经够好），仅微调样式以匹配新的弹窗宽度。

### 交互

- 回合日志仍保留逐回合显示（ROUND_INTERVAL = 800ms）
- 每显示一组回合日志，顶部 HP/MP 条同步更新
- 「跳过 ▶▶」按钮立即显示所有回合 + HP 条跳到最终值
- 自动滚动到最新日志

### 扩展性预留

1. **组件插槽**：CombatModal 采用子组件组合，后续可在 Header 和 Log 之间插入"技能选择栏"或"BUFF 状态栏"
2. **HpBar 通用化**：独立组件，可复用于 Boss 战、副本进度等
3. **怪物 emoji → 图片**：emoji 容器预留 `<img>` fallback，后续可替换为 SVG/PNG
4. **CombatResult 扩展**：`snapshots[]` 结构简单可扩展，后续可加 `buffs[]`、`skillUsed` 等

## 验证方式

1. 开始游戏，精力充足时点击「战斗」
2. 弹窗顶部应显示玩家头像 + 道号 + HP条 + MP条，右侧显示怪物 emoji + 名字 + HP条
3. 回合日志逐组显示，每显示一组，顶部 HP/MP 条平滑变化
4. 点击「跳过」→ 所有回合立即展示，HP 条跳到最终值
5. 胜利时显示「查看战利品 ▶」，失败时直接显示「确认」
6. 战利品界面保持正常

### 测试用例

| # | 场景 | 操作 | 预期 |
|---|------|------|------|
| 1 | 正常战斗（胜利） | 点击战斗 | 弹窗显示双方头像 + HP条 + 回合日志，HP条逐回合变化，胜利后可查看战利品 |
| 2 | 战斗失败 | 战斗低境界 vs 高境界怪 | 玩家 HP 条归零，显示「确认」按钮，无战利品入口 |
| 3 | 跳过动画 | 战斗中点「跳过」 | 所有回合立即展示，HP条跳到最终值 |
| 4 | 技能战斗 | 装备功法后战斗 | MP 条随技能释放下降，日志中技能行金色高亮 |
| 5 | 30 回合超时 | Debug 面板调低攻击 | 双方 HP 条停在非零值，显示平局 |

## 调试面板需求

无需更新 Debug 面板。现有的属性修改 + 物品添加已足够测试战斗场景。

## 依赖关系

- **前置**：T0003（战斗系统 v2）✅、T0044（战斗弹窗）✅、T0041（布局改版，Avatar 组件）✅
- **后续**：可为 T0020（神通）、T0023（秘境）提供可视化战斗基础
