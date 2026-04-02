# 设计文档：修仙履历系统（Cultivation Chronicle）
任务：T0068  
日期：2025-07-08

---

## 概述

修仙履历是**跨局永久存档**的修炼历程记录系统。每次轮回（从新游戏开始到死亡/飞升）的关键事件、最终境界、时间线都会被精选保存，不随死亡或新游戏重置。玩家可在专属面板中回顾历代分身的修炼足迹，感受"道虽不同，皆为修仙"的叙事沉浸感。

---

## 数据结构

### 关键事件类型

```typescript
type ChronicleEventType =
  | 'realm_breakthrough'        // 气修境界突破（记录目标境界）
  | 'body_realm_breakthrough'   // 体修境界突破（记录目标体修境界）
  | 'tribulation_pass'          // 渡劫成功
  | 'tribulation_fail'          // 渡劫失败（散仙化）
  | 'death'                     // 死亡（记录原因、境界）
  | 'revival'                   // 复活（记录复活手段）
  | 'first_boss_kill'           // 首次击败特定 Boss 妖兽
  | 'rare_item_obtained'        // 获得 epic/legendary 品质物品
  | 'technique_acquired'        // 习得 rare 及以上功法
  | 'bottleneck_broken'         // 突破瓶颈
  | 'special_adventure'         // 奇遇事件（金色 adventure 类日志）
  | 'achievement_unlocked'      // 解锁重要成就（非 common 类）
  | 'npc_milestone'             // NPC 关系里程碑（friend/close_friend/soulmate）
  | 'game_over'                 // 本轮回终结（死亡/飞升/手动结束）
```

### 单条关键事件

```typescript
interface ChronicleEvent {
  type: ChronicleEventType;
  year: number;           // 游戏年（gameYear）
  month: number;          // 游戏月（gameMonth）
  description: string;    // 简短文字描述，如"突破至金丹期"
  meta?: {
    realmName?: string;       // 境界名
    realmIndex?: number;      // 境界下标
    bodyRealmName?: string;   // 体修境界名
    itemId?: string;          // 物品 ID
    itemName?: string;        // 物品名
    monsterId?: string;       // 妖兽 ID
    monsterName?: string;     // 妖兽名
    techniqueId?: string;     // 功法 ID
    techniqueName?: string;   // 功法名
    achievementId?: string;   // 成就 ID
    achievementName?: string; // 成就名
    npcId?: string;           // NPC ID
    npcName?: string;         // NPC 名
    relationLevel?: string;   // 关系等级
    deathCause?: string;      // 死亡原因文本
    revivalMethod?: string;   // 复活手段 ID
  };
}
```

### 单次轮回记录

```typescript
interface IncarnationRecord {
  incarnationNo: number;        // 轮回编号（全局自增，从 1 开始）
  characterName: string;        // 角色名
  characterGender: string;      // 性别

  // === 时间 ===
  startedAt: number;            // 真实时间戳（毫秒），轮回开始
  endedAt: number | null;       // 真实时间戳（null = 进行中）
  startGameYear: number;        // 游戏起始年
  startGameMonth: number;       // 游戏起始月
  endGameYear: number | null;   // 游戏终止年
  endGameMonth: number | null;  // 游戏终止月

  // === 成就摘要 ===
  finalRealmIndex: number;      // 最终气修境界下标
  finalBodyRealmIndex: number;  // 最终体修境界下标
  finalRealmName: string;       // 最终境界名（冗余存储，防止 DLC 改名）
  peakExp: number;              // 本轮最高修为（快照）
  finalAge: number;             // 终止时年龄（月）
  finalLifespan: number;        // 终止时寿限（月）
  totalKills: number;           // 总击杀数
  totalDeaths: number;          // 本轮累计死亡次数（含轻/中度）
  totalRevives: number;         // 本轮复活次数
  outcome: 'died' | 'ascended' | 'active'; // 轮回结局

  // === 关键事件时间线 ===
  events: ChronicleEvent[];     // 上限 60 条，超出时丢弃最早的普通事件（保留 death/game_over）
}
```

### 整体履历（顶层）

```typescript
interface CultivationChronicle {
  schemaVersion: number;              // 格式版本，当前为 1
  nextIncarnationNo: number;          // 下一个轮回编号（从 1 开始）
  incarnations: IncarnationRecord[];  // 已完结轮回，上限 30 条（超出删最旧）
  current: IncarnationRecord | null;  // 当前进行中的轮回（null = 未开始）
}
```

### 存储键

```
localStorage key: "xiuxian_chronicle"
独立于存档系统（xiuxian_save），不随存档删除而消失
```

---

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键类/函数 |
|------|------|-------------|
| `src/game/chronicle.ts` | 履历核心逻辑（纯函数，无副作用） | `createIncarnation(player)` `finalizeIncarnation(record, player, outcome)` `addChronicleEvent(record, event)` `loadChronicle()` `saveChronicle(chronicle)` `migrateChronicle(raw)` |
| `src/hooks/useChronicle.ts` | React Hook，管理履历读写 | `useChronicle()` → `{ chronicle, addEvent, startNewIncarnation, finalizeCurrentIncarnation }` |
| `src/components/panels/ChroniclePanel.tsx` | 履历面板 UI | 历史轮回列表 + 单条详情展开 |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/hooks/useGameEngine.ts` | 新游戏开始时调用 `startNewIncarnation()`；死亡/游戏结束时调用 `finalizeCurrentIncarnation()` | 轮回生命周期管理 |
| `src/game/breakthrough/attempt.ts` | 突破成功后向 chronicle 写入 `realm_breakthrough` 事件 | 核心关键事件 |
| `src/game/death.ts` | severe 死亡时写入 `death` 事件 | 轮回终结触发 |
| `src/components/hud/HudLayout.tsx`（或顶层导航） | 增加「履历」入口按钮 | 让玩家能打开面板 |

### chronicle.ts 关键函数规范

```
createIncarnation(player: Player, incarnationNo: number): IncarnationRecord
  - 从 player 读取 name/gender/realmIndex/bodyRealmIndex/age/lifespan
  - startedAt = Date.now(), outcome = 'active'
  - events = []

finalizeIncarnation(record, player, outcome): IncarnationRecord
  - 写入 endedAt、endGameYear/Month、finalRealmIndex/Name 等快照
  - outcome: 'died' | 'ascended'
  - 自动追加 'game_over' 事件

addChronicleEvent(record, event): IncarnationRecord
  - 若 events.length >= 60，移除最早的非 death/game_over 事件
  - push 新事件（按游戏时间排序）

loadChronicle(): CultivationChronicle
  - 读 localStorage["xiuxian_chronicle"]
  - 若不存在，返回初始空对象
  - 调用 migrateChronicle() 做版本升级

saveChronicle(chronicle): void
  - JSON.stringify 写入 localStorage["xiuxian_chronicle"]

migrateChronicle(raw): CultivationChronicle
  - schemaVersion 1 → 未来版本的字段迁移
```

### 事件触发点一览

| 触发位置 | 事件类型 | 触发条件 |
|----------|----------|----------|
| `attemptBreakthrough()` 成功分支 | `realm_breakthrough` | 每次气修境界 +1 |
| `attemptBodyBreakthrough()` 成功分支 | `body_realm_breakthrough` | 每次体修境界 +1 |
| `attemptBreakthrough()` 渡劫判定 | `tribulation_pass` / `tribulation_fail` | requiresTribulation 且结果判定后 |
| `applyDeath()` severe | `death` | severity === 'severe' |
| `applyRevival()` | `revival` | 每次复活 |
| 战斗胜利后，首次击败特定妖兽 | `first_boss_kill` | `player.tracking.bossKillMap[monsterId] === 1` |
| 物品获得（背包添加时） | `rare_item_obtained` | rarity === 'epic' \|\| 'legendary' |
| 功法学习时 | `technique_acquired` | rarity === 'rare' \|\| 'epic' \|\| 'legendary' |
| 瓶颈解锁时 | `bottleneck_broken` | 每次成功解除瓶颈 |
| adventure 类日志（概率过滤） | `special_adventure` | 仅保留 isImportant 标记的奇遇事件 |
| 成就解锁时 | `achievement_unlocked` | rarity !== 'common'（需成就系统配合） |
| NPC 关系升级时 | `npc_milestone` | 关系升至 friend / close_friend / soulmate |

### 新游戏/死亡流程改动

```
【新游戏 startGame()】
  1. loadChronicle()
  2. 若 chronicle.current 存在且 outcome === 'active'
     → 说明上次游戏未正常结束，强制 finalize 并 push 到 incarnations
  3. createIncarnation(newPlayer, nextIncarnationNo++)
  4. chronicle.current = newRecord
  5. saveChronicle()

【severe 死亡 / gameOver】
  1. addChronicleEvent(current, { type: 'death', ... })
  2. finalizeIncarnation(current, player, 'died')
  3. chronicle.incarnations.push(current)  // 若超30条则 shift 最旧
  4. chronicle.current = null
  5. saveChronicle()
  （死亡弹窗关闭、玩家选择「开始新轮回」时再触发 startGame()）
```

### 存储量估算

| 项目 | 估算大小 |
|------|---------|
| 单条 ChronicleEvent | ~150 字节（含 meta） |
| 单次轮回记录（60 事件） | ~10 KB |
| 30 轮回上限 | ~300 KB |
| localStorage 典型上限 | 5–10 MB |

**结论**：300 KB 远低于 5 MB 限制，安全。

### 公式

- **事件优先级**（决定超限时丢弃顺序）：
  - 优先保留：`death`、`game_over`、`realm_breakthrough`（阶梯关键）
  - 次优先：`tribulation_*`、`first_boss_kill`
  - 普通：`special_adventure`、`rare_item_obtained`、`npc_milestone`
  - 超限时从列表尾部（最旧的普通事件）开始丢弃

- **轮回年龄换算**：游戏月 → 年龄展示
  - `ageYears = Math.floor(age / 12)`（age 为整数月）
  - 履历展示：`"享年 X 岁 Y 月"`

---

## UI 方案（@Designer）

### 新增界面/面板

| 元素 | 位置 | 内容 |
|------|------|------|
| 「履历」入口按钮 | 主界面底部导航栏 或 左侧边栏底部 | 📜 图标 + 文字「修仙履历」 |
| 履历面板（Modal 或侧边抽屉） | 覆盖主界面或右侧浮层 | 历代轮回列表 + 当前轮回 |
| 轮回摘要卡片 | 履历面板内，列表每行 | 轮回编号、角色名、最终境界、游戏内时长、结局标签 |
| 轮回详情展开区 | 点击摘要卡片后展开 | 关键统计 + 时间线事件列表 |
| 当前轮回置顶区 | 履历面板顶部 | 「当前轮回」标签 + 进度条（当前境界/最高境界） |

### 交互

- **面板入口**：底部 TabBar 增加「履历」标签页（📜），点击打开履历面板
- **轮回列表**：默认展示最近 10 条完结轮回 + 当前轮回；支持滚动加载更多
- **卡片折叠/展开**：点击轮回摘要卡片展开详情（时间线），再次点击折叠
- **时间线展示**：
  - 纵向时间线，每条事件前有对应图标（⚡境界突破、☁️渡劫、💀死亡、🌟奇遇等）
  - 事件显示游戏年月（如「第3年 二月」）
  - 死亡事件用红色高亮
- **结局标签颜色**：
  - `died` → 红色（「道消魂灭」）
  - `ascended` → 金色（「羽化飞升」）
  - `active` → 绿色脉冲动画（「修炼中」）
- **空态**：无任何历史轮回时展示：「此生尚是第一轮回，修仙之路，从此启程。」
- **悬浮提示**：鼠标 hover 事件条目时，显示 meta 详情（如物品名、境界名）

### 视觉风格建议（@Designer 自由发挥）

- 整体风格：水墨/古卷轴感（参考游戏现有主题色）
- 面板背景：半透明深色，略带纸张纹理感
- 时间线：细竖线连接，事件节点圆点
- 境界名称用金/橙色标注

---

## 验证方式

### 浏览器测试步骤

1. **新游戏**：开始游戏 → 打开 DevTools → `localStorage.getItem('xiuxian_chronicle')` → 确认 `current` 有轮回记录，`incarnationNo: 1`
2. **突破事件**：完成一次境界突破 → 检查 `current.events` 中有 `realm_breakthrough` 事件，year/month 与游戏内一致
3. **死亡事件（Dev 调试面板触发死亡）**：
   - Debug 面板触发 severe 死亡 → 确认 `current` 变为 null
   - 检查 `incarnations[0]` 有完整的 `endedAt`、`finalRealmIndex` 等字段
4. **新轮回**：死亡后开始新游戏 → `current.incarnationNo` 自增（2）
5. **履历面板 UI**：点击「履历」入口 → 看到已完结的第一轮回摘要 → 点击展开，看到时间线
6. **存储持久性**：刷新页面 → `xiuxian_chronicle` 仍在 → 履历面板仍显示历史记录
7. **跨存档独立**：切换存档槽位 → 履历面板显示的是同一份跨局记录（不随槽位切换）

### 预期行为

- 修仙履历不随「删除存档」操作消失（独立 key）
- 同一浏览器所有存档槽位共享同一份履历
- 最多保留 30 条完结轮回，超出后删最旧
- 每轮回最多 60 条事件，超出后丢弃普通事件（保留关键）

### 测试用例（test-guide.md 初稿）

| ID | 描述 | 步骤 | 预期结果 |
|----|------|------|---------|
| CHR-01 | 新游戏初始化轮回 | 清空 chronicle key → 开始新游戏 | current.incarnationNo === 1, outcome === 'active' |
| CHR-02 | 境界突破写入事件 | 触发突破成功 | current.events 含 realm_breakthrough，year/month 正确 |
| CHR-03 | 死亡归档 | Debug 触发 severe 死亡 | incarnations[0].outcome === 'died', current === null |
| CHR-04 | 轮回自增 | 死亡后开始新游戏 | current.incarnationNo === 2 |
| CHR-05 | 60 事件上限 | 触发 61 条事件 | events.length === 60，最早普通事件被丢弃 |
| CHR-06 | 30 轮回上限 | 模拟 31 次死亡 | incarnations.length === 30，最旧轮回被移除 |
| CHR-07 | 跨页刷新持久化 | 写入事件后刷新页面 | localStorage 中记录仍存在 |
| CHR-08 | 独立于存档删除 | 删除 xiuxian_save → 履历面板仍有记录 | xiuxian_chronicle 未被清除 |

---

## 调试面板需求

在现有 Debug 面板中新增「履历调试」分区：

| 控件 | 功能 |
|------|------|
| `[触发履历事件]` 按钮 + 类型下拉 | 手动向当前轮回写入指定类型的关键事件 |
| `[模拟死亡归档]` 按钮 | 强制 finalize 当前轮回，outcome='died' |
| `[清空履历]` 按钮（红色，需确认） | 删除 localStorage["xiuxian_chronicle"] |
| 显示字段：当前轮回编号 / 事件数 / 已完结轮回数 | 实时状态展示 |

---

## 依赖关系

### 前置任务

| 任务 | 原因 |
|------|------|
| T0029 突破系统 ✅ | 需在 attemptBreakthrough() 中插入事件 |
| T0040 死亡系统 ✅ | 需在 applyDeath() 中插入事件并触发轮回归档 |
| T0031 成就系统 ✅ | achievement_unlocked 事件依赖成就 ID |
| T0042 历法系统 ✅ | 事件的 year/month 字段依赖 gameYear/gameMonth |
| T0038 多存档 ✅ | 需确认 chronicle 与多存档共存（独立 key） |

### 后续任务（可选联动）

| 任务 | 联动内容 |
|------|---------|
| T0030 转世重修 ⬜ | 转世时应触发 `game_over`（outcome='ascended' 或特殊结局），并可在下一轮回继承部分记忆 |
| T0033 仙道境界/飞升 ⬜ | 飞升成功时 outcome = 'ascended' |
| T0057 任务链 ⬜ | 任务完成里程碑可记录为特殊 chronicle 事件 |
