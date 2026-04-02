export const INVENTORY_TEXTS = {
  itemNotFound: '物品不存在。',
  notUsable: (name: string) => `${name} 无法使用。`,
  noItem: (name: string) => `没有 ${name}。`,
  used: (name: string) => `使用了 ${name}。`,
} as const;
