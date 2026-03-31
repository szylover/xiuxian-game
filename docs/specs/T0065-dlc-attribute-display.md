# 设计文档：DLC 属性动态展示（详细属性面板补全）
任务：T0065
日期：2026-04-02

---

## 概述

「详细属性」面板（StatusPanel）目前硬编码约 32 条属性，无法感知 DLC 功法/装备/体修/灵根等系统注入到 `player.passives` 的自定义属性键值对。本任务通过两项改动，将面板升级为「核心硬编码 + DLC 动态追加」的混合渲染模式：
1. 把遗漏的核心属性 `critDmgMultiplier` 补入现有「战斗属性」段；
2. 读取 `player.passives`，将所有 DLC 注入的自定义键值渲染为「额外属性」段（仅在 passives 非空时出现）。

---

## 数据结构

### 已有字段（无需新增）

```ts
// src/types/player.ts（现有）
interface Player {
  critDmgMultiplier: number;          // 暴击伤害倍率，已有但 StatusPanel 未显示
  passives?: Record<string, number>;  // DLC 注入的自定义 buff，键=stat 名，值=数值
  systems?: Record<string, unknown>;  // 系统级扩展（本任务不涉及）
}
```

### 展示名称映射表（新增）

在 StatusPanel 内部（或单独 `statLabels.ts` 工具文件）维护一张「stat key → 中文名 + 单位」的映射：

```ts
// 伪代码——仅说明逻辑，不是真实代码
const STAT_LABEL_MAP: Record<string, { label: string; unit?: string; isPercent?: boolean }> = {
  // 功法被动常见键
  expMultiplier:          { label: '修炼倍率',    isPercent: true },
  bodyExpMultiplier:      { label: '体修倍率',    isPercent: true },
  physiqueRegenRate:      { label: '体魄回复率',  isPercent: true },
  dmgReduceBonus:         { label: '额外减伤',    isPercent: true },
  hpBonusRate:            { label: '气血加成率',  isPercent: true },
  // 体修/灵根奖励
  hpBonus:                { label: '气血加成',    unit: '' },
  atkBonus:               { label: '攻击加成',    unit: '' },
  defBonus:               { label: '防御加成',    unit: '' },
  physiqueBonus:          { label: '体魄加成',    unit: '' },
  // 装备附加（示例）
  moveSpeed:              { label: '移动速度',    unit: '' },
};
// 未命中的键：直接显示原始 key（驼峰转空格），值照原样渲染
```

**映射表放置位置**：优先放在 `StatusPanel.tsx` 文件顶部（局部常量），若将来键数量超过 20 条，提取到 `src/utils/statLabels.ts`。

---

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键导出 |
|------|------|----------|
| `src/utils/statLabels.ts` | stat key → 显示名/单位/格式化 | `getStatLabel(key)`, `formatStatValue(key, val)` | （可选，初期可直接写在 StatusPanel 内）

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/components/panels/StatusPanel.tsx` | ① 在战斗属性段追加 `critDmgMultiplier` 行；② 新增「额外属性」段，动态遍历 `player.passives` 渲染 | 核心改动 |
| `src/utils/statLabels.ts`（可选新建） | 维护 key→label 映射 + 格式化函数 | 可复用到 Debug 面板、Tooltip 等 |

### 关键逻辑

#### 1. 补全 `critDmgMultiplier`

在 StatusPanel 「战斗属性」段，在 `critRate` 行下面插入：

```
暴击伤害    player.critDmgMultiplier × 100  %
```

> 格式与现有 `critRate` 行保持一致（× 100 后显示百分比）。

#### 2. 动态渲染 `player.passives`

```
// 伪代码
const passiveEntries = Object.entries(player.passives ?? {})
  .filter(([_, v]) => v !== 0)       // 过滤零值，减少视觉噪音
  .sort(([a], [b]) => a.localeCompare(b))  // 字母排序，稳定显示

if (passiveEntries.length > 0) {
  渲染「额外属性」段标题
  for ([key, value] of passiveEntries) {
    label = STAT_LABEL_MAP[key]?.label ?? camelToSpaced(key)
    display = STAT_LABEL_MAP[key]?.isPercent
               ? (value * 100).toFixed(1) + '%'
               : value.toFixed(value < 1 ? 2 : 0)
    渲染一行：label + display
  }
}
```

#### 3. 辅助函数 `camelToSpaced`

将未在映射表中注册的驼峰 key 转为可读字符串（示例：`customBuff` → `custom Buff`）。这是兜底方案，确保任何 DLC 注入的 key 都能安全显示。

#### 4. 边界情况

| 情况 | 处理方式 |
|------|----------|
| `player.passives` 为 `undefined` | `?? {}` 默认空对象，不渲染「额外属性」段 |
| 所有 passive 值均为 0 | filter 后 entries 为空，不渲染段标题 |
| 值为负数 | 直接显示（如减益状态），无需特殊处理 |
| 极大/极小浮点数 | `toFixed(2)` 保留两位，避免精度噪声 |

---

## UI 方案（@Designer）

### 新增段落：额外属性

| 元素 | 位置 | 内容 |
|------|------|------|
| 段标题 `额外属性` | 现有五段之后（最底部） | 样式与其他段标题一致 |
| 动态属性行 | 段标题下方，逐行 | 左：中文名（或原始 key）；右：数值 + 单位 |

**视觉要求**：
- 段标题样式与「基础属性」等现有段完全一致（同色同字号）
- 属性行样式与现有 32 条属性行一致（二列布局，名称左对齐，数值右对齐）
- 正数值：普通白色；负数值：红色（`text-red-400` 或当前主题的减益色）
- **条件渲染**：`passiveEntries.length === 0` 时整段不渲染（不占空间）

### 修改：战斗属性段

在「暴击率」行下方紧接插入「暴击伤害」行，样式与同段其他行完全相同。

### 交互

- 本任务无新增按钮/弹窗，纯展示
- 「额外属性」段内容随 `player.passives` 实时响应（React 状态自动刷新，无需额外事件监听）

---

## 验证方式

### 手动测试步骤

1. **critDmgMultiplier 显示**
   - 打开游戏 → 「详细属性」面板
   - 在「战斗属性」段找到「暴击伤害」行
   - 预期：显示初始值（如 `150%`，即默认 1.5 × 100）

2. **passives 无值时不显示额外属性**
   - 新建角色（未修炼任何功法）
   - 预期：面板底部无「额外属性」段

3. **功法被动注入后出现额外属性**
   - 学习一个含 `passiveEffects` 的功法（如体修功法）
   - 预期：「额外属性」段出现，对应 key 以中文名显示

4. **未注册 key 的兜底显示**
   - Debug 面板手动向 `player.passives` 写入 `{ unknownBuff: 0.05 }`
   - 预期：显示 `unknown Buff   5.0%` 或类似格式（不崩溃）

5. **零值过滤**
   - 将某条 passive 值设为 0
   - 预期：该行不显示

### 测试用例（供 test-guide.md 参考）

| # | 前置条件 | 操作 | 预期结果 |
|---|----------|------|----------|
| 1 | 新角色 | 打开详细属性 | 战斗属性段存在「暴击伤害」行，值≥100% |
| 2 | 新角色 | 打开详细属性 | 底部无「额外属性」段 |
| 3 | 学习体修功法（有 passiveEffects） | 打开详细属性 | 出现「额外属性」段，至少一行 |
| 4 | passives 含 0 值项 | 打开详细属性 | 0 值行不出现 |
| 5 | passives 含未映射 key | 打开详细属性 | 驼峰转换显示，不崩溃 |

---

## 调试面板需求

**无需更新 Debug 面板**（DebugStatsTab）。

Debug 面板已支持直接修改 Player 字段；`player.passives` 属于 DLC 注入的动态数据，由对应系统（功法被动、体修境界等）负责写入，Debug 面板可通过修改功法/境界间接触发，不需要额外入口。

---

## 依赖关系

- **前置任务**：
  - T0006 ✅ 状态面板 v2（被修改的基础组件）
  - T0019 ✅ 被动效果（`player.passives` 的写入方）
  - T0059 ✅ 体修系统（体修相关 passives 的来源）
- **后续任务**：
  - T0047（命格天赋）可复用 `statLabels.ts` 注册天赋词条展示名
  - 未来 DLC 内容包（CP-01 等）添加新 passiveEffects 键时，只需在 `STAT_LABEL_MAP` 追加注册，无需改 StatusPanel 逻辑
