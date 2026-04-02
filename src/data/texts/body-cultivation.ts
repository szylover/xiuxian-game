export const BODY_CULTIVATION_TEXTS = {
  bottleneck: (name: string, hint: string) => `🚧 体修瓶颈未破：${name}。${hint}`,
  breakthrough: (name: string, reduce: number) => `🔥 体修突破！肉身淬炼至【${name}】！减伤 ${reduce}%`,
  notReady: '❌ 体修突破条件未满足。',
} as const;
