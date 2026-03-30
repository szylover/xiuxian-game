// ============================================================
// spirit-root.ts — 五行灵根系统 (T0056)
// ============================================================

export type SpiritRootType = 'metal' | 'wood' | 'water' | 'fire' | 'earth';

export interface SpiritRoot {
  type: SpiritRootType;
  affinity: number; // 1-100
}

export type SpiritRootCombo = 'none' | 'single' | 'dual' | 'triple' | 'quad' | 'penta';

export interface PlayerSpiritRoots {
  roots: SpiritRoot[];            // 已激活灵根 (0-5)
  combo: SpiritRootCombo;         // 灵根组合类型
  cultivationMultiplier: number;  // 修炼倍率，由组合类型决定
}

// ── 组合权重 & 倍率 ──
const COMBO_WEIGHTS: Array<{ combo: SpiritRootCombo; weight: number; count: number; multiplier: number }> = [
  { combo: 'single', weight: 1,  count: 1, multiplier: 3.0 },
  { combo: 'dual',   weight: 5,  count: 2, multiplier: 2.0 },
  { combo: 'triple', weight: 15, count: 3, multiplier: 1.2 },
  { combo: 'quad',   weight: 35, count: 4, multiplier: 0.8 },
  { combo: 'penta',  weight: 40, count: 5, multiplier: 0.5 },
  { combo: 'none',   weight: 4,  count: 0, multiplier: 0.1 },
];

const ALL_ROOT_TYPES: SpiritRootType[] = ['metal', 'wood', 'water', 'fire', 'earth'];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Fisher-Yates shuffle（取前 n 个）
function sampleN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/**
 * 随机掷出一套灵根
 */
export function rollSpiritRoots(): PlayerSpiritRoots {
  // 1. 加权随机选组合类型
  const totalWeight = COMBO_WEIGHTS.reduce((s, c) => s + c.weight, 0);
  let roll = Math.random() * totalWeight;
  // 初始化为最后一项作为兜底（浮点精度导致 roll 极小概率不减到 ≤0）
  let selected = COMBO_WEIGHTS[COMBO_WEIGHTS.length - 1];
  for (const entry of COMBO_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) { selected = entry; break; }
  }

  const { combo, count, multiplier } = selected;

  // 2. 无灵根直接返回
  if (count === 0) {
    return { roots: [], combo, cultivationMultiplier: multiplier };
  }

  // 3. 随机选 count 个灵根类型（不重复）
  const chosenTypes = sampleN(ALL_ROOT_TYPES, count);

  // 4. 为每个灵根生成亲和度
  //    单灵根：亲和度 ≥ 80；其余：随机 1-100
  const roots: SpiritRoot[] = chosenTypes.map(type => ({
    type,
    affinity: count === 1 ? randInt(80, 100) : randInt(1, 100),
  }));

  return { roots, combo, cultivationMultiplier: multiplier };
}
