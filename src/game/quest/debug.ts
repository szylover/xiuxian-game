// ============================================================
// quest/debug.ts — 调试辅助
// ============================================================

import type { Player } from '../player';
import type { QuestChainProgress, QuestSystemState } from '../types';
import { getQuestChainDef } from '../registry';
import { QUEST_TEXTS } from '../../data/texts/quest';
import { getQuestState, setQuestState, DEFAULT_QUEST_STATE } from './state';
import { acceptQuest, checkStepCompletion } from './operations';

export function forceDiscoverQuest(player: Player, questId: string): Player {
  const state = getQuestState(player);
  if (state.discoveredQuests.includes(questId)) return player;
  return setQuestState(player, { ...state, discoveredQuests: [...state.discoveredQuests, questId] });
}

export function forceAcceptQuest(player: Player, questId: string): { player: Player; logs: string[] } {
  const p = forceDiscoverQuest(player, questId);
  return acceptQuest(p, questId);
}

export function forceCompleteStep(player: Player, questId: string): { player: Player; logs: string[] } {
  const state = getQuestState(player);
  const progress = state.activeQuests[questId];
  if (!progress || progress.status !== 'active') return { player, logs: [QUEST_TEXTS.questNotActive] };
  const def = getQuestChainDef(questId);
  if (!def) return { player, logs: [QUEST_TEXTS.questNotFound] };

  const newObjProgress = progress.objectiveProgress.map(o => ({ ...o, completed: true, currentCount: def.steps[progress.currentStepIndex].objectives[o.objectiveIndex]?.count ?? 1 }));
  const newProgress: QuestChainProgress = { ...progress, objectiveProgress: newObjProgress };
  const newState: QuestSystemState = { ...state, activeQuests: { ...state.activeQuests, [questId]: newProgress } };
  let p = setQuestState(player, newState);
  return checkStepCompletion(p, questId);
}

export function forceCompleteQuest(player: Player, questId: string): { player: Player; logs: string[] } {
  const def = getQuestChainDef(questId);
  if (!def) return { player, logs: [QUEST_TEXTS.questNotFound] };
  // Ensure quest is active first
  let p = player;
  const state = getQuestState(p);
  if (!state.activeQuests[questId]) {
    const { player: p2 } = forceAcceptQuest(p, questId);
    p = p2;
  }
  // Complete all remaining steps
  let allLogs: string[] = [];
  for (let i = 0; i < def.steps.length; i++) {
    const curState = getQuestState(p);
    if (!curState.activeQuests[questId]) break; // Already completed
    const { player: p2, logs } = forceCompleteStep(p, questId);
    p = p2;
    allLogs.push(...logs);
  }
  return { player: p, logs: allLogs };
}

export function resetQuest(player: Player, questId: string): Player {
  const state = getQuestState(player);
  const { [questId]: _a, ...restActive } = state.activeQuests;
  const { [questId]: _c, ...restCompleted } = state.completedQuests;
  const { [questId]: _f, ...restFailed } = state.failedQuests;
  return setQuestState(player, {
    ...state,
    activeQuests: restActive,
    completedQuests: restCompleted,
    failedQuests: restFailed,
    abandonedQuests: state.abandonedQuests.filter(id => id !== questId),
    discoveredQuests: state.discoveredQuests.filter(id => id !== questId),
  });
}

export function clearAllQuestData(player: Player): Player {
  return setQuestState(player, { ...DEFAULT_QUEST_STATE });
}
