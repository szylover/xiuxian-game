# 设计文档：Toast 降噪 + 战斗日志合并

任务：T0045
日期：2026-03-30

## 概述

用户反馈两个 UI 体验问题：
1. **Toast 通知太突兀** — 每条日志都弹 Toast 气泡，多条堆叠视觉混乱
2. **战斗日志太散** — 战斗结果中属性变化分散，缺少 HP/MP 等差值展示

本任务统一改进消息反馈机制：降低 Toast 侵入性、合并战斗日志为结构化摘要。

## 问题根因分析

### Toast 根因

`useGameEngine.ts` 中 `addLog()` 包装函数（第 93-99 行）对**所有**日志无条件调用 `showToast()`：

```ts
const addLog = useCallback((msg: string, category: LogCategory = 'default') => {
    showToast(msg, category);          // ← 每条都弹
    if (msg.startsWith('⚠️')) return;
    rawAddLog(msg, category, ...);
}, ...);
```

结果：修炼 / 战斗 / 探索 / 休息 / 炼丹 / 商店 / 日常事件… 每个操作至少 1 条 Toast，探索拾取物品时 2 条，加上日常事件可能再叠 1 条。最多 5 条 Toast 同时堆叠在屏幕顶部中央，视觉噪音极大。

### 战斗日志根因

`handleCombatClose` 胜利日志已是一行，但格式 `→ +50修为 +20灵石` 只包含 exp/gold/loot，**缺少**：
- HP 变化（`result.playerHpLeft` vs `maxHp`）
- MP 消耗（`result.mpUsed`）
- 健康/心情变化（战败时扣减的 health）

同时 `advanceTime()` 在 `fight()` 内调用，可能触发日常事件产生额外日志条目，加上 Toast 放大散乱感。

---

## 数据结构

### 无需新增类型

现有 `ToastMessage`、`LogEntry`、`CombatResult` 类型足够，方案主要是行为调整。

### 可选：给 addLog 增加 `silent` 参数

```ts
// addLog 签名（可选扩展）
addLog(msg: string, category?: LogCategory, options?: { silent?: boolean })
```

`silent: true` 时只写日志不弹 Toast。大部分战斗/日常/探索日志用 silent 模式，仅关键事件弹 Toast。

---

## 游戏逻辑方案（@Dev）

### 方案 A：Toast 改为"最新消息条"（推荐）

将屏幕顶部堆叠的多条 Toast 气泡，替换为**单条消息栏**：

- 只显示**最新一条**消息，不叠加
- 位置改为中央面板顶部（或日志面板上方），而非 fixed 浮层
- 3 秒后自动淡出，新消息进来立即替换旧消息
- 视觉风格：半透明细条，字体更小，不抢注意力
- 保留类别颜色左边框

### 方案 B：分级 Toast + 关键事件才弹（备选）

给 `addLog` 增加 `toast` 选项，只有显式传 `toast: true` 的才弹气泡：
- **弹 Toast**：突破成功/失败、战斗胜利/死亡、奇遇触发、⚠️ 警告
- **不弹 Toast**：修炼、休息、探索拾取、日常事件、炼丹/锻造结果、商店交易

**推荐方案 A**，因为改动最小且彻底解决堆叠问题。

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/hooks/useToast.ts` | 改为只维护单条消息（移除数组/MAX_TOASTS），新消息替换旧消息 | 核心机制简化 |
| `src/components/hud/ToastContainer.tsx` | 从多条 `.map()` 改为单条渲染，样式改为内联消息条 | UI 降噪 |
| `src/App.css` | `.toast-container` / `.toast-item` 样式调整：去掉 `position: fixed; top: 2rem`，改为 `position: relative` 嵌入布局流；减小 padding/font-size；简化动画 | 降低视觉侵入 |
| `src/hooks/useGameEngine.ts` | `handleCombatClose` 中战斗日志格式改为括号摘要；`addLog` / `addLogs` 的 Toast 调用逻辑精简 | 合并战斗摘要 |
| `src/hooks/useCoreActions.ts` | `explore` 拾取日志合并到探索消息中（不再单独一条） | 减少日志条数 |
| `src/App.tsx` | `<ToastContainer>` 位置可能从 fixed 层移入中央面板内 | 布局调整 |

### 战斗日志合并格式

**胜利**：
```
⚔️ 击败 炎蛇（+50修为 +20灵石 -30HP -15MP 获得: 妖兽獠牙×1）
```

**失败**：
```
💀 败于 炎蛇（-80HP -20健康 护命玉佩救回一命）
```
或
```
💀 败于 炎蛇（-80HP -20健康 损失50修为 掉落灵石30）
```

**超时**：
```
⚔️ 与 炎蛇 缠斗超时，双方脱战（-40HP -10MP）
```

#### 格式规则

- 主体 `emoji + 结果描述`，然后用括号 `（…）` 包裹所有数值变化
- 括号内各项用空格分隔
- 正数用 `+`，负数用 `-`
- 物品掉落用 `获得: xxx×n`
- 整条是一个 `addLog` 调用

### 探索日志合并

当前探索拾取物品会单独一条日志：
```
🔍 山中发现灵药！
🎁 拾取 灵芝 ×1
```

合并为：
```
🔍 山中发现灵药！（获得灵芝×1）
```

### 公式

无新增公式。战斗摘要需在 `handleCombatClose` 中计算：
- `hpDelta = result.playerHpLeft - player.maxHp`（负值）→ 实际应基于战斗前 HP，但当前没有存战斗前快照。简化方案：只展示 `result.hpLost`（如 CombatResult 有），或展示战后 HP 值
- `mpUsed = result.mpUsed`
- `expGained = result.expGained`
- `goldGained = result.goldGained`

如果 CombatResult 中没有 `hpLost` 字段，可以从 `result.playerHpLeft` 和 `result.rounds` 推算，或在 `fight()` 中将战斗前的 HP 快照存入 CombatModalState。

---

## UI 方案（@Designer）

### Toast 消息条（替换原 Toast 气泡）

| 元素 | 位置 | 内容 |
|------|------|------|
| 消息条 `.toast-bar` | 中央面板顶部，在日志面板上方 | 单条最新消息，左侧类别色条，3s 淡出 |

### 样式要点

- **不使用 `position: fixed`**，嵌入正常布局流
- 高度 `~28px`，`font-size: 0.75rem`，`padding: 4px 10px`
- 背景 `rgba(18, 22, 42, 0.7)`，比原 Toast 更透明
- 淡入淡出动画保持 0.3s
- 空消息时不占位（`display: none` 或不渲染）

### 战斗日志

- 括号内容用略小/略灰的字号区分主体与详情（可选，通过 CSS `span.log-detail` 控制）
- 日志面板中的展示不变，仍按时间线分组

### 交互

- 消息条点击后立即消失（保留 dismiss 功能）
- 无其他新交互

---

## 验证方式

1. **Toast 降噪**
   - 连续快速点击「修炼」5 次，观察屏幕顶部：应只显示一条消息，不叠加
   - 同时有日常事件触发时，新消息替换旧消息而非堆叠
   - 消息 3s 后自动淡出

2. **战斗日志合并**
   - 战斗胜利后关闭弹窗，日志面板应只新增一条包含 `（+修为 +灵石 -HP …）` 的摘要
   - 战斗失败有死亡系统处理时，日志也应为一条（括号内含惩罚信息）
   - 探索拾取物品时，日志为一条（事件描述 + 括号内获得物品）

3. **边界条件**
   - 战斗无掉落时，括号内只有 `+修为 +灵石`
   - ⚠️ 提示（精力不足等）仍正常显示在消息条
   - 清空日志后，消息条也应清空

4. **Debug 辅助验证**
   - 在 Debug 面板将精力设为 0，检查 ⚠️ 提示是否正常显示
   - 手动触发战斗，检查日志格式

## 调试面板需求

无需更新。现有 Debug 面板可修改精力/HP 等属性辅助测试。

## 依赖关系

- **前置任务**：T0043 ✅（日志系统改进）、T0044 ✅（战斗弹窗 + 日志精简）
- **后续任务**：无
