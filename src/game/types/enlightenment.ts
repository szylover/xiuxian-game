import type { Alignment } from './karma';
import type { DestinyTalentEffect } from './destiny';

export type EnlightenmentRoute = Alignment | 'any';

export interface EnlightenmentInsightDef {
  id: string;
  name: string;
  description: string;
  route: EnlightenmentRoute;
  requiredInsight: number;
  effect: DestinyTalentEffect;
}

export interface EnlightenmentBuff {
  id: string;
  name: string;
  remainingMonths: number;
  effect: DestinyTalentEffect;
}

export interface EnlightenmentState {
  comprehensionExp: number;
  insightPoints: number;
  unlockedInsightIds: string[];
  activeBuffs: EnlightenmentBuff[];
  lastEventAge: number;
  totalTriggers: number;
}

export interface EnlightenmentTriggerResult {
  player: import('../player').Player;
  triggered: boolean;
  logs: string[];
}
