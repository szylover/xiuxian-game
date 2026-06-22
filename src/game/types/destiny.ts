import type { Player } from '../player';

export type DestinyRarity = 'common' | 'rare' | 'legendary';

export type DestinyTalentStatKey =
  | 'maxHp' | 'maxMp' | 'maxStamina' | 'maxMentalPower'
  | 'atk' | 'def' | 'speed' | 'skillResist' | 'spellResist'
  | 'critRate' | 'critDmgMultiplier' | 'critResist' | 'moveSpeed'
  | 'luck' | 'comprehension' | 'charisma' | 'lifespan'
  | 'inventoryCapacity' | 'maxPhysique' | 'physiqueDmgReduce';

export interface DestinyTalentEffect {
  statBonuses?: Partial<Record<DestinyTalentStatKey, number>>;
  statMultipliers?: Partial<Record<DestinyTalentStatKey, number>>;
  cultivationSpeedBonus?: number;
  breakthroughRateBonus?: number;
}

export interface DestinyDef {
  id: string;
  name: string;
  rarity: DestinyRarity;
  description: string;
  effect: DestinyTalentEffect;
  weight: number;
  initialKarma?: number;
}

export interface TalentDef {
  id: string;
  name: string;
  rarity: DestinyRarity;
  description: string;
  effect: DestinyTalentEffect;
}

export interface TalentTreeNodeDef {
  id: string;
  talentId: string;
  tier: number;
  cost: number;
  prereqNodeIds: string[];
  position: { x: number; y: number };
}

export interface DestinyTalentState {
  talentPoints: number;
  unlockedNodeIds: string[];
  acquiredTalentIds: string[];
}

export interface UnlockTalentNodeResult {
  success: boolean;
  player: Player;
  message: string;
}
