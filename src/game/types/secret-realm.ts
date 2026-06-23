import type { QuestReward } from './quest';

export type SecretRealmStageType = 'combat' | 'boss' | 'treasure' | 'trap' | 'rest';

export interface SecretRealmStageDef {
  id: string;
  type: SecretRealmStageType;
  title: string;
  description: string;
  monsterId?: string;
  damageRate?: number;
  mpDamageRate?: number;
  reward?: QuestReward;
}

export interface SecretRealmDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  regionId: string;
  minRealm: number;
  entryCost: { stamina: number; gold?: number; itemId?: string; itemCount?: number };
  cooldownMonths: number;
  risk: number;
  stages: SecretRealmStageDef[];
  completionReward: QuestReward;
}

export interface SecretRealmRun {
  realmId: string;
  startedAt: number;
  stageIndex: number;
  rewards: QuestReward;
  logs: string[];
  completed: boolean;
  failed: boolean;
}

export interface SecretRealmSystemState {
  cooldowns: Record<string, number>;
  activeRun?: SecretRealmRun;
  completedRuns: Record<string, number>;
}
