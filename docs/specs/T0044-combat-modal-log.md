# 设计文档：战斗弹窗 + 日志精简

任务：T0044
日期：2026-03-27

## 概述

当前战斗结果以平铺日志形式展示——每个回合的攻击/闪避/暴击细节直接写入 GameLog，信息量过大、重点不突出。改造为：

1. **战斗弹窗**：战斗触发时弹出模态框（Modal），逐条展示回合信息
2. **两阶段弹窗**：点"结束"后弹窗切换为战利品/收获展示，再点"确认"关闭
3. **日志精简**：GameLog 中只记录一行战斗摘要（时间 + 对手 + 结果 + 获得物品）
4. **折叠全部**：GameLog 面板头部加"折叠全部"按钮

## 数据结构

### CombatResult 扩展（`src/game/combat/types.ts`）

现有 `CombatResult` 已包含所需字段，无需修改：

```ts
interface CombatResult {
  winner: 'player' | 'monster' | 'draw';
  playerHpLeft: number;
  logs: string[];           // 回合详细日志 → 仅用于弹窗展示
  expGained: number;
  goldGained: number;
  mpUsed: number;
  skillUseCount: number;
}
```

### 新增：战斗弹窗状态

在 `useCoreActions` 或上层管理一个状态：

```ts
interface CombatModalState {
  phase: 'battle' | 'loot';    // 当前阶段
  monsterName: string;          // 对手名
  result: CombatResult;         // 战斗结果（含回合日志）
  loot: LootEntry[];            // 战利品列表
}

interface LootEntry {
  icon: string;      // emoji 图标
  name: string;      // 物品名
  amount: number;    // 数量
}
```

## 游戏逻辑方案（@Dev）

### 核心改动思路

当前 `fight()` 在 `setPlayer()` 回调内部同步计算战斗结果并 `queueLogs()`。改造后：

1. `fight()` 不再将回合日志写入 GameLog
2. `fight()` 计算出 `CombatResult` + 掉落物后，**设置一个 `combatModal` 状态**，触发弹窗渲染
3. 弹窗关闭时，才向 GameLog 写一条摘要

### 新增文件

| 文件 | 用途 | 关键组件/函数 |
|------|------|-------------|
| `src/components/shared/CombatModal.tsx` | 战斗结果模态框 | `<CombatModal>` — 接收 `CombatModalState`，分两阶段渲染 |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/hooks/useCoreActions.ts` | `fight()` 不再 `queueLogs` 战斗详情，改为返回/设置 `CombatModalState`；掉落物收集到 `LootEntry[]` | 战斗日志→弹窗展示，不再直接写 GameLog |
| `src/App.tsx` | 新增 `combatModal` 状态，传给 `<CombatModal>`；弹窗关闭回调写摘要日志 | 编排弹窗生命周期 |
| `src/components/hud/GameLog.tsx` | 标题栏右侧加"折叠全部"按钮 | 用户需求 |
| `src/App.css` | 新增 `.combat-modal-overlay` / `.combat-modal` 等样式 | 弹窗遮罩 + 内容样式 |

### 详细方案

#### 1. `useCoreActions.ts` — fight() 改造

```
fight() 流程改为：
  1. 扣精力、选怪、runCombat → result
  2. 计算掉落物（獠牙/妖丹/装备），收集到 loot: LootEntry[]
  3. 更新 player 状态（hp/exp/gold/物品/tracking）
  4. 不再 queueLogs()
  5. 调用 onCombatResult(monsterName, result, loot) 回调
     → 由上层 (App.tsx) 设置 combatModal 状态
```

`useCoreActions` 新增一个 `onCombatResult` 回调依赖（通过 `CoreActionDeps` 传入）。

#### 2. `App.tsx` — 弹窗编排

```
状态：
  const [combatModal, setCombatModal] = useState<CombatModalState | null>(null);

fight 触发 → setCombatModal({ phase: 'battle', monsterName, result, loot })
弹窗"结束"按钮 → setCombatModal(prev => ({ ...prev, phase: 'loot' }))
弹窗"确认"按钮 → 写摘要日志 + setCombatModal(null)

摘要日志格式：
  胜利：「⚔️ 击败 灵狐 → +150修为 +50灵石 妖兽獠牙×1」
  失败：「💀 败于 灵狐，身受重伤」
  平局：「⚔️ 与 灵狐 战斗超时，双方脱战」
```

#### 3. `CombatModal.tsx` — 两阶段弹窗

**Phase 1: 'battle'（战斗详情）**
- 半透明遮罩覆盖全屏
- 居中模态框，标题 "⚔️ 战斗 — {monsterName}"
- 滚动区域展示 `result.logs` 每条一行（保持现有颜色/格式）
- 底部按钮：
  - 胜利/平局 → "查看战利品 ▶"
  - 失败 → "确认"（直接关闭，写摘要）

**Phase 2: 'loot'（战利品展示）**
- 标题改为结果（"🎉 胜利！" / "⚔️ 脱战"）
- 内容区展示：
  - 获得修为：`+{expGained}`
  - 获得灵石：`+{goldGained}`
  - 掉落物品列表（icon + name + amount）
  - 如果 loot 为空，显示"无额外掉落"
- 底部按钮："确认"（关闭弹窗，写摘要）

**弹窗开启时**应禁止底层操作（overlay 阻止穿透点击）。

#### 4. `GameLog.tsx` — 折叠全部

在日志标题栏（`log-header`）右侧，加一个"折叠全部"按钮：

```
点击 → setExpandedYears(new Set()), setExpandedMonths(new Set())
图标：📂 或 ⬆️，tooltip: "折叠全部"
```

并且相应添加一个"展开全部"按钮（或做成切换式），便于对称操作。

## UI 方案（@Designer）

### 新增界面

| 元素 | 位置 | 内容 |
|------|------|------|
| CombatModal overlay | 全屏遮罩（z-index 高于所有面板） | 半透明黑色背景 `rgba(0,0,0,0.7)` |
| CombatModal 弹窗 | 屏幕居中，宽 460px，最大高度 70vh | 标题栏 + 滚动内容区 + 底部按钮栏 |
| 折叠全部按钮 | GameLog 标题栏右侧 | 小图标按钮 |

### 弹窗视觉风格

- 与现有 `floating-panel` 风格一致（深色背景 + 金色边框）
- Phase 1 战斗日志保持现有战斗颜色（红色系）
- Phase 2 战利品条目用品质颜色区分
- 底部按钮使用现有 `.btn` 样式

### 交互

- 弹窗出现时有简单 fade-in 动画（CSS transition）
- overlay 点击不关闭（必须点按钮），防止误操作
- Phase 2 战利品条目可做简单入场动画（逐条滑入）
- 折叠全部按钮 hover 显示 tooltip

## 验证方式

1. 点击"⚔️ 战斗"按钮 → 弹出战斗弹窗，展示回合日志
2. 胜利 → 点"查看战利品" → 弹窗切换为战利品列表 → 点"确认"关闭
3. 失败 → 点"确认"直接关闭
4. 弹窗关闭后 → GameLog 中只增加一条摘要日志
5. 弹窗开启时不能点击底层的操作按钮
6. GameLog "折叠全部"按钮 → 所有年/月折叠 → 再点"展开全部"恢复

---

## 追加改动：移除右侧按钮内的数字/badge 显示

### 问题

右栏功能按钮（`PanelButtons.tsx`）在按钮内通过 `badge` 字段显示数字/文字信息，导致按钮视觉杂乱、不够整洁：

| 按钮 | 当前 badge 内容 | 示例 |
|------|----------------|------|
| 🎒 背包 | `物品数/容量` | `3/20` |
| 🏪 商店 | `💰金币数` | `💰100` |
| 📖 功法 | 已学功法数量 | `2` |
| 🔥 炼制 | `🧠精神力` | `🧠50` |

### 改动方案

**完全移除所有按钮的 badge 显示**，按钮仅保留 icon + label。

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/components/layout/PanelButtons.tsx` | 1. 删除 `PanelDef` 接口中的 `badge` 字段<br>2. 删除每个 panel 定义中的 `badge` 函数<br>3. 删除渲染中 `badge` 相关的逻辑（`const badge = ...` 和 `{badge && ...}`）<br>4. 删除 `getInventoryEntries` 导入（不再需要） | 移除按钮内数字显示 |
| `src/App.css` | 删除 `.panel-btn-badge` 相关样式（如果存在） | 清理无用样式 |

### 验证方式

- 所有右侧功能按钮只显示 icon + 文字标签，无任何数字或 badge
- 按钮点击功能不受影响

## 依赖关系

- **前置任务**：T0003（战斗系统 v2）✅、T0043（日志系统改进）✅
- **后续影响**：T0018（技能战斗）如果未来改造战斗表现，需基于本弹窗框架扩展
