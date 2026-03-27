# 设计文档：年月历法系统

任务：T0042
日期：2026-03-27

## 概述

添加游戏内历法系统，将时间流逝从连续浮点数改为离散的年/月制。一年 12 个月，每次行动（修炼/战斗/探索/炼丹/休息）统一消耗 1 个月。状态栏显示当前年月，与现有寿命系统无缝整合。

## 时间模型

### 基本规则

| 概念 | 值 |
|------|-----|
| 1 年 | 12 个月 |
| 1 个月 | 4 周（叙事用，不再细分） |
| 每次行动耗时 | 1 个月 |
| 起始年龄 | 16 岁 |
| 起始月 | 一月（gameMonth = 1） |

### 月份名称

使用中文月份名：一月、二月、三月 … 十二月。可定义常量数组：

```
MONTH_NAMES = ['一月','二月','三月','四月','五月','六月',
               '七月','八月','九月','十月','十一月','十二月']
```

## 数据结构

### Player 接口新增字段

```ts
interface Player {
  // ... 现有字段 ...
  gameYear: number;   // 游戏内历法年份，从 1 开始
  gameMonth: number;  // 当前月份，1-12
}
```

### 初始值（createPlayer）

```ts
gameYear: 1,
gameMonth: 1,
```

### age 与历法的关系

- `age` 保持现有语义（实际年龄，浮点数，用于寿命判定）
- 每次行动：`age += 1/12`（即一个月）
- `gameMonth++`，若 `gameMonth > 12` 则 `gameYear++, gameMonth = 1`
- **不从 age 反算 year/month**，避免浮点误差；year/month 独立维护

### ACTION_COSTS 变更

所有行动的 `time` 统一改为 `1`，`time` 的语义从"年"改为"月"：

```ts
// 旧
cultivate: { stamina: 10, time: 0.1 },
explore:   { stamina: 15, time: 0.05 },
combat:    { stamina: 20, time: 0.02 },
alchemy:   { stamina: 10, time: 0.05 },
rest:      { stamina: 0,  time: 0.01 },

// 新：time 单位改为"月"（1 月 = 1/12 年）
cultivate: { stamina: 10, time: 1 },
explore:   { stamina: 15, time: 1 },
combat:    { stamina: 20, time: 1 },
alchemy:   { stamina: 10, time: 1 },
rest:      { stamina: 0,  time: 1 },
```

> 为 `ActionCost` 类型添加注释说明 `time` 单位为"月"。

## 游戏逻辑方案（@Dev）

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/player/types.ts` | Player 接口新增 `gameYear: number`, `gameMonth: number` | 存储历法状态 |
| `src/game/player/create.ts` | 初始化 `gameYear: 1, gameMonth: 1` | 新角色初始值 |
| `src/game/data.ts` | 所有 `ACTION_COSTS.time` 改为 `1`；添加 `MONTH_NAMES` 常量；`ActionCost.time` 注释说明单位为月 | 统一行动耗时 |
| `src/hooks/useGameEngine.ts` | `advanceTime` 函数：用 `cost.time` 推进 `gameMonth/gameYear`，`age += cost.time / 12`；旧存档兼容（无 `gameYear` 时补默认值） | 核心时间推进逻辑 |
| `src/components/hud/StatusBar.tsx` | 显示"第X年 X月"替换原有 `age.toFixed(1)` | 前端展示 |

### 公式

- 年龄推进：`age += actionTime / 12`（actionTime 为月数，通常为 1）
- 月份推进：`gameMonth += actionTime`；若 `gameMonth > 12`，则 `gameYear += Math.floor((gameMonth - 1) / 12)`，`gameMonth = ((gameMonth - 1) % 12) + 1`
- 寿命判定不变：`age >= lifespan` 时游戏结束

### 旧存档兼容

在 `loadSave()` 中添加向后兼容：
```ts
if (!p.gameYear) {
  // 从现有 age 推算
  const elapsedYears = p.age - 16; // 16 为默认起始年龄
  p.gameYear = Math.floor(elapsedYears) + 1;
  p.gameMonth = Math.floor((elapsedYears - Math.floor(elapsedYears)) * 12) + 1;
  if (p.gameMonth < 1) p.gameMonth = 1;
  if (p.gameMonth > 12) p.gameMonth = 12;
}
```

### 对现有系统的影响

| 系统 | 影响 | 说明 |
|------|------|------|
| 修炼 | 耗时从 0.1 年改为 1 月 | 略微变慢（原 0.1 年 ≈ 1.2 月 → 1 月），影响不大 |
| 战斗 | 耗时从 0.02 年改为 1 月 | 显著变慢（原约 0.24 月 → 1 月），需关注平衡 |
| 探索 | 耗时从 0.05 年改为 1 月 | 从约 0.6 月 → 1 月 |
| 炼丹 | 耗时从 0.05 年改为 1 月 | 同上 |
| 休息 | 耗时从 0.01 年改为 1 月 | 显著变慢（原约 0.12 月 → 1 月），休息代价更大 |
| 寿命系统 | 无变化 | 仍用 `age >= lifespan` 判定 |
| 突破/渡劫 | 不受影响 | 突破不走 `advanceTime`，无时间消耗 |
| 事件系统 | 不受影响 | 日常事件仍在 `advanceTime` 中触发 |
| 存档系统 | 需兼容旧存档 | 缺少 `gameYear/gameMonth` 时自动补算 |

> **平衡说明**：统一为每月一次行动后，玩家每年可执行 12 次行动。起始寿命 100 岁、起始年龄 16 岁，总共有 (100-16)×12 = 1008 次行动机会（凡人阶段）。原系统中修炼约 840 次就耗尽寿命，战斗约 4200 次。统一后所有行动变为 1008 次，战斗代价显著上升，这使得时间管理成为重要策略。如果觉得战斗/休息过于昂贵，后续可考虑引入"快速行动"消耗半月，但本任务不做此扩展。

## UI 方案（@Designer）

### 修改界面

| 元素 | 位置 | 变更 |
|------|------|------|
| StatusBar 年龄显示 | 顶部状态栏 | 原 `📅 16.1/100` → `📅 第1年 三月 (16岁/100)` |

### 显示格式

状态栏年龄区域改为：
```
📅 第1年 一月 (16岁/100)
```

- "第X年"：`gameYear`
- "X月"：`MONTH_NAMES[gameMonth - 1]`
- "(16岁/100)"：`Math.floor(age)岁/${lifespan}`，保持寿命可见

### 交互

- 无新增交互，纯展示变更
- 鼠标 hover title 显示完整信息："第X年 X月 | 年龄 XX.X 岁 | 寿限 XXX 岁"

## 验证方式

1. 新建角色，确认状态栏显示"第1年 一月 (16岁/100)"
2. 进行一次修炼，确认月份变为二月，年龄变为 16.08（≈16 + 1/12）
3. 连续行动 12 次，确认年份从第1年变为第2年，月份回到一月
4. 确认寿元耗尽时游戏仍正常结束
5. 用旧存档加载，确认 `gameYear/gameMonth` 正确补算
6. 检查日志中时间相关文字无异常

## 依赖关系

- **前置任务**：T0001（属性系统）✅、T0005（寿命系统）✅
- **后续任务**：无直接后续，但未来"季节系统"、"月相系统"等可基于此扩展
