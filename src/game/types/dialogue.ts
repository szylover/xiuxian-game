import type { Player } from '../player';
import type { NpcRelationLevel } from './npc';

// ── 对话系统类型定义（T0026）──

/** 对话节点类型 */
export type DialogueNodeType = 'npc_talk' | 'player_choice' | 'narration';

/** 对话选项效果 */
export interface DialogueEffect {
  affinityChange?: number;
  giveItems?: { itemId: string; count: number }[];
  takeItems?: { itemId: string; count: number }[];
  goldChange?: number;
  expChange?: number;
  triggerQuestId?: string;
  triggerEventId?: string;
  triggerCombatNpcId?: string;
  setNpcFlag?: { key: string; value: unknown };
  setDialogueFlag?: { key: string; value: unknown };
  unlockDialogueId?: string;
  statBonus?: Partial<Record<'atk' | 'def' | 'hp' | 'mp' | 'luck' | 'comprehension', number>>;
  karmaChange?: number;
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
  requiredAlignment?: import('./karma').Alignment;
  minKarma?: number;
  maxKarma?: number;
}

/** 单个对话选项 */
export interface DialogueChoice {
  id: string;
  text: string;
  condition?: DialogueChoiceCondition;
  nextNodeId?: string;
  effects?: DialogueEffect;
  tooltip?: string;
}

/** 对话节点 */
export interface DialogueNode {
  id: string;
  type: DialogueNodeType;
  speaker?: string;
  speakerEmoji?: string;
  text: string;
  choices?: DialogueChoice[];
  nextNodeId?: string;
  effects?: DialogueEffect;
}

/** 对话链触发条件 */
export interface DialogueCondition {
  minAffinity?: number;
  maxAffinity?: number;
  minRealm?: number;
  maxRealm?: number;
  relationLevel?: NpcRelationLevel[];
  regionId?: string;
  regionTags?: string[];
  requiredQuests?: string[];
  hasActiveQuest?: string;
  requiredItems?: { itemId: string; count: number }[];
  hasNpcFlag?: { key: string; value: unknown };
  hasDialogueFlag?: { key: string; value: unknown };
  requiredDialogues?: string[];           // 前置对话链 ID（必须已触发才解锁）
  requiredAlignment?: import('./karma').Alignment;
  minKarma?: number;
  maxKarma?: number;
  custom?: (p: Player) => boolean;
}

/** 对话链定义 */
export interface DialogueChainDef {
  id: string;
  npcId: string;
  name: string;
  priority: number;
  condition?: DialogueCondition;
  nodes: DialogueNode[];
  startNodeId: string;
  once?: boolean;
  cooldown?: number;
  tags?: string[];
}

/** 对话系统运行时状态 */
export interface DialogueSystemState {
  triggeredOnce: string[];
  lastTriggerAge: Record<string, number>;
  flags: Record<string, unknown>;
}

/** 闲聊池数据 */
export type IdleChatPool = Record<string, string[]>;
