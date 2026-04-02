export const DEATH_TEXTS = {
  lifeSaverBlock: (name: string) => `💎 ${name}碎裂！抵消了致命伤害！`,
  expLoss: (n: number) => `📉 损失 ${n} 修为`,
  goldLoss: (n: number) => `💰 损失 ${n} 灵石`,
  itemLoss: (n: number) => `📦 丢失 ${n} 件物品`,
  healthLoss: (n: number) => `❤️ 健康 -${n}`,
  moodLoss: (n: number) => `😞 心情 -${n}`,
  realmDrop: (drop: number, realm: string) => `🏔️ 境界跌落 ${drop} 级，当前 ${realm}期`,
  death: (name: string, desc: string) => `💀 ${name}！${desc}`,
  revival: (name: string, desc: string) => `🔮 ${name}！${desc}`,
  consumeRevival: (name: string) => `📦 消耗了 ${name}`,
} as const;
