# 设计文档：对话系统
任务：T0026
日期：2026-04-07
GitHub Issue: https://github.com/szylover/xiuxian-game/issues/98

## 概述

对话系统为修仙世界中的 NPC 交互注入灵魂。它使每个 NPC 不再只是一张静态名片，而是能与玩家进行有深度、有分支、有后果的对话。对话系统是修仙 RPG 的核心体验支柱之一——通过对话，玩家可以获取修行线索、接取或推进任务、获得物品赠礼、提升（或降低）好感度、解锁秘闻、触发事件甚至触发战斗。

**设计定位**：对话系统是纯逻辑壳子，所有具体对话内容通过 JSON 数据文件定义，由 `registerDLC()` 注册。核心包（`core`）自带基础对话内容，DLC 可扩展任意 NPC 的对话。

**前置任务**：T0025（NPC 系统）✅
**下游依赖**：T0048（道侣双修系统）、T0053（宗门管理）间接受益

---

## 核心设计思路

### 对话树模型

采用 **有向无环图（DAG）对话节点** 模型：

- 一个 NPC 可关联多个 **对话链（DialogueChainDef）**
- 每条对话链由多个 **对话节点（DialogueNode）** 组成
- 每个节点包含 NPC 台词 + 玩家可选的 **对话选项（DialogueChoice）**
- 每个选项可跳转到不同的下一节点、执行效果、或结束对话
- 对话链有触发条件：好感度、境界、任务状态、物品持有、区域……
- 同一个 NPC 在不同条件下可触发不同的对话链

### 与现有交谈按钮的关系

`NpcDetailModal.tsx` 已有 💬 交谈按钮，目前是从 `CHAT_LINES` 硬编码数组中随机取一句话。对话系统上线后：
1. 检查是否有可触发的对话链 → 有则启动对话弹窗
2. 无可触发对话链 → 退化为闲聊（随机对话），闲聊内容也由 JSON 数据驱动

---

## 数据结构

### DialogueChainDef — 对话链定义（核心类型）

```typescript
// ── 新增到 src/game/types.ts ──

/** 对话节点类型 */
export type DialogueNodeType = 'npc_talk' | 'player_choice' | 'narration';

/** 对话选项效果 */
export interface DialogueEffect {
  affinityChange?: number;                         // 好感度变化
  giveItems?: { itemId: string; count: number }[];  // NPC 赠送物品
  takeItems?: { itemId: string; count: number }[];  // 消耗玩家物品
  goldChange?: number;                              // 灵石变化
  expChange?: number;                               // 修为变化
  triggerQuestId?: string;                          // 接取任务链
  triggerEventId?: string;                          // 触发事件
  triggerCombatNpcId?: string;                      // 触发与该 NPC 的战斗
  setNpcFlag?: { key: string; value: unknown };     // 设置 NPC 关系 flags
  setDialogueFlag?: { key: string; value: unknown }; // 设置对话系统 flags
  unlockDialogueId?: string;                        // 手动解锁某对话链
  statBonus?: Partial<Record<'atk' | 'def' | 'hp' | 'mp' | 'luck' | 'comprehension', number>>;
}

/** 对话选项条件（决定该选项是否显示） */
export interface DialogueChoiceCondition {
  minAffinity?: number;
  minRealm?: number;
  hasItem?: { itemId: string; count: number };
  hasNpcFlag?: { key: string; value: unknown };
  hasDialogueFlag?: { key: string; value: unknown };
  completedQuest?: string;
  hasActiveQuest?: string;
  custom?: string;  // 预留，Loader 不处理，供 TS 扩展
}

/** 单个对话选项 */
export interface DialogueChoice {
  id: string;                              // 选项唯一 ID（链内唯一）
  text: string;                            // 选项文本（玩家看到的）
  condition?: DialogueChoiceCondition;      // 显示条件（不满足则不显示此选项）
  nextNodeId?: string;                      // 跳转到的下一节点 ID（缺省=结束对话）
  effects?: DialogueEffect;                 // 选择后的效果
  tooltip?: string;                         // 鼠标悬浮提示（如 "需好感度 ≥ 60"）
}

/** 对话节点 */
export interface DialogueNode {
  id: string;                              // 节点 ID（链内唯一）
  type: DialogueNodeType;                  // 节点类型
  speaker?: string;                        // 说话者名称（NPC 名/旁白，显示用）
  speakerEmoji?: string;                   // 说话者 emoji
  text: string;                            // 对话文本
  choices?: DialogueChoice[];              // 玩家可选选项（缺省=自动跳转 nextNodeId）
  nextNodeId?: string;                     // 无选项时自动跳转的下一节点
  effects?: DialogueEffect;                // 进入此节点时自动执行的效果
  delay?: number;                          // UI 打字机效果延迟（毫秒，预留）
}

/** 对话链触发条件 */
export interface DialogueCondition {
  minAffinity?: number;                    // 最低好感度
  maxAffinity?: number;                    // 最高好感度（如限定特定区间）
  minRealm?: number;                       // 最低境界
  maxRealm?: number;                       // 最高境界
  relationLevel?: NpcRelationLevel[];      // 关系等级白名单
  regionId?: string;                       // 必须在指定区域
  regionTags?: string[];                   // 必须在含指定标签的区域
  requiredQuests?: string[];               // 必须完成的前置任务
  hasActiveQuest?: string;                 // 必须有某激活任务
  requiredItems?: { itemId: string; count: number }[];
  hasNpcFlag?: { key: string; value: unknown };
  hasDialogueFlag?: { key: string; value: unknown };
  custom?: (p: Player) => boolean;         // TS 扩展条件（JSON 不使用）
}

/** 对话链定义 */
export interface DialogueChainDef {
  id: string;                              // 命名空间 ID，如 'core:dlg_qingyun_elder_greet'
  npcId: string;                           // 关联的 NPC ID
  name: string;                            // 对话名称（调试/日志用，不显示给玩家）
  priority: number;                        // 优先级（同一 NPC 多条可触发对话时，取最高优先级）
  condition?: DialogueCondition;           // 触发条件
  nodes: DialogueNode[];                   // 对话节点列表
  startNodeId: string;                     // 起始节点 ID
  once?: boolean;                          // 是否只能触发一次
  cooldown?: number;                       // 触发冷却（月数）
  tags?: string[];                         // 对话标签（如 'greeting', 'quest', 'trade', 'lore'）
}
```

### DialogueSystemState — 存入 player.systems['dialogue']

```typescript
/** 对话系统运行时状态 */
export interface DialogueSystemState {
  /** 已触发过的一次性对话 ID 集合 */
  triggeredOnce: string[];
  /** 对话触发冷却记录：dialogueId → 上次触发时的 player.age */
  lastTriggerAge: Record<string, number>;
  /** 对话系统全局 flags（供条件判断和跨对话链状态传递） */
  flags: Record<string, unknown>;
}
```

### DLCPack 扩展

```typescript
// DLCPack 新增字段
export interface DLCPack {
  // ...existing fields...
  dialogues?: DialogueChainDef[];          // 该 DLC 提供的对话链定义
}
```

### NpcDef.dialoguePoolId 的废弃

T0025 预留的 `dialoguePoolId` 字段不再使用。对话链通过 `DialogueChainDef.npcId` 反向关联 NPC，无需 NPC 侧组织。`dialoguePoolId` 字段保留但标记为 `@deprecated`，不影响现有功能。

---

## 游戏逻辑方案（@Dev）

### 新增文件

| 文件 | 用途 | 关键类/函数 |
|------|------|-------------|
| `src/game/dialogue.ts` | 对话系统核心逻辑 | `getDialogueState()`, `startDialogue()`, `selectChoice()`, `getAvailableDialogues()` |
| `src/game/dialogue-loader.ts` | JSON → DialogueChainDef 转换器 | `loadDialoguesFromJson()` |
| `src/data/texts/dialogue.ts` | 对话系统文案（系统提示、UI 标签） | `DIALOGUE_TEXTS` |
| `src/data/dlc/core/dialogues.json` | 核心包对话数据 | 6+ 条基础对话链 |
| `src/components/shared/DialogueModal.tsx` | 对话弹窗组件 | — |
| `src/components/shared/DialogueModal.css` | 对话弹窗样式 | — |

### 修改文件

| 文件 | 改动 | 原因 |
|------|------|------|
| `src/game/types.ts` | 新增对话相关类型定义 | 类型集中管理 |
| `src/game/registry/stores.ts` | 新增 `dialogueRegistry` Map | 注册表存储 |
| `src/game/registry/dlc.ts` | `registerDLC()`/`unregisterDLC()` 增加对话注册/注销 | DLC 扩展 |
| `src/game/registry/queries.ts` | 新增 `getDialogueDef()`, `getAllDialogueDefs()`, `getDialoguesByNpc()` | 注册表查询 |
| `src/game/registry/index.ts` | re-export 新增查询函数 | barrel export |
| `src/hooks/useSystemActions.ts` | 新增 `startDialogue()`, `advanceDialogue()` 行为 | Hook 接入 |
| `src/components/panels/npc/NpcDetailModal.tsx` | 交谈按钮接入对话系统 | 替换硬编码闲聊 |
| `src/data/dlc/core/manifest.ts` | 加载 dialogues.json 并注入 DLCPack | 核心包数据 |
| `src/data/texts/index.ts` | re-export `DIALOGUE_TEXTS` | 文案集中管理 |
| `src/components/debug/DebugStatsTab.tsx` | 新增对话 flags 查看/重置按钮 | 调试面板 |

### 核心逻辑 — `src/game/dialogue.ts`

```
// 伪代码

getDialogueState(player) → DialogueSystemState
setDialogueState(player, state) → Player

// 获取某 NPC 当前可触发的对话链列表（按 priority 排序）
getAvailableDialogues(player, npcId) → DialogueChainDef[]
  - 遍历 dialogueRegistry 中 npcId 匹配的对话链
  - 过滤 condition 不满足的
  - 过滤 once=true 且已触发过的
  - 过滤冷却中的
  - 按 priority 降序排序

// 获取当前 NPC 要播放的对话（取最高优先级）
getTopDialogue(player, npcId) → DialogueChainDef | null

// 开始一段对话（返回起始节点 + 更新状态）
startDialogue(player, dialogueId)
  → { player, node: DialogueNode, dialogueId }
  - 标记 once 对话为已触发
  - 记录冷却时间
  - 执行 startNode 的 effects（如有）

// 选择选项（推进到下一节点、执行效果）
selectChoice(player, dialogueId, nodeId, choiceId)
  → { player, nextNode: DialogueNode | null, logs: string[], combatTrigger?, questTrigger? }
  - 执行 choice.effects（好感度/物品/任务/事件/战斗）
  - 返回下一节点（null = 对话结束）

// 闲聊退化（无可用对话链时调用）
getIdleChat(npcId, personality) → string
  - 从闲聊池中随机取一条
  - 闲聊文案也通过 JSON 数据注册
```

### JSON Loader — `src/game/dialogue-loader.ts`

```
// JSON 数据格式（dialogues.json 中一条记录示例）

{
  "id": "core:dlg_qingyun_elder_greet",
  "npcId": "core:npc_qingyun_elder",
  "name": "青云长老初见",
  "priority": 10,
  "once": true,
  "condition": {
    "minAffinity": 0,
    "relationLevel": ["stranger", "acquaintance"]
  },
  "startNodeId": "n1",
  "nodes": [
    {
      "id": "n1",
      "type": "npc_talk",
      "text": "「年轻人，修行一途，当戒骄戒躁。你可有什么想问的？」",
      "choices": [
        {
          "id": "c1",
          "text": "🙏 请长老指点修行之道。",
          "nextNodeId": "n2",
          "effects": { "affinityChange": 3 }
        },
        {
          "id": "c2",
          "text": "💬 听说此地有什么奇遇？",
          "nextNodeId": "n3"
        },
        {
          "id": "c3",
          "text": "👋 告辞。",
          "effects": { "affinityChange": -1 }
        }
      ]
    },
    {
      "id": "n2",
      "type": "npc_talk",
      "text": "「不错，有此心性，日后必有所成。这枚丹药送你，助你筑基。」",
      "effects": {
        "giveItems": [{ "itemId": "core:hp_pill", "count": 2 }]
      }
    },
    {
      "id": "n3",
      "type": "npc_talk",
      "text": "「此地灵脉交汇，偶有灵药现世。不过更深处可能有妖兽出没，小心为上。」"
    }
  ]
}
```

**Loader 职责**（复用 event-loader / quest-loader 模式）：
- 解析 JSON → `DialogueChainDef` 对象
- 验证节点 ID 引用合法性（choice.nextNodeId 指向存在的 node）
- 验证 startNodeId 存在
- `custom` 条件在 JSON 中忽略，仅 TS 扩展使用

### 闲聊池数据

NPC 无可用对话链时，退化为闲聊。闲聊文案按 personality 分组，也通过 JSON 数据驱动：

```json
// 建议放入 dialogues.json 或独立 idle-chat.json
// 也可作为 DialogueChainDef 的 tag: "idle" 特殊处理

{
  "idleChat": {
    "gentle": ["「修行之路，贵在坚持。」", "「心怀善念，自有天助。」"],
    "cold": ["「……」", "「无事勿扰。」"],
    "hot_tempered": ["「废话少说！有事快讲！」", "「哼，又来了。」"],
    "cunning": ["「嘿嘿，有好东西吗？」", "「做生意讲个诚信。」"],
    "righteous": ["「正义之道，不可偏废。」", "「守护弱者，乃修士本分。」"],
    "mysterious": ["「天机不可泄露……」", "「有缘再见。」"]
  }
}
```

这样 `NpcDetailModal.tsx` 中的 `CHAT_LINES` 硬编码可彻底移除。

### 注册表扩展

```typescript
// stores.ts 新增
export const dialogueRegistry = new Map<string, DialogueChainDef>();

// queries.ts 新增
export function getDialogueDef(id: string): DialogueChainDef | undefined;
export function getAllDialogueDefs(): DialogueChainDef[];
export function getDialoguesByNpc(npcId: string): DialogueChainDef[];

// dlc.ts registerDLC 新增
if (pack.dialogues) for (const d of pack.dialogues) dialogueRegistry.set(d.id, d);

// dlc.ts unregisterDLC 新增
if (pack.dialogues) for (const d of pack.dialogues) dialogueRegistry.delete(d.id);
```

### 与现有系统的交互

#### 1. NPC 系统（T0025）

- 对话效果 `affinityChange` 调用 `changeAffinity()` 修改好感度
- 对话触发条件可检查 `NpcRelation.affinity`、`relationLevel`、`flags`
- 对话可设置 `NpcRelation.flags`（通过 `setNpcFlag` 效果）
- 交谈按钮点击时先检查对话系统，无对话链则退化为闲聊
- 对话结束后触发 `onMeet`（推进 `talk_npc` 任务目标）

#### 2. 任务链系统（T0057）

- 对话选项可通过 `triggerQuestId` 接取任务
- 对话条件可检查 `hasActiveQuest`、`completedQuest`
- 任务步骤中的 `talk_npc` 目标天然与对话交互对接
- 任务步骤的 `dialogueSnippet` 可升级为指向具体对话链 ID（渐进增强，本期不做）

#### 3. 事件系统

- 对话选项可通过 `triggerEventId` 触发任何已注册事件
- 事件可作为对话的"宏观叙事"补充

#### 4. 商店系统

- 对话不直接打开商店（保持系统分离），但可通过 `giveItems`/`takeItems` 模拟简单交易
- 商人 NPC 的专属商品列表仍通过 `shopGoodsIds` 管理

#### 5. 战斗系统

- 对话选项可通过 `triggerCombatNpcId` 触发与 NPC 的战斗
- 战斗结果不回到对话流（对话结束后才开始战斗）

#### 6. 瓶颈系统（T0064）

- 瓶颈解锁方式 `discourse`（论道）已有 NPC 交互设计
- 未来可通过对话触发论道瓶颈解锁（本期不做强耦合）

---

## UI 方案（@Designer）

### 新增界面：对话弹窗（DialogueModal）

| 元素 | 位置 | 内容 |
|------|------|------|
| 遮罩层 | 全屏 | 半透明黑色遮罩（复用 CombatModal 风格） |
| 对话容器 | 屏幕中央偏下 | 圆角浮窗，像素风边框 |
| NPC 区域（左上） | 容器顶部 | NPC emoji + 名称 + 称号 |
| 对话文本区 | 容器主体 | 当前节点台词文本，支持多行 |
| 选项区域 | 容器底部 | 垂直排列的选项按钮，悬浮显示 tooltip |
| 继续按钮 | 容器底部 | 无选项时显示"继续"按钮（跳至下一节点）或"结束对话" |

### UI 布局示意

```
┌──────────────────────────────────────┐
│  👴 青云长老 · 青云宗太上长老         │
├──────────────────────────────────────┤
│                                      │
│  「年轻人，修行一途，当戒骄戒躁。     │
│   你可有什么想问的？」               │
│                                      │
├──────────────────────────────────────┤
│  ▸ 🙏 请长老指点修行之道。           │
│  ▸ 💬 听说此地有什么奇遇？           │
│  ▸ 👋 告辞。                         │
└──────────────────────────────────────┘
```

### 交互设计

1. **进入对话**：玩家点击 NpcDetailModal 的 💬 交谈按钮
   - 有可用对话链 → 关闭 NpcDetailModal，打开 DialogueModal
   - 无可用对话链 → 在 NpcDetailModal 内显示闲聊气泡（保持现有行为）
2. **选择选项**：点击选项按钮 → 执行效果 → 显示下一节点
   - 不满足条件的选项不显示（不是灰色禁用，而是直接隐藏）
   - 效果反馈通过 Toast / 日志展示：好感度变化、获得物品等
3. **自动跳转**：无选项的节点（narration/npc_talk）显示"继续"按钮，点击跳转下一节点
4. **对话结束**：
   - 最后一个节点无 nextNodeId 且无 choices → 显示"结束对话"按钮
   - 选择某选项且该选项无 nextNodeId → 执行效果后结束对话
   - 对话结束后若有 `triggerCombatNpcId` → 启动战斗弹窗
   - 对话结束后若有 `triggerQuestId` → 触发任务接取
5. **样式规范**：所有样式写入 `DialogueModal.css`，使用 CSS 变量，禁止内联样式

### 修改现有界面

| 元素 | 位置 | 改动 |
|------|------|------|
| NpcDetailModal 交谈按钮 | npc/NpcDetailModal.tsx | 点击时检查对话系统，有对话链则打开 DialogueModal |
| NpcCard 对话标记 | npc/NpcCard.tsx | 有可用对话链的 NPC 显示 💬 角标（类似任务标记） |
| NpcDetailModal CHAT_LINES | npc/NpcDetailModal.tsx | 移除硬编码，改为从闲聊池加载 |

---

## 对话数据设计（核心包 `core:` 示例）

核心包至少包含以下 6 条基础对话链：

| ID | NPC | 触发条件 | 简述 | once? |
|----|-----|---------|------|-------|
| `core:dlg_elder_first_meet` | 青云长老 | stranger, 首次邂逅后 | 初见指点，赠送丹药 | ✅ |
| `core:dlg_elder_realm2_advice` | 青云长老 | friend+, 境界≥2 | 突破建议，赠送突破材料 | ✅ |
| `core:dlg_herb_master_trade` | 灵药谷药师 | acquaintance+ | 讨论灵药，可获得灵草 | cooldown 12 月 |
| `core:dlg_beast_hunter_challenge` | 猎妖人张猎 | friend+, 境界≥2 | 切磋邀请→触发战斗 | cooldown 6 月 |
| `core:dlg_market_chen_gossip` | 陈掌柜 | acquaintance+ | 打听消息，获得修行线索 | cooldown 6 月 |
| `core:dlg_wanderer_li_mystery` | 散修李无名 | friend+, 境界≥3 | 神秘暗示，设置 flag 供后续解锁 | ✅ |

每条对话链包含 2~5 个节点，1~3 个分支选项。

### JSON 文件格式示例（`dialogues.json`）

```json
[
  {
    "id": "core:dlg_elder_first_meet",
    "npcId": "core:npc_qingyun_elder",
    "name": "青云长老初见",
    "priority": 100,
    "once": true,
    "condition": {
      "minAffinity": 0,
      "relationLevel": ["stranger", "acquaintance"]
    },
    "startNodeId": "n1",
    "tags": ["greeting", "lore"],
    "nodes": [
      {
        "id": "n1",
        "type": "npc_talk",
        "text": "「年轻人，初入修途，前路漫漫。你可有什么想要请教的？」",
        "choices": [
          {
            "id": "c1",
            "text": "🙏 请长老指点修行之道。",
            "nextNodeId": "n2",
            "effects": { "affinityChange": 5 }
          },
          {
            "id": "c2",
            "text": "💰 有没有什么好处？",
            "nextNodeId": "n3",
            "effects": { "affinityChange": -2 }
          },
          {
            "id": "c3",
            "text": "👋 多谢，告辞。"
          }
        ]
      },
      {
        "id": "n2",
        "type": "npc_talk",
        "text": "「好，就凭你这份心性。这两枚回灵丹送你，修炼之余用得上。记住：修行如逆水行舟，不进则退。」",
        "effects": {
          "giveItems": [{ "itemId": "core:hp_pill", "count": 2 }]
        }
      },
      {
        "id": "n3",
        "type": "npc_talk",
        "text": "「哼，修行之路若只图好处，迟早走错路。去吧，自己好好想想。」"
      }
    ]
  },
  {
    "id": "core:dlg_beast_hunter_challenge",
    "npcId": "core:npc_beast_hunter",
    "name": "猎妖人切磋",
    "priority": 50,
    "cooldown": 6,
    "condition": {
      "minAffinity": 30,
      "relationLevel": ["friend", "close_friend", "soulmate"],
      "minRealm": 2
    },
    "startNodeId": "n1",
    "tags": ["combat"],
    "nodes": [
      {
        "id": "n1",
        "type": "npc_talk",
        "text": "「嘿！看你实力不错，要不来过两招？别怕，点到为止！」",
        "choices": [
          {
            "id": "c1",
            "text": "⚔️ 好！来就来！",
            "nextNodeId": "n2",
            "effects": {
              "affinityChange": 5,
              "triggerCombatNpcId": "core:npc_beast_hunter"
            }
          },
          {
            "id": "c2",
            "text": "🙅 今天身体不适，改日再战。",
            "effects": { "affinityChange": -1 }
          }
        ]
      },
      {
        "id": "n2",
        "type": "npc_talk",
        "text": "「哈哈！痛快！那就开始吧——」"
      }
    ]
  }
]
```

### 闲聊池格式

```json
{
  "idleChat": {
    "gentle": [
      "「修行之路，贵在坚持。」",
      "「心怀善念，自有天助。」",
      "「前辈有何指教？」",
      "「今日天色不错，适合修炼。」"
    ],
    "cold": [
      "「……」",
      "「无事勿扰。」",
      "「你还不够资格。」",
      "「走吧。」"
    ],
    "hot_tempered": [
      "「废话少说！有事快讲！」",
      "「哼，又来了。」",
      "「要切磋就痛快点！」",
      "「别磨磨蹭蹭的！」"
    ],
    "cunning": [
      "「嘿嘿，有好东西吗？」",
      "「做生意讲个诚信。」",
      "「这笔买卖不亏。」",
      "「你有什么想买的？」"
    ],
    "righteous": [
      "「正义之道，不可偏废。」",
      "「守护弱者，乃修士本分。」",
      "「你心中有正气。」",
      "「行善积德，天道酬勤。」"
    ],
    "mysterious": [
      "「天机不可泄露……」",
      "「或许……某日你会明白。」",
      "「有缘再见。」",
      "「此中有深意，你自己体会吧。」"
    ]
  }
}
```

---

## 文案集中管理

新增 `src/data/texts/dialogue.ts`：

```typescript
export const DIALOGUE_TEXTS = {
  // 系统提示
  noDialogueAvailable: '当前没有新的对话内容。',
  dialogueStarted: (npcName: string) => `${npcName} 与你交谈——`,
  dialogueEnded: '对话结束。',
  
  // 效果反馈
  affinityUp: (name: string, delta: number) => `${name} 好感度 +${delta}`,
  affinityDown: (name: string, delta: number) => `${name} 好感度 ${delta}`,
  receivedItem: (itemName: string, count: number) => `获得 ${itemName} ×${count}`,
  lostItem: (itemName: string, count: number) => `失去 ${itemName} ×${count}`,
  goldChange: (delta: number) => delta > 0 ? `获得 ${delta} 灵石` : `失去 ${Math.abs(delta)} 灵石`,
  questTriggered: (questName: string) => `接取任务：${questName}`,
  combatTriggered: (npcName: string) => `${npcName} 向你发起了挑战！`,
  
  // UI 标签
  continueBtn: '继续',
  endDialogueBtn: '结束对话',
  dialogueTitle: '对话',
  choiceHintLocked: '（条件不满足）',
  
  // NpcDetailModal
  chatBtnHasDialogue: '💬 交谈（有新对话）',
  chatBtnIdle: '💬 闲聊',
};
```

---

## 验证方式

### 基本流程测试

1. **邂逅 NPC → 查看对话**：邂逅青云长老后，点击交谈，应触发 `core:dlg_elder_first_meet`，弹出对话弹窗
2. **选择选项**：选择"请长老指点修行之道" → 好感度 +5 → 获得回灵丹 ×2 → 对话结束
3. **一次性对话**：再次点击交谈，不再出现 `core:dlg_elder_first_meet`，退化为闲聊
4. **条件触发**：提高好感度到 30+、境界达到 2，猎妖人张猎应出现切磋对话
5. **冷却机制**：切磋对话触发后，6 个月内不再出现
6. **战斗触发**：选择切磋选项后，对话结束，弹出战斗弹窗
7. **物品赠送/消耗**：对话效果的 giveItems/takeItems 正确增减背包

### 边界条件

1. NPC 无任何对话链 → 直接显示闲聊气泡
2. 对话链条件全部不满足 → 退化为闲聊
3. 对话中 giveItems 超出背包上限 → 提示背包已满（溢出部分丢弃或阻止选择）
4. 对话中 takeItems 玩家不持有 → 该选项不显示
5. 对话节点引用不存在的 nextNodeId → Loader 警告，运行时跳过

### Debug 面板验证

1. 使用 Debug 面板「对话系统」区域，可查看/重置 triggeredOnce 集合
2. 使用 Debug 面板可清除对话冷却
3. 使用 Debug 面板可手动设置/清除对话 flags

---

## 调试面板需求

新增以下调试功能到 `DebugStatsTab.tsx`：

| 调试功能 | 操作 | 说明 |
|---------|------|------|
| 重置所有对话 | 按钮 | 清空 triggeredOnce + lastTriggerAge + flags |
| 查看对话 flags | 显示 | 展示当前 dialogue flags 的 JSON |
| 清除对话冷却 | 按钮 | 清空 lastTriggerAge |

---

## 实现步骤拆分

建议分 3 个阶段实现：

### Phase 1：核心框架（必做）

1. 在 `types.ts` 新增所有对话相关类型
2. 实现 `dialogue.ts`：状态读写 + 条件检查 + 对话推进逻辑
3. 实现 `dialogue-loader.ts`：JSON → DialogueChainDef
4. 注册表扩展（stores/dlc/queries）
5. 创建 `dialogues.json`（核心包 6 条对话链 + 闲聊池）
6. 更新 `manifest.ts` 加载对话数据

### Phase 2：UI 集成（必做）

7. 实现 `DialogueModal.tsx` + `DialogueModal.css`
8. 修改 `NpcDetailModal.tsx`：交谈按钮接入对话系统
9. 修改 `NpcCard.tsx`：有对话的 NPC 显示标记
10. 新增 `DIALOGUE_TEXTS` 文案文件 + 更新 index.ts
11. 对话效果与现有系统对接（好感度/背包/任务/战斗）

### Phase 3：打磨体验

12. 调试面板对话区域
13. 闲聊池数据驱动（替换 NpcDetailModal 硬编码 CHAT_LINES）
14. 对话标记显示（NpcCard 角标）

---

## 依赖关系

### 前置任务

| 任务 | 状态 | 关系 |
|------|------|------|
| T0025 NPC 系统 | ✅ | 直接依赖：对话挂载在 NPC 上 |
| T0057 任务链系统 | ✅ | 可选联动：对话可触发任务 |
| T0021 地图系统 | ✅ | 可选联动：对话条件可检查区域 |
| T0064 瓶颈系统 | ✅ | 可选联动：论道瓶颈可通过对话解锁（未来） |

### 后续任务

| 任务 | 影响 |
|------|------|
| T0048 道侣双修系统 | 直接依赖：表白/约会等通过对话系统实现 |
| T0053 宗门管理 | 间接影响：入门/拜师等通过对话系统触发 |
| T0028 PvP 切磋 | 间接影响：切磋邀请可通过对话触发 |
| T0027 门派系统 | 间接影响：门派 NPC 对话丰富门派体验 |
| CP-01 凡人修仙 DLC | 可扩展：DLC 可注册大量剧情对话 |
