# T0021 — 地图系统（多区域） + 系统体验改进

- **状态**: 🔨 开发中
- **分类**: 世界与地图 + 体验改进
- **前置**: T0001, T0059
- **Spec**: [T0021-map-system.md](../../specs/T0021-map-system.md)

## 完成内容

### 🗺️ 地图系统（T0021 核心）
- **RegionDef 类型** — 区域定义含 parentId（树状结构）、isContainer（世界容器）、regionTags 等
- **MapSystemState** — 当前区域、已解锁区域、旅行次数
- **map.ts** — 移动、解锁检查、消耗计算（speed/moveSpeed 影响）
- **注册表扩展** — regionRegistry + DLCPack.regions + 查询 API
- **core-regions.json** — 凡界容器 + 6 个核心区域（青云镇→妖兽山→灵药谷→荒原→秘境→仙都）
- **MapPanel.tsx** — 树状渲染 + 折叠展开 + 容器分组 + 区域卡片
- **PanelButtons** — 新增「🗺️ 地图」按钮（🌍 世界分组）
- **LeftPanel** — 头像下方显示当前区域

### ⚔️ 区域联动
- **事件系统** — GameEvent/JsonEvent 增加 regionTags，event-engine 按区域筛选事件
- **战斗系统** — MonsterDef 增加 regionTags，fight 按区域筛选妖兽 + 安全区禁战
- **商店系统** — ShopGoodsDef 增加 regionTags，商店按区域过滤商品
- **core-events.json** — 1036 个事件中 473 个打了区域标签
- **core-shop.json** — 商品按区域分配（基础全区域、灵药归灵药谷、装备归对应区域）

### 🔥 体修突破按钮
- **body-cultivation.ts** — 新增 getBodyBreakthroughStatus() 状态查询
- **useSystemActions** — 新增 bodyBreakthrough action
- **ActionPanel** — 气修/体修突破按钮独立显示，满足条件动态弹出，disabled 时 hover 显示缺什么

### 📍 区域解锁多路线
- **map.ts** — getMaxCultivationLevel() 取 max(realmIndex, bodyRealmIndex)
- **MapPanel** — 锁定区域显示"需达到 炼气(气修) 或 铜皮(体修)"

### 📋 详细属性面板改版
- **StatusPanel** — 新增境界/位置/灵石/背包/修为/会心伤害/金系资质
- 资质分组：元素资质（始终显示）+ 折叠"更多"（武技·生活资质 + 追踪数据）
- 数据驱动 APTITUDE_GROUPS 便于 DLC 扩展

### 📖 功法/神通筛选
- **TechniquePanel + DivineArtsPanel** — 新增"只看可学/全部"切换按钮

### 🔧 存档兼容
- **useSaveLoad** — 旧存档自动初始化 map 状态
- **useGameEngine** — 加载存档时按境界刷新解锁区域

### 🐛 调试面板
- **DebugStatsTab** — 新增区域传送（无视境界限制）

## 关键文件

| 新增 | 说明 |
|------|------|
| src/game/map.ts | 地图核心逻辑 |
| src/data/core-regions.json | 核心区域数据 |
| src/components/panels/MapPanel.tsx | 地图面板 UI |
| docs/specs/T0021-map-system.md | 设计文档 |
| scripts/tag-events-region.py | 事件 regionTags 打标脚本 |

| 修改 | 说明 |
|------|------|
| 31 个文件共 ~3000 行变更 | 类型/注册表/UI/Hook/数据 全链路 |

## 完成日期
2026-03-31
