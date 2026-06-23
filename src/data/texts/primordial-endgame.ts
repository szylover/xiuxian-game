// ============================================================
// data/texts/primordial-endgame.ts — 洪荒终局文案（#104）
// ============================================================

export const PRIMORDIAL_ENDGAME_TEXTS = {
  button: '洪荒终局',
  buttonTitle: '挑战天道终局，决定此世结局',
  notReady: '尚未满足洪荒终局条件',
  missingItem: (name: string, have: number, need: number) => `${name} ${have}/${need}`,
  debugTitle: '♻️ 转世 / 洪荒终局',
  debugReincarnationCount: (count: number) => `转世次数: ${count}`,
  debugEnding: (ending: string) => `终局: ${ending}`,
  debugNotCompleted: '未完成',
  debugGiveOrb: '给予轮回珠',
  debugAddCount: '转世次数 +1',
  debugResetLegacy: '重置遗产',
  debugReadyNeutral: '设为终局中立',
  debugReadyRighteous: '设为终局正道',
  debugReadyEvil: '设为终局邪道',
  modalTitle: '洪荒终局',
  startChallenge: '开启终局挑战',
  close: '继续修炼',
  requirementTitle: '终局条件',
  bossTitle: '最终天道化身',
  rewardTitle: '终局馈赠',
  endingReached: '终局已定',
  victoryLog: (title: string) => `🌌 洪荒终局达成：${title}`,
  defeatLog: '⚠️ 天道化身威压无边，此次终局挑战失败。',
  completedTitle: '终局已完成',
  completedBody: '此世已留下最终结局，可选择转世重修开启新的轮回。',
  routeRighteous: '正道成圣',
  routeEvil: '逆天成魔',
  routeTranscendent: '超脱轮回',
} as const;
