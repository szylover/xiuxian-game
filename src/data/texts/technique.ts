export const TECHNIQUE_TEXTS = {
  unknownTechnique: (id: string) => `❌ 未知功法：${id}`,
  realmInsufficient: (name: string) => `❌ 境界不足，需达到更高境界才能修炼 ${name}`,
  spiritRootRequired: (cn: string, raw: string) => `❌ 此功法需要【${cn ?? raw}灵根】才能习得`,
  alreadyLearned: (name: string) => `⚠️ 已经学会了 ${name}`,
  learned: (name: string) => `📖 习得功法 ${name}！`,
  unknownPractice: '❌ 未知功法',
  notLearned: (name: string) => `❌ 尚未学会 ${name}`,
  rootLimitReached: (name: string, max: number) => `⚠️ ${name} 已达灵根上限（${max} 级），提升灵根亲和度可解锁更高等级`,
  maxLevel: (name: string, max: number) => `⚠️ ${name} 已满级（${max}）`,
  staminaInsufficient: (cost: number) => `⚠️ 精力不足，无法修炼功法（需 ${cost}）`,
  practiced: (name: string, gain: number, stamina: number, mp: number) =>
    `🧘 修炼 ${name}，熟练度 +${gain}（精力-${stamina} 灵力-${mp}）。`,
  levelUp: (name: string, level: number) => ` 🎉 ${name} 升至 ${level} 级！`,
  bottleneck: (name: string) => ` 🚧 功法瓶颈：${name}`,
  passiveUnlock: (descs: string) => ` ✨ 解锁被动：${descs}`,
  bodyExpGain: (n: number) => ` 💪体修修为+${n}`,
  activateNotLearned: '❌ 未知功法',
  activateNotLearnedName: (name: string) => `❌ 尚未学会 ${name}`,
  deactivate: (name: string) => `❎ 取消激活 ${name}`,
  activate: (name: string) => `⚔️ 切换功法为 ${name}`,
  // T0073: 功法词条
  traitsGenerated: (count: number, quality: string) => ` 🎲 ${quality}功法，附带 ${count} 条词条！`,
  qualityName: (rarity: string) => {
    const map: Record<string, string> = {
      common: '凡品', uncommon: '灵品', rare: '地品', epic: '天品', legendary: '仙品',
    };
    return map[rarity] ?? rarity;
  },
} as const;
