// ============================================================
// texts/dialogue.ts — 对话系统文案（T0026）
// ============================================================

export const DIALOGUE_TEXTS = {
  karmaReason: '对话抉择',
  // 系统提示
  noDialogueAvailable: '当前没有新的对话内容。',
  dialogueStarted: (npcName: string) => `💬 ${npcName} 与你交谈——`,
  dialogueEnded: '对话结束。',

  // 效果反馈
  affinityUp: (name: string, delta: number) => `${name} 好感度 +${delta}`,
  affinityDown: (name: string, delta: number) => `${name} 好感度 ${delta}`,
  receivedItem: (itemName: string, count: number) => `获得 ${itemName} ×${count}`,
  lostItem: (itemName: string, count: number) => `失去 ${itemName} ×${count}`,
  goldChange: (delta: number) => delta > 0 ? `获得 ${delta} 灵石` : `失去 ${Math.abs(delta)} 灵石`,
  questTriggered: (questName: string) => `接取任务：${questName}`,
  combatTriggered: (npcName: string) => `${npcName} 向你发起了挑战！`,

  // UI 标签
  continueBtn: '继续',
  endDialogueBtn: '结束对话',
  dialogueTitle: '对话',

  // NpcDetailModal
  chatBtnHasDialogue: '💬 交谈（有新对话）',
  chatBtnIdle: '💬 闲聊',
};
