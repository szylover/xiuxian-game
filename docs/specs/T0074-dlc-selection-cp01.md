# 设计文档：DLC 选择系统打通 + CP-01 凡人修仙内容包
任务：T0074
日期：2026-04-07

## 概述

当前项目的 DLC 系统存在以下问题：

1. `StartScreen` 有 DLC 勾选 UI（`enabledDLCs` 状态），但 `handleConfirm` 中**未把选中列表传给 `onNewGame`**，勾选无效
2. `core` DLC 标记为 `required: true`，checkbox 被禁用，用户无法取消勾选
3. `registerCoreEvents()` 在 `useGameEngine.ts` 的 `useEffect` 中**无条件加载**，不管用户选了什么
4. `Player` 类型中没有 `enabledDLCs` 字段，存档不记录加载了哪些 DLC
5. CP-01 凡人修仙内容包只有 `dlc/index.ts` 中的一条 meta 记录，实际数据文件夹为空

本设计分两部分解决：
- **Part 1**：打通 DLC 选择系统（StartScreen → Engine → 注册表 → 存档）
- **Part 2**：创建 CP-01 凡人修仙内容包（自给自足，不依赖 core 即可独立运行）

---

## Part 1：DLC 选择系统打通

### 1.1 数据流概览

```
StartScreen                    App.tsx                      useGameEngine
┌──────────┐    onNewGame()    ┌───────┐    newGame()       ┌────────────┐
│enabledDLCs├───────────────────┤       ├───────────────────►│            │
│（Set<str>）│ {...opts, dlcs}  │       │ opts.enabledDLCs  │ 清空注册表  │
└──────────┘                   └───────┘                    │ 按列表加载  │
                                                            │ 写入 Player │
                                                            └────────────┘
```

### 1.2 数据结构变更

#### 1.2.1 DLCMeta 扩展（`src/data/dlc/index.ts`）

```ts
export interface DLCMeta {
  id: string;
  name: string;
  description: string;
  version: string;
  type: 'core' | 'content-pack' | 'expansion';
  required: boolean;        // ← core 改为 false
  /** 异步加载函数，返回后数据即注册到全局注册表 */
  loader: () => Promise<void>;
}
```

- `required` 含义变更：**不再有强制必选的 DLC**，所有 DLC 均可自由勾选
- 新增 `loader` 字段：每个 DLC 的异步加载入口函数（代替硬编码的 `registerCoreEvents()`）
- `ALL_DLCS` 中 core 的 `required` 改为 `false`
- CP-01 补充 `loader` 字段

#### 1.2.2 Player 类型扩展（`src/game/player/types.ts`）

```ts
export interface Player {
  // ...existing fields...
  enabledDLCs: string[];    // 本局加载的 DLC ID 列表，如 ['core'] 或 ['cp-01']
}
```

#### 1.2.3 CreatePlayerOptions 扩展（`src/game/player/create.ts`）

```ts
export interface CreatePlayerOptions {
  // ...existing fields...
  enabledDLCs: string[];    // 从 StartScreen 传入
}
```

`createPlayer()` 中将 `options.enabledDLCs` 写入 `player.enabledDLCs`。

### 1.3 StartScreen → Engine 数据流

#### StartScreen 改动

1. 移除 `core` DLC 的 `required` 限制：**所有 DLC 的 checkbox 均可交互**
2. `handleConfirm` 传递 `enabledDLCs`：
   ```ts
   onNewGame({
     name: finalName, gender, appearance, preview,
     slotIndex: selectedSlot,
     enabledDLCs: Array.from(enabledDLCs),  // ← 新增
   });
   ```
3. 校验规则：按钮 disabled 条件追加 `enabledDLCs.size < 1`
4. 勾选提示：当 `enabledDLCs.size === 0` 时在 DLC 面板底部显示「⚠️ 至少选择一个内容包」

#### App.tsx 改动

`onNewGame` 的参数类型已包含 `enabledDLCs`，无需额外处理，直接透传到 `engine.newGame()`。

### 1.4 动态 DLC 加载（`useGameEngine.ts`）

#### 当前问题

```ts
// 当前：无条件加载 core
useEffect(() => {
  registerCoreEvents()
    .then(() => setDataReady(true))
    .catch(…);
}, []);
```

#### 改造方案

1. **删除 `useEffect` 中的无条件 `registerCoreEvents()` 调用**
2. 新增 `loadDLCs(ids: string[]): Promise<void>` 辅助函数：
   ```ts
   import { ALL_DLCS } from '../data/dlc';
   import { clearAllRegistries } from '../game/registry';

   async function loadDLCs(dlcIds: string[]): Promise<void> {
     clearAllRegistries();                     // 先清空，避免残留
     for (const id of dlcIds) {
       const meta = ALL_DLCS.find(d => d.id === id);
       if (meta?.loader) await meta.loader();  // 按顺序加载
     }
   }
   ```
3. `newGame()` 中：
   ```ts
   const newGame = useCallback(async (options) => {
     await loadDLCs(options.enabledDLCs);
     setDataReady(true);
     const p = createPlayer(options);
     // ...rest
   }, [...]);
   ```
4. `loadGame()` 中：
   ```ts
   const loadGame = useCallback(async (slotIndex) => {
     const saved = loadSaveSlot(slotIndex);
     if (!saved) return;
     const dlcIds = saved.enabledDLCs ?? ['core'];  // 向后兼容旧存档
     await loadDLCs(dlcIds);
     setDataReady(true);
     // ...rest
   }, [...]);
   ```
5. **StartScreen dataReady**：改为在用户点击「开始游戏」或「加载存档」后触发加载，不再在组件挂载时自动加载。StartScreen 无需等待 `dataReady` 即可渲染。

#### clearAllRegistries（`src/game/registry/stores.ts`）

新增函数，清空所有注册表 Map：

```ts
export function clearAllRegistries(): void {
  dlcRegistry.clear();
  eventRegistry.clear();
  itemDefRegistry.clear();
  // ...所有 registry.clear()
}
```

### 1.5 存档集成

#### 写入

`writeSaveSlot()` 已序列化整个 `Player` 对象，`enabledDLCs` 作为 Player 的新字段会自动写入。

#### 读取

`loadSaveSlot()` 读取后，在 `loadGame()` 中取 `saved.enabledDLCs`（向后兼容：如无该字段则默认 `['core']`）。按该列表调用 `loadDLCs()` 后再恢复状态。

#### 存档预览

`SaveSlotPreview` 新增 `enabledDLCs?: string[]` 字段，在存档管理面板中显示「内容包：基础 / 凡人修仙」。

### 1.6 校验规则

| 校验项 | 时机 | 失败处理 |
|--------|------|----------|
| `enabledDLCs.length >= 1` | StartScreen 确认按钮 | 按钮 disabled + 提示 |
| `realmRegistry.size >= 1` | `loadDLCs()` 完成后 | 抛异常 + setDataError |
| `regionRegistry.size >= 1` | `loadDLCs()` 完成后 | 抛异常 + setDataError |

### 1.7 DLC 注册表（ALL_DLCS）

`src/data/dlc/index.ts` 改造后：

```ts
import { CORE_DLC_META } from './core/manifest';
import { CP01_DLC_META } from './cp-01-fanren/manifest';

export interface DLCMeta {
  id: string;
  name: string;
  description: string;
  version: string;
  type: 'core' | 'content-pack' | 'expansion';
  required: boolean;
  loader: () => Promise<void>;
}

export const ALL_DLCS: DLCMeta[] = [
  {
    ...CORE_DLC_META,
    required: false,                                     // ← 不再强制
    loader: async () => {
      const { registerCoreEvents } = await import('../../game/events');
      await registerCoreEvents();
    },
  },
  {
    ...CP01_DLC_META,
    required: false,
    loader: async () => {
      const { registerCP01Events } = await import('../../game/cp01-loader');
      await registerCP01Events();
    },
  },
];

export function getDefaultEnabledDLCs(): string[] {
  return ['core'];  // 默认只勾选 core
}
```

### 1.8 registerCoreEvents 重构

当前 `registerCoreEvents()` 在 `src/game/events.ts` 中，既包含事件加载又包含 core 专属的死亡触发、护命道具、复活手段、妖兽等硬编码数据。

改造：将 `registerCoreEvents()` 保持原位不动（它已经是一个完整的 core DLC 加载器），`ALL_DLCS` 中 core 的 `loader` 直接指向它即可。不做拆分，避免改动过大。

---

## Part 2：CP-01 凡人修仙内容包

### 2.1 设计原则

- **自给自足**：CP-01 必须提供完整的 `realms`、`regions`、`npcs`、`items`、`equips`、`recipes`、`techniques`、`events`、`monsters`、`shop`、`quests`、`breakthrough`、`tribulations`、`event-templates`、`event-vocab` 等数据，独立于 core 可运行
- **命名空间**：所有 ID 前缀为 `cp-01:`，如 `cp-01:realm_qi_condensing`、`cp-01:huang_feng_valley`
- **世界观**：以《凡人修仙传》为背景灵感，区域/NPC/物品风格统一
- **数值对齐**：境界数值体系与 core 保持相近数量级（同 index 的 hpBase/atkBase 等在同一数量级），确保游戏平衡

### 2.2 文件结构

```
src/data/dlc/cp-01-fanren/
├── manifest.ts              # DLC 元信息
├── realms.json              # 境界体系（9 阶）
├── regions.json             # 区域地图（20+ 区域）
├── npcs.json                # NPC（30+ 角色）
├── items.json               # 物品定义（40+ 物品）
├── equips.json              # 装备定义（25+ 装备）
├── recipes.json             # 炼丹配方（15+ 配方）
├── techniques.json          # 功法定义（12+ 功法）
├── events.json              # 固定事件（30+ 事件）
├── monsters.json            # 固定妖兽（12+ 妖兽）
├── shop.json                # 商品列表
├── smithing.json            # 炼器配方（10+ 配方）
├── breakthrough.json        # 突破需求
├── breakthrough.ts          # TS 壳子加载器
├── divine-arts.json         # 神通（8+ 神通）
├── divine-arts.ts           # TS 壳子加载器
├── event-templates.json     # 程序化事件模板（80+ 模板）
├── event-vocab.json         # 变量词库（600+ 词条）
├── equip-templates.json     # 装备模板
├── affixes.json             # 装备词缀
├── monster-templates.json   # 妖兽模板
├── mutations.json           # 妖兽变异
├── technique-traits.json    # 功法词条
├── bottlenecks.json         # 瓶颈定义
├── body-config.json         # 体修配置
├── body-config.ts           # TS 壳子
├── realms.ts                # TS 壳子
├── bottlenecks.ts           # TS 壳子
├── quests.json              # 任务链
├── dialogues/               # 对话数据
│   ├── han-li.json          # 韩立对话
│   ├── nan-gong-wan.json    # 南宫婉对话
│   ├── idle-chat.json       # 闲聊池
│   └── ...
└── loader.ts                # CP-01 加载入口（类似 registerCoreEvents）
```

### 2.3 境界体系（`realms.json`）

CP-01 采用 9 阶境界体系（以凡人修仙传为设定参考），index 与 core 一致以保持系统兼容：

| index | id | name | expReq | lifespanBonus | hpBase | mpBase | atkBase | defBase | speedBase | mentalBase |
|-------|-----|------|--------|---------------|--------|--------|---------|---------|-----------|------------|
| 0 | cp-01:realm_mortal | 凡人 | 0 | 0 | 100 | 25 | 7 | 3 | 7 | 15 |
| 1 | cp-01:realm_qi_condensing | 炼气 | 120 | 500 | 180 | 55 | 14 | 7 | 11 | 35 |
| 2 | cp-01:realm_foundation | 筑基 | 600 | 1000 | 450 | 130 | 32 | 18 | 16 | 70 |
| 3 | cp-01:realm_core_formation | 结丹 | 2500 | 2200 | 1100 | 350 | 75 | 40 | 23 | 130 |
| 4 | cp-01:realm_nascent_soul | 元婴 | 10000 | 5500 | 2800 | 900 | 170 | 90 | 33 | 260 |
| 5 | cp-01:realm_deity_transform | 化神 | 35000 | 11000 | 6500 | 2200 | 380 | 200 | 48 | 520 |
| 6 | cp-01:realm_integration | 合体 | 120000 | 22000 | 14000 | 4500 | 850 | 460 | 65 | 1000 |
| 7 | cp-01:realm_mahayana | 大乘 | 400000 | 50000 | 30000 | 10000 | 1800 | 1000 | 90 | 2200 |

> 说明：core 有 8 阶（凡人→大乘），CP-01 同样 8 阶，但数值和境界名称略有差异（如 core 的 index 6 叫"渡劫"，CP-01 叫"合体"）。这是设计上允许的——每个 DLC 定义自己的境界体系。系统根据 `realmIndex` 匹配而非名称。

### 2.4 区域地图（`regions.json`）

以凡人修仙传的地理设定为灵感，分为 3 层级（大陆/主要区域/子区域）：

#### 容器节点
| id | name | emoji | 说明 |
|----|------|-------|------|
| cp-01:tianan | 天南 | 🌏 | 天南大陆（一级容器） |
| cp-01:luanxinghai | 乱星海 | 🌊 | 乱星海（一级容器） |
| cp-01:lingjie | 灵界 | ✨ | 灵界（一级容器） |

#### 天南地区（minRealm 0–3）
| id | name | emoji | minRealm | regionTags | safeZone | parentId |
|----|------|-------|----------|------------|----------|----------|
| cp-01:huang_feng_valley | 黄枫谷 | 🍂 | 0 | town, sect, safe | true | cp-01:tianan |
| cp-01:qixuan_sect | 七玄门 | ⚔️ | 0 | town, sect | false | cp-01:tianan |
| cp-01:yue_kingdom | 越国 | 🏯 | 0 | town, kingdom | false | cp-01:tianan |
| cp-01:tainan_valley | 太南谷 | 🌿 | 1 | valley, herb | false | cp-01:tianan |
| cp-01:blood_forbidden | 血禁地 | 🩸 | 1 | dangerous, wilderness | false | cp-01:tianan |
| cp-01:scarlet_trial | 赤炼试炼场 | 🔥 | 1 | mountain, dangerous | false | cp-01:tianan |
| cp-01:jianzhou_capital | 剑洲城 | 🏙️ | 2 | city, trade | false | cp-01:tianan |
| cp-01:mulan_grassland | 木兰草原 | 🌾 | 2 | wilderness, wasteland | false | cp-01:tianan |
| cp-01:tianlan_desert | 天澜沙漠 | 🏜️ | 2 | wasteland, dangerous | false | cp-01:tianan |
| cp-01:tainan_market | 太南小会 | 🏪 | 2 | city, trade, safe | true | cp-01:tianan |
| cp-01:devilfall_valley | 堕魔谷 | 💀 | 3 | mystic, dangerous | false | cp-01:tianan |
| cp-01:kunwu_mountain | 昆吾山 | ⛰️ | 3 | mountain, mystic | false | cp-01:tianan |

#### 乱星海地区（minRealm 2–4）
| id | name | emoji | minRealm | regionTags | parentId |
|----|------|-------|----------|------------|----------|
| cp-01:kuixing_island | 魁星岛 | 🏝️ | 2 | island, trade, safe | cp-01:luanxinghai |
| cp-01:green_wave_island | 翠浪岛 | 🌴 | 2 | island, herb | cp-01:luanxinghai |
| cp-01:wanzhang_abyss | 万丈深渊 | 🕳️ | 3 | dangerous, mystic | cp-01:luanxinghai |
| cp-01:stormwind_sea | 风暴海域 | 🌊 | 3 | dangerous, wilderness | cp-01:luanxinghai |
| cp-01:xinggong_palace | 星宫 | 🌟 | 4 | celestial, sect | cp-01:luanxinghai |

#### 灵界地区（minRealm 4–7）
| id | name | emoji | minRealm | regionTags | parentId |
|----|------|-------|----------|------------|----------|
| cp-01:tianyuan_city | 天渊城 | 🏛️ | 4 | city, celestial | cp-01:lingjie |
| cp-01:deep_heaven_plateau | 深天高原 | ☁️ | 5 | dangerous, celestial | cp-01:lingjie |
| cp-01:thunder_continent | 雷霆大陆 | ⚡ | 5 | dangerous, wilderness | cp-01:lingjie |
| cp-01:illusion_forest | 幻境林 | 🌲 | 6 | mystic, dangerous | cp-01:lingjie |
| cp-01:heavenly_court | 天庭遗迹 | 🏰 | 7 | celestial, mystic | cp-01:lingjie |

> 共 22 个可移动区域 + 3 个容器节点 = 25 个区域

### 2.5 NPC（`npcs.json`）

以凡人修仙传主要角色为原型设计 30+ NPC。示例：

| id | name | title | emoji | realmIndex | disposition | roles | personality | regionTags |
|----|------|-------|-------|------------|-------------|-------|-------------|------------|
| cp-01:han_li | 韩立 | 黄枫谷弟子 | 🧑‍🔬 | 1 | neutral | wanderer | mysterious | sect, town |
| cp-01:nangong_wan | 南宫婉 | 掩月宗仙子 | 💃 | 3 | friendly | companion | gentle | sect, city |
| cp-01:mo_caihuan | 墨彩环 | 灵药谷女修 | 🌸 | 2 | friendly | alchemist | gentle | valley, herb |
| cp-01:li_feiyu | 厉飞雨 | 黄枫谷弟子 | ⚔️ | 1 | friendly | companion | hot_tempered | sect, town |
| cp-01:yuan_yao | 元瑶 | 鬼道女修 | 👻 | 4 | neutral | wanderer | mysterious | dangerous, mystic |
| cp-01:lei_wanhe | 雷万鹤 | 青竹蜂云剑传承者 | ⚡ | 2 | friendly | elder | righteous | sect |
| cp-01:dong_xuan_er | 董萱儿 | 黄枫谷女弟子 | 🌺 | 1 | friendly | companion | gentle | sect |
| cp-01:zhong_weiniang | 钟卫娘 | 黄枫谷女修 | 🎐 | 1 | friendly | companion | cold | sect |
| cp-01:yu_zitong | 余紫童 | 掩月宗女修 | 🦋 | 2 | neutral | wanderer | cunning | city, trade |
| cp-01:old_xuan | 玄老 | 黄枫谷太上长老 | 👴 | 5 | friendly | elder, sect_leader | righteous | sect |
| cp-01:qi_yunxiao | 齐云霄 | 七玄门掌门 | 🗡️ | 3 | neutral | sect_leader | cunning | sect |
| cp-01:wang_chan | 王蝉 | 化神期修士 | 🦂 | 5 | hostile | rival | cold | dangerous |
| cp-01:patriarch_xin | 辛老祖 | 合欢宗老祖 | 😈 | 5 | hostile | sect_leader | cunning | dangerous |
| cp-01:wen_tianren | 文天仁 | 万剑山庄庄主 | 🗡️ | 4 | neutral | sect_leader | righteous | mountain |
| cp-01:tian_lan_beast | 天澜妖兽王 | 天澜兽王 | 🐲 | 4 | hostile | rival | hot_tempered | dangerous, wilderness |
| cp-01:old_devil_he | 赫老魔 | 六派魔修 | 👿 | 3 | hostile | rival | hot_tempered | dangerous |
| cp-01:xuan_le | 玄乐大师 | 佛门高僧 | 🙏 | 4 | friendly | elder | gentle | celestial |
| cp-01:fairy_violet | 紫灵仙子 | 紫灵真人 | 🔮 | 5 | friendly | elder | mysterious | celestial |
| cp-01:bai_yaoyi | 白瑶依 | 北极殿女修 | ❄️ | 4 | neutral | companion | cold | island, mystic |
| cp-01:shi_jian | 石坚 | 乱星海散修 | 🪨 | 2 | friendly | merchant | righteous | island, trade |
| cp-01:wen_siyue | 文斯月 | 星宫宫主 | 🌟 | 5 | neutral | sect_leader | mysterious | celestial |
| cp-01:silvermoon | 银月 | 器灵 | 🌙 | 3 | friendly | companion | gentle | — |
| cp-01:golden_thunder_bamboo | 金雷竹精 | 灵植精怪 | 🎋 | 3 | neutral | wanderer | mysterious | valley |
| cp-01:puppet_master_wu | 吴道人 | 傀儡师 | 🎭 | 3 | neutral | smith | cunning | city |
| cp-01:mu_peiling | 慕沛玲 | 凝翠居女修 | 🌹 | 2 | friendly | companion | gentle | sect |
| cp-01:chen_qiaoqian | 陈巧倩 | 黄枫谷女修 | 🌷 | 1 | friendly | companion | gentle | sect |
| cp-01:yan_ruyu | 颜如玉 | 商贾世家 | 💰 | 1 | friendly | merchant | cunning | trade, city |
| cp-01:spirit_physician | 灵医孙婆 | 游方灵医 | 👩‍⚕️ | 2 | friendly | alchemist | gentle | town, valley |
| cp-01:star_palace_guard | 星宫护卫 | 星宫执法弟子 | 🛡️ | 3 | neutral | guard | righteous | celestial |
| cp-01:rogue_cultivator_li | 李散修 | 乱星海散修 | 🍵 | 1 | neutral | wanderer | cunning | island |

> 共 30 个 NPC

### 2.6 物品定义（`items.json`）

以凡人修仙传常见丹药、材料、灵物为基础设计。分类：

#### 消耗品（consumable）
| id | name | rarity | description | 效果 |
|----|------|--------|-------------|------|
| cp-01:hp_pill | 黄龙丹 | common | 恢复 60 HP | hp +60 |
| cp-01:mp_pill | 清灵丹 | common | 恢复 35 MP | mp +35 |
| cp-01:stamina_pill | 培元丹 | common | 恢复 35 精力 | stamina +35 |
| cp-01:exp_pill | 筑基丹 | uncommon | 获得 80 修为 | exp +80 |
| cp-01:jichu_pill | 基础丹 | common | 获得 30 修为 | exp +30 |
| cp-01:lianqi_pill | 炼气丹 | uncommon | 获得 150 修为 | exp +150 |
| cp-01:golden_core_pill | 结丹丹 | rare | 获得 500 修为 | exp +500 |
| cp-01:nascent_soul_pill | 元婴丹 | epic | 获得 2000 修为 | exp +2000 |
| cp-01:mood_pill | 宁心丹 | common | 恢复 25 心情 | mood +25 |
| cp-01:health_pill | 驻颜丹 | uncommon | 恢复 30 健康 | health +30 |
| cp-01:life_talisman | 护身灵符 | rare | 抵消致命伤害 | 护命道具 |
| cp-01:jade_shield | 护身玉佩 | rare | 碎裂护主 | 护命道具 |
| cp-01:nine_turn_pill | 九转回魂丹 | legendary | 起死回生之丹 | 复活道具 |
| cp-01:calming_talisman | 定心符 | uncommon | 驱散心魔 | 护命道具 |
| cp-01:soul_lamp | 魂灯 | epic | 灯火护魂 | 护命道具 |
| cp-01:enlightenment_pill | 悟道丹 | epic | 大幅提升修为 | exp +3000 |

#### 材料（material）
| id | name | rarity | description |
|----|------|--------|-------------|
| cp-01:herb_lingcao | 灵草 | common | 基础炼丹材料 |
| cp-01:herb_xuanlian | 玄莲子 | uncommon | 中阶炼丹材料 |
| cp-01:herb_tianhuo | 天火花 | rare | 高阶炼丹材料 |
| cp-01:herb_wanling | 万灵果 | epic | 顶级炼丹材料 |
| cp-01:iron_ore | 玄铁矿 | common | 基础炼器材料 |
| cp-01:mithril_ore | 秘银矿 | uncommon | 中阶炼器材料 |
| cp-01:star_iron | 星陨铁 | rare | 高阶炼器材料 |
| cp-01:monster_core | 妖丹 | uncommon | 妖兽核心 |
| cp-01:monster_fang | 妖牙 | common | 妖兽牙齿 |
| cp-01:spirit_stone_shard | 灵石碎片 | common | 通用货币材料 |
| cp-01:jade_slip | 玉简 | uncommon | 记载功法/信息 |
| cp-01:map_fragment | 地图残片 | uncommon | 解锁新区域线索 |
| cp-01:beast_blood | 妖兽血 | common | 炼器辅材 |
| cp-01:spirit_water | 灵泉水 | common | 炼丹辅材 |
| cp-01:mountain_herb | 山灵草 | common | 野外采集灵草 |
| cp-01:sand_crystal | 流沙晶 | uncommon | 沙漠特产 |
| cp-01:mystery_fragment | 秘境碎片 | rare | 秘境探索所得 |
| cp-01:celestial_jade | 仙玉 | epic | 灵界材料 |
| cp-01:spirit_jade | 灵玉 | rare | 蕴含灵力的玉石 |
| cp-01:golden_thunder_bamboo_leaf | 金雷竹叶 | epic | 韩立特色材料 |
| cp-01:qingyuan_herb | 青元草 | uncommon | 黄枫谷特产灵草 |
| cp-01:ice_silkworm_thread | 冰蚕丝 | rare | 极寒灵虫所产 |

#### 杂项（misc）
| id | name | rarity | description |
|----|------|--------|-------------|
| cp-01:qixuan_token | 七玄门令牌 | uncommon | 七玄门弟子令 |
| cp-01:luanxing_chart | 乱星海航图 | rare | 导航乱星海的地图 |

> 共 40+ 物品

### 2.7 装备定义（`equips.json`）

| id | name | slot | rarity | minRealm | 核心属性 |
|----|------|------|--------|----------|----------|
| cp-01:wooden_sword | 木剑 | weapon | common | 0 | atk +5 |
| cp-01:huang_feng_robe | 黄枫谷弟子袍 | armor | common | 0 | def +3, hp +20 |
| cp-01:iron_sword | 玄铁剑 | weapon | uncommon | 1 | atk +12 |
| cp-01:spirit_silk_robe | 灵蚕丝衣 | armor | uncommon | 1 | def +8, speed +3 |
| cp-01:jade_pendant | 碧玉挂坠 | accessory1 | uncommon | 1 | mp +20, critRate +2 |
| cp-01:golden_thunder_sword | 青竹蜂云剑 | weapon | epic | 2 | atk +35, critRate +5, speed +5 |
| cp-01:scarlet_soul_armor | 赤魂甲 | armor | rare | 2 | def +22, hp +100 |
| cp-01:wind_boots | 御风靴 | boots | uncommon | 1 | speed +5, moveSpeed +3 |
| cp-01:elders_helmet | 长老冠 | helmet | rare | 3 | def +18, mp +80 |
| cp-01:star_amulet | 星辰护符 | accessory2 | rare | 3 | critResist +8, def +12 |
| cp-01:nascent_soul_sword | 元婴法剑 | weapon | epic | 4 | atk +180, critDmgMultiplier +0.3 |
| cp-01:divine_robe | 化神法袍 | armor | epic | 5 | def +200, hp +2000, mp +500 |
| cp-01:azure_cloud_sword | 碧云剑 | weapon | rare | 2 | atk +28, speed +4 |
| cp-01:mulan_shield | 木兰盾 | accessory2 | uncommon | 2 | def +15, hp +50 |
| cp-01:stormwind_ring | 风暴戒 | accessory1 | rare | 3 | atk +20, speed +8, critRate +3 |
| cp-01:spirit_crown | 灵冕 | helmet | uncommon | 1 | def +6, mp +30 |
| cp-01:deep_sea_armor | 深海玄甲 | armor | rare | 3 | def +30, hp +200, physiqueDmgReduce +0.02 |
| cp-01:heavenly_boots | 天行靴 | boots | rare | 4 | speed +12, moveSpeed +8 |
| cp-01:integration_blade | 合体期灵刃 | weapon | legendary | 6 | atk +850, critRate +10, critDmgMultiplier +0.5 |
| cp-01:mahayana_robe | 大乘法衣 | armor | legendary | 7 | def +1000, hp +8000, mp +3000 |
| cp-01:kunwu_mirror | 昆吾宝镜 | accessory1 | epic | 4 | critResist +12, mp +200, critRate +5 |
| cp-01:ice_silk_boots | 冰蚕丝靴 | boots | uncommon | 2 | speed +6, moveSpeed +4 |
| cp-01:void_helmet | 虚空盔 | helmet | epic | 5 | def +60, hp +800, critResist +10 |
| cp-01:thunder_ring | 雷霆指环 | accessory1 | uncommon | 2 | atk +15, critRate +3 |
| cp-01:celestial_pendant | 天仙佩 | accessory2 | legendary | 6 | 全属性加成 |

> 共 25+ 装备

### 2.8 功法定义（`techniques.json`）

| id | name | type | rarity | minRealm | maxLevel | 核心技能 |
|----|------|------|--------|----------|----------|----------|
| cp-01:changchun_art | 长春功 | palm | common | 0 | 10 | 无主动技能，纯被动养生 |
| cp-01:luoyan_swordsmanship | 罗烟剑诀 | sword | uncommon | 1 | 15 | 罗烟三剑 |
| cp-01:golden_thunder_method | 青竹蜂云剑诀 | sword | epic | 2 | 25 | 金雷万刃 |
| cp-01:great_divination | 大衍诀 | finger | rare | 1 | 20 | 大衍决指 |
| cp-01:blood_shadow_evasion | 血影遁 | blade | uncommon | 1 | 12 | 血遁斩 |
| cp-01:nature_art | 造化功 | palm | rare | 2 | 20 | 造化归元 |
| cp-01:xuanyin_art | 玄阴功 | finger | uncommon | 1 | 15 | 玄阴指 |
| cp-01:mulan_spear | 木兰枪法 | spear | uncommon | 2 | 15 | 破军枪 |
| cp-01:seven_star_fist | 七星拳 | fist | common | 0 | 10 | 七星连环击 |
| cp-01:ice_flame_art | 冰焰功 | palm | rare | 3 | 20 | 冰火双莲 |
| cp-01:skydevil_art | 天魔功 | blade | epic | 4 | 25 | 天魔噬魂 |
| cp-01:heavenly_sword | 天剑术 | sword | legendary | 5 | 30 | 天地同斩 |

> 共 12 功法

### 2.9 妖兽定义（`monsters.json`） — 固定妖兽

| id | name | emoji | realmIndex | 核心数值 | regionTags |
|----|------|-------|------------|----------|------------|
| cp-01:ink_jiao | 墨蛟 | 🐍 | 0 | hp 70, atk 8 | wilderness |
| cp-01:two_headed_wolf | 双头妖狼 | 🐺 | 0 | hp 90, atk 6 | mountain, wilderness |
| cp-01:bloodline_bat | 嗜血蝠 | 🦇 | 1 | hp 160, atk 15 | dangerous |
| cp-01:giant_scorpion | 巨毒蝎 | 🦂 | 1 | hp 230, atk 20 | wasteland |
| cp-01:iron_shell_turtle | 铁壳龟 | 🐢 | 2 | hp 600, atk 35, def 35 | island |
| cp-01:flame_bird | 火鸦 | 🔥 | 2 | hp 400, atk 50 | mountain, dangerous |
| cp-01:sea_serpent | 海蛟 | 🐉 | 3 | hp 1400, atk 95 | island, dangerous |
| cp-01:wind_leopard | 风豹 | 🐆 | 3 | hp 1200, atk 110, speed 30 | wilderness |
| cp-01:thunder_roc | 雷鹏 | ⚡ | 4 | hp 3800, atk 240 | dangerous, celestial |
| cp-01:ice_wyrm | 寒蛟 | 🧊 | 4 | hp 4200, atk 220, def 140 | island, mystic |
| cp-01:void_beast | 虚空兽 | 🌀 | 5 | hp 8500, atk 500 | celestial, dangerous |
| cp-01:ancient_dragon | 远古巨龙 | 🐲 | 6 | hp 18000, atk 900 | celestial, mystic |

> 共 12 固定妖兽

### 2.10 事件模板（`event-templates.json`）

CP-01 需要 80+ 程序化事件模板，覆盖以下类别：

| 类别 | 数量 | 示例 |
|------|------|------|
| explore - good（探索正面） | 25+ | 发现灵草丛、偶遇散修指点、拾到功法残卷、灵泉沐浴 |
| explore - bad（探索负面） | 20+ | 妖兽伏击、陷阱中招、毒雾迷路、灵力紊乱 |
| explore - neutral（探索中性） | 15+ | 遇见旅人、发现遗迹碎片、天象异变 |
| adventure - good（奇遇正面） | 10+ | 洞府传承、仙人赐宝、古修残念 |
| adventure - bad（奇遇负面） | 5+ | 心魔幻境、上古禁制反噬 |
| daily - good/neutral（日常） | 10+ | 炼丹成功、修炼顿悟、观星悟道 |

模板 ID 前缀 `cp-01:tpl_xxx`，变量引用 `cp-01:pool_xxx` 词库。

### 2.11 变量词库（`event-vocab.json`）

600+ 词条，分布在以下词库中：

| 词库 id | variable | 条目数 | 说明 |
|---------|----------|--------|------|
| cp-01:pool_resources | resource | 15+ | 灵石矿、玄铁脉、灵草丛… |
| cp-01:pool_locations | location | 40+ | 黄枫谷后山、七玄门剑池、乱星海礁石… |
| cp-01:pool_amounts_small | amount | 8 | 5/10/15/20/… |
| cp-01:pool_amounts_medium | amount | 8 | 30/50/80/… |
| cp-01:pool_amounts_large | amount | 6 | 100/150/200/… |
| cp-01:pool_exp_amounts | exp | 8 | 10/20/40/… |
| cp-01:pool_exp_large | exp | 6 | 100/200/400/… |
| cp-01:pool_elders | elder | 20+ | 玄老、雷万鹤、齐云霄、紫灵仙子… |
| cp-01:pool_teaching_actions | teaching_action | 15+ | 传授剑诀心法、点拨灵力运行… |
| cp-01:pool_enemies | enemy | 25+ | 墨蛟、双头妖狼、嗜血蝠、魔修… |
| cp-01:pool_hiding_spots | hiding_spot | 15+ | 灵草丛、岩缝中、朽木后… |
| cp-01:pool_damage_small | hp_loss | 6 | 5/10/15/… |
| cp-01:pool_damage_medium | hp_loss | 6 | 20/30/50/… |
| cp-01:pool_herbs | herb | 20+ | 灵草、玄莲子、天火花、万灵果… |
| cp-01:pool_treasures | treasure | 15+ | 碧玉挂坠、青竹蜂云剑、赤魂甲… |
| cp-01:pool_weather | weather | 10+ | 雷暴、灵气潮汐、血月… |
| cp-01:pool_cultivation_methods | method | 15+ | 闭关吐纳、对镜参悟、以战养战… |
| cp-01:pool_sect_names | sect | 12+ | 黄枫谷、七玄门、掩月宗、天绝宗… |
| cp-01:pool_item_names | item | 20+ | 符纸、灵石碎片、妖丹… |
| cp-01:pool_realms_flavor | realm_flavor | 10+ | 炼气圆满、筑基初期、金丹大圆满… |
| cp-01:pool_adventure_locations | adv_location | 20+ | 堕魔谷深处、昆吾山秘洞、虚空裂缝… |
| cp-01:pool_artifacts | artifact | 10+ | 青竹蜂云剑、玄天宝鼎、乾坤袋… |
| cp-01:pool_beast_materials | material | 15+ | 妖丹、蛟龙鳞、雷鹏羽、寒蛟血… |
| cp-01:pool_curse_effects | curse | 8+ | 灵力紊乱、经脉受损、神识混沌… |
| cp-01:pool_blessing_effects | blessing | 8+ | 灵力充盈、经脉通畅、悟性提升… |
| cp-01:pool_emojis_good | emoji | 10+ | ✨/💎/🌟/… |
| cp-01:pool_emojis_bad | emoji | 8+ | ⚠️/💀/🔥/… |
| cp-01:pool_emojis_neutral | emoji | 8+ | 📖/🔍/🌙/… |

> 共 28+ 个词库，总计约 600–700 词条

### 2.12 CP-01 加载入口（`loader.ts`）

```ts
// src/data/dlc/cp-01-fanren/loader.ts
// 类似 core 的 registerCoreEvents()，加载 CP-01 全部数据并注册到全局注册表

export async function registerCP01Events(): Promise<void> {
  const [...allJsons] = await Promise.all([
    import('./events.json'),
    import('./items.json'),
    import('./recipes.json'),
    import('./equips.json'),
    import('./shop.json'),
    import('./smithing.json'),
    import('./techniques.json'),
    import('./regions.json'),
    import('./npcs.json'),
    import('./quests.json'),
    import('./event-templates.json'),
    import('./event-vocab.json'),
    import('./equip-templates.json'),
    import('./affixes.json'),
    import('./monster-templates.json'),
    import('./mutations.json'),
    import('./technique-traits.json'),
    import('./realms.json'),
    import('./bottlenecks.json'),
    import('./monsters.json'),
    import('./divine-arts.json'),
    // ...
  ]);
  // 类似 registerCoreEvents 的转换 + registerDLC + registerShopGoods
}
```

### 2.13 其他数据文件

以下文件需要创建但内容可较简：

| 文件 | 数量 | 说明 |
|------|------|------|
| `recipes.json` | 15+ 配方 | 黄龙丹配方、炼气丹配方、结丹丹配方等 |
| `shop.json` | 20+ 商品 | 各区域商人售卖的物品/装备 |
| `smithing.json` | 10+ 配方 | 玄铁剑、青竹蜂云剑等 |
| `breakthrough.json` | 7 条 | index 0→1 到 6→7 的突破需求 |
| `divine-arts.json` | 8+ 神通 | 金雷遁、冰焰术、天煞爪等 |
| `bottlenecks.json` | 5+ 瓶颈 | 筑基瓶颈、结丹瓶颈等 |
| `body-config.json` | 体修配置 | 与 core 结构对齐 |
| `quests.json` | 5+ 任务链 | 黄枫谷入门、乱星海探索等 |
| `dialogues/*.json` | 5+ 文件 | 韩立、南宫婉等主要 NPC 对话 |
| `equip-templates.json` | 10+ 模板 | 程序化装备基础模板 |
| `affixes.json` | 10+ 词缀 | 锋利、坚固、灵巧等 |
| `monster-templates.json` | 8+ 模板 | 程序化妖兽基础模板 |
| `mutations.json` | 6+ 变异 | 狂暴、巨化、灵化等 |
| `technique-traits.json` | 8+ 词条 | 功法词条（精通、领悟等） |

---

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键类/函数 |
|------|------|-------------|
| `src/data/dlc/cp-01-fanren/manifest.ts` | CP-01 DLC 元信息 | `CP01_DLC_META` |
| `src/data/dlc/cp-01-fanren/loader.ts` | CP-01 加载入口 | `registerCP01Events()` |
| `src/data/dlc/cp-01-fanren/realms.ts` | 境界薄壳 loader | `CP01_REALMS` |
| `src/data/dlc/cp-01-fanren/breakthrough.ts` | 突破薄壳 loader | `CP01_BREAKTHROUGH_REQS`, `CP01_TRIBULATIONS` |
| `src/data/dlc/cp-01-fanren/divine-arts.ts` | 神通薄壳 loader | `CP01_DIVINE_ARTS` |
| `src/data/dlc/cp-01-fanren/bottlenecks.ts` | 瓶颈薄壳 loader | `CP01_BOTTLENECKS` |
| `src/data/dlc/cp-01-fanren/body-config.ts` | 体修薄壳 loader | `CP01_BODY_REALMS` |
| `src/data/dlc/cp-01-fanren/*.json` | 全部 JSON 数据文件 | 见 §2.2 文件结构 |
| `src/data/dlc/cp-01-fanren/dialogues/*.json` | 对话数据 | 按 NPC 拆分 |
| `src/game/registry/stores.ts` | 新增 clearAllRegistries | `clearAllRegistries()` |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/data/dlc/index.ts` | DLCMeta 增加 `loader`；core `required` 改 false；增加 cp-01 | DLC 注册表 |
| `src/data/dlc/core/manifest.ts` | `required: false` | core 改为可选 |
| `src/game/player/types.ts` | Player 增加 `enabledDLCs: string[]` | 存档记录 DLC |
| `src/game/player/create.ts` | CreatePlayerOptions 增加 `enabledDLCs`；createPlayer 赋值 | 新建角色时记录 |
| `src/hooks/useGameEngine.ts` | 删除无条件 registerCoreEvents；newGame/loadGame 改为动态加载 | DLC 按需加载 |
| `src/components/screens/StartScreen.tsx` | handleConfirm 传 enabledDLCs；移除 required 限制；增加校验 | 数据流打通 |
| `src/hooks/useSaveLoad.ts` | SaveSlotPreview 增加 enabledDLCs；向后兼容 | 存档兼容 |
| `src/game/registry/stores.ts` | 新增 clearAllRegistries() | 切换 DLC 前清空 |
| `src/game/shop.ts` | clearShopGoods() 或在 clearAllRegistries 中处理 | 商店数据也需清空 |

### 公式

无新公式，境界数值/战斗系统复用现有逻辑。

---

## UI 方案（@Designer）

### 改动界面

| 元素 | 位置 | 改动内容 |
|------|------|----------|
| DLC 面板 checkbox | StartScreen DLC 弹窗 | 移除 core 的 `disabled`，所有 DLC 可勾选 |
| DLC 面板底部提示 | StartScreen DLC 弹窗 | 当无勾选时显示「⚠️ 至少选择一个内容包」 |
| 开始按钮 | StartScreen 创角页 | `enabledDLCs.size < 1` 时 disabled |
| 存档预览 | SaveManagerPanel | 显示存档所用内容包名称 |

### 交互

- 所有 DLC checkbox 均可交互，无 disabled 状态
- 勾选/取消勾选实时更新计数（📦 内容包 n/m）
- 无勾选时确认按钮灰色 + 面板显示警告文案

---

## 验证方式

### Part 1 验证

1. **新建游戏 - 仅选 core**：不勾选 CP-01，开始游戏，验证所有 core 内容（境界/区域/NPC/物品/事件）正常加载
2. **新建游戏 - 仅选 CP-01**：取消 core 勾选，仅勾选 CP-01，开始游戏，验证凡人修仙传境界/区域/NPC 正常显示
3. **新建游戏 - 同时选两个**：core + CP-01 同时勾选，验证两边数据合并加载，不冲突
4. **存档/读档**：新建 CP-01 游戏 → 保存 → 退出 → 读档，验证 enabledDLCs 正确恢复
5. **旧存档兼容**：使用无 enabledDLCs 的旧存档读档，应默认加载 core
6. **零选校验**：全部取消勾选，验证开始按钮 disabled，显示警告文案
7. **Debug 面板**：验证 Debug 面板在不同 DLC 组合下仍可正常工作

### Part 2 验证

1. **境界显示**：仅加载 CP-01 时，状态栏应显示「凡人」→「炼气」→…→「大乘」
2. **区域地图**：初始区域应为黄枫谷，移动到其他区域正常
3. **NPC 显示**：NPC 面板应显示韩立、南宫婉等凡人修仙传角色
4. **战斗**：与 CP-01 妖兽战斗正常
5. **物品/装备/商店**：可购买/使用/装备 CP-01 的物品
6. **探索事件**：触发的事件文本含凡人修仙传风味（地名/人名/物品名）

---

## 调试面板需求

- 无需新增 Debug 面板字段
- 现有 Debug 面板的物品/装备添加功能应动态读取当前已注册的注册表数据（已自动适配 DLC 切换）

---

## 依赖关系

- **前置任务**：无（T0070/T0071/T0072/T0073 程序化系统已完成）
- **后续任务**：
  - DLC 内容扩展包（更多凡人修仙传事件/任务/NPC）
  - DLC 热加载（游戏中切换 DLC，不重启）

---

## 实现步骤拆分

将实现拆分为以下可独立提交的步骤：

### Step 1: 基础设施 — DLC 动态加载系统（代码变更）

**分支**：`feat/T0074-dlc-dynamic-loading`

1. `src/game/registry/stores.ts`：新增 `clearAllRegistries()`
2. `src/game/shop.ts`：新增 `clearShopGoods()`（或在 clearAllRegistries 中统一处理）
3. `src/data/dlc/index.ts`：DLCMeta 增加 `loader` 字段；core `required: false`
4. `src/data/dlc/core/manifest.ts`：`required: false`
5. `src/game/player/types.ts`：Player 增加 `enabledDLCs`
6. `src/game/player/create.ts`：CreatePlayerOptions 增加 `enabledDLCs`；createPlayer 赋值
7. `src/hooks/useGameEngine.ts`：删除无条件加载；newGame/loadGame 动态加载
8. `src/components/screens/StartScreen.tsx`：handleConfirm 传 enabledDLCs；移除 required 限制；增加校验
9. `src/hooks/useSaveLoad.ts`：SaveSlotPreview 兼容

### Step 2: CP-01 骨架 — manifest + 境界 + 区域（数据文件）

**分支**：`feat/T0074-cp01-skeleton`

1. 创建 `src/data/dlc/cp-01-fanren/` 目录结构
2. `manifest.ts`、`realms.json`、`realms.ts`、`regions.json`
3. `loader.ts`（初始版本，只注册境界+区域）
4. 基础可运行验证

### Step 3: CP-01 核心内容 — 物品/装备/配方/功法/妖兽

**分支**：`feat/T0074-cp01-core-content`

1. `items.json`、`equips.json`、`recipes.json`、`techniques.json`、`monsters.json`（固定妖兽）
2. `smithing.json`、`shop.json`
3. `breakthrough.json`、`breakthrough.ts`
4. `divine-arts.json`、`divine-arts.ts`
5. `bottlenecks.json`、`bottlenecks.ts`
6. `body-config.json`、`body-config.ts`
7. 更新 `loader.ts` 注册所有数据

### Step 4: CP-01 填充内容 — NPC/事件/对话/任务/程序化

**分支**：`feat/T0074-cp01-world-content`

1. `npcs.json`（30+ NPC）
2. `events.json`（30+ 固定事件）
3. `event-templates.json`（80+ 模板）
4. `event-vocab.json`（600+ 词条）
5. `quests.json`（5+ 任务链）
6. `dialogues/*.json`（NPC 对话）
7. `equip-templates.json`、`affixes.json`（程序化装备）
8. `monster-templates.json`、`mutations.json`（程序化妖兽）
9. `technique-traits.json`（功法词条）
10. 最终 `loader.ts` 完善

### Step 5: 文档更新

**分支**：`chore/T0074-docs-update`

1. 更新 `docs/test-guide.md`
2. 更新 `docs/roadmap.md`
3. 更新 `src/data/changelog.ts`
4. 关闭 GitHub Issue
