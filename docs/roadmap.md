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
| [T0047](tasks/todo/T0047-talent-fate.md) | 命格天赋系统 | T0001 | — | ⬜ |
| [T0056](tasks/done/T0056-initial-random-attributes.md) | 初始随机属性系统 | T0001 | — | ✅ |

### 🏷️ 事件系统

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0007](tasks/done/T0007-event-engine.md) | 事件引擎（luck 加权随机） | T0001 | — | ✅ |
| [T0008](tasks/done/T0008-explore-events.md) | 探索事件池（20+） | T0007 | — | ✅ |
| [T0009](tasks/done/T0009-adventure-system.md) | 奇遇系统 | T0007 | [spec](specs/design-novel-events.md) | ✅ |
| [T0010](tasks/done/T0010-daily-events.md) | 日常事件 | T0007 | — | ✅ |
| [T0011](tasks/done/T0011-event-log.md) | 事件日志（分类/颜色/回溯） | T0007 | — | ✅ |
| [T0057](tasks/todo/T0057-quest-chain.md) | 任务链系统（Quest Chain） | T0007, T0012, T0042, T0021 | — | ⬜ |

### 🏷️ 物品与经济

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0012](tasks/done/T0012-inventory.md) | 背包系统 | T0001 | — | ✅ |
| [T0013](tasks/done/T0013-alchemy-v2.md) | 丹药系统 v2（炼丹） | T0012 | — | ✅ |
| [T0014](tasks/done/T0014-equipment.md) | 装备系统 | T0012 | — | ✅ |
| [T0015](tasks/done/T0015-shop.md) | 商店系统 | T0012 | — | ✅ |
| [T0016](tasks/done/T0016-smithing.md) | 炼器系统 | T0012, T0014 | — | ✅ |
| [T0052](tasks/todo/T0052-auction-house.md) | 拍卖行 | T0025, T0015 | — | ⬜ |

### 🏷️ 功法与技能

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0017](tasks/done/T0017-technique-system.md) | 功法系统 | T0001 | — | ✅ |
| [T0018](tasks/done/T0018-skill-combat.md) | 技能战斗 | T0003, T0017 | [Spec](specs/T0018-skill-combat.md) | ✅ |
| [T0019](tasks/done/T0019-passive-effects.md) | 被动效果 | T0017 | [spec](specs/T0019-passive-effects.md) | ✅ |
| [T0020](tasks/done/T0020-divine-arts.md) | 神通（元素体系） | T0017, T0018 | [Spec](specs/T0020-divine-arts.md) | ✅ |
| [T0049](tasks/todo/T0049-enlightenment.md) | 悟道顿悟系统 | T0002, T0017 | — | ⬜ |
| [T0059](tasks/todo/T0059-body-cultivation.md) | 体修系统核心（体魄 · 体修境界 · 减伤） | T0001, T0003, T0017, T0019 | [spec](specs/T0059-body-cultivation.md) | 📐 |
| [T0060](tasks/todo/T0060-body-weapons.md) | 体修武器内容（拳套 · 指环 · 手甲） | T0059, T0014, T0015 | [spec](specs/T0059-body-cultivation.md) | ⬜ |
| [T0061](tasks/todo/T0061-body-techniques.md) | 体修功法内容（高阶拳法 · 指法） | T0059, T0017 | [spec](specs/T0059-body-cultivation.md) | ⬜ |
| [T0062](tasks/todo/T0062-body-ui.md) | 体修 UI（境界行 · 体魄条 · Debug 面板） | T0059, T0041, T0046 | [spec](specs/T0059-body-cultivation.md) | ⬜ |


### 🏷️ 世界与地图

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0021](tasks/todo/T0021-map-system.md) | 地图系统（多区域） | T0001 | — | ⬜ |
| [T0022](tasks/todo/T0022-region-events.md) | 区域事件 | T0007, T0021 | — | ⬜ |
| [T0023](tasks/todo/T0023-dungeon.md) | 秘境探索（限时副本） | T0021, T0003 | — | ⬜ |
| [T0024](tasks/todo/T0024-fengshui-mining.md) | 风水采矿 | T0021, T0012 | — | ⬜ |
| [T0054](tasks/todo/T0054-bounty-quest.md) | 历练悬赏任务 | T0021, T0025 | — | ⬜ |

### 🏷️ 社交与NPC

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0025](tasks/todo/T0025-npc-system.md) | NPC 系统 | T0001 | — | ⬜ |
| [T0026](tasks/todo/T0026-dialogue.md) | 对话系统 | T0025 | — | ⬜ |
| [T0027](tasks/todo/T0027-sect.md) | 门派系统 | T0025, T0017 | — | ⬜ |
| [T0028](tasks/todo/T0028-pvp.md) | PvP 切磋 | T0025, T0003 | — | ⬜ |
| [T0048](tasks/todo/T0048-romance-dual-cultivation.md) | 道侣双修系统 | T0025, T0026 | — | ⬜ |
| [T0051](tasks/todo/T0051-npc-ai-ecology.md) | NPC AI 生态（世界模拟） | T0025, T0021 | — | ⬜ |
| [T0053](tasks/todo/T0053-sect-management.md) | 宗门管理（自建宗门） | T0027, T0025, T0021 | — | ⬜ |

### 🏷️ 进阶机制

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0029](tasks/done/T0029-breakthrough-v2.md) | 突破系统重构 + 渡劫 | T0004, T0012 | [spec](specs/T0029-breakthrough-tribulation.md) | ✅ |
| [T0030](tasks/todo/T0030-reincarnation.md) | 转世重修 | T0029, T0040, T0056 | — | ⬜ |
| [T0040](tasks/done/T0040-death-system.md) | 死亡与复活系统 | T0001, T0003, T0012, T0018, T0044 | [spec](specs/T0040-death-system.md) | ✅ |
| [T0031](tasks/done/T0031-achievement.md) | 成就系统 | T0001 | [spec](specs/T0031-achievement.md) | ✅ |
| [T0032](tasks/todo/T0032-leaderboard.md) | 排行榜 | T0031 | — | ⬜ |
| [T0033](tasks/todo/T0033-ascension.md) | 仙道境界（飞升） | T0029, T0058 | — | ⬜ |
| [T0058](tasks/todo/T0058-realm-dlc.md) | 境界表 DLC 化 | — | [spec](specs/T0058-realm-dlc.md) | ⬜ |
| [T0034](tasks/todo/T0034-honghuang-endgame.md) | 洪荒终局 | T0033 | — | ⬜ |
| [T0042](tasks/done/T0042-calendar-system.md) | 年月历法系统 | T0001, T0005 | [spec](specs/T0042-calendar-system.md) | ✅ |
| [T0050](tasks/todo/T0050-inner-demon.md) | 心魔系统 | T0029 | — | ⬜ |
| [T0055](tasks/todo/T0055-heavenly-ranking.md) | 天机榜（天骄排行） | T0025, T0003, T0051 | — | ⬜ |

### 🏷️ 界面与体验

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0041](tasks/done/T0041-ui-layout-revamp.md) | 界面布局改版（三栏 + 头像） | T0006 | [spec](specs/T0041-ui-layout-revamp.md) | ✅ |
| [T0043](tasks/done/T0043-log-revamp.md) | 日志系统改进（Toast + 时间线 + 功法增强） | T0011, T0042, T0017 | — | ✅ |
| [T0044](tasks/done/T0044-combat-modal-log.md) | 战斗弹窗 + 日志精简 | T0003, T0043 | [spec](specs/T0044-combat-modal-log.md) | ✅ |
| [T0045](tasks/done/T0045-toast-combat-log-polish.md) | Toast 降噪 + 战斗日志合并 | T0043, T0044 | [spec](specs/T0045-toast-combat-log-polish.md) | ✅ |
| [T0046](tasks/done/T0046-combat-ui-revamp.md) | 战斗弹窗 UI 重做（头像+血条+可视化） | T0003, T0044, T0041 | [spec](specs/T0046-combat-ui-revamp.md) | ✅ |
| [T0063](tasks/todo/T0063-start-screen-reroll-modal.md) | 开始界面改版：随机角色弹窗 | T0056 | [spec](specs/T0063-start-screen-reroll-modal.md) | ⬜ |

### 🏷️ 部署与体验

| ID | 任务 | 前置 | Spec | 状态 |
|----|------|------|------|------|
| [T0035](tasks/todo/T0035-azure-cicd.md) | Azure SWA CI/CD | — | — | ⬜ |
| [T0036](tasks/todo/T0036-pwa.md) | PWA 支持 | T0035 | — | ⬜ |
| [T0037](tasks/todo/T0037-audio.md) | 音效系统 | — | — | ⬜ |
| [T0038](tasks/todo/T0038-multi-save.md) | 多存档 | — | — | ⬜ |
| [T0039](tasks/todo/T0039-tutorial.md) | 新手引导 | T0001 | — | ⬜ |
| [T0059](tasks/done/T0059-data-lazy-loading.md) | 数据懒加载 & Bundle 分割 | — | [spec](specs/T0059-data-lazy-loading.md) | ✅ |

---

## DLC 规划

> 所有系统须预留 `registerDLC()` 扩展点。DLC 分为两种类型：
> - **内容包 (Content Pack)** — 只挂载数据（事件/物品/妖兽/配方/装备/功法/境界/任务链），不新增系统代码，社区可制作
> - **扩展包 (Expansion)** — 引入全新游戏系统（新的 `src/game/` 模块 + Hook + UI 面板），通常自带配套内容

### 内容包（Content Pack）

> 纯数据扩展，通过 `registerDLC()` 挂载到已有系统，无需修改系统代码。
> 命名空间：`cp-XX:item_id`

| ID | 名称 | 主题 | 挂载内容 | 前置 | 状态 |
|----|------|------|----------|------|------|
| CP-01 | 凡人修仙 | 凡人流 | 事件·物品·妖兽·功法·任务链 | T0057 | ⬜ |
| CP-02 | 苟道求真 | 苟道流 | 事件·物品·妖兽·功法·任务链 | T0057 | ⬜ |
| CP-03 | 仙道飞升 | 仙界 | 境界·事件·物品·妖兽·功法·任务链 | T0058, T0033 | ⬜ |
| CP-04 | 洪荒天地 | 洪荒流 | 境界·事件·物品·妖兽·任务链 | CP-03 | ⬜ |
| CP-05 | 魔道逆天 | 魔道流 | 事件·物品·妖兽·功法·任务链 | T0050 | ⬜ |

### 扩展包（Expansion）

> 引入全新游戏系统，包含新的逻辑模块、UI 面板和配套数据。
> 命名空间：`exp-XX:item_id`

| ID | 名称 | 主题 | 新增系统 | 前置 | 状态 |
|----|------|------|---------|------|------|
| EXP-01 | 签到模拟器 | 系统流 | 每日签到·挂机面板·奖励日历 | T0042, T0031 | ⬜ |
| EXP-02 | 无限秘境 | 无限流 | 程序生成副本·无限 Loop·副本排行 | T0023, T0021 | ⬜ |
| EXP-03 | 量劫天道 | 洪荒终局 | 量劫系统·圣人机制·天道感应 | CP-04, T0051 | ⬜ |
| EXP-04 | 宗门争霸 | 宗门流 | 宗门战争·领地争夺·宗门建设 | T0027, T0053, T0021 | ⬜ |

### 原 DLC 映射

| 原编号 | → 新分类 | 变更原因 |
|--------|---------|---------|
| DLC-1 凡人流 | CP-01 | 纯内容，降为内容包 |
| DLC-2 系统流 | EXP-01 | 签到/模拟器需新系统，升为扩展包 |
| DLC-3 苟道流 | CP-02 | 纯内容，降为内容包 |
| DLC-4 无限流 | EXP-02 | 无限副本循环需新系统，升为扩展包 |
| DLC-5 洪荒流 | CP-04 + EXP-03 | 拆分：数据→内容包，新机制→扩展包 |

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
| 物品 | `ItemDef` | `core:iron_ore` | 所有可拥有的东西（材料/杂物/消耗品/丹药） |
| 装备 | `EquipDef` | `core:iron_sword` | 武器/防具/饰品模板 |
| 妖兽 | `MonsterDef` | `core:wolf` | 战斗系统消费的怪物定义 |
| 功法 | `TechniqueDef` | `core:basic_meditation` | 功法/技能定义 |
| 炼丹配方 | `RecipeDef` | `core:recipe_hp_pill` | 炼丹配方（输入→输出） |
| 炼器配方 | `SmithingRecipeDef` | `core:smith_iron_sword` | 炼器配方 |
| 商品 | `ShopGoodsDef` | `core:shop_basic` | 商店可售商品列表定义 |
| 突破需求 | `BreakthroughReqDef` | `core:bt_lianqi` | 各境界突破条件 |
| 天劫 | `TribulationDef` | `core:trib_dujie` | 渡劫定义 |
| 死亡触发 | `DeathTriggerDef` | `core:death_combat` | 死亡判定规则 |
| 护命道具 | `LifeSaverDef` | `core:jade_pendant` | 死亡时自动消耗的保命物品 |
| 复活手段 | `RevivalMethodDef` | `core:revival_pill` | 复活方式定义 |
| 境界 | `RealmDef` | `core:mortal` | 境界定义（T0058 后生效） |
| 任务链 | `QuestChainDef` | `cp-01:fanren_ch1` | 多步骤剧情任务链（T0057 后生效） |

> 上表按需扩展。新增内容类型时，在注册表新增对应 Map + register/query API 即可。

### DLCPack 结构（扩展后）

```ts
interface DLCPack {
  id: string;           // 'core' | 'cp-01' | 'exp-01' | ...
  name: string;
  description: string;
  version: string;
  type: 'core' | 'content-pack' | 'expansion';
  // ── 内容挂载（content-pack 和 expansion 都可用）──
  events?: GameEvent[];
  items?: ItemDef[];
  equips?: EquipDef[];
  monsters?: MonsterDef[];
  techniques?: TechniqueDef[];
  recipes?: RecipeDef[];
  shopGoods?: ShopGoodsDef[];
  realms?: RealmDef[];           // T0058 新增
  questChains?: QuestChainDef[]; // T0057 新增
  // ── 系统扩展（仅 expansion 使用）──
  // systems?: SystemExtension[];  // 预留
}
```

### 实施规则

1. **数据注册制**：所有内容类型均通过 `registerDLC()` 注册到全局表，DLC 只需调用注册函数
2. **ID 命名空间**：核心用 `core:xxx`，内容包用 `cp-XX:xxx`，扩展包用 `exp-XX:xxx`，避免冲突
3. **条件谓词**：事件/商品/配方等可附带 `condition?: (p: Player) => boolean`，DLC 可自定义任意条件
4. **Player 扩展字段**：`player.systems` / `player.passives` / `player.items` 使用 `Record<string, unknown>` 动态扩展
5. **系统零硬编码**：系统模块（如 `combat.ts`）从注册表 **查询** 数据，不 import 具体数据常量
6. **核心数据即 DLC**：`data/core-*.json` + `game/data.ts` 的内容最终整合进 `core` DLC 包，启动时自动注册
7. **JSON 优先**：纯数值型内容（物品/丹药/妖兽/配方）优先用 JSON 定义 + Loader 转换，便于生成和 diff
8. **Loader 模式**：每种内容类型可配套一个 `*-loader.ts`（类似 `event-loader.ts`），将 JSON 纯数据转为带函数的运行时对象
