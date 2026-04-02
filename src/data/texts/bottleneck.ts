export const BOTTLENECK_TEXTS = {
  activated: (name: string, desc: string) => `⚠️ 【瓶颈】${name}——${desc}`,
  unlocked: (name: string, method: string) => `🎆 【瓶颈突破】${name}已突破！（${method}）道心通畅，修为再无阻碍！`,
  methodNames: {
    quest:       '完成任务',
    combat:      '战斗突破',
    discourse:   '论道感悟',
    epiphany:    '灵光顿悟',
    persistence: '坚韧修炼',
    overflow:    '修为溢出',
  } as const,
  overflowRealm: (name: string) => `🌊 【瓶颈消融】${name}——修为深厚远超此境，瓶颈不攻自破！`,
  overflowBody:  (name: string) => `🌊 【瓶颈消融】${name}——体修深厚远超此境，瓶颈不攻自破！`,
} as const;
