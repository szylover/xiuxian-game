export const DIVINE_ARTS_TEXTS = {
  notFound: (id: string) => `❌ 神通 ${id} 不存在。`,
  alreadyLearned: (name: string) => `❌ 已学习【${name}】。`,
  realmInsufficient: (realmName: string, name: string) => `❌ 境界不足，需达到${realmName}期才能学习【${name}】。`,
  aptitudeInsufficient: (cn: string, current: number, required: number, name: string) =>
    `❌ ${cn}灵根不足（当前 ${current} / 需要 ${required}），无法学习【${name}】。`,
  learned: (name: string, emoji: string, cn: string) =>
    `✨ 习得神通【${name}】（${emoji}${cn}系）！战斗中将自动施展。`,
  activateNotFound: (id: string) => `❌ 神通 ${id} 不存在。`,
  activateNotLearned: (name: string) => `❌ 尚未学习【${name}】，无法激活。`,
  activated: (name: string, emoji: string, cn: string) =>
    `⚡ 激活神通【${name}】（${emoji}${cn}系），战斗中将自动施展！`,
  noActiveArt: '❌ 当前没有激活的神通。',
  deactivated: (name: string) => `❎ 已取消激活神通【${name}】。`,
} as const;
