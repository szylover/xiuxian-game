import type { QuestObjectiveType, QuestReward } from './quest';

export type BountyObjectiveType = Extract<QuestObjectiveType, 'kill_monster' | 'collect_item' | 'reach_region'>;

export interface BountyObjectiveDef {
  type: BountyObjectiveType;
  targetId: string;
  count: number;
}

export interface BountyTemplateDef {
  id: string;
  title: string;
  description: string;
  issuer: string;
  icon: string;
  regionTags: string[];
  minRealm: number;
  maxRealm?: number;
  weight: number;
  durationMonths: number;
  objective: BountyObjectiveDef;
  rewards: QuestReward;
  reputation: number;
}

export interface GeneratedBounty {
  id: string;
  templateId: string;
  title: string;
  description: string;
  issuer: string;
  icon: string;
  createdAt: number;
  expiresAt: number;
  objective: BountyObjectiveDef;
  rewards: QuestReward;
  reputation: number;
}

export interface ActiveBounty extends GeneratedBounty {
  acceptedAt: number;
  progress: number;
  completed: boolean;
}

export interface BountySystemState {
  available: GeneratedBounty[];
  active: Record<string, ActiveBounty>;
  completed: Record<string, { completedAt: number; templateId: string }>;
  lastRefreshAge: number;
  reputation: number;
}
