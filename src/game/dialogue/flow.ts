// ============================================================
// dialogue/flow.ts — 对话流程（查询、开始、推进、选择）
// ============================================================

import type { Player } from '../player';
import type { DialogueChainDef, DialogueNode, DialogueChoice } from '../types';
import { getDialoguesByNpc, getDialogueDef, getNpcDef } from '../registry';
import { DIALOGUE_TEXTS } from '../../data/texts/dialogue';
import { getDialogueState, setDialogueState } from './state';
import { checkDialogueCondition } from './conditions';
import { applyDialogueEffect } from './effects';

// ── 查询可用对话 ──

export function getAvailableDialogues(player: Player, npcId: string): DialogueChainDef[] {
  const allForNpc = getDialoguesByNpc(npcId);
  const dlgState = getDialogueState(player);

  return allForNpc
    .filter(def => {
      // 一次性对话已触发
      if (def.once && dlgState.triggeredOnce.includes(def.id)) return false;
      // 冷却中
      if (def.cooldown && dlgState.lastTriggerAge[def.id] !== undefined) {
        const elapsed = player.age - dlgState.lastTriggerAge[def.id];
        if (elapsed < def.cooldown) return false;
      }
      // 条件检查
      return checkDialogueCondition(player, def);
    })
    .sort((a, b) => b.priority - a.priority);
}

/** 获取当前 NPC 最高优先级的可用对话 */
export function getTopDialogue(player: Player, npcId: string): DialogueChainDef | null {
  const available = getAvailableDialogues(player, npcId);
  return available.length > 0 ? available[0] : null;
}

// ── 开始对话 ──

export function startDialogue(
  player: Player, dialogueId: string,
): { player: Player; node: DialogueNode | null; logs: string[] } {
  const def = getDialogueDef(dialogueId);
  if (!def) return { player, node: null, logs: [DIALOGUE_TEXTS.noDialogueAvailable] };

  const npcDef = getNpcDef(def.npcId);
  const dlgState = getDialogueState(player);
  const logs: string[] = [];

  // 标记已触发（所有对话都记录，用于前置依赖检查）
  const newTriggeredOnce = dlgState.triggeredOnce.includes(def.id)
    ? dlgState.triggeredOnce
    : [...dlgState.triggeredOnce, def.id];

  // 记录冷却
  const newLastTriggerAge = { ...dlgState.lastTriggerAge, [def.id]: player.age };

  let p = setDialogueState(player, {
    ...dlgState,
    triggeredOnce: newTriggeredOnce,
    lastTriggerAge: newLastTriggerAge,
  });

  logs.push(DIALOGUE_TEXTS.dialogueStarted(npcDef?.name ?? '???'));

  // 找到起始节点
  const startNode = def.nodes.find(n => n.id === def.startNodeId) ?? null;

  // 执行起始节点的 effects
  if (startNode?.effects) {
    const effectResult = applyDialogueEffect(p, def.npcId, startNode.effects);
    p = effectResult.player;
    logs.push(...effectResult.logs);
  }

  return { player: p, node: startNode, logs };
}

// ── 选择选项 ──

export interface SelectChoiceResult {
  player: Player;
  nextNode: DialogueNode | null;
  logs: string[];
  combatTrigger?: string;
  questTrigger?: string;
}

export function selectChoice(
  player: Player, dialogueId: string, _nodeId: string, choiceId: string,
): SelectChoiceResult {
  const def = getDialogueDef(dialogueId);
  if (!def) return { player, nextNode: null, logs: [] };

  // 在所有节点的选项中查找
  let choice: DialogueChoice | undefined;
  for (const node of def.nodes) {
    choice = node.choices?.find(c => c.id === choiceId);
    if (choice) break;
  }

  if (!choice) return { player, nextNode: null, logs: [] };

  const logs: string[] = [];
  let p = player;
  let combatTrigger: string | undefined;
  let questTrigger: string | undefined;

  // 执行选项效果
  if (choice.effects) {
    const effectResult = applyDialogueEffect(p, def.npcId, choice.effects);
    p = effectResult.player;
    logs.push(...effectResult.logs);
    combatTrigger = choice.effects.triggerCombatNpcId;
    questTrigger = choice.effects.triggerQuestId;
  }

  // 查找下一节点
  const nextNode = choice.nextNodeId
    ? (def.nodes.find(n => n.id === choice!.nextNodeId) ?? null)
    : null;

  // 进入下一节点时执行其 effects
  if (nextNode?.effects) {
    const effectResult = applyDialogueEffect(p, def.npcId, nextNode.effects);
    p = effectResult.player;
    logs.push(...effectResult.logs);
    if (nextNode.effects.triggerCombatNpcId) combatTrigger = nextNode.effects.triggerCombatNpcId;
    if (nextNode.effects.triggerQuestId) questTrigger = nextNode.effects.triggerQuestId;
  }

  return { player: p, nextNode, logs, combatTrigger, questTrigger };
}

/** 自动跳转到下一节点（无选项的节点使用） */
export function advanceToNextNode(
  player: Player, dialogueId: string, currentNodeId: string,
): { player: Player; nextNode: DialogueNode | null; logs: string[]; combatTrigger?: string; questTrigger?: string } {
  const def = getDialogueDef(dialogueId);
  if (!def) return { player, nextNode: null, logs: [] };

  const currentNode = def.nodes.find(n => n.id === currentNodeId);
  if (!currentNode?.nextNodeId) return { player, nextNode: null, logs: [] };

  const nextNode = def.nodes.find(n => n.id === currentNode.nextNodeId) ?? null;
  const logs: string[] = [];
  let p = player;
  let combatTrigger: string | undefined;
  let questTrigger: string | undefined;

  if (nextNode?.effects) {
    const effectResult = applyDialogueEffect(p, def.npcId, nextNode.effects);
    p = effectResult.player;
    logs.push(...effectResult.logs);
    if (nextNode.effects.triggerCombatNpcId) combatTrigger = nextNode.effects.triggerCombatNpcId;
    if (nextNode.effects.triggerQuestId) questTrigger = nextNode.effects.triggerQuestId;
  }

  return { player: p, nextNode, logs, combatTrigger, questTrigger };
}
