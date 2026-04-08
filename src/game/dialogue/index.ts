// ============================================================
// dialogue/index.ts — barrel re-export
// ============================================================

export { getDialogueState, setDialogueState, resetDialogueState, clearDialogueCooldowns } from './state';
export { checkChoiceCondition } from './conditions';
export { getAvailableDialogues, getTopDialogue, startDialogue, selectChoice, advanceToNextNode } from './flow';
export type { SelectChoiceResult } from './flow';
export { getIdleChat } from './idle-chat';
