import type { Player } from '../player';

// ── 突破需求定义 ──

export interface BreakthroughItemCost {
  itemId: string;
  count: number;
}

export interface BreakthroughCondition {
  id: string;
  description: string;
  check: (p: Player) => boolean;
}

export interface BreakthroughReqDef {
  id: string;
  fromRealmIndex: number;
  toRealmIndex: number;
  itemCosts: BreakthroughItemCost[];
  conditions: BreakthroughCondition[];
  requiresTribulation: boolean;
  baseSuccessRate?: number;
  failurePenalty?: {
    expLossRate?: number;
    moodLoss?: number;
    healthLoss?: number;
  };
  description?: string;
}

// ── 天劫定义 ──

export interface TribulationWave {
  name: string;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  specialEffect?: {
    type: 'dot' | 'debuff_def' | 'debuff_atk' | 'heal_block';
    value: number;
    description: string;
  };
}

export interface TribulationDef {
  id: string;
  name: string;
  description: string;
  forRealmIndex: number;
  waves: TribulationWave[];
  rewards: {
    bonusExp: number;
    items: Array<{ itemId: string; count: number }>;
  };
  failureType: 'realm_drop' | 'become_loose_immortal' | 'death';
  failureDescription: string;
}
