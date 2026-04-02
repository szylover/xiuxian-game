# 设计文档：地图系统（多区域）
任务：T0021
日期：2026-03-31

## 概述

引入多区域地图系统，将游戏世界划分为多个可探索的区域（新手村、妖兽山、灵药谷、秘境荒原、仙都等）。玩家初始位于「青云镇」，通过满足境界门槛解锁新区域，消耗时间和精力进行移动。不同区域拥有不同的事件池、妖兽分布、商品供应，为修炼、战斗、探索带来区域差异化体验。

所有区域数据通过 `registerDLC()` 注册，系统层不硬编码任何具体区域，后续 DLC/内容包可自由追加新区域。

## 数据结构

### A1. RegionDef — 区域定义

```ts
interface RegionDef {
  id: string;                     // 命名空间 ID，如 'core:qingyun_town'
  name: string;                   // 显示名称，如 '青云镇'
  emoji: string;                  // 显示用 emoji，如 '🏘️'
  description: string;            // 区域描述
  minRealm: number;               // 最低进入境界（realmIndex）
  // ── 内容筛选标签 ──
  regionTags: string[];           // 区域标签，如 ['town', 'safe']，用于筛选事件/妖兽/商品
  // ── 移动消耗 ──
  travelCostBase: number;         // 基础移动精力消耗
  travelTimeMonths: number;       // 移动耗时（月数），默认 1
  // ── 区域特性 ──
  safeZone?: boolean;             // 安全区：无法触发战斗（默认 false）
  explorationBonus?: number;      // 探索事件额外权重加成（0~1，如 0.2 = +20%）
  combatBonus?: number;           // 战斗经验加成（0~1，如 0.3 = +30%）
  shopDiscount?: number;          // 商店折扣加成（0~1，如 0.1 = 额外9折）
  // ── 连接（可选，预留寻路）──
  connections?: string[];         // 可直接移动到的相邻区域 ID 列表
}
```

### A2. 现有类型扩展 — 为事件/妖兽/商品增加区域标签

**GameEvent（JSON 事件）扩展**：
```ts
// JsonEvent 新增可选字段
interface JsonEvent {
  // ...existing fields...
  regionTags?: string[];   // 事件适用区域标签，如 ['mountain', 'wilderness']
                           // 空/未设置 = 所有区域通用
}

// GameEvent 运行时类型同步新增
interface GameEvent {
  // ...existing fields...
  regionTags?: string[];
}
```

**MonsterDef 扩展**：
```ts
interface MonsterDef {
  // ...existing fields...
  regionTags?: string[];   // 妖兽出没区域标签，如 ['mountain', 'forest']
                           // 空/未设置 = 所有区域通用
}
```

**ShopGoodsDef 扩展**：
```ts
interface ShopGoodsDef {
  // ...existing fields...
  regionTags?: string[];   // 商品在哪些区域可购买
                           // 空/未设置 = 所有区域通用
}
```

### A3. MapSystemState — 地图系统状态（存入 player.systems）

```ts
interface MapSystemState {
  currentRegionId: string;         // 当前所在区域 ID
  unlockedRegions: string[];       // 已解锁区域 ID 列表
  travelCount: number;             // 累计移动次数（成就用）
}
```

存储路径：`player.systems['map']`

### A4. DLCPack 扩展

```ts
interface DLCPack {
  // ...existing fields...
  regions?: RegionDef[];           // 该 DLC 提供的区域定义
}
```

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键类/函数 |
|------|------|-------------|
| `src/game/map.ts` | 地图系统核心逻辑 | `getMapState()`, `travelTo()`, `getUnlockedRegions()`, `checkRegionAccess()`, `calcTravelCost()`, `getCurrentRegion()` |
| `src/data/core-regions.json` | 核心区域定义数据 | — |
| `src/components/panels/MapPanel.tsx` | 地图面板 UI | — |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | 新增 `RegionDef` 接口；`DLCPack` 增加 `regions?` 字段；`MonsterDef` 增加 `regionTags?` 字段；`GameEvent` 增加 `regionTags?` 字段 | 数据模型 |
| `src/game/registry/stores.ts` | 新增 `regionRegistry: Map<string, RegionDef>` | 注册表存储 |
| `src/game/registry/dlc.ts` | `registerDLC` / `unregisterDLC` 增加 `regions` 处理 | DLC 注册 |
| `src/game/registry/queries.ts` | 新增 `getRegion()`, `getAllRegions()`, `getRegionsByMinRealm()` | 查询 API |
| `src/game/registry/index.ts` | barrel re-export 新增类型和函数 | 导出 |
| `src/game/event-loader.ts` | `JsonEvent` 增加 `regionTags?`，`loadEventsFromJson` 透传 | 事件加载 |
| `src/game/events.ts` | `triggerExploreEvent` 增加 `regionId?` 参数，按区域筛选事件池 | 探索按区域 |
| `src/game/registry/event-engine.ts` | `triggerEvent` 增加可选 `regionTags` 参数，筛选匹配事件 | 事件筛选 |
| `src/game/shop.ts` | `ShopGoodsDef` 增加 `regionTags?`；`getAllShopGoods` 增加 `regionId?` 过滤 | 区域商店 |
| `src/hooks/useCoreActions.ts` | `fight` 按当前区域筛选妖兽；`explore` 传入区域；安全区禁战检查 | 核心行为适配 |
| `src/hooks/useSystemActions.ts` | 新增 `travel` 行为；商店调用传入区域 | 系统行为 |
| `src/game/data.ts` | `ACTION_COSTS` 新增 `travel` 条目 | 移动消耗 |
| `src/components/layout/PanelButtons.tsx` | `PanelKey` union 加 `'map'`；`PANEL_GROUPS` 新增地图按钮 | 面板入口 |
| `src/components/layout/LeftPanel.tsx` | 在境界下方显示当前区域名称 + emoji | 位置展示 |
| `src/components/layout/RightPanel.tsx` | 渲染 `MapPanel` 面板 | 面板容器 |
| `src/components/panels/ActionPanel.tsx` | 战斗按钮在安全区时 disabled + tooltip | 安全区限制 |
| `src/hooks/useGameEngine.ts` | 初始化时设置默认区域状态；存档兼容处理 | 系统初始化 |
| `src/game/player/create.ts` | 新建角色时在 `systems` 中初始化 `map` 状态 | 初始状态 |

### 公式

#### 移动精力消耗

```
actualCost = max(1, floor(region.travelCostBase × (100 / (100 + player.speed × 0.5))))
```

- `speed` 越高，移动消耗越低
- `moveSpeed` 装备加成进一步降低消耗：`actualCost = max(1, floor(actualCost × (100 / (100 + player.moveSpeed))))`
- 最终公式：`actualCost = max(1, floor(base × speedFactor × moveSpeedFactor))`
  - `speedFactor = 100 / (100 + speed × 0.5)`，speed=0 → ×1.0，speed=100 → ×0.67
  - `moveSpeedFactor = 100 / (100 + moveSpeed)`，moveSpeed=0 → ×1.0，moveSpeed=50 → ×0.67

#### 移动耗时

```
travelTimeMonths = region.travelTimeMonths   // 固定值，由区域数据定义
```

Phase 1 不做速度影响耗时，保持简单。

#### 区域解锁检查

```ts
function checkRegionAccess(player: Player, region: RegionDef): boolean {
  return player.realmIndex >= region.minRealm;
}
```

#### 妖兽区域筛选

```ts
// 战斗时：先按 realmIndex 粗筛，再按当前区域 regionTags 过滤
const regionTags = getCurrentRegion(player).regionTags;
const eligible = getAllMonsters().filter(m =>
  m.realmIndex >= player.realmIndex - 1 &&
  m.realmIndex <= player.realmIndex &&
  (!m.regionTags?.length || m.regionTags.some(t => regionTags.includes(t)))
);
```

落入规则：`regionTags` 未设置或为空的妖兽/事件/商品 = 全区域通用，不受区域限制。

#### 事件区域筛选

```ts
// 事件引擎 filterAvailable 增加 regionTags 过滤
function filterAvailable(events: GameEvent[], player: Player, regionTags?: string[]): GameEvent[] {
  return events.filter(e => {
    // ...existing checks (once, cooldown, condition)...
    // 区域标签匹配
    if (regionTags && e.regionTags?.length) {
      if (!e.regionTags.some(t => regionTags.includes(t))) return false;
    }
    return true;
  });
}
```

#### 商品区域筛选

```ts
function getShopGoodsForRegion(regionId: string): ShopGoodsDef[] {
  const region = getRegion(regionId);
  if (!region) return getAllShopGoods();
  const tags = region.regionTags;
  return getAllShopGoods().filter(g =>
    !g.regionTags?.length || g.regionTags.some(t => tags.includes(t))
  );
}
```

## UI 方案（@Designer）

### 新增界面/面板

| 元素 | 位置 | 内容 |
|------|------|------|
| 地图面板 `MapPanel.tsx` | 右栏面板区 | 显示所有区域卡片，当前位置高亮，可移动目标，移动按钮 |
| 当前区域标签 | 左栏头像区下方 | emoji + 区域名（如 "🏘️ 青云镇"） |
| 地图按钮 | 右栏 PANEL_GROUPS | 🗺️ 地图（放在物品经济组后面或新增世界组） |

### 地图面板布局

```
┌──────────────────────────────────┐
│  🗺️ 世界地图                     │
├──────────────────────────────────┤
│  📍 当前位置：🏘️ 青云镇           │
├──────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐│
│  │ 🏘️ 青云镇    │  │ ⛰️ 妖兽山   ││
│  │ 新手起步之地  │  │ 妖兽横行之地 ││
│  │ [当前位置]   │  │ [前往] 15精力││
│  │ 境界：凡人   │  │ 境界：炼气   ││
│  └─────────────┘  └─────────────┘│
│  ┌─────────────┐  ┌─────────────┐│
│  │ 🌿 灵药谷    │  │ 🏜️ 荒原     ││
│  │ 灵药遍地     │  │ 凶险之地     ││
│  │ [前往] 20精力 │  │ 🔒 需筑基   ││
│  │ 境界：炼气   │  │ 境界：筑基   ││
│  └─────────────┘  └─────────────┘│
│  ┌─────────────┐  ┌─────────────┐│
│  │ 🌙 秘境      │  │ 🏛️ 仙都     ││
│  │ 机遇与危险   │  │ 仙人聚居     ││
│  │ 🔒 需金丹   │  │ 🔒 需元婴   ││
│  │ 境界：金丹   │  │ 境界：元婴   ││
│  └─────────────┘  └─────────────┘│
└──────────────────────────────────┘
```

### 交互

- 点击区域卡片上的「前往」按钮执行移动
- 已解锁但精力不足时按钮 disabled，tooltip 显示消耗
- 未解锁区域显示 🔒 图标 + 所需境界
- 当前位置区域卡片高亮边框 + "📍 当前位置"标签
- 移动成功后弹 Toast："🗺️ 到达 ⛰️ 妖兽山"
- 安全区标记：安全区卡片显示 🛡️ 标签

### 左栏当前区域显示

在左栏头像区域的"【境界名】"下方新增一行：
```
📍 🏘️ 青云镇
```

## 核心区域内容建议

### 6 个核心区域

| ID | emoji | 名称 | 最低境界 | 基础移动消耗 | 特色 | regionTags |
|----|-------|------|---------|-------------|------|------------|
| `core:qingyun_town` | 🏘️ | 青云镇 | 凡人(0) | 0（初始区域） | 安全区、基础商店、低阶事件 | `['town', 'safe']` |
| `core:beast_mountain` | ⛰️ | 妖兽山 | 炼气(1) | 15 | 妖兽密集、战斗经验+20%、低中阶妖兽 | `['mountain', 'wilderness']` |
| `core:herb_valley` | 🌿 | 灵药谷 | 炼气(1) | 15 | 灵药类事件权重+30%、炼丹材料商店 | `['valley', 'herb']` |
| `core:desolate_waste` | 🏜️ | 荒原 | 筑基(2) | 25 | 高阶妖兽、战斗经验+30%、稀有矿石 | `['wasteland', 'wilderness']` |
| `core:mystic_realm` | 🌙 | 秘境 | 金丹(3) | 35 | 奇遇概率翻倍、高风险高回报、稀有装备 | `['mystic', 'dangerous']` |
| `core:celestial_city` | 🏛️ | 仙都 | 元婴(4) | 40 | 高阶商店、仙级功法/丹药、NPC 集中 | `['city', 'celestial']` |

### 区域特性说明

1. **青云镇**（初始区域，安全区）
   - `safeZone: true` — 无法战斗
   - 基础商店（现有全部商品）
   - 所有通用事件 + 少量城镇事件
   - 新手友好区域

2. **妖兽山**
   - 炼气~筑基阶妖兽密集
   - `combatBonus: 0.2` — 战斗经验+20%
   - 妖兽材料掉落率更高

3. **灵药谷**
   - `explorationBonus: 0.3` — 灵药类探索事件权重+30%
   - 炼丹材料商品丰富
   - 适合炼丹流玩家

4. **荒原**
   - 金丹阶以下妖兽 + 部分高阶妖兽
   - `combatBonus: 0.3` — 战斗经验+30%
   - 稀有矿石事件

5. **秘境**
   - 奇遇事件权重翻倍
   - 高风险：强力妖兽 + 陷阱事件
   - 稀有装备/丹药事件

6. **仙都**
   - 高阶商店（仙级物品）
   - `shopDiscount: 0.1` — 额外9折
   - NPC 集中（为后续 T0025 预留）

## 与现有系统的整合

### F1. 事件系统

**现状**：`triggerExploreEvent()` → `triggerEvent('explore', player)` → 从 `eventRegistry` 按 category 过滤 → luck 加权随机。events 无区域概念。

**改造**：
1. `GameEvent` / `JsonEvent` 新增可选 `regionTags?: string[]`
2. `event-loader.ts` 的 `loadEventsFromJson` 透传 `regionTags`
3. `triggerEvent()` 增加可选 `regionTags` 参数
4. `filterAvailable()` 内部增加 regionTags 匹配逻辑
5. `triggerExploreEvent()` 读取玩家当前区域，将区域 tags 传入 `triggerEvent`
6. **向后兼容**：无 regionTags 的事件在所有区域都可触发

### F2. 战斗系统

**现状**：`useCoreActions.fight()` 从 `getAllMonsters()` 按 `realmIndex` 筛选。monsters 无区域概念。

**改造**：
1. `MonsterDef` 新增可选 `regionTags?: string[]`
2. `fight()` 读取当前区域 tags，增加 regionTags 过滤
3. 安全区（`safeZone: true`）时禁止战斗，UI 按钮 disabled
4. 区域 `combatBonus` 应用于 `expReward` 和 `goldReward`
5. **向后兼容**：无 regionTags 的妖兽在所有区域都可遇到

### F3. 商店系统

**现状**：`shopGoodsRegistry` 全局数组，`getAllShopGoods()` 返回全部。无区域概念。

**改造**：
1. `ShopGoodsDef` 新增可选 `regionTags?: string[]`
2. `getAllShopGoods()` 增加可选 `regionId` 参数
3. 按当前区域 tags 过滤商品（未设 regionTags 的商品在所有区域可见）
4. 区域 `shopDiscount` 叠加 charisma 折扣

### F4. 存档兼容

**旧存档（无 map 状态）**：
```ts
// useGameEngine.ts 加载存档时检查
if (!player.systems['map']) {
  player.systems['map'] = {
    currentRegionId: 'core:qingyun_town',  // 默认初始区域
    unlockedRegions: ['core:qingyun_town'], // 仅解锁初始区域
    travelCount: 0,
  } satisfies MapSystemState;
}
```

加载完毕后立即根据当前境界刷新 `unlockedRegions`（可能玩家境界已很高）。

## 验证方式

### 在浏览器中如何测试

1. 开始新游戏，确认左栏显示「📍 🏘️ 青云镇」
2. 右栏出现「🗺️ 地图」按钮，点击展开地图面板
3. 地图面板显示 6 个区域卡片，青云镇高亮为当前位置
4. 妖兽山、灵药谷显示 🔒（需炼气），无法点击前往
5. 通过 Debug 面板将境界提升至炼气，妖兽山、灵药谷解锁
6. 点击「前往 ⛰️ 妖兽山」，扣除精力 + 时间推进，左栏显示更新
7. 在妖兽山战斗，确认遇到的妖兽与该区域 tags 匹配
8. 在安全区（青云镇）点击战斗按钮，确认 disabled 并显示 tooltip
9. 进入灵药谷探索，确认灵药类事件概率提高
10. 商店面板确认显示的商品按当前区域过滤

### 预期行为描述

- 新玩家从青云镇开始，只能在安全区修炼/探索/休息，不能战斗
- 到达炼气后解锁妖兽山和灵药谷，可移动过去
- 不同区域的探索/战斗/商店内容有差异
- 移动消耗精力且推进时间，speed 高的玩家消耗更少
- 旧存档加载后默认在青云镇，且根据境界自动解锁所有满足条件的区域

### 测试用例

| # | 场景 | 操作 | 预期结果 |
|---|------|------|----------|
| 1 | 新游戏初始状态 | 开始新游戏 | 左栏显示「📍 🏘️ 青云镇」，地图面板仅青云镇可达 |
| 2 | 安全区限制 | 在青云镇点击战斗 | 按钮禁用，tooltip"安全区域无法战斗" |
| 3 | 区域解锁 | Debug 设境界=炼气 | 妖兽山、灵药谷可前往；荒原以上仍锁 |
| 4 | 移动消耗 | 前往妖兽山 | 精力-15（受 speed 调节），时间+1 月，位置变更 |
| 5 | 精力不足 | 精力<travel cost 时点前往 | 按钮 disabled，tooltip 显示消耗 |
| 6 | 区域战斗筛选 | 在妖兽山战斗 | 遇到的妖兽包含 mountain/wilderness 标签或无标签 |
| 7 | 区域商店 | 在灵药谷打开商店 | 显示带 herb 标签的商品 + 通用商品 |
| 8 | 旧存档兼容 | 加载无 map 的存档 | 自动设为青云镇，按境界解锁区域 |

## 调试面板需求

- **区域传送** — 在 DebugStatsTab 增加「当前区域」下拉选择，可快速切换到任意区域（无视境界限制）
- **解锁全部区域** — 增加按钮「解锁全部区域」，一键解锁所有注册区域

## 依赖关系

### 前置任务
- T0001 属性系统（✅）— Player 基础属性（speed、realmIndex 等）

### 后续任务（已在 roadmap 中声明 T0021 为前置）
- T0022 区域事件 — 为每个区域编写专属事件
- T0023 秘境探索 — 基于区域系统的限时副本
- T0024 风水采矿 — 区域特有的采集系统
- T0054 历练悬赏 — 区域关联的悬赏任务
- T0051 NPC AI 生态 — NPC 在区域间活动
- T0053 宗门管理 — 宗门领地与区域关联

## 实现计划

### Phase 1 — 数据层 + 注册表（建议先完成）

1. `types.ts` 新增 `RegionDef` 接口，`DLCPack` 增加 `regions?`
2. `MonsterDef` / `GameEvent` / `ShopGoodsDef` 增加 `regionTags?`
3. `registry/stores.ts` 新增 `regionRegistry`
4. `registry/dlc.ts` 处理 `regions` 注册/注销
5. `registry/queries.ts` 新增查询 API
6. `registry/index.ts` re-export
7. `event-loader.ts` 透传 `regionTags`

### Phase 2 — 系统逻辑（map.ts）

1. `src/game/map.ts` 实现核心函数
2. `src/data/core-regions.json` 定义 6 个核心区域
3. `events.ts` 注册核心区域到 core DLC
4. `player/create.ts` 初始化 MapSystemState

### Phase 3 — 系统联动

1. `events.ts` / `event-engine.ts` 适配区域筛选
2. `useCoreActions.ts` fight/explore 适配区域
3. `shop.ts` 适配区域过滤
4. `useGameEngine.ts` 存档兼容
5. `data.ts` ACTION_COSTS 新增 travel

### Phase 4 — UI

1. `MapPanel.tsx` 地图面板
2. `PanelButtons.tsx` 新增地图按钮
3. `LeftPanel.tsx` 显示当前区域
4. `RightPanel.tsx` 渲染 MapPanel
5. `ActionPanel.tsx` 安全区战斗限制

### Phase 5 — Debug + 测试

1. `DebugStatsTab.tsx` 新增区域传送 + 全部解锁
2. 测试用例验证

### 需要修改的文件清单

| # | 文件 | 操作 | Phase |
|---|------|------|-------|
| 1 | `src/game/types.ts` | 修改 | 1 |
| 2 | `src/game/registry/stores.ts` | 修改 | 1 |
| 3 | `src/game/registry/dlc.ts` | 修改 | 1 |
| 4 | `src/game/registry/queries.ts` | 修改 | 1 |
| 5 | `src/game/registry/index.ts` | 修改 | 1 |
| 6 | `src/game/event-loader.ts` | 修改 | 1 |
| 7 | `src/game/map.ts` | **新增** | 2 |
| 8 | `src/data/core-regions.json` | **新增** | 2 |
| 9 | `src/game/events.ts` | 修改 | 2+3 |
| 10 | `src/game/player/create.ts` | 修改 | 2 |
| 11 | `src/game/registry/event-engine.ts` | 修改 | 3 |
| 12 | `src/hooks/useCoreActions.ts` | 修改 | 3 |
| 13 | `src/game/shop.ts` | 修改 | 3 |
| 14 | `src/hooks/useSystemActions.ts` | 修改 | 3 |
| 15 | `src/hooks/useGameEngine.ts` | 修改 | 3 |
| 16 | `src/game/data.ts` | 修改 | 3 |
| 17 | `src/components/panels/MapPanel.tsx` | **新增** | 4 |
| 18 | `src/components/layout/PanelButtons.tsx` | 修改 | 4 |
| 19 | `src/components/layout/LeftPanel.tsx` | 修改 | 4 |
| 20 | `src/components/layout/RightPanel.tsx` | 修改 | 4 |
| 21 | `src/components/panels/ActionPanel.tsx` | 修改 | 4 |
| 22 | `src/components/debug/DebugStatsTab.tsx` | 修改 | 5 |
