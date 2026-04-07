// ============================================================
// procedural/rarity.ts — 品质抽取逻辑（T0070–T0073 共享）
// ============================================================

import type { ItemRarity } from '../types';

export type ProceduralEquipQuality = 'mortal' | 'spirit' | 'treasure' | 'immortal' | 'ancient';

export interface QualityTier {
  quality: ProceduralEquipQuality;
  displayName: string;
  rarity: ItemRarity;
  statMultiplier: number;
  affixSlots: { prefix: number; suffix: number };
  priceMultiplier: number;
  dropWeight: number;
  nameColor: string;
}

export const QUALITY_TIERS: QualityTier[] = [
  { quality: 'mortal',    displayName: '凡品', rarity: 'common',    statMultiplier: 1.0, affixSlots: { prefix: 0, suffix: 0 }, priceMultiplier: 1.0, dropWeight: 50, nameColor: '--color-quality-common' },
  { quality: 'spirit',    displayName: '灵器', rarity: 'uncommon',  statMultiplier: 1.5, affixSlots: { prefix: 1, suffix: 0 }, priceMultiplier: 2.0, dropWeight: 30, nameColor: '--color-quality-uncommon' },
  { quality: 'treasure',  displayName: '法宝', rarity: 'rare',      statMultiplier: 2.5, affixSlots: { prefix: 1, suffix: 1 }, priceMultiplier: 5.0, dropWeight: 12, nameColor: '--color-quality-rare' },
  { quality: 'immortal',  displayName: '仙器', rarity: 'epic',      statMultiplier: 4.0, affixSlots: { prefix: 2, suffix: 1 }, priceMultiplier: 12.0, dropWeight: 6, nameColor: '--color-quality-epic' },
  { quality: 'ancient',   displayName: '太古', rarity: 'legendary', statMultiplier: 6.0, affixSlots: { prefix: 2, suffix: 2 }, priceMultiplier: 25.0, dropWeight: 2, nameColor: '--color-quality-legendary' },
];

const QUALITY_INDEX: Record<ProceduralEquipQuality, number> = {
  mortal: 0, spirit: 1, treasure: 2, immortal: 3, ancient: 4,
};

const LUCK_SCALING = [0, 0.005, 0.01, 0.015, 0.02];

export function getQualityTier(quality: ProceduralEquipQuality): QualityTier {
  return QUALITY_TIERS[QUALITY_INDEX[quality]];
}

export function rollRarity(rng: () => number, luck: number = 0): QualityTier {
  const adjusted = QUALITY_TIERS.map((tier, i) => ({
    ...tier,
    weight: tier.dropWeight * (1 + luck * LUCK_SCALING[i]),
  }));
  const total = adjusted.reduce((s, t) => s + t.weight, 0);
  let roll = rng() * total;
  for (const tier of adjusted) {
    roll -= tier.weight;
    if (roll <= 0) return tier;
  }
  return QUALITY_TIERS[0];
}

export function rollRarityForced(quality: ProceduralEquipQuality): QualityTier {
  return QUALITY_TIERS[QUALITY_INDEX[quality]];
}
