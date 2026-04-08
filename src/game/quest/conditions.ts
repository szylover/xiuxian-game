// ============================================================
// quest/conditions.ts — 条件检查
// ============================================================

import type { Player } from '../player';
import type { QuestChainDef } from '../types';
import { getCurrentRegion } from '../map';
import { hasItem } from '../inventory';
import { getRelation } from '../npc';
import { getQuestState } from './state';

export function checkQuestCondition(player: Player, def: QuestChainDef): boolean {
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
