// ============================================================
// dialogue/state.ts — 对话状态管理（读写 / 重置）
// ============================================================

import type { Player } from '../player';
import type { DialogueSystemState } from '../types';

const DEFAULT_DIALOGUE_STATE: DialogueSystemState = {
  triggeredOnce: [],
  lastTriggerAge: {},
  flags: {},
};

export function getDialogueState(player: Player): DialogueSystemState {
  const s = player.systems['dialogue'];
  if (!s || typeof s !== 'object') return { ...DEFAULT_DIALOGUE_STATE, triggeredOnce: [], lastTriggerAge: {}, flags: {} };
  const state = s as Partial<DialogueSystemState>;
  return {
    triggeredOnce: Array.isArray(state.triggeredOnce) ? state.triggeredOnce : [],
    lastTriggerAge: state.lastTriggerAge ?? {},
    flags: state.flags ?? {},
  };
}

export function setDialogueState(player: Player, state: DialogueSystemState): Player {
  return { ...player, systems: { ...player.systems, dialogue: state } };
}

export function resetDialogueState(player: Player): Player {
  return setDialogueState(player, { triggeredOnce: [], lastTriggerAge: {}, flags: {} });
}

export function clearDialogueCooldowns(player: Player): Player {
  const state = getDialogueState(player);
  return setDialogueState(player, { ...state, lastTriggerAge: {} });
}
