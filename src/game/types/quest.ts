import type { Player } from '../player';

// ── 任务链系统类型定义（T0057）──

/** 任务目标类型 */
export type QuestObjectiveType =
  | 'kill_monster'
  | 'collect_item'
  | 'deliver_item'
  | 'reach_region'
  | 'reach_realm'
  | 'talk_npc'
  | 'craft_item'
  | 'explore_count'
  | 'cultivate_count'
  | 'combat_count'
  | 'survive_months'
  | 'custom';

/** 任务目标定义 */
export interface QuestObjective {
  type: QuestObjectiveType;
  targetId?: string;
  count?: number;
  description: string;
  minRealmIndex?: number;
  customCheck?: (p: Player) => boolean;
}

/** 任务奖励 */
export interface QuestReward {
  exp?: number;
  gold?: number;
  items?: { itemId: string; count: number }[];
  statBonus?: Partial<Record<'atk' | 'def' | 'hp' | 'mp' | 'luck' | 'comprehension', number>>;
  affinityChange?: { npcId: string; delta: number }[];
}

/** 任务步骤定义 */
export interface QuestStep {
  id: string;
  name: string;
  description: string;
  objectives: QuestObjective[];
  rewards?: QuestReward;
  onStartEventId?: string;
  onCompleteEventId?: string;
  dialogueSnippet?: string;
  timeLimit?: number;
}

/** 任务链接取条件 */
export interface QuestChainCondition {
  minRealm?: number;
  maxRealm?: number;
  minAge?: number;
  regionId?: string;
  regionTags?: string[];
  requiredQuests?: string[];
  requiredItems?: { itemId: string; count: number }[];
  npcAffinity?: { npcId: string; min: number }[];
  custom?: (p: Player) => boolean;
}

/** 任务链分类 */
export type QuestChainCategory =
  | 'main'
  | 'side'
  | 'daily'
  | 'bounty'
  | 'dialogue'
  | 'event';

/** 任务发现来源 */
export type QuestDiscoverSource =
  | { type: 'npc'; npcId: string }
  | { type: 'exploration'; chance?: number }
  | { type: 'combat_drop'; monsterId: string; chance?: number }
  | { type: 'region_enter'; regionId: string }
  | { type: 'realm_reach'; realmIndex: number }
  | { type: 'quest_complete'; questId: string }
  | { type: 'auto' };

/** 任务链定义 */
export interface QuestChainDef {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: QuestChainCategory;
  condition?: QuestChainCondition;
  steps: QuestStep[];
  rewards: QuestReward;
  repeatable?: boolean;
  repeatCooldown?: number;             // 可重复任务的冷却时间（月），默认无冷却
  discoverSource: QuestDiscoverSource;
  turnInNpcId?: string;
  failOnDeath?: boolean;
  onCompleteEventId?: string;
  maxConcurrent?: number;
}

/** 单个目标的进度 */
export interface QuestObjectiveProgress {
  objectiveIndex: number;
  currentCount: number;
  completed: boolean;
}

/** 单条任务链的运行时进度 */
export interface QuestChainProgress {
  questId: string;
  status: QuestStatus;
  currentStepIndex: number;
  objectiveProgress: QuestObjectiveProgress[];
  acceptedAt: number;
  stepStartedAt: number;
  completedSteps: number[];
}

/** 任务状态 */
export type QuestStatus =
  | 'active'
  | 'pending_turnin'
  | 'completed'
  | 'failed'
  | 'abandoned';

/** 任务系统总状态 */
export interface QuestSystemState {
  activeQuests: Record<string, QuestChainProgress>;
  completedQuests: Record<string, {
    questId: string;
    completedAt: number;
    repeatCount: number;
  }>;
  failedQuests: Record<string, {
    questId: string;
    failedAt: number;
    reason: string;
  }>;
  abandonedQuests: string[];
  discoveredQuests: string[];
  trackedQuestId?: string;
  actionCounters: {
    explore: number;
    cultivate: number;
    combat: number;
  };
}

/** 任务推进触发器 */
export type QuestTrigger =
  | { type: 'kill_monster'; monsterId: string }
  | { type: 'reach_region'; regionId: string }
  | { type: 'reach_realm'; realmIndex: number }
  | { type: 'talk_npc'; npcId: string }
  | { type: 'craft_item'; recipeId: string; outputItemId: string }
  | { type: 'explore' }
  | { type: 'cultivate' }
  | { type: 'combat' }
  | { type: 'time_tick' }
  | { type: 'item_change' }
  | { type: 'quest_complete'; questId: string };
