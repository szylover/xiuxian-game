export const BREAKTHROUGH_TEXTS = {
  maxRealm: '🏔️ 你已到达当前版本的最高境界！',
  expInsufficient: (realm: string, req: number, current: number) =>
    `⚠️ 修为不足！突破 ${realm} 需要 ${req} 修为（当前 ${current}）。`,
  materialInsufficient: (name: string, req: number, have: number) =>
    `⚠️ 材料不足：${name} 需要 ${req} 个（当前 ${have}）。`,
  conditionNotMet: (desc: string) => `⚠️ 条件未满足：${desc}`,
  bottleneck: (name: string, hint: string) => `🚧 瓶颈未破：${name}。${hint}`,
  consumeItem: (name: string, count: number) => `📦 消耗 ${name} ×${count}`,
  tribulationRequired: '⚡ 突破此境界需经历天劫考验！',
  success: (realm: string) => `🎆 突破成功！晋升 ${realm}期！`,
  successBonus: (lifespan: number) => `寿限 +${lifespan}，属性全面提升！`,
  failed: (expLoss: number, mood: number, health: number) =>
    `💥 突破失败！损失 ${expLoss} 修为，心情 -${mood}，健康 -${health}。`,
  failedStats: (rate: string, roll: string, count: number) =>
    `（成功率 ${rate}%，掷骰 ${roll}%，累计失败 ${count} 次）`,
  bottleneckHint: '💡 提示：可通过战斗击杀指定妖兽、探索触发顿悟、或坚持修炼来突破瓶颈。',
} as const;

export const TRIBULATION_TEXTS = {
  notFound: '⚠️ 未找到天劫定义。',
  start: (name: string, desc: string, waves: number) =>
    [`⛈️ ${name} 降临！${desc}`, `共 ${waves} 波天劫，波间不可恢复！`],
  waveHeader: (i: number, total: number, name: string) => `── 第 ${i}/${total} 波：${name} ──`,
  failed: (desc: string) => `💥 渡劫失败！${desc}`,
  realmDrop: (realm: string) => `📉 跌落至 ${realm}期，健康归零。`,
  looseImmortal: '🌫️ 沦为散仙，无法走正统突破路线。',
  annihilated: '💀 形神俱灭！',
  success: '🌟 渡劫成功！天劫散去，道行大增！',
  bonusExp: (exp: number) => `📈 获得 ${exp} 修为奖励。`,
  rewardItem: (name: string, count: number) => `🎁 获得 ${name} ×${count}。`,
  advance: (realm: string, lifespan: number) => `🎆 晋升 ${realm}期！寿限 +${lifespan}！`,
  waveWin: (name: string, hp: number) => `✅ 扛住了 ${name}！（剩余体力 ${hp}）`,
  waveLose: (name: string) => `❌ 未能抵挡 ${name}…`,
} as const;
