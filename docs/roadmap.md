# Roadmap — 修仙小游戏

> 从最小可玩原型到完整修仙世界的阶段规划。
> 每个 Milestone 拆分为独立文件，详见 `docs/roadmap/` 目录。
> 小说奇遇事件（DLC）将在基础壳子完成后按"一本小说一个 Milestone"的方式追加。

---

## 总览

| Milestone | 主题 | Stage 数 | 文件 | 状态 |
|-----------|------|----------|------|------|
| A | 核心循环 | 6 | [milestone-a.md](roadmap/milestone-a.md) | ✅ |
| B | 随机事件引擎 | 5 | [milestone-b.md](roadmap/milestone-b.md) | ✅ |
| C | 物品与经济 | 5 | [milestone-c.md](roadmap/milestone-c.md) | ⬜ |
| D | 功法与技能 | 4 | [milestone-d.md](roadmap/milestone-d.md) | ⬜ |
| E | 世界与地图 | 4 | [milestone-e.md](roadmap/milestone-e.md) | ⬜ |
| F | 社交与NPC | 4 | [milestone-f.md](roadmap/milestone-f.md) | ⬜ |
| G | 进阶机制 | 6 | [milestone-g.md](roadmap/milestone-g.md) | ⬜ |
| H | 部署与体验优化 | 5 | [milestone-h.md](roadmap/milestone-h.md) | ⬜ |
| **合计** | | **39** | | |

## DLC 规划（基础壳子完成后追加）

> 小说奇遇事件以 DLC 形式加入，一本小说 = 一个 Milestone。
> 设计文档见 `docs/specs/design-novel-events.md`。
> 所有系统在设计时须预留**事件注册、被动注册、物品注册**扩展点，方便 DLC 插入。

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
