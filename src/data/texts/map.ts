export const MAP_TEXTS = {
  regionNotFound: '❌ 目标区域不存在。',
  containerRegion: '❌ 无法前往容器区域。',
  alreadyHere: (emoji: string, name: string) => `❌ 你已经在${emoji} ${name}了。`,
  accessDenied: (emoji: string, name: string, reason: string) => `❌ 无法前往${emoji} ${name}：${reason}`,
  staminaInsufficient: (need: number, have: number) => `❌ 精力不足（需 ${need}，当前 ${have}）`,
  arrived: (emoji: string, name: string, cost: number) => `🗺️ 到达 ${emoji} ${name}（消耗 ${cost} 精力）`,
  regionNotExist: '区域不存在',
  levelInsufficient: (min: number) => `修炼等级不足（需 ${min} 阶）`,
} as const;
