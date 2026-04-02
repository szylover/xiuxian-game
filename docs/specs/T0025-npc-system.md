# 设计文档：NPC 系统
任务：T0025
日期：2026-04-02
GitHub Issue: https://github.com/szylover/xiuxian-game/issues/97

## 概述

NPC 系统是社交系统的基石，为修仙世界注入"活人"。NPC 拥有名字、境界、性格、好感度等属性，分布在各个地图区域中，玩家可与之交互（交谈、切磋、交易、论道）。本任务只建设 **NPC 数据模型 + 注册表 + 区域分布 + 好感度/关系 + 基础交互框架**，不实现具体对话内容（T0026）、门派逻辑（T0027）、PvP 战斗（T0028）等，但须为它们预留清晰接口。

NPC 与现有妖兽（MonsterDef）的区别：
- 妖兽是一次性遭遇的战斗对象，无状态、无关系、无对话
- NPC 是持久存在的世界角色，有好感度、有位置、有 AI 行为标签，可反复交互
- 敌对 NPC 在需要战斗时，通过生成 `Combatant` 参数复用现有战斗系统，不复制 MonsterDef

### 设计目标

1. **数据驱动**：NPC 定义（NpcDef）通过 JSON 数据文件定义，通过 `registerDLC()` 注册
2. **DLC 可扩展**：命名空间 `core:npc_xxx` / `dlc-N:npc_xxx`
3. **与地图系统联动**：NPC 绑定 regionTags，玩家切换区域后可见 NPC 列表变化
4. **好感度持久化**：关系状态存入 `player.systems['npc']`，支持存档
5. **为后续系统留接口**：对话（T0026）、门派（T0027）、PvP（T0028）、道侣（T0048）、AI 生态（T0051）、拍卖行（T0052）、宗门（T0053）、历练悬赏（T0054）、天机榜（T0055）

---

## 数据结构

### NpcDef — NPC 定义（注册到全局表）

```typescript
// ── NPC 类型定义（新增到 src/game/types.ts）──

/** NPC 态度类型 */
export type NpcDisposition = 'friendly' | 'neutral' | 'hostile';

/** NPC 角色标签（用于筛选、AI 行为、对话触发等） */
export type NpcRole =
  | 'merchant'      // 商人（可交易）
  | 'elder'         // 长老（可论道、传授功法）
  | 'wanderer'      // 散修（可切磋、组队）
  | 'guard'         // 守卫（区域安全相关）
  | 'alchemist'     // 炼丹师（可代炼、交易丹药）
  | 'smith'         // 炼器师（可代炼、交易装备）
  | 'sect_leader'   // 宗主（T0027 门派预留）
  | 'rival'         // 宿敌（剧情/PvP 预留）
  | 'companion';    // 道侣候选（T0048 预留）

/** NPC 性格标签（影响对话选项和好感度变化速率） */
export type NpcPersonality =
  | 'gentle'        // 温和
  | 'cold'          // 冷漠
  | 'hot_tempered'  // 暴躁
  | 'cunning'       // 狡猾
  | 'righteous'     // 正义
  | 'mysterious';   // 神秘

export interface NpcDef {
  id: string;                       // 命名空间 ID，如 'core:npc_qingyun_elder'
  name: string;                     // 显示名称，如 '青云长老'
  title?: string;                   // 称号，如 '青云宗太上长老'
  emoji: string;                    // 显示 emoji，如 '👴'
  gender: 'male' | 'female';       // 性别
  description: string;              // NPC 简介

  // ── 战斗属性（用于 PvP 切磋 / 敌对战斗时生成 Combatant）──
  realmIndex: number;               // 境界等级（用于战力估算和条件判断）
  hp: number;
  atk: number;
  def: number;
  speed: number;
  critRate: number;
  critResist: number;
  critDmgMultiplier?: number;

  // ── 社交属性 ──
  disposition: NpcDisposition;      // 初始态度
  roles: NpcRole[];                 // 角色标签（一个 NPC 可兼任多个角色）
  personality: NpcPersonality;      // 性格
  charisma: number;                 // 魅力值（影响交易价格等，0-100）

  // ── 区域绑定 ──
  regionTags: string[];             // 出现区域标签（与 RegionDef.regionTags 匹配）
  homeRegionId?: string;            // 固定驻留区域 ID（可选，优先于 regionTags）

  // ── 条件 ──
  minRealm?: number;                // 玩家最低境界才能看到此 NPC（默认 0）
  condition?: (p: Player) => boolean; // 额外出现条件（如特定任务完成后才出现）

  // ── 扩展预留 ──
  dialoguePoolId?: string;          // T0026 对话池 ID（预留）
  sectId?: string;                  // T0027 所属门派 ID（预留）
  shopGoodsIds?: string[];          // 该 NPC 专属商品列表（物品 ID，T0052 拍卖行预留）
  aiTags?: string[];                // T0051 AI 行为标签（预留，如 ['cultivates', 'trades', 'travels']）

  // ── 好感度配置 ──
  maxAffinity?: number;             // 好感度上限（默认 100）
  affinityDecayRate?: number;       // 每年好感度自然衰减（默认 0）
  giftPreferences?: {               // 喜好物品 ID 列表（赠礼用）
    loved: string[];                 // 喜爱（+大量好感）
    liked: string[];                 // 喜欢（+少量好感）
    disliked: string[];              // 厌恶（-好感）
  };
}
```

### NpcSystemState — 存入 player.systems['npc']

```typescript
/** 单个 NPC 的运行时关系状态 */
export interface NpcRelation {
  npcId: string;                    // NPC 定义 ID
  affinity: number;                 // 当前好感度（-100 ~ maxAffinity，负值=敌对）
  met: boolean;                     // 是否已邂逅
  metAt: number;                    // 首次邂逅时的年份（gameYear）
  interactionCount: number;         // 总交互次数
  lastInteractionYear: number;      // 上次交互年份
  relationLevel: NpcRelationLevel;  // 关系等级（由好感度区间自动计算）
  flags: Record<string, unknown>;   // 自由扩展标记（供 T0026 对话、T0027 门派、T0048 道侣等写入）
}

/** 关系等级（好感度区间映射） */
export type NpcRelationLevel =
  | 'hostile'     // -100 ~ -50：敌对（可能主动攻击）
  | 'cold'        // -49 ~ -10：冷淡（拒绝交互）
  | 'stranger'    // -9 ~ 9：陌生（初始状态，基本交互）
  | 'acquaintance' // 10 ~ 29：相识（解锁更多对话选项）
  | 'friend'      // 30 ~ 59：友好（可交易折扣、赠送物品）
  | 'close_friend' // 60 ~ 89：至交（可论道增益、传授功法）
  | 'soulmate';   // 90+：知己/道侣候选（T0048 解锁条件）

/** NPC 系统整体状态 */
export interface NpcSystemState {
  relations: Record<string, NpcRelation>;   // key = npcId
  discoveredNpcs: string[];                 // 已发现的 NPC ID 列表（用于 UI 列表过滤）
  lastGiftYear: Record<string, number>;     // 上次赠礼年份，每年每 NPC 限赠一次（防刷）
}
```

### 关系等级映射公式

```
好感度 → 关系等级：
  affinity < -50       → hostile
  -50 ≤ affinity < -10 → cold
  -10 ≤ affinity < 10  → stranger
   10 ≤ affinity < 30  → acquaintance
   30 ≤ affinity < 60  → friend
   60 ≤ affinity < 90  → close_friend
   90 ≤ affinity       → soulmate
```

---

## 注册表集成

### stores.ts 新增

```typescript
export const npcRegistry = new Map<string, NpcDef>();
```

### queries.ts 新增

```typescript
// ── NPC ──
export function getNpcDef(id: string): NpcDef | undefined;
export function getAllNpcDefs(): NpcDef[];
export function getNpcsByRegionTags(tags: string[]): NpcDef[];
export function getNpcsByRole(role: NpcRole): NpcDef[];
export function getNpcsByDisposition(disposition: NpcDisposition): NpcDef[];
```

### dlc.ts 新增注册/注销

```typescript
// registerDLC 中追加：
if (pack.npcs) for (const npc of pack.npcs) npcRegistry.set(npc.id, npc);

// unregisterDLC 中追加：
if (pack.npcs) for (const npc of pack.npcs) npcRegistry.delete(npc.id);
```

### DLCPack 类型扩展

```typescript
export interface DLCPack {
  // ...existing fields...
  npcs?: NpcDef[];                // NPC 定义
}
```

### registry/index.ts 重新导出

```typescript
export type { NpcDef, NpcDisposition, NpcRole, NpcPersonality } from '../types';
export { getNpcDef, getAllNpcDefs, getNpcsByRegionTags, getNpcsByRole, getNpcsByDisposition } from './queries';
```

---

## NPC 分布机制（与地图联动）

### 区域匹配规则

NPC 出现在哪些区域，遵循以下优先级：

1. **`homeRegionId` 精确匹配**：若设定了固定驻留区域，仅在该区域出现
2. **`regionTags` 标签匹配**：NPC 的 regionTags 与 RegionDef.regionTags 做交集，有交集则出现
3. **空 regionTags**：出现在所有区域（流浪型 NPC）

### 获取当前区域 NPC 列表

```typescript
// src/game/npc.ts
export function getNpcsInRegion(player: Player): NpcDef[] {
  const region = getCurrentRegion(player);
  if (!region) return [];
  const all = getAllNpcDefs();
  const maxLevel = getMaxCultivationLevel(player);

  return all.filter(npc => {
    // 境界门槛
    if (npc.minRealm && maxLevel < npc.minRealm) return false;
    // 自定义条件
    if (npc.condition && !npc.condition(player)) return false;
    // 区域匹配
    if (npc.homeRegionId) return npc.homeRegionId === region.id;
    if (!npc.regionTags.length) return true; // 全区域
    return npc.regionTags.some(tag => region.regionTags.includes(tag));
  });
}
```

玩家执行"探索"或进入新区域时，系统自动刷新可见 NPC 列表，已邂逅但不在当前区域的 NPC 可通过"人脉"面板查看（只读）。

---

## 好感度/关系系统

### 好感度变化来源

| 行为 | 好感度变化 | 说明 |
|------|-----------|------|
| 首次邂逅 | +5 | 自动触发，根据 personality 微调 |
| 赠礼（loved） | +15 ~ +25 | 每年每 NPC 限 1 次 |
| 赠礼（liked） | +5 ~ +10 | 每年每 NPC 限 1 次 |
| 赠礼（disliked） | -10 ~ -5 | 每年每 NPC 限 1 次 |
| 论道成功 | +10 | T0064 瓶颈系统已预留 `discourse` |
| 切磋（玩家胜） | +3  | T0028 预留 |
| 切磋（玩家败） | +5  | NPC 赞赏勇气 |
| 完成 NPC 委托 | +10 ~ +30 | T0054 历练悬赏预留 |
| 攻击友好 NPC | -30 ~ -50 | 可能翻脸为 hostile |
| 年度衰减 | -affinityDecayRate | 长期不互动自然降低 |

### 关系等级解锁的功能

| 等级 | 解锁 | 备注 |
|------|------|------|
| stranger | 基本对话、查看信息 | 默认 |
| acquaintance | 更多对话选项 | T0026 |
| friend | 交易折扣（-10%）、赠送物品 | T0052 |
| close_friend | 论道增益（+悟性）、传授功法 | T0027, T0064 |
| soulmate | 道侣双修候选 | T0048 |

### 核心函数

```typescript
// src/game/npc.ts

/** 初始化 NPC 系统状态 */
export function getNpcState(player: Player): NpcSystemState;

/** 获取某 NPC 的关系（不存在时返回默认 stranger） */
export function getRelation(player: Player, npcId: string): NpcRelation;

/** 计算关系等级 */
export function calcRelationLevel(affinity: number): NpcRelationLevel;

/** 修改好感度（带上下限裁剪） */
export function changeAffinity(
  player: Player, npcId: string, delta: number, reason: string
): { player: Player; message: string; newLevel?: NpcRelationLevel };

/** 邂逅 NPC（首次遇见，初始化关系记录） */
export function meetNpc(
  player: Player, npcId: string
): { player: Player; message: string };

/** 赠礼 */
export function giveGift(
  player: Player, npcId: string, itemId: string
): { player: Player; message: string; affinityChange: number };

/** 查看当前区域可见 NPC 列表（含好感度和关系等级） */
export function getNpcsInRegion(player: Player): NpcDef[];

/** 年度好感度衰减（在年度结算时调用） */
export function tickAffinityDecay(player: Player): Player;

/** 将 NPC 定义转为 Combatant（供战斗系统使用） */
export function npcToCombatant(npc: NpcDef): Combatant;
```

---

## NPC 与战斗系统的交互

### 敌对 NPC 战斗

当 NPC `disposition === 'hostile'` 或好感度降至 hostile 等级时，可能触发战斗。战斗复用现有 `runCombat` 系统：

```typescript
import type { Combatant } from './combat/types';

/** 将 NpcDef 转为 Combatant，复用现有战斗机制 */
export function npcToCombatant(npc: NpcDef): Combatant {
  return {
    name: npc.name,
    hp: npc.hp,
    atk: npc.atk,
    def: npc.def,
    speed: npc.speed,
    moveSpeed: 0,
    critRate: npc.critRate,
    critDmgMultiplier: npc.critDmgMultiplier,
    critResist: npc.critResist,
  };
}
```

**注意**：当前 `runCombat(player, monster)` 接收 `MonsterDef`。为支持 NPC 战斗，需在 Phase 2 或 T0028 中将 `runCombat` 重构为接收通用 `Combatant`，或新增 `runNpcCombat` 适配函数。Phase 1 暂不触碰战斗主循环，仅提供 `npcToCombatant` 转换器。

### 与 MonsterDef 的区别

| 特性 | MonsterDef | NpcDef |
|------|-----------|--------|
| 持久状态 | 无（一次性遭遇） | 有（好感度、flags） |
| 战利品 | expReward / goldReward | 无固定掉落（T0028 PvP 奖励另设） |
| 区域绑定 | regionTags | regionTags + homeRegionId |
| 社交交互 | 无 | 对话、赠礼、论道、委托 |
| 重复遭遇 | 随机刷新 | 固定存在 |

---

## 存档兼容性

### 向后兼容方案

NPC 系统状态存储在 `player.systems['npc']` 中。旧存档不含此字段时，系统自动初始化默认值：

```typescript
const DEFAULT_NPC_STATE: NpcSystemState = {
  relations: {},
  discoveredNpcs: [],
  lastGiftYear: {},
};

export function getNpcState(player: Player): NpcSystemState {
  const s = player.systems['npc'];
  if (!s || typeof s !== 'object') return { ...DEFAULT_NPC_STATE, relations: {}, discoveredNpcs: [], lastGiftYear: {} };
  const state = s as Partial<NpcSystemState>;
  return {
    relations: state.relations ?? {},
    discoveredNpcs: Array.isArray(state.discoveredNpcs) ? state.discoveredNpcs : [],
    lastGiftYear: state.lastGiftYear ?? {},
  };
}
```

遵循与 `getDivineArtsState`、`getMapState`、`getBottleneckState` 完全一致的防御性读取模式。

### 数据迁移

无需迁移。旧存档加载后，NPC 系统自动以空状态启动，玩家正常游玩时逐步填充关系记录。

---

## 与瓶颈系统的对接

现有瓶颈系统（T0064）已预留 `discourse` 解锁方式：

```typescript
{ type: 'discourse'; npcId: string; cost: { itemId: string; count: number }[] }
```

`bottleneck.ts` 中的 `tryDiscourseUnlock(player, npcId)` 函数已实现但标注为"T0064-C 接入时完善"。NPC 系统上线后，此函数需更新为：

1. 检查 NPC 是否存在于当前区域
2. 检查好感度 ≥ close_friend（`affinity ≥ 60`）
3. 扣除 cost 物品
4. 解锁瓶颈 + 增加好感度

此对接在 T0025 Phase 2 完成。

---

## UI 设计要点（@Designer）

### 新增界面/面板

| 元素 | 位置 | 内容 |
|------|------|------|
| NPC 面板 | 右侧面板标签页（与背包/装备/商店同级） | 当前区域 NPC 列表 + 交互按钮 |
| NPC 详情浮窗 | 点击 NPC 卡片弹出 | 头像/名字/称号/境界/好感度条/关系等级/按钮组 |
| 人脉总览标签 | NPC 面板二级 Tab | 所有已邂逅 NPC 列表（包括不在当前区域的） |

### NPC 面板布局

```
┌────────────────────────────────────┐
│  👥 NPC    [当前区域] [人脉总览]  │  ← TabBar
├────────────────────────────────────┤
│ 👴 青云长老  金丹期  ❤️ 友好       │  ← NPC 卡片
│ 🧙 散修张三  筑基期  💛 相识       │
│ 💂 守卫李四  炼气期  🤍 陌生       │
│                                    │
│ (当前区域无更多 NPC)               │
└────────────────────────────────────┘
```

### NPC 详情浮窗

```
┌──────────────────────────────┐
│ 👴 青云长老                   │
│ 称号：青云宗太上长老          │
│ 境界：金丹期                  │
│ 性格：温和                    │
│ ───────────────────────       │
│ 好感度 ████████░░ 72/100     │
│ 关系：至交                    │
│ ───────────────────────       │
│ [交谈]  [赠礼]  [论道]       │
│ [切磋]                        │
└──────────────────────────────┘
```

### 交互按钮可用性

| 按钮 | 条件 | 说明 |
|------|------|------|
| 交谈 | 始终可用 | T0026 实现前，显示固定文本 |
| 赠礼 | 背包有物品 + 本年未赠此 NPC | 选择背包物品赠送 |
| 论道 | 好感度 ≥ close_friend + 有活跃瓶颈含 discourse | T0064 对接 |
| 切磋 | 好感度 ≥ acquaintance | T0028 实现前，按钮灰置 |

### 好感度颜色

| 等级 | 颜色 | Emoji |
|------|------|-------|
| hostile | #F44336 红 | 💢 |
| cold | #9E9E9E 灰 | 🥶 |
| stranger | #FFFFFF 白 | 🤍 |
| acquaintance | #FFEB3B 黄 | 💛 |
| friend | #4CAF50 绿 | 💚 |
| close_friend | #2196F3 蓝 | 💙 |
| soulmate | #E91E63 粉 | ❤️ |

---

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键类/函数 |
|------|------|-------------|
| `src/game/npc.ts` | NPC 系统核心逻辑 | `getNpcState`, `getRelation`, `calcRelationLevel`, `changeAffinity`, `meetNpc`, `giveGift`, `getNpcsInRegion`, `tickAffinityDecay`, `npcToCombatant` |
| `src/data/core-npcs.json` | 核心 NPC 数据（10-15 个初始 NPC） | JSON 格式，通过 `event-loader` 同类模式加载 |
| `src/components/panels/NpcPanel.tsx` | NPC 面板入口 | 当前区域 + 人脉总览两个 Tab |
| `src/components/panels/npc/NpcCard.tsx` | NPC 卡片组件 | 头像+名字+境界+关系等级 |
| `src/components/panels/npc/NpcDetailModal.tsx` | NPC 详情浮窗 | 详细信息+交互按钮 |
| `src/components/panels/npc/GiftModal.tsx` | 赠礼弹窗 | 选择背包物品赠送 |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | 新增 `NpcDef`, `NpcDisposition`, `NpcRole`, `NpcPersonality`, `NpcRelation`, `NpcRelationLevel`, `NpcSystemState` 类型 | 全局类型集中管理 |
| `src/game/types.ts` | `DLCPack` 新增 `npcs?: NpcDef[]` 字段 | DLC 扩展支持 |
| `src/game/registry/stores.ts` | 新增 `npcRegistry` Map | 注册表存储 |
| `src/game/registry/dlc.ts` | `registerDLC`/`unregisterDLC` 追加 NPC 注册/注销 | DLC 挂载 |
| `src/game/registry/queries.ts` | 新增 NPC 查询函数 | 注册表查询 API |
| `src/game/registry/index.ts` | 重新导出 NPC 相关类型和函数 | barrel export |
| `src/game/events.ts` | `registerCoreEvents` 中追加 NPC JSON 加载 + DLC 注册 | 核心数据加载 |
| `src/game/bottleneck.ts` | `tryDiscourseUnlock` 接入 NPC 好感度检查（Phase 2） | 论道解锁瓶颈 |
| `src/hooks/useSystemActions.ts` | 新增 `meetNpc`, `giveGift`, `interactNpc` 等 action | Hook 暴露给 UI |
| `src/components/layout/RightPanel.tsx` | 新增 NPC 面板 Tab | 面板入口 |
| `src/components/shared/constants.ts` | 新增关系等级中文名、颜色常量 | UI 常量 |

### 公式

**好感度变化公式**：
```
赠礼好感度 = base × (1 + player.charisma / 200)
  其中 base:
    loved    = random(15, 25)
    liked    = random(5, 10)
    disliked = random(-10, -5)
```

玩家魅力（charisma）越高，正面好感度增幅越大（最多 +50%），负面变化不受魅力影响。

**关系等级中文映射**：
```
hostile      → 敌对
cold         → 冷淡
stranger     → 陌生
acquaintance → 相识
friend       → 友好
close_friend → 至交
soulmate     → 知己
```

---

## 核心 NPC 数据（core-npcs.json）初始内容规划

Phase 1 提供 10-15 个核心 NPC，覆盖不同区域、角色和境界：

| ID | 名称 | 区域 | 角色 | 境界 | 态度 | 性格 |
|----|------|------|------|------|------|------|
| `core:npc_qingyun_elder` | 青云长老 | town | elder | 金丹(4) | friendly | gentle |
| `core:npc_herb_master` | 灵药谷药师 | valley, herb | alchemist | 筑基(2) | friendly | mysterious |
| `core:npc_beast_hunter` | 猎妖人张猎 | mountain, wilderness | wanderer | 筑基(2) | neutral | hot_tempered |
| `core:npc_market_chen` | 陈掌柜 | town | merchant | 炼气(1) | friendly | cunning |
| `core:npc_gate_guard` | 守山弟子 | town | guard | 炼气(1) | neutral | righteous |
| `core:npc_wanderer_li` | 散修李无名 | 全区域 | wanderer | 筑基(2) | neutral | cold |
| `core:npc_mystic_sage` | 秘境老人 | mystic | elder | 元婴(5) | neutral | mysterious |
| `core:npc_smith_wang` | 王铁匠 | town | smith | 筑基(2) | friendly | hot_tempered |
| `core:npc_bandit_chief` | 山贼头子 | wasteland, wilderness | rival | 筑基(2) | hostile | cunning |
| `core:npc_fairy_xue` | 雪灵仙子 | mystic | companion | 金丹(4) | neutral | gentle |

> **@Content** 在实现阶段负责填充完整数值（hp/atk/def 等），此处仅规划角色定位。

---

## 验证方式

### 功能测试用例

1. **NPC 发现**：创建新角色 → 进入青云镇 → NPC 面板显示该区域 NPC 列表 → 点击 NPC 卡片弹出详情浮窗
2. **区域切换**：移动到妖兽山 → NPC 列表刷新为妖兽山区域 NPC → 青云镇 NPC 不再显示（但人脉总览中可见）
3. **赠礼**：选择赠礼 → 弹出物品选择 → 选择 NPC 喜爱的物品 → 好感度增加 → 日志显示变化 → 同年再次赠礼提示"今年已赠过"
4. **好感度等级提升**：通过赠礼将好感度从 stranger 提升到 acquaintance → UI 颜色/emoji 变化 → Toast 提示"关系提升"
5. **境界限制**：凡人玩家无法看到秘境 NPC（minRealm = 3） → 突破到筑基后仍不可见 → 突破到结丹后可见
6. **存档兼容**：加载旧存档（无 NPC 数据） → 系统正常初始化 → NPC 面板显示空的关系列表
7. **Debug 面板**：通过 Debug 面板修改指定 NPC 好感度 → 验证关系等级变化

### 浏览器验证步骤

1. `npm run dev` → 开始游戏 → 右侧面板切到"NPC"标签
2. 确认当前区域（青云镇）显示对应 NPC
3. 点击 NPC 卡片 → 检查详情浮窗内容
4. 赠礼 → 确认好感度变化和日志
5. 移动到其他区域 → 确认 NPC 列表变化
6. 切到"人脉总览"Tab → 确认已邂逅 NPC 均显示

---

## 调试面板需求

新增 Debug 面板功能：

1. **NPC 好感度修改**：选择 NPC → 输入好感度数值 → 直接设置
2. **全部邂逅**：一键将所有已注册 NPC 标记为已邂逅
3. **重置 NPC 状态**：一键清空所有 NPC 关系数据
4. **好感度批量设置**：将所有已邂逅 NPC 好感度设为指定值（便于测试关系等级解锁）

建议在 Debug 面板新增一个 Tab："NPC 调试"，放置以上功能。

---

## 分阶段实施计划

### Phase 1：基础框架（T0025 本任务）

- [x] 设计 NpcDef 类型 + NpcSystemState
- [ ] 注册表集成（stores / dlc / queries / index）
- [ ] `src/game/npc.ts`：核心逻辑（状态读写、好感度变化、区域 NPC 查询）
- [ ] `src/data/core-npcs.json`：10 个初始 NPC 数据
- [ ] `events.ts` 加载 NPC JSON 并注册
- [ ] NPC 面板 UI（列表 + 详情浮窗 + 赠礼）
- [ ] useSystemActions 追加 NPC 交互 action
- [ ] Debug 面板 NPC 调试功能
- [ ] 测试用例写入 test-guide.md

### Phase 2：系统对接（T0025 后续或并行）

- [ ] 瓶颈系统论道解锁对接（`tryDiscourseUnlock` 完善）
- [ ] 年度好感度衰减接入时间系统
- [ ] 探索事件触发 NPC 邂逅
- [ ] NPC 商人角色接入商店系统（NPC 专属商品）

### Phase 3：后续任务消费（各自独立任务）

- T0026 对话系统：消费 `dialoguePoolId`，实现对话树
- T0027 门派系统：消费 `sectId`，实现入门/师徒
- T0028 PvP 切磋：消费 `npcToCombatant`，实现切磋战斗
- T0048 道侣双修：消费 `soulmate` 关系等级
- T0051 NPC AI 生态：消费 `aiTags`，实现 NPC 自主行为
- T0052 拍卖行：消费 `shopGoodsIds`，实现 NPC 拍卖
- T0053 宗门管理：消费 `sectId` + 新增宗门数据结构
- T0054 历练悬赏：NPC 发布任务，完成后增加好感度
- T0055 天机榜：NPC 境界/战力作为排行参考

---

## 预留扩展点清单

| 扩展点 | 目标任务 | 接口/字段 | 说明 |
|--------|---------|----------|------|
| `dialoguePoolId` | T0026 对话 | NpcDef 字段 | 指向对话树数据 |
| `sectId` | T0027 门派 | NpcDef 字段 | NPC 所属门派 ID |
| `npcToCombatant()` | T0028 PvP | 函数 | NPC → 战斗参与者 |
| `soulmate` 关系等级 | T0048 道侣 | NpcRelationLevel | 好感度 ≥ 90 解锁 |
| `aiTags` | T0051 AI 生态 | NpcDef 字段 | NPC 自主行为标签 |
| `shopGoodsIds` | T0052 拍卖行 | NpcDef 字段 | NPC 专属商品 |
| `NpcRelation.flags` | 通用 | Record<string, unknown> | 各子系统自由写入状态 |
| `giftPreferences` | T0025 Phase 1 | NpcDef 字段 | 赠礼喜好，后续可扩展为更复杂的喜好系统 |
| `condition` 谓词 | 通用 | NpcDef 字段 | 动态控制 NPC 出现条件 |
| `maxAffinity` | 通用 | NpcDef 字段 | 允许 DLC 定义超高好感度上限的特殊 NPC |

---

## 依赖关系

### 前置任务

| ID | 任务 | 状态 | 说明 |
|----|------|------|------|
| T0001 | 属性系统 | ✅ | Player 类型基础 |
| T0021 | 地图系统 | ✅ | 区域绑定、regionTags |
| T0012 | 背包系统 | ✅ | 赠礼需要物品 |

### 后续任务（直接依赖 T0025）

| ID | 任务 | 消费接口 |
|----|------|---------|
| T0026 | 对话系统 | NpcDef, dialoguePoolId, NpcRelation |
| T0027 | 门派系统 | NpcDef, sectId, NpcRelation |
| T0028 | PvP 切磋 | npcToCombatant(), NpcRelation |
| T0048 | 道侣双修 | soulmate 等级, NpcRelation.flags |
| T0051 | NPC AI 生态 | NpcDef, aiTags, 全局 NPC 列表 |
| T0052 | 拍卖行 | NpcDef, shopGoodsIds, NpcRelation |
| T0053 | 宗门管理 | sectId, NpcRelation |
| T0054 | 历练悬赏 | NpcDef, NpcRelation (好感度奖励) |
| T0055 | 天机榜 | NpcDef (境界/战力), NpcRelation |
