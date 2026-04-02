export const SHOP_TEXTS = {
  itemNotFound: '商品不存在。',
  itemDefNotFound: '物品定义不存在。',
  goldInsufficient: (need: number, have: number) => `灵石不足！需要 ${need}，当前 ${have}。`,
  inventoryFull: '背包已满，无法购买。',
  bought: (name: string, count: number, cost: number) => `🛒 购入 ${name} ×${count}，花费 ${cost} 灵石。`,
  boughtOverflow: (overflow: number) => `（背包满，${overflow} 个未购入）`,
  sellItemNotFound: '物品不存在。',
  stockInsufficient: (name: string) => `${name} 数量不足。`,
  sold: (name: string, count: number, gold: number) => `💰 卖出 ${name} ×${count}，获得 ${gold} 灵石。`,
} as const;
