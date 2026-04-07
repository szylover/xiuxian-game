// ============================================================
// dialogue.ts — 对话系统核心逻辑（T0026）
// 状态读写、条件检查、对话推进、闲聊退化
// ============================================================

import type { Player } from './player';
import type {
  DialogueChainDef, DialogueNode, DialogueChoice,
  DialogueCondition, DialogueChoiceCondition, DialogueEffect,
  DialogueSystemState, NpcPersonality,
} from './types';
import { getDialoguesByNpc, getDialogueDef, getNpcDef, getItemDef, getIdleChatPool } from './registry';
import { getRelation, changeAffinity, getNpcState } from './npc';
import { getCurrentRegion } from './map';
import { hasItem, addItem, removeItem } from './inventory';
import { getQuestState } from './quest';
import { DIALOGUE_TEXTS } from '../data/texts/dialogue';

// ── 默认状态 ──

const DEFAULT_DIALOGUE_STATE: DialogueSystemState = {
  triggeredOnce: [],
  lastTriggerAge: {},
  flags: {},
};

// ── 状态读写 ──

export function getDialogueState(player: Player): DialogueSystemState {
  const s = player.systems['dialogue'];
  if (!s || typeof s !== 'object') return { ...DEFAULT_DIALOGUE_STATE, triggeredOnce: [], lastTriggerAge: {}, flags: {} };
  const state = s as Partial<DialogueSystemState>;
  return {
    triggeredOnce: Array.isArray(state.triggeredOnce) ? state.triggeredOnce : [],
    lastTriggerAge: state.lastTriggerAge ?? {},
    flags: state.flags ?? {},
  };
}

export function setDialogueState(player: Player, state: DialogueSystemState): Player {
  return { ...player, systems: { ...player.systems, dialogue: state } };
}

// ── 条件检查 ──

function checkDialogueCondition(player: Player, def: DialogueChainDef): boolean {
  const cond = def.condition;
  if (!cond) return true;

  const rel = getRelation(player, def.npcId);
  const dlgState = getDialogueState(player);

  if (cond.minAffinity !== undefined && rel.affinity < cond.minAffinity) return false;
  if (cond.maxAffinity !== undefined && rel.affinity > cond.maxAffinity) return false;
  if (cond.minRealm !== undefined && player.realmIndex < cond.minRealm) return false;
  if (cond.maxRealm !== undefined && player.realmIndex > cond.maxRealm) return false;

  if (cond.relationLevel?.length) {
    if (!cond.relationLevel.includes(rel.relationLevel)) return false;
  }

  if (cond.regionId) {
    const region = getCurrentRegion(player);
    if (!region || region.id !== cond.regionId) return false;
  }

  if (cond.regionTags?.length) {
    const region = getCurrentRegion(player);
    if (!region || !cond.regionTags.some(t => region.regionTags.includes(t))) return false;
  }

  if (cond.requiredQuests?.length) {
    const questState = getQuestState(player);
    for (const reqId of cond.requiredQuests) {
      if (!questState.completedQuests[reqId]) return false;
    }
  }

  if (cond.hasActiveQuest) {
    const questState = getQuestState(player);
    if (!questState.activeQuests[cond.hasActiveQuest]) return false;
  }

  if (cond.requiredItems?.length) {
    for (const { itemId, count } of cond.requiredItems) {
      if (!hasItem(player, itemId, count)) return false;
    }
  }

  if (cond.hasNpcFlag) {
    const npcState = getNpcState(player);
    const npcRel = npcState.relations[def.npcId];
    if (!npcRel || npcRel.flags[cond.hasNpcFlag.key] !== cond.hasNpcFlag.value) return false;
  }

  if (cond.hasDialogueFlag) {
    if (dlgState.flags[cond.hasDialogueFlag.key] !== cond.hasDialogueFlag.value) return false;
  }

  if (cond.custom && !cond.custom(player)) return false;

  return true;
}

/** 检查对话选项条件 */
export function checkChoiceCondition(player: Player, npcId: string, cond?: DialogueChoiceCondition): boolean {
  if (!cond) return true;

  const rel = getRelation(player, npcId);
  const dlgState = getDialogueState(player);

  if (cond.minAffinity !== undefined && rel.affinity < cond.minAffinity) return false;
  if (cond.minRealm !== undefined && player.realmIndex < cond.minRealm) return false;

  if (cond.hasItem) {
    if (!hasItem(player, cond.hasItem.itemId, cond.hasItem.count)) return false;
  }

  if (cond.hasNpcFlag) {
    const npcState = getNpcState(player);
    const npcRel = npcState.relations[npcId];
    if (!npcRel || npcRel.flags[cond.hasNpcFlag.key] !== cond.hasNpcFlag.value) return false;
  }

  if (cond.hasDialogueFlag) {
    if (dlgState.flags[cond.hasDialogueFlag.key] !== cond.hasDialogueFlag.value) return false;
  }

  if (cond.completedQuest) {
    const questState = getQuestState(player);
    if (!questState.completedQuests[cond.completedQuest]) return false;
  }

  if (cond.hasActiveQuest) {
    const questState = getQuestState(player);
    if (!questState.activeQuests[cond.hasActiveQuest]) return false;
  }

  return true;
}

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

  // 标记 once 对话
  const newTriggeredOnce = def.once
    ? [...dlgState.triggeredOnce, def.id]
    : dlgState.triggeredOnce;

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

// ── 效果执行 ──

function applyDialogueEffect(
  player: Player, npcId: string, effect: DialogueEffect,
): { player: Player; logs: string[] } {
  let p = player;
  const logs: string[] = [];
  const npcDef = getNpcDef(npcId);
  const npcName = npcDef?.name ?? '???';

  // 好感度变化
  if (effect.affinityChange) {
    const result = changeAffinity(p, npcId, effect.affinityChange, 'dialogue');
    p = result.player;
    if (effect.affinityChange > 0) {
      logs.push(DIALOGUE_TEXTS.affinityUp(npcName, effect.affinityChange));
    } else {
      logs.push(DIALOGUE_TEXTS.affinityDown(npcName, effect.affinityChange));
    }
  }

  // 赠送物品
  if (effect.giveItems) {
    for (const { itemId, count } of effect.giveItems) {
      const { player: p2 } = addItem(p, itemId, count);
      p = p2;
      const itemDef = getItemDef(itemId);
      logs.push(DIALOGUE_TEXTS.receivedItem(itemDef?.name ?? itemId, count));
    }
  }

  // 消耗物品
  if (effect.takeItems) {
    for (const { itemId, count } of effect.takeItems) {
      p = removeItem(p, itemId, count);
      const itemDef = getItemDef(itemId);
      logs.push(DIALOGUE_TEXTS.lostItem(itemDef?.name ?? itemId, count));
    }
  }

  // 灵石变化
  if (effect.goldChange) {
    p = { ...p, gold: Math.max(0, p.gold + effect.goldChange) };
    logs.push(DIALOGUE_TEXTS.goldChange(effect.goldChange));
  }

  // 修为变化
  if (effect.expChange) {
    p = { ...p, exp: Math.max(0, p.exp + effect.expChange) };
    logs.push(effect.expChange > 0 ? `修为 +${effect.expChange}` : `修为 ${effect.expChange}`);
  }

  // 属性加成
  if (effect.statBonus) {
    const bonus: Partial<Player> = {};
    for (const [key, value] of Object.entries(effect.statBonus)) {
      if (value && key in p) {
        (bonus as Record<string, number>)[key] = (p[key as keyof Player] as number) + value;
      }
    }
    p = { ...p, ...bonus };
  }

  // 设置 NPC flags
  if (effect.setNpcFlag) {
    const npcState = getNpcState(p);
    const rel = npcState.relations[npcId];
    if (rel) {
      const updatedRel = { ...rel, flags: { ...rel.flags, [effect.setNpcFlag.key]: effect.setNpcFlag.value } };
      p = { ...p, systems: { ...p.systems, npc: { ...npcState, relations: { ...npcState.relations, [npcId]: updatedRel } } } };
    }
  }

  // 设置对话 flags
  if (effect.setDialogueFlag) {
    const dlgState = getDialogueState(p);
    p = setDialogueState(p, {
      ...dlgState,
      flags: { ...dlgState.flags, [effect.setDialogueFlag.key]: effect.setDialogueFlag.value },
    });
  }

  // 解锁对话链（从 triggeredOnce 中移除，或不做特殊处理——只要满足条件即可触发）
  // unlockDialogueId 的语义：将某条对话链从冷却中解除
  if (effect.unlockDialogueId) {
    const dlgState = getDialogueState(p);
    const { [effect.unlockDialogueId]: _, ...restCooldowns } = dlgState.lastTriggerAge;
    p = setDialogueState(p, { ...dlgState, lastTriggerAge: restCooldowns });
  }

  return { player: p, logs };
}

// ── 闲聊 ──

export function getIdleChat(npcId: string, personality: NpcPersonality): string {
  const pool = getIdleChatPool();
  const lines = pool[personality];
  if (lines && lines.length > 0) {
    return lines[Math.floor(Math.random() * lines.length)];
  }
  // 兜底
  const fallback = ['「你好。」', '「今日天气不错。」', '「修行之路不易啊。」'];
  return fallback[Math.floor(Math.random() * fallback.length)];
}

// ── 重置（调试用） ──

export function resetDialogueState(player: Player): Player {
  return setDialogueState(player, { triggeredOnce: [], lastTriggerAge: {}, flags: {} });
}

export function clearDialogueCooldowns(player: Player): Player {
  const state = getDialogueState(player);
  return setDialogueState(player, { ...state, lastTriggerAge: {} });
}
