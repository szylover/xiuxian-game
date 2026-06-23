import type { Alignment } from './karma';
import type { QuestReward } from './quest';

export type SectMissionType = 'patrol' | 'donate_item' | 'meditate' | 'manage';

export interface SectRankDef {
  id: string;
  name: string;
  minContribution: number;
  stipendGold: number;
  stipendContribution: number;
  cultivationBonus: number;
  statBonuses?: Partial<Record<'atk' | 'def' | 'hp' | 'mp' | 'speed', number>>;
  techniqueIds: string[];
}

export interface SectStoreItemDef {
  itemId: string;
  contributionCost: number;
  minRankId: string;
  stockPerYear?: number;
}

export interface SectMissionDef {
  id: string;
  title: string;
  description: string;
  type: SectMissionType;
  minRankId: string;
  staminaCost?: number;
  goldCost?: number;
  itemCost?: { itemId: string; count: number };
  reward: QuestReward & { contribution?: number; sectPrestige?: number };
  repeatCooldownMonths: number;
}

export interface SectFacilityDef {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  upgradeCost: { treasury: number; herbs?: number; ore?: number; prestige?: number };
  effects: Partial<Record<'cultivationBonus' | 'treasuryYield' | 'herbYield' | 'oreYield' | 'recruitBonus', number>>;
}

export interface SectDef {
  id: string;
  name: string;
  description: string;
  alignment: Alignment;
  minRealm: number;
  minKarma?: number;
  maxKarma?: number;
  entryGold?: number;
  ranks: SectRankDef[];
  store: SectStoreItemDef[];
  missions: SectMissionDef[];
  facilities: SectFacilityDef[];
  founderNpcIds?: string[];
}

export interface SectMemberState {
  id: string;
  name: string;
  role: 'disciple' | 'steward' | 'elder';
  loyalty: number;
  cultivation: number;
  task: 'idle' | 'cultivate' | 'gather' | 'guard';
}

export interface SectResources {
  treasury: number;
  herbs: number;
  ore: number;
  morale: number;
  prestige: number;
}

export interface SectManagementState {
  active: boolean;
  foundedAt: number;
  members: SectMemberState[];
  resources: SectResources;
  facilities: Record<string, number>;
  lastYieldAge: number;
}

export interface SectSystemState {
  sectId: string | null;
  rankId: string | null;
  contribution: number;
  totalContribution: number;
  joinedAt: number;
  claimedStipendYear: number;
  missionCooldowns: Record<string, number>;
  storePurchases: Record<string, number>;
  management?: SectManagementState;
}

export interface SectActionResult {
  player: import('../player').Player;
  logs: string[];
}
