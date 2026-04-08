import type { Player } from '../player';

// ── 飞升定义（T0033）──

export type RealmTier = 'mortal' | 'immortal' | 'primordial';

export interface AscensionItemCost {
  itemId: string;
  count: number;
}

export interface AscensionCondition {
  id: string;
  description: string;
  check: (p: Player) => boolean;
}

export interface AscensionDef {
  id: string;                         // 'cp-03:ascension_mortal_to_immortal'
  name: string;                       // '飞升仙界'
  description: string;                // '大乘圆满，天道感应，飞升仙界…'
  fromTier: RealmTier;                // 源阶层
  toTier: RealmTier;                  // 目标阶层
  fromRealmIndex: number;             // 源阶层最高境界 index
  toRealmIndex: number;               // 目标阶层最低境界 index
  minExp: number;                     // 修为下限
  itemCosts: AscensionItemCost[];     // 消耗物品
  conditions: AscensionCondition[];   // 额外谓词条件
  tribulationId?: string;             // 飞升天劫 ID
  rewards: {
    bonusExp: number;
    lifespanBonus: number;
    items: { itemId: string; count: number }[];
  };
  statReset?: {
    hpMultiplier?: number;
    mpMultiplier?: number;
    expReset?: boolean;
  };
}

export interface AscensionState {
  hasAscended: boolean;
  currentTier: RealmTier;
  ascensionHistory: {
    fromTier: string;
    toTier: string;
    atAge: number;
    realmIndexBefore: number;
  }[];
  ascensionFailCount: number;
}
