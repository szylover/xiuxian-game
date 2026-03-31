# 设计文档：开始界面改版 — 随机角色弹窗

任务：T0063
日期：2026-03-31

## 概述

当前 StartScreen 的右半部分直接展示所有随机属性（灵根、先天属性、元素资质、体质），导致信息过载、页面冗长。锁定粒度为整个分类（如锁住所有灵根），用户无法仅锁某一个属性。

本设计将天赋预览从主页移入**随机角色弹窗（RerollModal）**，主页只保留基本信息输入 + "随机角色"按钮；弹窗内展示完整属性并支持**单属性级别锁定**。

## 当前问题分析

### 问题 1：信息过载
- 右侧展示 4 大分类（灵根 0–5 条、先天属性 3 条、元素资质 16 条、体质 2 条），占据大量屏幕空间
- 用户还没开始游戏就被大量数字淹没

### 问题 2：锁粒度太粗
- 当前锁的单位是 `CreationSlot`（`spiritRoots` / `innateStats` / `aptitudes` / `constitution`），一锁就锁住整个分类
- 用户无法实现"只锁金灵根亲和度，其他灵根继续随机"这类需求

### 问题 3：锁 UI 位置不合理
- 锁图标和计数器显示在主页上，但只有在随机时才有意义
- 应当与随机操作共存于弹窗内部

## 数据结构

### 新增：细粒度锁定 Key

用字符串 key 标识每个可锁定的属性：

```ts
/** 所有可独立锁定的属性 key */
type LockableKey =
  // 灵根：锁定 combo 类型 + 各灵根亲和度
  | 'spiritRoots'          // 锁住灵根组合（哪些灵根被激活 + combo 类型）
  | 'root:metal' | 'root:wood' | 'root:water' | 'root:fire' | 'root:earth'  // 锁住单个灵根的亲和度
  // 先天属性
  | 'luck' | 'comprehension' | 'charisma'
  // 元素资质（16 项）
  | `apt:${keyof Aptitudes}`
  // 体质
  | 'mood' | 'health';
```

> **锁定规则**：
> - `spiritRoots` 锁定后，灵根的组合类型（单灵根/双灵根/…）和具体哪些灵根被激活不变，但各灵根的亲和度仍可随机（除非该灵根的 `root:xxx` 也被锁定）
> - `root:metal` 等锁定后，该灵根的亲和度不变（前提：该灵根在本次 combo 中被激活）
> - 先天属性、资质、体质各 key 独立锁定
> - 总锁数上限：**5 把锁**（从原来 3 提升，因为粒度变细后 3 把不够用）

### 保留：PreviewRoll 不变

```ts
interface PreviewRoll {
  spiritRoots: PlayerSpiritRoots;
  luck: number;
  comprehension: number;
  charisma: number;
  aptitudes: Aptitudes;
  mood: number;
  health: number;
}
```

PreviewRoll 本身不需要改动。锁定状态由 UI 侧的 `Set<LockableKey>` 管理，重新随机时读锁集合决定哪些字段保留。

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键类/函数 |
|------|------|-------------|
| `src/components/screens/RerollModal.tsx` | 随机角色弹窗组件 | `RerollModal` |
| `src/components/screens/RerollModal.css`（可选） | 弹窗样式（也可内联到 App.css） | — |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/components/screens/StartScreen.tsx` | 大幅重构：移除右侧天赋区域、移除旧锁机制、新增"随机角色"按钮和弹窗调用、增加已随机属性摘要 | 核心变更 |
| `src/App.css` | 新增 RerollModal 样式、调整 StartScreen 布局样式 | UI 适配 |

### 关键逻辑：带细粒度锁的 reroll

```ts
function rerollWithLocks(prev: PreviewRoll, locks: Set<LockableKey>): PreviewRoll {
  // 1. 灵根
  const newSpiritRoots = locks.has('spiritRoots')
    ? (() => {
        // combo 不变，但各灵根亲和度可随机（除非 root:xxx 也锁住）
        const roots = prev.spiritRoots.roots.map(r =>
          locks.has(`root:${r.type}`) ? r : { ...r, affinity: randAffinity() }
        );
        return { ...prev.spiritRoots, roots };
      })()
    : (() => {
        const fresh = rollSpiritRoots();
        // 即使 combo 没锁，如果某个灵根 key 被锁住且该灵根恰好也在新 combo 中，保留亲和度
        const roots = fresh.roots.map(r => {
          const prevRoot = prev.spiritRoots.roots.find(pr => pr.type === r.type);
          return locks.has(`root:${r.type}`) && prevRoot
            ? { ...r, affinity: prevRoot.affinity }
            : r;
        });
        return { ...fresh, roots };
      })();

  // 2. 先天属性
  const luck          = locks.has('luck')          ? prev.luck          : rollInnateAttr();
  const comprehension = locks.has('comprehension') ? prev.comprehension : rollInnateAttr();
  const charisma      = locks.has('charisma')      ? prev.charisma      : rollInnateAttr();

  // 3. 资质
  const aptitudes = { ...rollAptitudesWithSpiritRoots(newSpiritRoots) };
  for (const key of Object.keys(prev.aptitudes) as (keyof Aptitudes)[]) {
    if (locks.has(`apt:${key}`)) aptitudes[key] = prev.aptitudes[key];
  }

  // 4. 体质
  const mood   = locks.has('mood')   ? prev.mood   : randInt(50, 90);
  const health = locks.has('health') ? prev.health  : randInt(80, 100);

  return { spiritRoots: newSpiritRoots, luck, comprehension, charisma, aptitudes, mood, health };
}
```

> 以上为伪代码说明逻辑，@Dev 实现时可放在 RerollModal 内部或提取到 `player/create.ts`。

## UI 方案（@Designer）

### 主页布局变更

#### 变更前（当前）
```
┌─────────────────────────────────────┐
│         🏔️ 修仙之路                 │
│    踏入修仙世界，逆天改命            │
├─────────────┬───────────────────────┤
│  基本信息    │   ✨ 角色天赋          │
│  道号输入    │   灵根（锁🔒）        │
│  性别选择    │   先天属性（锁🔒）    │
│  外貌选择    │   元素资质（锁🔒）    │
│  剩余锁 🔒🔒🔒│  体质（锁🔒）        │
├─────────────┴───────────────────────┤
│   🎲 重新随机    ✨ 开始修炼         │
└─────────────────────────────────────┘
```

#### 变更后（新设计）
```
┌─────────────────────────────────────┐
│         🏔️ 修仙之路                 │
│    踏入修仙世界，逆天改命            │
├─────────────────────────────────────┤
│            基本信息                  │
│   道号：[________]                  │
│   性别：[♂ 男修] [♀ 女修]           │
│   外貌：[头像1] [头像2] [头像3]     │
│                                     │
│         ┌──────────────┐            │
│         │ 🎲 随机角色   │            │
│         └──────────────┘            │
│                                     │
│   ┌─ 天赋摘要（已随机后显示）────┐   │
│   │ 双灵根（金·水）│ 运62 悟78 魅45│ │
│   └─────────────────────────────┘   │
│                                     │
│   [✨ 开始修炼]   [继续修炼]        │
└─────────────────────────────────────┘
```

**关键变化：**
1. 移除右侧 `create-char-right` 整个区域
2. 基本信息居中展示（不再左右分栏）
3. 新增"🎲 随机角色"按钮，点击打开 RerollModal
4. 在"随机角色"按钮下方显示**天赋摘要**（一行简要文字），让用户知道已经随机了什么，但不铺开细节
5. 天赋摘要只在至少随机过一次后显示
6. 移除锁计数器（锁功能移入弹窗）

### 随机角色弹窗（RerollModal）

```
┌─────────────── 随机角色 ──────────────────┐
│                                            │
│  ── 灵根 ──────────────────────────────── │
│  [🔓] 灵根组合：双灵根 ×2.0              │
│  [🔓] 🔥 火灵根  ████████░░  亲和 78     │
│  [🔓] 💧 水灵根  ██████░░░░  亲和 56     │
│                                            │
│  ── 先天属性 ──────────────────────────── │
│  [🔓] 运气   ████████░░  62              │
│  [🔓] 悟性   █████████░  78              │
│  [🔒] 魅力   ████░░░░░░  45  ← 已锁定   │
│                                            │
│  ── 元素资质 ──────────────────────────── │
│  元素：                                    │
│  [🔓]火 23 [🔒]水 88 [🔓]雷 45 …         │
│  武学：                                    │
│  [🔓]刀 12 [🔓]枪 67 [🔓]剑 34 …         │
│  功法：                                    │
│  [🔓]丹 56 [🔓]器 23 [🔓]风水 45 [🔓]矿 78│
│                                            │
│  ── 体质 ──────────────────────────────── │
│  [🔓] 心情   ████████░░  72              │
│  [🔓] 健康   █████████░  91              │
│                                            │
│  剩余锁：🔒🔒🔒🔒🔒 (5/5)                │
│                                            │
│  [🎲 重新随机]          [✅ 确认选择]     │
└────────────────────────────────────────────┘
```

### 交互流程

1. **打开弹窗**：用户点击主页"🎲 随机角色"按钮 → 弹窗打开，展示当前 preview 的全部属性
2. **锁定属性**：每个属性行左侧有一个锁图标，点击切换锁定/解锁
   - 解锁状态：`🔓`，灰色
   - 锁定状态：`🔒`，金色高亮，该行背景加淡金色
   - 当 5 把锁全部用完时，剩余未锁定的锁图标变为禁用态（灰色不可点击）
3. **重新随机**：点击"🎲 重新随机"→ 根据锁状态执行 `rerollWithLocks()`，弹窗内实时刷新数据
4. **确认选择**：点击"✅ 确认选择"→ 关闭弹窗，将当前 preview 写回主页 state，主页显示天赋摘要
5. **关闭弹窗**：点击右上角 × 或弹窗外区域 → 关闭弹窗，**不更新**主页的 preview（即取消本次随机）
6. **ESC 关闭**：按 Escape 键效果同关闭

### 天赋摘要规格

主页"随机角色"按钮下方显示的摘要：
```
双灵根（火·水）| 运 62 · 悟 78 · 魅 45
```
- 格式：`{combo中文}（{灵根列表}）| 运 {luck} · 悟 {comp} · 魅 {char}`
- 无灵根时显示："无灵根之体 | 运 xx · 悟 xx · 魅 xx"
- 点击摘要也可以打开弹窗（快捷入口）

## 组件拆分方案

### 新组件

| 组件 | 文件 | 职责 |
|------|------|------|
| `RerollModal` | `src/components/screens/RerollModal.tsx` | 随机角色弹窗的主容器，管理锁状态和 reroll 逻辑 |
| `LockableRow` | RerollModal 内部子组件 | 单行：锁按钮 + 标签 + 进度条 + 数值 |
| `LockableAptitudeGrid` | RerollModal 内部子组件 | 资质网格：每个格子带独立锁 |

### 改动组件

| 组件 | 改动 |
|------|------|
| `StartScreen` | 移除 `create-char-right`、`SlotHeader`、`InnateBar`（弹窗内部定义）、`AptitudeGrid`（弹窗内部重做） → 新增"随机角色"按钮 + 天赋摘要 + 调用 RerollModal |

### 可复用 / 删除

- `SlotHeader` 组件：**删除**（被弹窗内的 `LockableRow` 替代）
- `InnateBar` 组件：可保留为内部工具组件，或在 RerollModal 内重新定义（不导出）
- `AptitudeGrid` 组件：在 RerollModal 内重做为带锁版本
- `COMBO_COLORS`、`MULT_MAP` 等常量保留

## 数据流 & 状态管理

```
StartScreen (state)
├── name, gender, appearance     — 基本信息（不变）
├── preview: PreviewRoll          — 当前确认的随机属性
├── showRerollModal: boolean     — 控制弹窗开关
│
└── RerollModal (props: preview, onConfirm, onClose)
    ├── localPreview: PreviewRoll  — 弹窗内的临时工作副本
    ├── locks: Set<LockableKey>    — 锁定状态
    │
    ├── handleReroll()             — rerollWithLocks(localPreview, locks) → setLocalPreview
    ├── handleConfirm()            — onConfirm(localPreview) → 写回 StartScreen.preview + 关闭
    └── handleClose()              — onClose() → 关闭弹窗，不写回
```

**关键点：**
- 弹窗打开时，将 StartScreen 的 `preview` 拷贝为弹窗内部的 `localPreview`
- 弹窗内所有随机操作只修改 `localPreview`，不影响外部
- 只有点"确认选择"才将 `localPreview` 写回 StartScreen 的 `preview`
- 关闭/取消弹窗不产生副作用

## 验证方式

### 浏览器测试

1. 进入开始界面，应看到居中的基本信息表单 + "🎲 随机角色"按钮
2. 点击"随机角色"按钮，弹窗弹出，展示所有属性
3. 在弹窗中锁定某属性（如金灵根亲和度），点击"重新随机"，该属性保持不变、其他属性刷新
4. 锁定 5 个属性后，第 6 个属性的锁图标变为禁用态
5. 解锁一个属性后，其余禁用态恢复可点击
6. 点击"确认选择"，弹窗关闭，主页显示天赋摘要
7. 点击弹窗外区域或 ×，弹窗关闭，主页 preview 不变
8. 点击"开始修炼"，游戏正常以所选属性开始

### 测试用例初稿（→ test-guide.md）

| # | 场景 | 步骤 | 预期 |
|---|------|------|------|
| 1 | 基本随机流程 | 点"随机角色"→ 在弹窗内点"重新随机"多次 → 点"确认选择" | 弹窗关闭，主页摘要更新为最后一次随机结果 |
| 2 | 单属性锁定 | 锁定"运气"→ 重新随机 | 运气数值不变，其余属性刷新 |
| 3 | 灵根组合锁 + 亲和度锁 | 锁定"灵根组合"+ 锁定"火灵根亲和度"→ 重新随机 | combo 不变、火灵根亲和度不变、其他灵根亲和度刷新 |
| 4 | 锁上限 | 连续锁定 5 个属性 → 尝试锁第 6 个 | 第 6 个锁按钮灰色禁用 |
| 5 | 取消不影响主页 | 弹窗内随机多次 → 点 × 关闭 | 主页 preview 保持上一次确认的值 |
| 6 | 天赋摘要正确性 | 确认后查看摘要 | 显示正确的灵根组合名 + 激活灵根 + 先天属性数值 |
| 7 | 初始状态 | 首次进入主页，未点过"随机角色" | 主页显示初始随机到的摘要，或显示"点击随机角色开始" |
| 8 | 键盘关闭 | 弹窗打开时按 ESC | 弹窗关闭，preview 不变 |

## 调试面板需求

无需更新。本任务仅影响开始界面（创建角色），不涉及游戏进行中的调试面板。

## 依赖关系

- **前置任务**：T0056（初始随机属性系统）— 已完成 ✅
- **后续任务**：T0047（命格天赋系统）— 可在弹窗中追加天赋展示区域
