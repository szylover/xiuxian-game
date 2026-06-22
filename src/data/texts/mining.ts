export const MINING_TEXTS = {
  grades: {
    excellent: '龙脉汇聚',
    good: '藏风聚气',
    normal: '平稳有脉',
    poor: '砂水散乱',
    bad: '煞气侵脉',
  },
  labels: {
    separator: '、',
    fengShui: (value: number, grade: string) => `风水：${grade}（${value}）`,
    cost: (stamina: number, months: number) => `消耗：${stamina} 精力、${months} 个月`,
    total: (count: number, feng: number) => `已采矿 ${count} 次，累计风水 ${feng}`,
    minRealm: (realm: string) => `最低境界：${realm}`,
  },
  panel: {
    intro: '选择矿脉勘探，风水越佳越容易采到稀有材料；采矿受采矿与风水资质影响。',
    availableTitle: '可采矿脉',
    emptySites: '当前区域没有合适矿脉，可换到山川荒地再寻龙点穴。',
    mine: '入山采矿',
    lockRegion: '需先抵达矿脉所在区域。',
    lockRealm: '当前境界不足，难以承受此地矿煞。',
  },
  logs: {
    siteMissing: '⚠️ 矿脉不存在。',
    staminaInsufficient: (need: number, have: number) => `⚠️ 精力不足：需要 ${need}，当前 ${have}。`,
    mined: (site: string, feng: number, rewards: string) => `⛏️ 于「${site}」循风水采矿（风水 ${feng}），获得${rewards}。`,
    rewardItem: (name: string, count: number) => `${name}×${count}`,
  },
} as const;
