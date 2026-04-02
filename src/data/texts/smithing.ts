export const SMITHING_TEXTS = {
  recipeNotFound: '配方不存在。',
  realmInsufficient: '境界不足，无法炼制此器。',
  mentalInsufficient: '念力不足，无法炼器。',
  goldInsufficient: (need: number, have: number) => `灵石不足！需要 ${need}，当前 ${have}。`,
  materialInsufficient: (name: string, count: number) => `材料不足：${name} 需要 ${count} 个。`,
  failed: (rate: string) => `💥 炼器失败！材料化为废铁。（成功率 ${rate}%）`,
  success: (name: string, rate: string) => `⚒️ 炼器成功！打造出 ${name}！（成功率 ${rate}%）`,
  successFull: (name: string) => `⚒️ 炼器成功但背包已满！${name} 丢失了。`,
} as const;
