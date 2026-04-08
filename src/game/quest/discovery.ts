// ============================================================
// quest/discovery.ts — 发现系统
// ============================================================

import type { Player } from '../player';
import type { QuestTrigger } from '../types';
import { getQuestChainDef, getAllQuestChainDefs } from '../registry';
import { QUEST_TEXTS } from '../../data/texts/quest';
import { getQuestState, setQuestState } from './state';
import { checkQuestCondition } from './conditions';

export function discoverQuest(player: Player, questId: string): { player: Player; logs: string[] } {
  const def = getQuestChainDef(questId);
  if (!def) return { player, logs: [] };

  const state = getQuestState(player);
  if (state.discoveredQuests.includes(questId)) return { player, logs: [] };
  if (state.activeQuests[questId]) return { player, logs: [] };

  const newState = {
    ...state,
    discoveredQuests: [...state.discoveredQuests, questId],
  };

  const p = setQuestState(player, newState);
  return { player: p, logs: [QUEST_TEXTS.discovered(def.name)] };
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
