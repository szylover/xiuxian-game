// ============================================================
// procedural/seed.ts — 确定性 PRNG（Mulberry32）+ 辅助工具
// 供 T0070–T0073 共享使用
// ============================================================

/**
 * Mulberry32 — 确定性伪随机数生成器
 * 给定同一种子，总是产生相同的随机序列。
 * 返回一个函数，每次调用返回 [0, 1) 之间的浮点数。
 */
export function createRNG(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 对主种子和计数器做确定性哈希，产生子种子。
 * 使用简单的混合函数，保证每个 (master, counter) 对产生不同的子种子。
 */
export function hashSeed(master: number, counter: number): number {
  let h = master ^ counter;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
  h = h ^ (h >>> 16);
  return h >>> 0;
}

/**
 * 加权随机选择：从带 weight 的条目列表中按权重抽取一个。
 * @param items 条目数组，每项必须含 weight 字段
 * @param rng  确定性随机函数
 * @returns 选中的条目
 */
export function weightedPick<T extends { weight: number }>(items: T[], rng: () => number): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

/**
 * 生成一个随机主种子（32 位无符号整数）
 */
export function randomMasterSeed(): number {
  return (Math.random() * 0xFFFFFFFF) >>> 0;
}
