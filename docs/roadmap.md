# Roadmap — 修仙小游戏

> 以任务（Task）为原子单位的开发看板。
> 每个任务声明前置依赖 + 索引设计文档，形成 DAG 依赖图。
> 任务 ID 范围 T0001–T9999（10000 个槽位），新任务可随时追加到任意分类。
> 每个任务对应 `docs/tasks/T0001-xxx.md` 独立文件。

---

## 状态图例

| 图标 | 含义 |
|------|------|
| ✅ | 已完成 |
| 📐 | 设计完成，待实现 |
| 🔨 | 开发中 |
| ⬜ | 未开始 |

---

## 任务列表

### 🏷️ 核心循环

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0001](tasks/done/T0001-attribute-system.md) | 属性系统（四类属性） | — | [spec](specs/design-attribute-system.md) | ✅ |
| [T0002](tasks/done/T0002-cultivation.md) | 修炼系统 | T0001 | — | ✅ |
| [T0003](tasks/done/T0003-combat-v2.md) | 战斗系统 v2 | T0001 | — | ✅ |
| [T0004](tasks/done/T0004-breakthrough-v1.md) | 境界突破 v1 | T0002 | — | ✅ |
| [T0005](tasks/done/T0005-lifespan.md) | 寿命系统 | T0001 | — | ✅ |
| [T0006](tasks/done/T0006-status-panel.md) | 状态面板 v2 | T0001 | — | ✅ |

### 🏷️ 事件系统

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0007](tasks/done/T0007-event-engine.md) | 事件引擎（luck 加权随机） | T0001 | — | ✅ |
| [T0008](tasks/done/T0008-explore-events.md) | 探索事件池（20+） | T0007 | — | ✅ |
| [T0009](tasks/done/T0009-adventure-system.md) | 奇遇系统 | T0007 | [spec](specs/design-novel-events.md) | ✅ |
| [T0010](tasks/done/T0010-daily-events.md) | 日常事件 | T0007 | — | ✅ |
| [T0011](tasks/done/T0011-event-log.md) | 事件日志（分类/颜色/回溯） | T0007 | — | ✅ |

### 🏷️ 物品与经济

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0012](tasks/done/T0012-inventory.md) | 背包系统 | T0001 | — | ✅ |
| [T0013](tasks/done/T0013-alchemy-v2.md) | 丹药系统 v2（炼丹） | T0012 | — | ✅ |
| [T0014](tasks/done/T0014-equipment.md) | 装备系统 | T0012 | — | ✅ |
| [T0015](tasks/done/T0015-shop.md) | 商店系统 | T0012 | — | ✅ |
| [T0016](tasks/done/T0016-smithing.md) | 炼器系统 | T0012, T0014 | — | ✅ |

### 🏷️ 功法与技能

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0017](tasks/done/T0017-technique-system.md) | 功法系统 | T0001 | — | ✅ |
| [T0018](tasks/todo/T0018-skill-combat.md) | 技能战斗 | T0003, T0017 | — | ⬜ |
| [T0019](tasks/todo/T0019-passive-effects.md) | 被动效果 | T0017 | — | ⬜ |
| [T0020](tasks/todo/T0020-divine-arts.md) | 神通（元素体系） | T0017, T0018 | — | ⬜ |

### 🏷️ 世界与地图

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0021](tasks/todo/T0021-map-system.md) | 地图系统（多区域） | T0001 | — | ⬜ |
| [T0022](tasks/todo/T0022-region-events.md) | 区域事件 | T0007, T0021 | — | ⬜ |
| [T0023](tasks/todo/T0023-dungeon.md) | 秘境探索（限时副本） | T0021, T0003 | — | ⬜ |
| [T0024](tasks/todo/T0024-fengshui-mining.md) | 风水采矿 | T0021, T0012 | — | ⬜ |

### 🏷️ 社交与NPC

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0025](tasks/todo/T0025-npc-system.md) | NPC 系统 | T0001 | — | ⬜ |
| [T0026](tasks/todo/T0026-dialogue.md) | 对话系统 | T0025 | — | ⬜ |
| [T0027](tasks/todo/T0027-sect.md) | 门派系统 | T0025, T0017 | — | ⬜ |
| [T0028](tasks/todo/T0028-pvp.md) | PvP 切磋 | T0025, T0003 | — | ⬜ |

### 🏷️ 进阶机制

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0029](tasks/done/T0029-breakthrough-v2.md) | 突破系统重构 + 渡劫 | T0004, T0012 | [spec](specs/T0029-breakthrough-tribulation.md) | ✅ |
| [T0030](tasks/todo/T0030-reincarnation.md) | 转世重修 | T0029, T0040 | — | ⬜ |
| [T0040](tasks/todo/T0040-death-system.md) | 死亡与复活系统 | T0001, T0003, T0012 | [spec](specs/T0040-death-system.md) | ⬜ |
| [T0031](tasks/todo/T0031-achievement.md) | 成就系统 | T0001 | — | ⬜ |
| [T0032](tasks/todo/T0032-leaderboard.md) | 排行榜 | T0031 | — | ⬜ |
| [T0033](tasks/todo/T0033-ascension.md) | 仙道境界（飞升） | T0029 | — | ⬜ |
| [T0034](tasks/todo/T0034-honghuang-endgame.md) | 洪荒终局 | T0033 | — | ⬜ |
| [T0042](tasks/todo/T0042-calendar-system.md) | 年月历法系统 | T0001, T0005 | [spec](specs/T0042-calendar-system.md) | 📐 |

### 🏷️ 界面与体验

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0041](tasks/done/T0041-ui-layout-revamp.md) | 界面布局改版（三栏 + 头像） | T0006 | [spec](specs/T0041-ui-layout-revamp.md) | ✅ |

### 🏷️ 部署与体验

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0035](tasks/todo/T0035-azure-cicd.md) | Azure SWA CI/CD | — | — | ⬜ |
| [T0036](tasks/todo/T0036-pwa.md) | PWA 支持 | T0035 | — | ⬜ |
| [T0037](tasks/todo/T0037-audio.md) | 音效系统 | — | — | ⬜ |
| [T0038](tasks/todo/T0038-multi-save.md) | 多存档 | — | — | ⬜ |
| [T0039](tasks/todo/T0039-tutorial.md) | 新手引导 | T0001 | — | ⬜ |

---

## DLC 规划

> 所有系统须预留 `registerDLC()` 扩展点。DLC 任务在基础壳子完成后追加到上方任务列表。

| DLC | 小说流派 | 内容示例 | 状态 |
|-----|----------|----------|------|
| DLC-1 | 凡人流 | 《凡人修仙传》相关奇遇 | ⬜ |
| DLC-2 | 系统流 | 修仙模拟器 / 签到系统 | ⬜ |
| DLC-3 | 苟道流 | 《仙逆》《一念永恒》相关奇遇 | ⬜ |
| DLC-4 | 无限流 | 无限恐怖 / 副本闯关 | ⬜ |
| DLC-5 | 洪荒流 | 《佛本是道》/ 准圣→圣人 | ⬜ |

## 扩展性约定

### 核心原则：系统 ≠ 内容

> **系统是纯逻辑壳子，所有具体内容（物品 / 丹药 / 装备 / 妖兽 / 功法 / 配方 / 商品…）
> 均为"可挂载数据"，通过全局注册表注册，核心包也是 DLC（namespace: `core`）。**

这意味着：
- `src/game/` 下的系统模块（背包、炼丹、装备、商店、炼器…）只实现**通用逻辑**，不硬编码任何具体内容
- 所有具体内容定义在数据层（JSON / TS 数据文件），通过 `registerDLC()` 统一注册
- DLC 通过注册同类型数据即可扩展任意系统，无需修改系统代码

### 内容类型注册表

DLCPack 覆盖以下内容类型，每种类型对应注册表中的一个 Map：

| 内容类型 | 类型名 | ID 示例 | 说明 |
|----------|--------|---------|------|
| 事件 | `GameEvent` | `core:find_ore` | 探索/奇遇/日常事件 |
| 物品 | `ItemDef` | `core:iron_ore` | 所有可拥有的东西（材料/杂物/消耗品） |
| 丹药 | `PillDef` | `core:hp_pill` | 炼丹产出 & 可使用的丹药 |
| 装备 | `EquipDef` | `core:iron_sword` | 武器/防具/饰品模板 |
| 妖兽 | `MonsterDef` | `core:wolf` | 战斗系统消费的怪物定义 |
| 功法 | `TechniqueDef` | `core:basic_meditation` | 功法/技能定义 |
| 配方 | `RecipeDef` | `core:recipe_hp_pill` | 炼丹/炼器配方（输入→输出） |
| 商品 | `ShopGoodsDef` | `core:shop_basic` | 商店可售商品列表定义 |

> 上表按需扩展。新增内容类型时，在注册表新增对应 Map + register/query API 即可。

### DLCPack 结构（扩展后）

```ts
interface DLCPack {
  id: string;           // 'core' | 'dlc-1' | ...
  name: string;
  description: string;
  version: string;
  // ── 内容挂载（均为可选，按需提供）──
  events?: GameEvent[];
  items?: ItemDef[];
  pills?: PillDef[];
  equips?: EquipDef[];
  monsters?: MonsterDef[];
  techniques?: TechniqueDef[];
  recipes?: RecipeDef[];
  shopGoods?: ShopGoodsDef[];
}
```

### 实施规则

1. **数据注册制**：所有内容类型均通过 `registerDLC()` 注册到全局表，DLC 只需调用注册函数
2. **ID 命名空间**：核心用 `core:xxx`，DLC 用 `dlc-N:xxx`，避免冲突
3. **条件谓词**：事件/商品/配方等可附带 `condition?: (p: Player) => boolean`，DLC 可自定义任意条件
4. **Player 扩展字段**：`player.systems` / `player.passives` / `player.items` 使用 `Record<string, unknown>` 动态扩展
5. **系统零硬编码**：系统模块（如 `combat.ts`）从注册表 **查询** 数据，不 import 具体数据常量
6. **核心数据即 DLC**：`data/core-*.json` + `game/data.ts` 的内容最终整合进 `core` DLC 包，启动时自动注册
7. **JSON 优先**：纯数值型内容（物品/丹药/妖兽/配方）优先用 JSON 定义 + Loader 转换，便于生成和 diff
8. **Loader 模式**：每种内容类型可配套一个 `*-loader.ts`（类似 `event-loader.ts`），将 JSON 纯数据转为带函数的运行时对象
