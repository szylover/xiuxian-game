// ============================================================
// quest/objectives.ts — 目标推进
// ============================================================

import type { Player } from '../player';
import type {
  QuestChainProgress, QuestSystemState, QuestTrigger,
} from '../types';
import { getQuestChainDef } from '../registry';
import { hasItem } from '../inventory';
import { QUEST_TEXTS } from '../../data/texts/quest';
import { getQuestState, setQuestState } from './state';
import { checkStepCompletion, failQuest } from './operations';

// ── 目标推进 ──

export function tickQuestObjectives(
  player: Player, trigger: QuestTrigger,
): { player: Player; logs: string[] } {
  let state = getQuestState(player);
  let p = player;
  const logs: string[] = [];

  // Update action counters
  if (trigger.type === 'explore' || trigger.type === 'cultivate' || trigger.type === 'combat') {
    state = {
      ...state,
      actionCounters: {
        ...state.actionCounters,
        [trigger.type]: state.actionCounters[trigger.type] + 1,
      },
    };
    p = setQuestState(p, state);
  }

  const activeIds = Object.keys(state.activeQuests);
  for (const questId of activeIds) {
    const progress = getQuestState(p).activeQuests[questId];
    if (!progress || progress.status !== 'active') continue;

    const def = getQuestChainDef(questId);
    if (!def) continue;

    const step = def.steps[progress.currentStepIndex];
    let updated = false;
    const newObjProgress = [...progress.objectiveProgress];

    for (let i = 0; i < step.objectives.length; i++) {
      if (newObjProgress[i].completed) continue;
      const obj = step.objectives[i];
      const delta = getObjectiveDelta(p, obj, trigger, state, progress);
      if (delta > 0) {
        const newCount = Math.min(newObjProgress[i].currentCount + delta, obj.count ?? 1);
        const wasCompleted = newObjProgress[i].completed;
        const nowCompleted = newCount >= (obj.count ?? 1);
        newObjProgress[i] = {
          ...newObjProgress[i],
          currentCount: newCount,
          completed: nowCompleted,
        };
        if (nowCompleted && !wasCompleted) {
          updated = true;
        }
      }
    }

    if (updated || newObjProgress.some((o, i) => o.currentCount !== progress.objectiveProgress[i].currentCount)) {
      const newProgress: QuestChainProgress = { ...progress, objectiveProgress: newObjProgress };
      const currentState = getQuestState(p);
      const newState: QuestSystemState = {
        ...currentState,
        activeQuests: { ...currentState.activeQuests, [questId]: newProgress },
      };
      p = setQuestState(p, newState);
    }

    if (updated) {
      const { player: p2, logs: stepLogs } = checkStepCompletion(p, questId);
      p = p2;
      logs.push(...stepLogs);
    }
  }

  return { player: p, logs };
}

// ── 单次目标增量计算 ──

function getObjectiveDelta(
  player: Player,
  obj: { type: string; targetId?: string; count?: number; minRealmIndex?: number; customCheck?: (p: Player) => boolean },
  trigger: QuestTrigger,
  state: QuestSystemState,
  progress: QuestChainProgress,
): number {
  switch (obj.type) {
    case 'kill_monster':
      if (trigger.type === 'kill_monster' && trigger.monsterId === obj.targetId) return 1;
      return 0;

    case 'collect_item':
      // collect_item checks current inventory (on any trigger that might change inventory)
      if (trigger.type === 'item_change' || trigger.type === 'explore' || trigger.type === 'combat' || trigger.type === 'craft_item') {
        if (hasItem(player, obj.targetId!, obj.count ?? 1)) return obj.count ?? 1;
      }
      return 0;

    case 'reach_region':
      if (trigger.type === 'reach_region' && trigger.regionId === obj.targetId) return 1;
      return 0;

    case 'reach_realm':
      if (trigger.type === 'reach_realm' && trigger.realmIndex >= (obj.minRealmIndex ?? 0)) return 1;
      return 0;

    case 'talk_npc':
      if (trigger.type === 'talk_npc' && trigger.npcId === obj.targetId) return 1;
      return 0;

    case 'craft_item':
      if (trigger.type === 'craft_item') {
        if (trigger.recipeId === obj.targetId || trigger.outputItemId === obj.targetId) return 1;
      }
      return 0;

    case 'explore_count':
      if (trigger.type === 'explore') return 1;
      return 0;

    case 'cultivate_count':
      if (trigger.type === 'cultivate') return 1;
      return 0;

    case 'combat_count':
      if (trigger.type === 'combat') return 1;
      return 0;

    case 'survive_months':
      if (trigger.type === 'time_tick') {
        const elapsed = player.age - progress.stepStartedAt;
        if (elapsed >= (obj.count ?? 1)) return obj.count ?? 1;
      }
      return 0;

    case 'custom':
      if (obj.customCheck && obj.customCheck(player)) return obj.count ?? 1;
      return 0;

    default:
      return 0;
  }
}

// ── 超时检查 ──

export function checkQuestTimeouts(player: Player): { player: Player; logs: string[] } {
  const state = getQuestState(player);
  let p = player;
  const logs: string[] = [];

  for (const [questId, progress] of Object.entries(state.activeQuests)) {
    if (progress.status !== 'active') continue;
    const def = getQuestChainDef(questId);
    if (!def) continue;

    const step = def.steps[progress.currentStepIndex];
    if (step.timeLimit && step.timeLimit > 0) {
      const elapsed = p.age - progress.stepStartedAt;
      if (elapsed > step.timeLimit) {
        // Fail quest due to timeout
        const { player: p2, logs: failLogs } = failQuest(p, questId, QUEST_TEXTS.timeout);
        p = p2;
        logs.push(...failLogs);
      }
    }
  }

  return { player: p, logs };
}
