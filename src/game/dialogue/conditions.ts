// ============================================================
// dialogue/conditions.ts — 对话条件检查
// ============================================================

import type { Player } from '../player';
import type { DialogueChainDef, DialogueChoiceCondition } from '../types';
import { getRelation, getNpcState } from '../npc';
import { getCurrentRegion } from '../map';
import { hasItem } from '../inventory';
import { getQuestState } from '../quest';
import { getDialogueState } from './state';
import { getAlignment } from '../karma';

export function checkDialogueCondition(player: Player, def: DialogueChainDef): boolean {
  const cond = def.condition;
  if (!cond) return true;

  const rel = getRelation(player, def.npcId);
  const dlgState = getDialogueState(player);

  if (cond.minAffinity !== undefined && rel.affinity < cond.minAffinity) return false;
  if (cond.maxAffinity !== undefined && rel.affinity > cond.maxAffinity) return false;
  if (cond.minRealm !== undefined && player.realmIndex < cond.minRealm) return false;
  if (cond.requiredAlignment && getAlignment(player.karma ?? 0) !== cond.requiredAlignment) return false;
  if (cond.minKarma !== undefined && (player.karma ?? 0) < cond.minKarma) return false;
  if (cond.maxKarma !== undefined && (player.karma ?? 0) > cond.maxKarma) return false;
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

  if (cond.requiredDialogues?.length) {
    for (const reqId of cond.requiredDialogues) {
      if (!dlgState.triggeredOnce.includes(reqId)) return false;
    }
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

  if (cond.requiredAlignment && getAlignment(player.karma ?? 0) !== cond.requiredAlignment) return false;
  if (cond.minKarma !== undefined && (player.karma ?? 0) < cond.minKarma) return false;
  if (cond.maxKarma !== undefined && (player.karma ?? 0) > cond.maxKarma) return false;

  return true;
}
