// ============================================================
// achievement/types.ts — 成就系统类型定义（T0031）
// ============================================================

import type { Player } from '../player';

export type AchievementCategory = 'combat' | 'cultivation' | 'collection' | 'alchemy' | 'misc';

// recalcStats 型加成——每次 recalcStats() 叠加
export interface AchievementRecalcBonus {
  atk?: number;
  def?: number;
  speed?: number;
  hp?: number;
  mp?: number;
  mentalPower?: number;
  critRate?: number;
  critDmgMultiplier?: number;
  critResist?: number;
  moveSpeed?: number;
}

// 一次性加成——解锁瞬间直接叠加到 Player
export interface AchievementOnceBonus {
  luck?: number;
  comprehension?: number;
  charisma?: number;
  lifespan?: number;
}

export type AchievementBonusStats = AchievementRecalcBonus & AchievementOnceBonus;

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  condition: (p: Player) => boolean;
  bonusStats?: AchievementBonusStats;
  bonusDescription?: string;
  hidden?: boolean;
}

export interface AchievementSystemState {
  unlockedIds: string[];
  pendingToast: string[];
}
