# 设计文档：成就系统（Achievement System）
任务：T0031  
日期：2026-04-01

---

## 概述

成就系统让玩家通过完成各类游戏目标（战斗、修炼、炼丹、收集等）解锁**称号**和**永久属性加成**，提供长期驱动力和成就感。成就定义遵循"系统 ≠ 内容"原则：引擎只负责检测与存储，所有成就数据通过 `registerDLC()` 注册，核心成就以 `core:xxx` 命名注册。

---

## 数据结构

### AchievementCategory

```ts
// src/game/achievement/types.ts
export type AchievementCategory = 'combat' | 'cultivation' | 'collection' | 'alchemy' | 'misc';
```

### AchievementBonusStats

永久属性加成分为两类：

**① recalcStats 型**（每次 `recalcStats()` 叠加，随境界重算基础值保持相对正确）：
```ts
export interface AchievementRecalcBonus {
  atk?: number;
  def?: number;
  speed?: number;
  hp?: number;              // 加到 maxHp
  mp?: number;              // 加到 maxMp
  mentalPower?: number;     // 加到 maxMentalPower
  critRate?: number;
  critDmgMultiplier?: number;
  critResist?: number;
  moveSpeed?: number;
}
```

**② 一次性型**（解锁瞬间直接加到 Player，不参与 recalcStats 循环）：
```ts
export interface AchievementOnceBonus {
  luck?: number;
  comprehension?: number;
  charisma?: number;
  lifespan?: number;
}
```

**合并类型**：
```ts
export type AchievementBonusStats = AchievementRecalcBonus & AchievementOnceBonus;
```

### AchievementDef

```ts
export interface AchievementDef {
  id: string;                           // 命名空间 ID，如 'core:first_blood'
  name: string;                         // 称号名称，如 "初战之人"
  description: string;                  // 解锁说明，如 "击败第一只妖兽"
  category: AchievementCategory;        // 分类
  icon: string;                         // emoji 图标，如 '⚔️'
  condition: (p: Player) => boolean;   // 解锁谓词（纯函数，不能有副作用）
  bonusStats?: AchievementBonusStats;  // 永久属性加成（可无）
  bonusDescription?: string;           // 加成描述，如 "攻击 +1"（纯展示）
  hidden?: boolean;                    // true = 未解锁时隐藏条件（默认 false）
}
```

### AchievementSystemState

存储在 `player.systems.achievement`：

```ts
export interface AchievementSystemState {
  unlockedIds: string[];     // 已解锁成就 ID 列表（按解锁时间顺序）
  pendingToast: string[];    // 本轮行动新解锁的 ID，供 UI Toast 读取后清空
}
```

### DLCPack 扩展

在 `src/game/types.ts` 的 `DLCPack` 接口末尾追加：

```ts
achievements?: AchievementDef[];      // 该 DLC 提供的成就定义
```

---

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键导出 |
|------|------|---------|
| `src/game/achievement/types.ts` | 全部类型定义 | `AchievementDef`, `AchievementCategory`, `AchievementBonusStats`, `AchievementRecalcBonus`, `AchievementOnceBonus`, `AchievementSystemState` |
| `src/game/achievement/engine.ts` | 引擎逻辑 | `checkAchievements()`, `getAchievementRecalcBonus()`, `initAchievementState()` |
| `src/game/achievement/data.ts` | 核心成就数据 | `CORE_ACHIEVEMENTS: AchievementDef[]`（在 `registerCoreEvents()` 中注册） |
| `src/components/panels/AchievementPanel.tsx` | UI 面板 | `AchievementPanel` |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | 引入 `AchievementDef`，在 `DLCPack` 末尾加 `achievements?: AchievementDef[]` | DLC 数据扩展 |
| `src/game/registry/dlc.ts` | 新增 `achievementRegistry: Map<string, AchievementDef>`，在 `registerDLC()` 中循环注册 | 注册成就到全局表 |
| `src/game/player/stats.ts` | `recalcStats()` 末段调用 `getAchievementRecalcBonus(p)` 叠加 recalcStats 型加成 | 永久属性加成生效 |
| `src/game/events.ts` | `registerCoreEvents()` 末段调用 `registerDLC({ ..., achievements: CORE_ACHIEVEMENTS })` | 注册核心成就 |
| `src/components/layout/PanelButtons.tsx` | `PanelKey` union 加 `'achievement'`；`PANEL_GROUPS` 新增第三组 | 面板接入 |
| `src/components/layout/RightPanel.tsx` | `PANEL_CONFIG` 新增 achievement 条目；渲染分支加 `AchievementPanel` | 面板渲染 |

### 关键函数签名

#### `initAchievementState(): AchievementSystemState`
```ts
// 返回空白状态，用于 player 初始化
export function initAchievementState(): AchievementSystemState {
  return { unlockedIds: [], pendingToast: [] };
}
```

#### `checkAchievements(player: Player): Player`
```ts
// 检查所有已注册成就，对未解锁的逐一调用 condition(player)
// 新解锁：将 ID 写入 state.unlockedIds 和 state.pendingToast
// 一次性加成（luck/comprehension/charisma/lifespan）在此直接叠加到 player
// 返回更新后的 Player（含新解锁状态 + 一次性加成）
export function checkAchievements(player: Player): Player
```

**调用时机**：在以下动作的最终结果中调用（在 App.tsx 或对应 handler 中）：
- 修炼（cultivate）
- 探索（explore）
- 战斗结束（combat end）
- 突破（breakthrough）
- 炼丹 / 炼器（craft / smith）
- 休息（rest）

#### `getAchievementRecalcBonus(player: Player): AchievementRecalcBonus`
```ts
// 遍历已解锁成就，累加所有 bonusStats 中的 recalcStats 型字段
// 被 recalcStats() 调用
export function getAchievementRecalcBonus(player: Player): AchievementRecalcBonus
```

#### `getAllAchievements(): AchievementDef[]`
```ts
// 从 achievementRegistry 返回全部已注册成就（供 UI 遍历）
export function getAllAchievements(): AchievementDef[]
```

### recalcStats 叠加点（在功法被动加成之后）

```ts
// ── 成就永久加成（T0031）——recalcStats 型 ──
const achBonus = getAchievementRecalcBonus(p);
if (achBonus.atk)               p.atk += achBonus.atk;
if (achBonus.def)               p.def += achBonus.def;
if (achBonus.speed)             p.speed += achBonus.speed;
if (achBonus.hp)                p.maxHp += achBonus.hp;
if (achBonus.mp)                p.maxMp += achBonus.mp;
if (achBonus.mentalPower)       p.maxMentalPower += achBonus.mentalPower;
if (achBonus.critRate)          p.critRate += achBonus.critRate;
if (achBonus.critDmgMultiplier) p.critDmgMultiplier += achBonus.critDmgMultiplier;
if (achBonus.critResist)        p.critResist += achBonus.critResist;
if (achBonus.moveSpeed)         p.moveSpeed += achBonus.moveSpeed;
```

### 公式与边界

- `condition` 是纯谓词，不得修改 player（引擎保证只读调用）
- 每个成就只解锁一次：`checkAchievements` 跳过 `state.unlockedIds` 中已有的 ID
- 一次性加成（luck 等）在 `checkAchievements` 解锁时直接 `p.luck += bonus.luck` 叠加，不通过 recalcStats
- `pendingToast` 在 UI 层读取并展示 Toast 后，调用者负责清空（`state.pendingToast = []`）
- 成就 `condition` 抛出异常时应被 try-catch 吞掉，避免影响游戏主流程

---

## 核心成就列表（26 条，@Content 维护于 `data.ts`）

### ⚔️ 战斗（combat）

| ID | 称号 | 解锁条件 | 永久加成 | 加成描述 |
|----|------|---------|---------|---------|
| `core:first_blood` | 初战之人 | `tracking.killCount >= 1` | atk +1 | 攻击 +1 |
| `core:beast_slayer_50` | 妖兽猎手 | `tracking.killCount >= 50` | atk +3 | 攻击 +3 |
| `core:beast_slayer_100` | 百战老将 | `tracking.killCount >= 100` | atk +5 | 攻击 +5 |
| `core:beast_slayer_1000` | 千杀屠魔 | `tracking.killCount >= 1000` | atk +15, def +5 | 攻击 +15，防御 +5 |
| `core:boss_hunter_10` | 精英猎手 | `tracking.bossKillCount >= 10` | atk +5, def +5 | 攻击 +5，防御 +5 |
| `core:higher_realm_victory` | 以弱胜强 | `tracking.defeatedHigherRealm === true` | atk +3, def +3 | 攻击 +3，防御 +3 |
| `core:near_death_survivor` | 九死一生 | `tracking.hasBeenBelow10Hp === true` | hp +20 | 气血上限 +20 |

### 🧘 修炼（cultivation）

| ID | 称号 | 解锁条件 | 永久加成 | 加成描述 |
|----|------|---------|---------|---------|
| `core:qi_condensation` | 筑基有成 | `realmIndex >= 1` | hp +10 | 气血上限 +10 |
| `core:golden_core` | 金丹道人 | `realmIndex >= 3` | hp +20, mp +10 | 气血上限 +20，灵力上限 +10 |
| `core:nascent_soul` | 元婴天骄 | `realmIndex >= 4` | hp +30, mp +20, atk +5 | 气血 +30，灵力 +20，攻击 +5 |
| `core:tribulation_survived` | 天劫渡世 | `(p.systems.breakthrough as any)?.tribulationsPassed?.length >= 1` | hp +20, mp +10 | 气血 +20，灵力 +10 |
| `core:breakthrough_stubborn` | 百折不挠 | `tracking.consecutiveBreakthroughFails >= 3` | comprehension +5 | 悟性 +5（一次性） |
| `core:cultivate_streak` | 修炼痴人 | `tracking.consecutiveCultivates >= 10` | hp +5 | 气血上限 +5 |
| `core:centenarian` | 百岁长者 | `age >= 100` | lifespan +50 | 寿元 +50（一次性） |

### 🔥 炼丹（alchemy）

| ID | 称号 | 解锁条件 | 永久加成 | 加成描述 |
|----|------|---------|---------|---------|
| `core:first_pill` | 丹道入门 | `(p.systems.alchemy as any)?.totalCrafted >= 1` | mentalPower +5 | 念力上限 +5 |
| `core:pill_master_50` | 丹道精通 | `(p.systems.alchemy as any)?.totalCrafted >= 50` | mentalPower +10 | 念力上限 +10 |
| `core:pill_excellent` | 极品丹师 | `(p.systems.alchemy as any)?.excellentCount >= 1` | mentalPower +5 | 念力上限 +5 |
| `core:pill_grandmaster` | 丹道宗师 | `(p.systems.alchemy as any)?.totalCrafted >= 200` | mentalPower +20, luck +3 | 念力上限 +20，幸运 +3（一次性） |

> **注**：alchemy 子系统当前未单独追踪 `totalCrafted`/`excellentCount`，需在炼丹 handler（`craft` 动作）中于 `player.systems.alchemy` 写入计数。如该字段不存在则 condition 返回 false，成就暂不解锁，安全降级。

### 📦 收集（collection）

| ID | 称号 | 解锁条件 | 永久加成 | 加成描述 |
|----|------|---------|---------|---------|
| `core:first_gold` | 初获灵石 | `gold >= 100` | luck +1 | 幸运 +1（一次性） |
| `core:wealthy` | 万贯家财 | `gold >= 10000` | luck +3, charisma +2 | 幸运 +3，魅力 +2（一次性） |
| `core:item_collector` | 收藏家 | `inventory.length >= 10` | charisma +2 | 魅力 +2（一次性） |
| `core:technique_scholar` | 功法博学 | `techniques.length >= 3` | atk +5, def +5 | 攻击 +5，防御 +5 |
| `core:equipment_hoarder` | 装备达人 | `Object.values(equipped).filter(Boolean).length >= 5` | def +5 | 防御 +5 |

> `equipment_hoarder` 条件实为"同时佩戴 5 件及以上装备"，当前最多 6 槽，>=5 代表近满装。

### 🌟 综合（misc）

| ID | 称号 | 解锁条件 | 永久加成 | 加成描述 |
|----|------|---------|---------|---------|
| `core:first_year` | 踏上修途 | `gameYear >= 2` | luck +1 | 幸运 +1（一次性） |
| `core:near_death_escape` | 死里逃生 | `(p.systems.death as any)?.revivalCount >= 1` | hp +10 | 气血上限 +10 |
| `core:inner_demon_survivor` | 心魔征服 | `tracking.lowMoodStreak >= 5 && mood > 50` | luck +2 | 幸运 +2（一次性） |
| `core:full_inventory` | 背囊充盈 | `inventory.length >= inventoryCapacity` | luck +1 | 幸运 +1（一次性） |

---

## UI 方案（@Designer）

### 新增界面：AchievementPanel

| 元素 | 位置 | 内容 |
|------|------|------|
| 面板标题栏 | FloatingPanel 内顶部 | "🏆 成就" + 已解锁数 / 总数，如 "8 / 26" |
| 分类 Tab 栏 | 标题栏下方 | 5 个 Tab：全部 / 战斗 / 修炼 / 炼丹 / 收集 / 综合 |
| 成就卡片区域 | Tab 下方，可滚动 | 每行一张成就卡片 |
| 永久加成汇总 | 面板底部固定栏 | 显示所有已解锁成就的属性加成合计 |

### 成就卡片布局

```
┌─────────────────────────────────────────────────────────┐
│  [图标] [称号名]                    [已解锁 ✅ / 未解锁 🔒] │
│         [解锁说明 / 未解锁时显示"???" 如 hidden=true]        │
│         [加成描述，灰色如未解锁]                             │
└─────────────────────────────────────────────────────────┘
```

- 已解锁：卡片亮色边框（金色 `#FFD700`），图标全彩，称号文字高亮
- 未解锁：卡片灰色边框，图标置灰（opacity 0.4），称号文字灰色
- `hidden=true` 的未解锁成就：称号显示 `???`，说明显示 `???`

### 底部加成汇总栏

```
永久加成合计：攻击 +24 | 防御 +18 | 气血上限 +85 | 幸运 +7 | ...
```
仅显示数值 > 0 的项。

### PanelButtons 新增

在 `PANEL_GROUPS` 末尾增加第三组：

```ts
{
  label: '🏆 成就',
  panels: [
    { key: 'achievement', icon: '🏆', label: '成就' },
  ],
},
```

`PanelKey` union 类型扩展为：
```ts
export type PanelKey = 'inventory' | 'shop' | 'crafting' | 'equipment' | 'technique' | 'achievement';
```

### RightPanel 扩展

```ts
// PANEL_CONFIG 新增
achievement: { title: '成就', icon: '🏆', width: 420 },

// 渲染分支新增
{activePanel === 'achievement' && <AchievementPanel player={player} />}
```

`AchievementPanel` 不需要任何回调 prop，只读展示。

### 交互

- 切换 Tab：平滑过渡，默认展示"全部"
- 成就卡片 hover：轻微放大（scale 1.02），加成描述变色
- 新成就解锁：顶部弹出金色 Toast，格式：`🏆 解锁成就：[称号名] — [加成描述]`
- Toast 显示后，调用方清空 `player.systems.achievement.pendingToast`

---

## 验证方式

### 在浏览器中测试

1. 开局后进入战斗，击败第一只妖兽，确认 Toast 弹出"🏆 解锁成就：初战之人 — 攻击 +1"
2. 打开成就面板，确认卡片展示"初战之人"已解锁，底部汇总显示"攻击 +1"
3. 在 Debug 面板将 `killCount` 设为 100，手动触发任一动作，确认"百战老将"解锁
4. 将 `realmIndex` 设为 3，触发 `recalcStats`，确认属性面板中攻击/防御/气血数值包含了成就加成
5. 将 `gold` 设为 10001，触发任一动作，确认"万贯家财"解锁且 luck 立即 +3
6. 验证 `hidden=true` 成就在未解锁时显示"???"

### 预期行为

- 已解锁的成就在重新加载存档后保持（state 存储在 player.systems.achievement 中，随 player 持久化）
- 成就加成在每次 `recalcStats` 时正确叠加（与装备/功法加成不冲突）
- 一次性加成（luck/lifespan 等）只在解锁瞬间叠加一次，不重复计算

### 测试用例（将写入 `docs/test-guide.md`）

| # | 用例 | 操作 | 预期 |
|---|------|------|------|
| ACH-01 | 首次杀怪解锁成就 | 战斗击杀第 1 只妖兽 | Toast 出现"初战之人"，成就面板战斗 Tab 亮起 |
| ACH-02 | recalcStats 叠加成就加成 | 解锁"初战之人"后查看状态面板 | atk 比同境界基础值 +1 |
| ACH-03 | 一次性加成不重复 | 反复触发 checkAchievements | luck 只在首次解锁时 +3，之后不变 |
| ACH-04 | 隐藏成就 | hidden=true 成就未解锁时查看 | 称号与条件均显示"???" |
| ACH-05 | Tab 过滤 | 切换到"炼丹"Tab | 仅显示 alchemy 类成就 |
| ACH-06 | 底部汇总正确 | 解锁 5 个带 atk 加成的成就 | 底部汇总"攻击 +X"等于各成就 atk 之和 |
| ACH-07 | 存档持久化 | 解锁成就后刷新页面 | 成就仍显示已解锁，加成仍生效 |

---

## 调试面板需求

在现有 Debug 面板中新增"成就系统"分区：

| 控件 | 类型 | 作用 |
|------|------|------|
| 已解锁成就列表 | 只读文本（逗号分隔 ID） | 查看当前解锁状态 |
| "解锁全部成就"按钮 | Button | 调试用：将所有已注册成就加入 unlockedIds，一次性加成逐一叠加 |
| "清空所有成就"按钮 | Button | 调试用：清空 unlockedIds，重置一次性加成（注意：luck 等直接回退可能影响其他系统，仅用于开发测试） |
| "手动触发检测"按钮 | Button | 立即调用 `checkAchievements`（用于测试条件谓词） |
| killCount 输入框 | Number input | 快速修改 `player.tracking.killCount` |
| bossKillCount 输入框 | Number input | 快速修改 `player.tracking.bossKillCount` |

---

## 依赖关系

### 前置任务
- **T0001** ✅ 属性系统（Player 类型基础）

### 后续任务
- **T0032** ⬜ 排行榜（依赖成就系统提供称号数据）

### 横向依赖
- `PlayerTracking` 已提供 `killCount`、`bossKillCount`、`hasBeenBelow10Hp`、`defeatedHigherRealm`、`consecutiveCultivates`、`consecutiveBreakthroughFails`、`lowMoodStreak`，可直接使用
- 炼丹成就需要在炼丹 handler 中额外写入 `player.systems.alchemy.totalCrafted` 和 `excellentCount`；如该字段不存在，condition 安全返回 false
- 死亡/突破相关成就依赖 `player.systems.death` 和 `player.systems.breakthrough`，通过 `as any` 访问，安全降级

---

## 附录：注册示例（仅供说明，不是真实代码）

```ts
// src/game/achievement/data.ts（伪代码示意）
export const CORE_ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'core:first_blood',
    name: '初战之人',
    description: '击败第一只妖兽',
    category: 'combat',
    icon: '⚔️',
    condition: (p) => p.tracking.killCount >= 1,
    bonusStats: { atk: 1 },
    bonusDescription: '攻击 +1',
  },
  // ... 其余 25 条
];

// src/game/events.ts — registerCoreEvents() 末段
registerDLC({
  id: 'core',
  // ...现有内容...
  achievements: CORE_ACHIEVEMENTS,
});
```

```ts
// src/game/registry/dlc.ts — registerDLC() 中追加
for (const ach of (pack.achievements ?? [])) {
  achievementRegistry.set(ach.id, ach);
}
```
