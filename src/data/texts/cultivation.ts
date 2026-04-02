export const CULTIVATION_TEXTS = {
  cultivate: (exp: number, comp: string, root: string | number, mood: string) =>
    `🧘 修炼一次，获得 ${exp} 修为。（悟性×${comp} 灵根×${root} 心情×${mood}）`,
  cultivateBody: (exp: number) => `🧘 修炼一次，获得 ${exp} 修为。`,
  bodyExpGain: (n: number) => `💪体修修为+${n}`,
  rest: '💤 休息片刻，体力、灵力、精力完全恢复，健康/心情少量恢复。',
  explore: '🚶 四处探索了一番，未发现什么特别的东西。',
  breakthoughBottleneck: (name: string, hint: string) => `💡 提示：${name}。${hint}`,
  bottleneckHint: '💡 提示：可通过战斗击杀指定妖兽、探索触发顿悟、或坚持修炼来突破瓶颈。',
} as const;
