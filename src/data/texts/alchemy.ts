export const ALCHEMY_TEXTS = {
  recipeNotFound: '配方不存在。',
  realmInsufficient: '境界不足，无法炼制此丹。',
  mentalInsufficient: '念力不足，无法炼丹。',
  materialInsufficient: (name: string, count: number) => `材料不足：${name} 需要 ${count} 个。`,
  failed: (rate: string) => `💥 炼丹失败！材料化为灰烬。（成功率 ${rate}%）`,
  success: (label: string, name: string, count: number, rate: string) =>
    `🔥 炼丹成功！获得 ${label} ${name} ×${count}。（成功率 ${rate}%）`,
} as const;
