# 设计文档：商店集成到场景视图（NPC 商人模式）

任务：#197
日期：2026-04-08

## 概述

将商店面板从右侧浮动窗口迁移到中央场景视图（SceneView），以 **NPC 商人** 为单位组织分店。每个拥有 `roles: ['merchant']` 的 NPC 就是一个分店 tab，展示该商人的专属商品。卖出功能统一放在一个「💰 出售」tab 中。

商人 NPC 及其商品均通过 `registerDLC()` 注册，DLC 可向任意区域挂载新商人 + 独家商品，实现完全的数据驱动扩展。

玩家进入有商人的区域时，场景中自然出现商铺区块，无需再到右栏点按钮开窗口。

---

## 现状分析

### 当前商店入口链路

1. 右栏 `PanelButtons` → 点击 🏪 商店 → 浮动面板 `FloatingPanel` 包裹 `ShopPanel`
2. `ShopPanel` 内部有 买入/卖出 两个 tab
3. 买入列表通过 `getShopGoodsForRegion(player)` 过滤当前区域可售商品
4. SceneHeader 已展示 `🏪 折扣X%` 标签（但点击无反应）

### 痛点

- 商店藏在右栏浮动面板里，需要两次点击才能到达，且浮动窗遮挡场景
- 有商铺标签但不能直接买东西，信息断层
- 每个区域的商品不同，但玩家无法从场景感知"这里能买什么"

---

## 设计方案

### 核心思路

每个 NPC 商人（`roles` 包含 `'merchant'`）绑定一组 `shopGoods`（商品列表）。SceneShop 组件查询当前区域内的商人 NPC，每个商人作为一个 tab，展示其专属商品。无商人的区域不渲染商铺区块。

**DLC 扩展方式**：DLC 注册新的商人 NPC（含 `shopGoods` 字段）→ 商人出现在对应区域 → 场景自动多出一个分店 tab。

### NPC 商人示例（core DLC）

| NPC | 角色 | 驻守区域 | 经营商品 |
|-----|------|---------|---------|
| 张药师 | 丹药阁掌柜 | 青云镇 | 回血丹、回蓝丹、体力丹、心情丹、健康丹 |
| 李铁匠 | 百宝铺掌柜 | 青云镇 | 铁剑、布帽、麻衣、草鞋、玉佩、铁拳套… |
| 王材官 | 材料坊掌柜 | 青云镇 | 灵石碎片 |
| 灵药谷药农 | 药材商 | 灵药谷 | 灵水、灵芝、灵石碎片 |
| 矿山老汉 | 矿石商 | 妖兽山/荒原 | 铁矿、灵石碎片 |
| 仙都仙师 | 仙器铺掌柜 | 仙都 | 灵剑、灵冠、灵袍、疾风靴、灵戒… |

> 无 `regionTags` 的全局商品（如基础丹药）由驻守对应区域的商人 NPC 持有。DLC 新增商人时，只需在 `npcs.json` 中定义 NPC + 在 `shop.json` 中将商品的 `npcId` 指向该 NPC。

### 改版后 SceneView 结构

```
┌─ SceneHeader (区域标题+描述+标签) ─────────────┐
├─ SceneNpcs (此地之人，NPC 卡片) ───────────────┤
├─ SceneShop (此地商铺) ← 新增 ──────────────────┤
│   TabBar: [🧪张药师] [⚔️李铁匠] [💰 出售]       │
│   （仅显示当前区域的商人 NPC tab）               │
├─ ActionPanel (修炼/战斗/探索/休息/外出/突破) ──┤
└─ (SceneFooter 等未来集成) ─────────────────────┘
```

### DLC 扩展场景

```
加载 DLC "凡人修仙" 后，青云镇多出一个符篆商人：

TabBar: [🧪张药师] [⚔️李铁匠] [📜王符师] [💰 出售]
                                 ↑ DLC 新增
```

### 关键决策

| 问题 | 决策 | 理由 |
|------|------|------|
| 分店方式 | 按 NPC 商人分 tab，每个商人 = 一个分店 | 有角色感、DLC 可挂载新商人 |
| 商人与商品关联 | `ShopGoodsDef` 新增可选 `npcId` 字段 | 指定"谁卖这件商品" |
| 无 npcId 的旧商品 | 迁移时为现有商品分配对应的商人 NPC | 保证向后兼容 |
| 有/无商人的区域 | 当前区域无商人 NPC → 不渲染 SceneShop | 零干扰 |
| Tab 显示内容 | `NPC.emoji + NPC.name`（如 `🧪 张药师`） | 直观，有角色感 |
| 卖出功能 | 所有商人共享统一的「💰 出售」tab | 避免"去哪个商人卖"的困惑 |
| 右栏商店按钮 | **移除** | 商店已在场景中 |
| 灵石余额 | 标题行右侧显示 | 买卖时随时可见 |
| 区域折扣 | SceneHeader 已展示折扣标签，价格自动应用 | 无需改动 |
| 商品列表高度 | `max-height: 240px`，超出内部滚动 | 避免挤压 ActionPanel |
| 好感度影响 | **本期不做**，预留接口。未来可按好感度解锁隐藏商品 | 控制范围 |

---

## 数据结构

### ShopGoodsDef 变更

新增可选 `npcId` 字段，指定"谁卖这件商品"：

```ts
// game/types.ts 修改
export interface ShopGoodsDef {
  itemId: string;
  buyPrice: number;
  stock: number;
  regionTags?: string[];   // 保留，但优先使用 npcId 的区域归属
  npcId?: string;          // ← 新增：持有此商品的商人 NPC ID
}
```

### NpcDef 利用现有字段

`NpcDef` 已有 `roles: NpcRole[]` 和 `shopGoodsIds?: string[]`。本次：
- 商人 NPC 的 `roles` 包含 `'merchant'`
- `shopGoodsIds` 暂不使用（商品侧通过 `npcId` 反向引用更灵活，一件商品可以被多个商人卖）

### DLCPack 变更

新增 `shopGoods` 字段：

```ts
// game/types.ts 修改
export interface DLCPack {
  // ... 现有字段 ...
  shopGoods?: ShopGoodsDef[];  // ← 新增：商店商品
}
```

### 新增查询函数

```ts
// game/shop.ts 新增

/** 获取当前区域内的商人 NPC 列表 */
function getMerchantsInRegion(player: Player): NpcDef[] { ... }

/** 获取指定商人的商品列表 */
function getGoodsForMerchant(npcId: string, player: Player): ShopGoodsDef[] { ... }

/** 当前区域是否有商人 */
function hasShopInRegion(player: Player): boolean { ... }
```

### shop.json 数据迁移

为现有商品添加 `npcId`，并在 `npcs.json` 中新增对应的商人 NPC：

```jsonc
// shop.json（迁移后示例）
[
  { "itemId": "core:hp_pill",  "buyPrice": 20, "stock": -1, "npcId": "core:merchant_zhang" },
  { "itemId": "core:mp_pill",  "buyPrice": 20, "stock": -1, "npcId": "core:merchant_zhang" },
  { "itemId": "core:iron_sword", "buyPrice": 30, "stock": 3, "npcId": "core:merchant_li", "regionTags": ["town","safe"] },
  // ...
]
```

```jsonc
// npcs.json 新增商人 NPC
{
  "id": "core:merchant_zhang",
  "name": "张药师",
  "title": "丹药阁掌柜",
  "emoji": "🧪",
  "gender": "male",
  "description": "青云镇丹药铺的掌柜，常年经营各类丹药。",
  "roles": ["merchant"],
  "disposition": "friendly",
  "regionTags": ["town", "safe"],
  "homeRegionId": "core:qingyun_town",
  // ... 其他属性
}
```

---

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键类/函数 |
|------|------|-------------|
| `src/components/panels/scene/SceneShop.tsx` | 场景内商店区块 | `SceneShop` 组件 |
| `src/components/panels/scene/SceneShop.css` | SceneShop 样式 | — |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | `ShopGoodsDef` 增加 `npcId?` 字段；`DLCPack` 增加 `shopGoods?` 字段 | 商人关联 + DLC 挂载 |
| `src/game/shop.ts` | 新增 `getMerchantsInRegion`、`getGoodsForMerchant`、`hasShopInRegion`；`registerShopGoods` 支持 `npcId` | 按商人分组查询 |
| `src/game/registry/dlc.ts` | `registerDLC` 增加 `shopGoods` 注册逻辑 | DLC 可注册商品 |
| `src/game/registry/stores.ts` | 如果 shopGoods 当前不在 registry store 中，需确认注册方式 | — |
| `src/components/panels/scene/SceneView.tsx` | 在 SceneNpcs 和 ActionPanel 之间插入 `<SceneShop />` | 整合商店到场景 |
| `src/components/layout/PanelButtons.tsx` | 经济分组中移除 `shop` 项 | 右栏不再提供商店入口 |
| `src/components/layout/RightPanel.tsx` | 移除 ShopPanel 的渲染分支 | 商店不再由右栏渲染 |
| `src/data/dlc/core/shop.json` | 所有商品加 `npcId` 字段 | 指定商人 |
| `src/data/dlc/core/npcs.json` | 新增 6~8 个商人 NPC（张药师、李铁匠等） | 分店载体 |
| `src/data/dlc/core/manifest.ts` | 加载 shop.json 并注册到 DLC pack 的 `shopGoods` | DLC 注册入口 |
| `src/App.tsx` | 将 `onBuy`/`onSell` 回调传入 SceneView | 事件冒泡 |

### 不修改的文件

| 文件 | 原因 |
|------|------|
| `src/components/panels/ShopPanel.tsx` | **保留不删**。SceneShop 内部直接复用 ShopBuyItem / ShopSellItem 子组件，但不复用 ShopPanel 整体容器（因容器包含浮动面板样式）。ShopPanel 文件暂保留，待确认无其他引用后再清理 |
| `src/components/panels/shop/ShopBuyItem.tsx` | 原封不动复用 |
| `src/components/panels/shop/ShopSellItem.tsx` | 原封不动复用 |
| `src/game/shop.ts` 核心逻辑 | 买卖逻辑不变，仅新增一个判断函数 |

### SceneShop 组件设计

```
┌──────────────────────────────────────────┐
│ 此地商铺                  💰 1280 灵石    │
│ ┌───────────────────────────────────────┐│
│ │[🧪张药师][⚔️李铁匠][🪨王材官][💰出售] ││ ← 按商人 NPC 动态生成
│ ├───────────────────────────────────────┤│
│ │ 回血丹               💰20     [买]    ││ ← 当前商人的商品
│ │ 回蓝丹               💰20     [买]    ││
│ │ 体力丹               💰16     [买]    ││
│ │ ┈ 向下滚动查看更多 ┈                  ││
│ └───────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

**Tab 动态生成规则**：
- 查询当前区域的商人 NPC（`getMerchantsInRegion`）
- 每个商人生成一个 tab：`{ key: npc.id, label: npc.emoji + ' ' + npc.name }`
- 最后固定追加「💰 出售」tab
- 例：青云镇 → `[🧪 张药师] [⚔️ 李铁匠] [🪨 王材官] [💰 出售]`
- 例：灵药谷 → `[🌿 灵药谷药农] [💰 出售]`（只有一个商人）

伪代码：

```tsx
function SceneShop({ player, onBuy, onSell }) {
  const merchants = getMerchantsInRegion(player);
  if (merchants.length === 0) return null;

  // 动态构建 tabs：每个商人 + 固定的出售 tab
  const tabs = merchants
    .map(npc => ({ key: npc.id, label: `${npc.emoji} ${npc.name}` }))
    .concat({ key: 'sell', label: '💰 出售' });

  const [activeTab, setActiveTab] = useState(tabs[0].key);
  const inventoryEntries = getInventoryEntries(player);

  return (
    <div className="scene-shop">
      <div className="scene-section-header">
        <span className="scene-section-title">此地商铺</span>
        <span className="scene-shop-gold">💰 {player.gold} 灵石</span>
      </div>
      <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      <div className="scene-shop-list">
        {activeTab === 'sell'
          ? inventoryEntries.map(e => <ShopSellItem ... />)
          : getGoodsForMerchant(activeTab, player).map(g => <ShopBuyItem ... />)
        }
      </div>
    </div>
  );
}
```

### 场景排列顺序

1. **SceneHeader** — 你在哪（区域标题 + 描述 + 标签）
2. **SceneNpcs** — 身边有谁（NPC 卡片）
3. **SceneShop** — 此地商铺（商人 NPC tabs + 商品列表 + 统一出售）← **新增**
4. **ActionPanel** — 能做什么（修炼/战斗/探索/休息/突破）

商铺排在 NPC 之后、操作按钮之前，因为：
- 逻辑上，先看到"人和物"，再决定"做什么"
- 操作按钮必须始终可见（靠近底部），商铺可以滚动

---

## UI 方案（@Designer）

### 新增界面/面板

| 元素 | 位置 | 内容 |
|------|------|------|
| SceneShop 区块 | SceneView 中，SceneNpcs 下方 | 标题行 + TabBar + 商品滚动列表 |

### 样式规范

- **区块外观**：与 SceneNpcs 保持一致的卡片风格（`scene-section-header` 标题行 + 内容区），使用 CSS 变量
- **标题行**：左侧"此地商铺"文本，右侧灵石余额（金色 `var(--color-gold)`）
- **TabBar**：复用现有 `TabBar` 组件，紧凑尺寸。Tab 数量动态，取决于当前区域有多少商人 NPC
- **商品列表**：`max-height: 240px`（约 4 件商品高度），`overflow-y: auto` 内部滚动
- **无商品提示**：不渲染整个区块（而非显示空列表）
- **买/卖按钮**：直接复用 ShopBuyItem / ShopSellItem 现有样式
- **分隔线**：区块之间由 `scene-view` 的 `gap` 自然分隔，无需额外 border
- **出售 tab**：固定在最右，使用 💰 图标区分于买入分店

### 交互

- 进入有商铺的区域 → 商铺区块出现（无动画，随场景刷新）
- 离开有商铺区域 → 商铺区块消失
- 买入/卖出 → 与现有逻辑完全一致（扣灵石/加物品/日志提示）
- 商品列表超 4 件 → 区块内滚动，ActionPanel 位置不变
- 卖出 tab → 显示背包中可卖物品（复用 ShopSellItem）

### 移动端/小屏幕适配

- SceneShop 在窄屏下自然全宽展示（与 SceneNpcs 一致）
- 列表 `max-height` 在小屏可适当缩小（如 `180px`），通过媒体查询调整
- TabBar 按钮在窄屏仍横排（只有 2 个 tab，不会溢出）

---

## 右栏变更

### 移除商店按钮

从 `PanelButtons.tsx` 的 PANEL_GROUPS 中移除 `shop` 条目：

```
变更前（经济分组）：          变更后（经济分组）：
┌─────────────────┐         ┌─────────────────┐
│ 经济             │         │ 经济             │
│ [🎒背包][🏪商店] │         │ [🎒 背包]        │
└─────────────────┘         └─────────────────┘
```

- `RightPanel.tsx` 中移除 ShopPanel 的渲染分支和相关 props
- `PanelKey` 类型中保留 `'shop'`（避免影响其他类型引用），但按钮不再展示
- 或者如果确认无其他地方引用 `'shop'` key，可同步移除

### 清理（可选，低优先级）

- `ShopPanel.tsx` 可标记为 deprecated，在确认无引用后删除
- `PANEL_WIDTHS` 中的 `shop: 380` 可移除

---

## 验证方式

### 手动测试用例

1. **商人展示 — 青云镇**
   - 前往"青云镇"
   - 场景视图出现"此地商铺"区块
   - TabBar 显示 `[🧪 张药师] [⚔️ 李铁匠] [🪨 王材官] [💰 出售]`
   - 默认选中第一个商人（张药师），显示回血丹、回蓝丹等消耗品
   - 切换到李铁匠 → 显示铁剑、布帽、草鞋、玉佩等装备

2. **商人展示 — 灵药谷**
   - 前往"灵药谷"
   - TabBar 显示 `[🌿 灵药谷药农] [💰 出售]`（只有一个商人）
   - 药农商品包含灵水、灵芝、灵石碎片等

3. **买入功能**
   - 在任一商人 tab 中点击"买"→ 灵石减少、日志输出购买记录
   - 灵石不足时"买"按钮禁用

4. **统一卖出功能**
   - 切换到"💰 出售"tab
   - 显示背包中所有可卖物品及售价（不分类型）
   - 点击"卖1"→ 背包物品减少、灵石增加
   - 背包为空时显示"背包空空…"

5. **无商人区域**
   - 如果某区域没有任何商人 NPC → 整个商铺区块不渲染
   - ActionPanel 正常显示不受影响

6. **区域切换 — 商人动态变化**
   - 从青云镇前往灵药谷 → 商人 tab 完全切换
   - activeTab 重置为第一个商人
   - 不同区域之间切换 → tab 数量和商品列表同步刷新

7. **DLC 扩展验证**
   - 加载额外 DLC 后，对应区域应出现 DLC 新增的商人 tab
   - DLC 商人的商品不与 core 商人混在一起

8. **右栏按钮移除**
   - 右栏经济分组只剩"背包"一个按钮
   - 原商店浮动面板不再可触发

9. **折扣展示**
   - 有魅力属性或区域 shopDiscount 时，商品价格体现折扣（价格旁标注 -X%）

10. **商品滚动**
    - 当商人的商品超过 4 件时，列表可滚动
    - ActionPanel 不被推到视口外

## 调试面板需求

无需更新 Debug 面板。现有的灵石修改、物品添加功能足以测试商店交互。

## 依赖关系

- **前置任务**：T0069（场景视图基础结构 — 已完成）、T0015（商店系统 — 已完成）、T0021（地图系统 — 已完成）、T0025（NPC 系统 — 已完成）
- **后续可选**：好感度解锁隐藏商品、NPC 专属折扣、拍卖行（T0052）
- **清理**：ShopPanel.tsx 确认无引用后删除
