export const QUEST_TEXTS = {
  karmaReason: '任务抉择',
  // ── 系统提示 ──
  accepted: (name: string) => `📜 接取任务：${name}`,
  abandoned: (name: string) => `📜 放弃任务：${name}`,
  stepComplete: (questName: string, stepName: string) => `📜 「${questName}」步骤完成：${stepName}`,
  questComplete: (name: string) => `🎉 任务完成：${name}！`,
  questFailed: (name: string, reason: string) => `❌ 任务失败：${name}（${reason}）`,
  discovered: (name: string) => `📜 发现新任务：${name}！`,
  autoAccepted: (name: string) => `📜 自动接取任务：${name}`,
  readyToTurnIn: (questName: string, npcName: string) => `📜 「${questName}」目标完成！前往${npcName}处交付任务。`,
  turnedIn: (name: string) => `✅ 交付任务：${name}！`,
  npcQuestsTitle: '📜 任务',
  npcQuestAccept: '接受',
  npcQuestTurnIn: '交付',
  npcNoQuests: '暂无任务',
  pendingTurnInHint: (npcName: string) => `✅ 目标完成，前往「${npcName}」处交付`,
  timeout: '超时',
  delivered: (itemName: string, count: number) => `📦 交付了 ${count} 个 ${itemName}`,
  deliverFail: '背包中物品不足，无法交付。',
  questNotFound: '未找到该任务。',
  questNotActive: '该任务不在进行中。',
  alreadyAccepted: '该任务已经接取。',
  cannotAccept: '不满足接取条件。',

  // ── 奖励 ──
  rewardExp: (n: number) => `修为+${n}`,
  rewardGold: (n: number) => `灵石+${n}`,
  rewardItem: (name: string, count: number) => `${name}×${count}`,
  rewardStat: (name: string, value: number) => `${name}+${value}`,
  questCompleteSummary: (name: string, rewards: string[]) =>
    `🎉 完成任务「${name}」 — ${rewards.length > 0 ? rewards.join(' · ') : '无奖励'}`,
  stepRewardSummary: (questName: string, stepName: string, rewards: string[]) =>
    `📜 「${questName}」步骤完成：${stepName}${rewards.length > 0 ? ' — ' + rewards.join(' · ') : ''}`,

  // ── 步骤对话 ──
  dialogue: (text: string) => `💬 ${text}`,

  // ── 面板 ──
  tabActive: '进行中',
  tabDiscovered: '已发现',
  tabCompleted: '已完成',
  noActiveQuests: '暂无进行中的任务',
  noDiscoveredQuests: '暂无已发现的任务',
  noCompletedQuests: '暂无已完成的任务',
  acceptBtn: '接取',
  abandonBtn: '放弃',
  trackBtn: '追踪',
  untrackBtn: '取消追踪',
  deliverBtn: '交付',
  rewardLabel: '奖励',
  completedAt: (age: number) => `完成于 ${Math.floor(age / 12)} 岁`,
  repeatCount: (n: number) => `已完成 ${n} 次`,
  trackerLabel: '追踪',
  stepProgress: (current: number, total: number) => `步骤 ${current}/${total}`,

  // ── 分类标签 ──
  categoryMain: '主线',
  categorySide: '支线',
  categoryDaily: '每日',
  categoryBounty: '悬赏',
  categoryDialogue: '对话',
  categoryEvent: '事件',
};
