// ============================================================
// quest/operations.ts — 核心操作
// ============================================================

import type { Player } from '../player';
import type {
  QuestChainDef, QuestChainProgress, QuestSystemState,
  QuestObjectiveProgress, QuestStatus,
} from '../types';
import { getQuestChainDef, getItemDef, getNpcDef } from '../registry';
import { hasItem, removeItem } from '../inventory';
import { QUEST_TEXTS } from '../../data/texts/quest';
import { getQuestState, setQuestState } from './state';
import { applyReward } from './rewards';
import { checkQuestDiscovery } from './discovery';

// ── 初始化步骤进度 ──

function initStepProgress(def: QuestChainDef, stepIndex: number): QuestObjectiveProgress[] {
  const step = def.steps[stepIndex];
  return step.objectives.map((_, i) => ({
    objectiveIndex: i,
    currentCount: 0,
    completed: false,
  }));
}

// ── 接取任务 ──

export function acceptQuest(player: Player, questId: string): { player: Player; logs: string[] } {
  const def = getQuestChainDef(questId);
  if (!def) return { player, logs: [QUEST_TEXTS.questNotFound] };

  const state = getQuestState(player);
  if (state.activeQuests[questId]) return { player, logs: [QUEST_TEXTS.alreadyAccepted] };
  if (state.completedQuests[questId] && !def.repeatable) return { player, logs: [QUEST_TEXTS.alreadyAccepted] };
  if (state.completedQuests[questId] && def.repeatable && def.repeatCooldown) {
    const elapsed = player.age - state.completedQuests[questId].completedAt;
    if (elapsed < def.repeatCooldown) return { player, logs: [QUEST_TEXTS.alreadyAccepted] };
  }

  const progress: QuestChainProgress = {
    questId,
    status: 'active',
    currentStepIndex: 0,
    objectiveProgress: initStepProgress(def, 0),
    acceptedAt: player.age,
    stepStartedAt: player.age,
    completedSteps: [],
  };

  const newState: QuestSystemState = {
    ...state,
    activeQuests: { ...state.activeQuests, [questId]: progress },
    discoveredQuests: state.discoveredQuests.filter(id => id !== questId),
  };

  let p = setQuestState(player, newState);
  const logs: string[] = [QUEST_TEXTS.accepted(def.name)];

  // Show first step dialogue
  const firstStep = def.steps[0];
  if (firstStep.dialogueSnippet) {
    logs.push(QUEST_TEXTS.dialogue(firstStep.dialogueSnippet));
  }

  return { player: p, logs };
}

// ── 放弃任务 ──

export function abandonQuest(player: Player, questId: string): { player: Player; logs: string[] } {
  const def = getQuestChainDef(questId);
  if (!def) return { player, logs: [QUEST_TEXTS.questNotFound] };

  const state = getQuestState(player);
  if (!state.activeQuests[questId]) return { player, logs: [QUEST_TEXTS.questNotActive] };

  const { [questId]: _, ...restActive } = state.activeQuests;
  const newState: QuestSystemState = {
    ...state,
    activeQuests: restActive,
    abandonedQuests: [...state.abandonedQuests, questId],
  };

  const p = setQuestState(player, newState);
  return { player: p, logs: [QUEST_TEXTS.abandoned(def.name)] };
}

// ── 交付物品 ──

export function deliverQuestItem(
  player: Player, questId: string, objectiveIndex: number,
): { player: Player; logs: string[] } {
  const state = getQuestState(player);
  const progress = state.activeQuests[questId];
  if (!progress || progress.status !== 'active') return { player, logs: [QUEST_TEXTS.questNotActive] };

  const def = getQuestChainDef(questId);
  if (!def) return { player, logs: [QUEST_TEXTS.questNotFound] };

  const step = def.steps[progress.currentStepIndex];
  const obj = step.objectives[objectiveIndex];
  if (!obj || obj.type !== 'deliver_item') return { player, logs: [QUEST_TEXTS.questNotFound] };

  const itemId = obj.targetId!;
  const count = obj.count ?? 1;
  if (!hasItem(player, itemId, count)) return { player, logs: [QUEST_TEXTS.deliverFail] };

  let p = removeItem(player, itemId, count);
  const itemDef = getItemDef(itemId);
  const logs: string[] = [QUEST_TEXTS.delivered(itemDef?.name ?? itemId, count)];

  // Mark objective completed
  const newProgress = { ...progress, objectiveProgress: [...progress.objectiveProgress] };
  newProgress.objectiveProgress[objectiveIndex] = {
    ...newProgress.objectiveProgress[objectiveIndex],
    currentCount: count,
    completed: true,
  };

  const newState: QuestSystemState = {
    ...getQuestState(p),
    activeQuests: { ...getQuestState(p).activeQuests, [questId]: newProgress },
  };
  p = setQuestState(p, newState);

  // Check step completion
  const { player: p2, logs: stepLogs } = checkStepCompletion(p, questId);
  p = p2;
  logs.push(...stepLogs);

  return { player: p, logs };
}

// ── 步骤完成检查与推进 ──

export function checkStepCompletion(player: Player, questId: string): { player: Player; logs: string[] } {
  const state = getQuestState(player);
  const progress = state.activeQuests[questId];
  if (!progress || progress.status !== 'active') return { player, logs: [] };

  const def = getQuestChainDef(questId);
  if (!def) return { player, logs: [] };

  // Are all objectives of the current step completed?
  const allCompleted = progress.objectiveProgress.every(o => o.completed);
  if (!allCompleted) return { player, logs: [] };

  let p = player;
  const logs: string[] = [];
  const step = def.steps[progress.currentStepIndex];

  // Apply step rewards
  const { player: p2, logs: rewardLogs } = applyReward(p, step.rewards);
  p = p2;
  // Step completed — single summary line with rewards
  logs.push(QUEST_TEXTS.stepRewardSummary(def.name, step.name, rewardLogs));

  // Advance to next step or mark pending turn-in
  const nextStepIndex = progress.currentStepIndex + 1;
  if (nextStepIndex >= def.steps.length) {
    if (def.turnInNpcId) {
      // All steps done — mark as pending turn-in (don't give chain rewards yet)
      const newProgress: QuestChainProgress = { ...progress, status: 'pending_turnin' as QuestStatus, completedSteps: [...progress.completedSteps, progress.currentStepIndex] };
      const newState: QuestSystemState = { ...getQuestState(p), activeQuests: { ...getQuestState(p).activeQuests, [questId]: newProgress } };
      p = setQuestState(p, newState);
      const turnInNpc = getNpcDef(def.turnInNpcId!);
      logs.push(QUEST_TEXTS.readyToTurnIn(def.name, turnInNpc?.name ?? '???'));
    } else {
      // No turn-in NPC — complete immediately
      const { player: p3, logs: completeLogs } = completeQuest(p, questId);
      p = p3;
      logs.push(...completeLogs);
    }
  } else {
    // Advance step
    const newProgress: QuestChainProgress = {
      ...progress,
      currentStepIndex: nextStepIndex,
      objectiveProgress: initStepProgress(def, nextStepIndex),
      stepStartedAt: p.age,
      completedSteps: [...progress.completedSteps, progress.currentStepIndex],
    };

    const newState: QuestSystemState = {
      ...getQuestState(p),
      activeQuests: { ...getQuestState(p).activeQuests, [questId]: newProgress },
    };
    p = setQuestState(p, newState);

    // Show next step dialogue
    const nextStep = def.steps[nextStepIndex];
    if (nextStep.dialogueSnippet) {
      logs.push(QUEST_TEXTS.dialogue(nextStep.dialogueSnippet));
    }
  }

  return { player: p, logs };
}

// ── 任务完成 ──

function completeQuest(player: Player, questId: string): { player: Player; logs: string[] } {
  const def = getQuestChainDef(questId);
  if (!def) return { player, logs: [] };

  const state = getQuestState(player);

  // Apply chain rewards
  const { player: p2, logs: rewardLogs } = applyReward(player, def.rewards);
  let p = p2;
  // Single summary line with all rewards
  const logs: string[] = [QUEST_TEXTS.questCompleteSummary(def.name, rewardLogs)];

  // Move from active to completed
  const { [questId]: _, ...restActive } = state.activeQuests;
  const existingComplete = state.completedQuests[questId];
  const newState: QuestSystemState = {
    ...state,
    activeQuests: restActive,
    completedQuests: {
      ...state.completedQuests,
      [questId]: {
        questId,
        completedAt: p.age,
        repeatCount: (existingComplete?.repeatCount ?? 0) + 1,
      },
    },
  };
  p = setQuestState(p, newState);

  // Check if completing this quest triggers discovery of new quests
  const { player: p3, logs: discoveryLogs } = checkQuestDiscovery(p, { type: 'quest_complete', questId });
  p = p3;
  logs.push(...discoveryLogs);

  return { player: p, logs };
}

// ── 交付任务 ──

export function turnInQuest(player: Player, questId: string): { player: Player; logs: string[] } {
  const state = getQuestState(player);
  const progress = state.activeQuests[questId];
  if (!progress || progress.status !== 'pending_turnin') {
    return { player, logs: [QUEST_TEXTS.questNotActive] };
  }

  const def = getQuestChainDef(questId);
  if (!def) return { player, logs: [QUEST_TEXTS.questNotFound] };

  // Complete the quest (gives chain rewards + moves to completedQuests)
  const { player: p2, logs } = completeQuest(player, questId);
  return { player: p2, logs };
}

// ── 设置追踪任务 ──

export function setTrackedQuest(player: Player, questId: string | null): Player {
  const state = getQuestState(player);
  return setQuestState(player, { ...state, trackedQuestId: questId ?? undefined });
}

// ── 任务失败 ──

export function failQuest(player: Player, questId: string, reason: string): { player: Player; logs: string[] } {
  const def = getQuestChainDef(questId);
  if (!def) return { player, logs: [] };

  const state = getQuestState(player);
  const { [questId]: _, ...restActive } = state.activeQuests;
  const newState: QuestSystemState = {
    ...state,
    activeQuests: restActive,
    failedQuests: {
      ...state.failedQuests,
      [questId]: { questId, failedAt: player.age, reason },
    },
  };

  const p = setQuestState(player, newState);
  return { player: p, logs: [QUEST_TEXTS.questFailed(def.name, reason)] };
}
