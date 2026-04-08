// ============================================================
// quest/state.ts — 状态读写
// ============================================================

import type { Player } from '../player';
import type { QuestSystemState } from '../types';

// ── 默认状态 ──

export const DEFAULT_QUEST_STATE: QuestSystemState = {
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
