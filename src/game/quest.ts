// ============================================================
// quest.ts — 任务链系统核心逻辑（T0057）
// 状态读写、接取/放弃/推进/完成/失败
// 纯逻辑壳子：不硬编码任何具体任务数据
// ============================================================

import type { Player } from './player';
import type {
  QuestChainDef, QuestChainProgress, QuestSystemState,
  QuestObjectiveProgress, QuestTrigger, QuestReward, QuestStatus,
} from './types';
import { getQuestChainDef, getAllQuestChainDefs, getItemDef, getNpcDef } from './registry';
import { hasItem, removeItem, addItem } from './inventory';
import { getCurrentRegion } from './map';
import { getRelation } from './npc';
import { QUEST_TEXTS } from '../data/texts/quest';
import { ATTR_NAMES } from '../data/texts/common';

// ── 默认状态 ──

const DEFAULT_QUEST_STATE: QuestSystemState = {
  activeQuests: {},
  completedQuests: {},
  failedQuests: {},
  abandonedQuests: [],
  discoveredQuests: [],
  trackedQuestId: undefined,
  actionCounters: { explore: 0, cultivate: 0, combat: 0 },
};

// ── 状态读写 ──

export function getQuestState(player: Player): QuestSystemState {
  const s = player.systems['quest'];
  if (!s || typeof s !== 'object') return { ...DEFAULT_QUEST_STATE, activeQuests: {}, completedQuests: {}, failedQuests: {}, abandonedQuests: [], discoveredQuests: [], trackedQuestId: undefined, actionCounters: { explore: 0, cultivate: 0, combat: 0 } };
  const state = s as Partial<QuestSystemState>;
  return {
    activeQuests: state.activeQuests ?? {},
    completedQuests: state.completedQuests ?? {},
    failedQuests: state.failedQuests ?? {},
    abandonedQuests: state.abandonedQuests ?? [],
    discoveredQuests: state.discoveredQuests ?? [],
    trackedQuestId: state.trackedQuestId,
    actionCounters: state.actionCounters ?? { explore: 0, cultivate: 0, combat: 0 },
  };
}

export function setQuestState(player: Player, state: QuestSystemState): Player {
  return { ...player, systems: { ...player.systems, quest: state } };
}

// ── 条件检查 ──

function checkQuestCondition(player: Player, def: QuestChainDef): boolean {
  const cond = def.condition;
  if (!cond) return true;

  if (cond.minRealm !== undefined && player.realmIndex < cond.minRealm) return false;
  if (cond.maxRealm !== undefined && player.realmIndex > cond.maxRealm) return false;
  if (cond.minAge !== undefined && player.age < cond.minAge) return false;

  if (cond.regionId) {
    const region = getCurrentRegion(player);
    if (!region || region.id !== cond.regionId) return false;
  }

  if (cond.regionTags?.length) {
    const region = getCurrentRegion(player);
    if (!region || !cond.regionTags.some(t => region.regionTags.includes(t))) return false;
  }

  if (cond.requiredQuests?.length) {
    const state = getQuestState(player);
    for (const reqId of cond.requiredQuests) {
      if (!state.completedQuests[reqId]) return false;
    }
  }

  if (cond.requiredItems?.length) {
    for (const { itemId, count } of cond.requiredItems) {
      if (!hasItem(player, itemId, count)) return false;
    }
  }

  if (cond.npcAffinity?.length) {
    for (const { npcId, min } of cond.npcAffinity) {
      const rel = getRelation(player, npcId);
      if (rel.affinity < min) return false;
    }
  }

  if (cond.custom && !cond.custom(player)) return false;

  return true;
}

// ── 查询 ──

export function getAvailableQuests(player: Player): QuestChainDef[] {
  const state = getQuestState(player);
  const all = getAllQuestChainDefs();
  return all.filter(def => {
    // Already active
    if (state.activeQuests[def.id]) return false;
    // Already completed (and not repeatable, or cooldown not elapsed)
    if (state.completedQuests[def.id]) {
      if (!def.repeatable) return false;
      if (def.repeatCooldown && def.repeatCooldown > 0) {
        const elapsed = player.age - state.completedQuests[def.id].completedAt;
        if (elapsed < def.repeatCooldown) return false;
      }
    }
    // Check condition
    return checkQuestCondition(player, def);
  });
}

export function getActiveQuests(player: Player): QuestChainProgress[] {
  const state = getQuestState(player);
  return Object.values(state.activeQuests).filter(q => q.status === 'active' || q.status === 'pending_turnin');
}

export function getCompletedQuests(player: Player): string[] {
  const state = getQuestState(player);
  return Object.keys(state.completedQuests);
}

// ── 初始化步骤进度 ──

function initStepProgress(def: QuestChainDef, stepIndex: number): QuestObjectiveProgress[] {
  const step = def.steps[stepIndex];
  return step.objectives.map((_, i) => ({
    objectiveIndex: i,
    currentCount: 0,
    completed: false,
  }));
}

// ── 奖励发放 ──

function applyReward(player: Player, reward: QuestReward | undefined): { player: Player; logs: string[] } {
  if (!reward) return { player, logs: [] };
  let p = { ...player };
  const logs: string[] = [];

  if (reward.exp) {
    p.exp += reward.exp;
    logs.push(QUEST_TEXTS.rewardExp(reward.exp));
  }
  if (reward.gold) {
    p.gold += reward.gold;
    logs.push(QUEST_TEXTS.rewardGold(reward.gold));
  }
  if (reward.items) {
    for (const { itemId, count } of reward.items) {
      const { player: p2 } = addItem(p, itemId, count);
      p = p2;
      const def = getItemDef(itemId);
      logs.push(QUEST_TEXTS.rewardItem(def?.name ?? itemId, count));
    }
  }
  if (reward.statBonus) {
    for (const [key, value] of Object.entries(reward.statBonus)) {
      if (value && key in p) {
        (p as Record<string, unknown>)[key] = (p[key as keyof Player] as number) + value;
        const cnName = ATTR_NAMES[key as keyof typeof ATTR_NAMES] ?? key;
        logs.push(QUEST_TEXTS.rewardStat(cnName, value));
      }
    }
  }

  return { player: p, logs };
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

function checkStepCompletion(player: Player, questId: string): { player: Player; logs: string[] } {
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

// ── 任务失败 ──

function failQuest(player: Player, questId: string, reason: string): { player: Player; logs: string[] } {
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

// ── 任务发现系统 ──

export function discoverQuest(player: Player, questId: string): { player: Player; logs: string[] } {
  const def = getQuestChainDef(questId);
  if (!def) return { player, logs: [] };

  const state = getQuestState(player);
  if (state.discoveredQuests.includes(questId)) return { player, logs: [] };
  if (state.activeQuests[questId]) return { player, logs: [] };

  const newState: QuestSystemState = {
    ...state,
    discoveredQuests: [...state.discoveredQuests, questId],
  };

  const p = setQuestState(player, newState);
  return { player: p, logs: [QUEST_TEXTS.discovered(def.name)] };
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

// ── NPC 任务查询 ──

export function getQuestsForNpc(player: Player, npcId: string): {
  available: QuestChainDef[];
  pendingTurnIn: { def: QuestChainDef; progress: QuestChainProgress }[];
} {
  const state = getQuestState(player);
  const all = getAllQuestChainDefs();

  // Available: not yet discovered/active/completed(non-repeatable), condition met, discoverSource.npcId matches
  const available = all.filter(def => {
    if (def.discoverSource.type !== 'npc') return false;
    if (def.discoverSource.npcId !== npcId) return false;
    if (state.discoveredQuests.includes(def.id)) return false;
    if (state.activeQuests[def.id]) return false;
    if (state.completedQuests[def.id]) {
      if (!def.repeatable) return false;
      if (def.repeatCooldown && def.repeatCooldown > 0) {
        const elapsed = player.age - state.completedQuests[def.id].completedAt;
        if (elapsed < def.repeatCooldown) return false;
      }
    }
    return checkQuestCondition(player, def);
  });

  // Pending turn-in: status is 'pending_turnin' AND turnInNpcId matches
  const pendingTurnIn: { def: QuestChainDef; progress: QuestChainProgress }[] = [];
  for (const [qId, progress] of Object.entries(state.activeQuests)) {
    if (progress.status !== 'pending_turnin') continue;
    const def = getQuestChainDef(qId);
    if (!def || def.turnInNpcId !== npcId) continue;
    pendingTurnIn.push({ def, progress });
  }

  return { available, pendingTurnIn };
}

export function checkQuestDiscovery(player: Player, trigger: QuestTrigger): { player: Player; logs: string[] } {
  const all = getAllQuestChainDefs();
  const state = getQuestState(player);
  let p = player;
  const logs: string[] = [];

  for (const def of all) {
    const currentState = getQuestState(p);
    if (currentState.discoveredQuests.includes(def.id)) continue;
    if (currentState.activeQuests[def.id]) continue;
    if (currentState.completedQuests[def.id]) {
      if (!def.repeatable) continue;
      if (def.repeatCooldown && def.repeatCooldown > 0) {
        const elapsed = p.age - currentState.completedQuests[def.id].completedAt;
        if (elapsed < def.repeatCooldown) continue;
      }
    }

    if (!checkQuestCondition(p, def)) continue;

    const ds = def.discoverSource;
    if (!ds) continue;
    let discovered = false;

    switch (ds.type) {
      case 'npc':
        if (trigger.type === 'talk_npc' && trigger.npcId === ds.npcId) discovered = true;
        break;
      case 'exploration':
        if (trigger.type === 'explore' && Math.random() < (ds.chance ?? 1)) discovered = true;
        break;
      case 'combat_drop':
        if (trigger.type === 'kill_monster' && trigger.monsterId === ds.monsterId && Math.random() < (ds.chance ?? 1)) discovered = true;
        break;
      case 'region_enter':
        if (trigger.type === 'reach_region' && trigger.regionId === ds.regionId) discovered = true;
        break;
      case 'realm_reach':
        if (trigger.type === 'reach_realm' && trigger.realmIndex >= ds.realmIndex) discovered = true;
        break;
      case 'quest_complete':
        if (trigger.type === 'quest_complete' && trigger.questId === ds.questId) discovered = true;
        break;
      case 'auto':
        discovered = true;
        break;
    }

    if (discovered) {
      const { player: p2, logs: dLogs } = discoverQuest(p, def.id);
      p = p2;
      logs.push(...dLogs);
    }
  }

  return { player: p, logs };
}

export function getDiscoveredQuests(player: Player): QuestChainDef[] {
  const state = getQuestState(player);
  return state.discoveredQuests
    .map(id => getQuestChainDef(id))
    .filter((d): d is QuestChainDef => !!d);
}

export function setTrackedQuest(player: Player, questId: string | null): Player {
  const state = getQuestState(player);
  return setQuestState(player, { ...state, trackedQuestId: questId ?? undefined });
}

export function getTrackedQuestInfo(player: Player): { def: QuestChainDef; progress: QuestChainProgress } | null {
  const state = getQuestState(player);
  if (!state.trackedQuestId) return null;
  const progress = state.activeQuests[state.trackedQuestId];
  if (!progress || (progress.status !== 'active' && progress.status !== 'pending_turnin')) return null;
  const def = getQuestChainDef(state.trackedQuestId);
  if (!def) return null;
  return { def, progress };
}

// ── 调试辅助 ──

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
