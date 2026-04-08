// ============================================================
// quest/queries.ts — 查询函数
// ============================================================

import type { Player } from '../player';
import type { QuestChainDef, QuestChainProgress } from '../types';
import { getQuestChainDef, getAllQuestChainDefs } from '../registry';
import { getQuestState } from './state';
import { checkQuestCondition } from './conditions';

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

export function getDiscoveredQuests(player: Player): QuestChainDef[] {
  const state = getQuestState(player);
  return state.discoveredQuests
    .map(id => getQuestChainDef(id))
    .filter((d): d is QuestChainDef => !!d);
}

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

export function getTrackedQuestInfo(player: Player): { def: QuestChainDef; progress: QuestChainProgress } | null {
  const state = getQuestState(player);
  if (!state.trackedQuestId) return null;
  const progress = state.activeQuests[state.trackedQuestId];
  if (!progress || (progress.status !== 'active' && progress.status !== 'pending_turnin')) return null;
  const def = getQuestChainDef(state.trackedQuestId);
  if (!def) return null;
  return { def, progress };
}
