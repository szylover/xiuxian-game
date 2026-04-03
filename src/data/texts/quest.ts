export const QUEST_TEXTS = {
  // ── 系统提示 ──
  accepted: (name: string) => `📜 接取任务：${name}`,
  abandoned: (name: string) => `📜 放弃任务：${name}`,
  stepComplete: (questName: string, stepName: string) => `📜 「${questName}」步骤完成：${stepName}`,
  questComplete: (name: string) => `🎉 任务完成：${name}！`,
  questFailed: (name: string, reason: string) => `❌ 任务失败：${name}（${reason}）`,
  newQuestAvailable: '📜 有新的任务可以接取！',
  autoAccepted: (name: string) => `📜 自动接取任务：${name}`,
  timeout: '超时',
  delivered: (itemName: string, count: number) => `📦 交付了 ${count} 个 ${itemName}`,
  deliverFail: '背包中物品不足，无法交付。',
  questNotFound: '未找到该任务。',
  questNotActive: '该任务不在进行中。',
  alreadyAccepted: '该任务已经接取。',
  cannotAccept: '不满足接取条件。',

  // ── 奖励 ──
  rewardExp: (n: number) => `修为 +${n}`,
  rewardGold: (n: number) => `灵石 +${n}`,
  rewardItem: (name: string, count: number) => `${name} ×${count}`,
  rewardStat: (name: string, value: number) => `${name} +${value}`,

  // ── 步骤对话 ──
  dialogue: (text: string) => `💬 ${text}`,
};
