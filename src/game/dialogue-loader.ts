// ============================================================
// dialogue-loader.ts — JSON → DialogueChainDef 转换器（T0026）
// 将纯 JSON 数据转换为运行时 DialogueChainDef 对象
// ============================================================

import type {
  DialogueChainDef, DialogueNode, DialogueChoice,
  DialogueCondition, DialogueEffect, DialogueChoiceCondition,
  DialogueNodeType, NpcRelationLevel, IdleChatPool,
} from './types';

// ── JSON 数据格式 ──

interface JsonDialogueEffect {
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
  statBonus?: Partial<Record<string, number>>;
}

interface JsonDialogueChoiceCondition {
  minAffinity?: number;
  minRealm?: number;
  hasItem?: { itemId: string; count: number };
  hasNpcFlag?: { key: string; value: unknown };
  hasDialogueFlag?: { key: string; value: unknown };
  completedQuest?: string;
  hasActiveQuest?: string;
}

interface JsonDialogueChoice {
  id: string;
  text: string;
  condition?: JsonDialogueChoiceCondition | null;
  nextNodeId?: string;
  effects?: JsonDialogueEffect;
  tooltip?: string;
}

interface JsonDialogueNode {
  id: string;
  type: string;
  speaker?: string;
  speakerEmoji?: string;
  text: string;
  choices?: JsonDialogueChoice[];
  nextNodeId?: string;
  effects?: JsonDialogueEffect;
}

interface JsonDialogueCondition {
  minAffinity?: number;
  maxAffinity?: number;
  minRealm?: number;
  maxRealm?: number;
  relationLevel?: string[];
  regionId?: string;
  regionTags?: string[];
  requiredQuests?: string[];
  hasActiveQuest?: string;
  requiredItems?: { itemId: string; count: number }[];
  hasNpcFlag?: { key: string; value: unknown };
  hasDialogueFlag?: { key: string; value: unknown };
  requiredDialogues?: string[];
}

export interface JsonDialogueChain {
  id: string;
  npcId: string;
  name: string;
  priority: number;
  condition?: JsonDialogueCondition | null;
  nodes: JsonDialogueNode[];
  startNodeId: string;
  once?: boolean;
  cooldown?: number;
  tags?: string[];
}

export interface JsonDialogueData {
  dialogues: JsonDialogueChain[];
  idleChat?: IdleChatPool;
}

// ── 合法节点类型 ──

const VALID_NODE_TYPES = new Set<DialogueNodeType>(['npc_talk', 'player_choice', 'narration']);

// ── 转换函数 ──

function parseEffect(eff?: JsonDialogueEffect): DialogueEffect | undefined {
  if (!eff) return undefined;
  return {
    affinityChange: eff.affinityChange,
    giveItems: eff.giveItems,
    takeItems: eff.takeItems,
    goldChange: eff.goldChange,
    expChange: eff.expChange,
    triggerQuestId: eff.triggerQuestId,
    triggerEventId: eff.triggerEventId,
    triggerCombatNpcId: eff.triggerCombatNpcId,
    setNpcFlag: eff.setNpcFlag,
    setDialogueFlag: eff.setDialogueFlag,
    unlockDialogueId: eff.unlockDialogueId,
    statBonus: eff.statBonus as DialogueEffect['statBonus'],
  };
}

function parseChoiceCondition(cond?: JsonDialogueChoiceCondition | null): DialogueChoiceCondition | undefined {
  if (!cond) return undefined;
  return {
    minAffinity: cond.minAffinity,
    minRealm: cond.minRealm,
    hasItem: cond.hasItem,
    hasNpcFlag: cond.hasNpcFlag,
    hasDialogueFlag: cond.hasDialogueFlag,
    completedQuest: cond.completedQuest,
    hasActiveQuest: cond.hasActiveQuest,
  };
}

function parseChoice(choice: JsonDialogueChoice): DialogueChoice {
  return {
    id: choice.id,
    text: choice.text,
    condition: parseChoiceCondition(choice.condition),
    nextNodeId: choice.nextNodeId,
    effects: parseEffect(choice.effects),
    tooltip: choice.tooltip,
  };
}

function parseNode(node: JsonDialogueNode): DialogueNode {
  const type = node.type as DialogueNodeType;
  if (!VALID_NODE_TYPES.has(type)) {
    console.warn(`[dialogue-loader] Unknown node type: ${node.type}`);
  }
  return {
    id: node.id,
    type,
    speaker: node.speaker,
    speakerEmoji: node.speakerEmoji,
    text: node.text,
    choices: node.choices?.map(parseChoice),
    nextNodeId: node.nextNodeId,
    effects: parseEffect(node.effects),
  };
}

function parseCondition(cond?: JsonDialogueCondition | null): DialogueCondition | undefined {
  if (!cond) return undefined;
  return {
    minAffinity: cond.minAffinity,
    maxAffinity: cond.maxAffinity,
    minRealm: cond.minRealm,
    maxRealm: cond.maxRealm,
    relationLevel: cond.relationLevel as NpcRelationLevel[] | undefined,
    regionId: cond.regionId,
    regionTags: cond.regionTags,
    requiredQuests: cond.requiredQuests,
    hasActiveQuest: cond.hasActiveQuest,
    requiredItems: cond.requiredItems,
    hasNpcFlag: cond.hasNpcFlag,
    hasDialogueFlag: cond.hasDialogueFlag,
    requiredDialogues: cond.requiredDialogues,
  };
}

// ── 主加载函数 ──

export function loadDialoguesFromJson(jsonDialogues: JsonDialogueChain[]): DialogueChainDef[] {
  const results: DialogueChainDef[] = [];

  for (const json of jsonDialogues) {
    if (!json.id || !json.nodes || json.nodes.length === 0) {
      console.warn(`[dialogue-loader] Skipping invalid dialogue: ${json.id ?? 'unknown'}`);
      continue;
    }

    const nodes = json.nodes.map(parseNode);
    const nodeIds = new Set(nodes.map(n => n.id));

    // 验证 startNodeId 存在
    if (!nodeIds.has(json.startNodeId)) {
      console.warn(`[dialogue-loader] startNodeId '${json.startNodeId}' not found in dialogue ${json.id}`);
      continue;
    }

    // 验证节点引用合法性
    for (const node of nodes) {
      if (node.nextNodeId && !nodeIds.has(node.nextNodeId)) {
        console.warn(`[dialogue-loader] Node '${node.id}' references missing nextNodeId '${node.nextNodeId}' in dialogue ${json.id}`);
      }
      if (node.choices) {
        for (const choice of node.choices) {
          if (choice.nextNodeId && !nodeIds.has(choice.nextNodeId)) {
            console.warn(`[dialogue-loader] Choice '${choice.id}' references missing nextNodeId '${choice.nextNodeId}' in dialogue ${json.id}`);
          }
        }
      }
    }

    results.push({
      id: json.id,
      npcId: json.npcId,
      name: json.name,
      priority: json.priority ?? 0,
      condition: parseCondition(json.condition),
      nodes,
      startNodeId: json.startNodeId,
      once: json.once,
      cooldown: json.cooldown,
      tags: json.tags,
    });
  }

  return results;
}
