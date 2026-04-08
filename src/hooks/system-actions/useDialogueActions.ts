import { useCallback } from 'react';
import { startDialogue as startDialogueFn, selectChoice as selectChoiceFn, advanceToNextNode as advanceToNextNodeFn, getTopDialogue, getIdleChat } from '../../game/dialogue';
import type { DialogueChainDef, DialogueNode, NpcPersonality } from '../../game/types';
import type { SystemActionContext } from './types';

export function useDialogueActions({ player, addLog, setPlayer }: Pick<SystemActionContext, 'player' | 'addLog' | 'setPlayer'>) {
  /** 检查 NPC 是否有可用对话链 */
  const checkDialogue = useCallback((npcId: string): DialogueChainDef | null => {
    if (!player) return null;
    return getTopDialogue(player, npcId);
  }, [player]);

  /** 获取闲聊文本 */
  const getIdleChatForNpc = useCallback((npcId: string, personality: string): string => {
    return getIdleChat(npcId, personality as NpcPersonality);
  }, []);

  /** 开始对话链 */
  const startDialogue = useCallback((dialogueId: string): { node: DialogueNode | null } => {
    let startNode: DialogueNode | null = null;
    setPlayer(prev => {
      if (!prev) return prev;
      const result = startDialogueFn(prev, dialogueId);
      startNode = result.node;
      for (const log of result.logs) addLog(log, 'system');
      return result.player;
    });
    return { node: startNode };
  }, [addLog, setPlayer]);

  /** 选择对话选项 */
  const dialogueSelectChoice = useCallback((dialogueId: string, nodeId: string, choiceId: string): {
    nextNode: DialogueNode | null; logs: string[]; combatTrigger?: string; questTrigger?: string;
  } => {
    let nextNode: DialogueNode | null = null;
    let logs: string[] = [];
    let combatTrigger: string | undefined;
    let questTrigger: string | undefined;
    setPlayer(prev => {
      if (!prev) return prev;
      const result = selectChoiceFn(prev, dialogueId, nodeId, choiceId);
      nextNode = result.nextNode;
      logs = result.logs;
      combatTrigger = result.combatTrigger;
      questTrigger = result.questTrigger;
      for (const log of result.logs) addLog(log, 'system');
      return result.player;
    });
    return { nextNode, logs, combatTrigger, questTrigger };
  }, [addLog, setPlayer]);

  /** 推进到下一节点（无选项时使用） */
  const dialogueAdvance = useCallback((dialogueId: string, currentNodeId: string): {
    nextNode: DialogueNode | null; logs: string[]; combatTrigger?: string; questTrigger?: string;
  } => {
    let nextNode: DialogueNode | null = null;
    let logs: string[] = [];
    let combatTrigger: string | undefined;
    let questTrigger: string | undefined;
    setPlayer(prev => {
      if (!prev) return prev;
      const result = advanceToNextNodeFn(prev, dialogueId, currentNodeId);
      nextNode = result.nextNode;
      logs = result.logs;
      combatTrigger = result.combatTrigger;
      questTrigger = result.questTrigger;
      for (const log of result.logs) addLog(log, 'system');
      return result.player;
    });
    return { nextNode, logs, combatTrigger, questTrigger };
  }, [addLog, setPlayer]);

  return { checkDialogue, getIdleChatForNpc, startDialogue, dialogueSelectChoice, dialogueAdvance };
}
