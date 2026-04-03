// ============================================================
// quest-loader.ts — JSON → QuestChainDef 转换器（T0057）
// 将纯 JSON 数据转换为运行时 QuestChainDef 对象
// ============================================================

import type {
  QuestChainDef, QuestChainCategory, QuestChainCondition,
  QuestStep, QuestObjective, QuestObjectiveType, QuestReward,
} from './types';

// ── JSON 数据格式 ──

interface JsonQuestCondition {
  minRealm?: number;
  maxRealm?: number;
  minAge?: number;
  regionId?: string;
  regionTags?: string[];
  requiredQuests?: string[];
  requiredItems?: { itemId: string; count: number }[];
  npcAffinity?: { npcId: string; min: number }[];
}

interface JsonQuestObjective {
  type: string;
  targetId?: string;
  count?: number;
  description: string;
  minRealmIndex?: number;
}

interface JsonQuestReward {
  exp?: number;
  gold?: number;
  items?: { itemId: string; count: number }[];
  statBonus?: Partial<Record<string, number>>;
  affinityChange?: { npcId: string; delta: number }[];
}

interface JsonQuestStep {
  id: string;
  name: string;
  description: string;
  objectives: JsonQuestObjective[];
  rewards?: JsonQuestReward;
  onStartEventId?: string;
  onCompleteEventId?: string;
  dialogueSnippet?: string;
  timeLimit?: number;
}

export interface JsonQuestChain {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  condition?: JsonQuestCondition | null;
  steps: JsonQuestStep[];
  rewards: JsonQuestReward;
  repeatable?: boolean;
  autoAccept?: boolean;
  failOnDeath?: boolean;
  onCompleteEventId?: string;
  maxConcurrent?: number;
}

// ── 合法目标类型 ──

const VALID_OBJECTIVE_TYPES = new Set<QuestObjectiveType>([
  'kill_monster', 'collect_item', 'deliver_item', 'reach_region',
  'reach_realm', 'talk_npc', 'craft_item', 'explore_count',
  'cultivate_count', 'combat_count', 'survive_months', 'custom',
]);

const VALID_CATEGORIES = new Set<QuestChainCategory>([
  'main', 'side', 'daily', 'bounty', 'dialogue', 'event',
]);

// ── 转换函数 ──

function parseCondition(cond?: JsonQuestCondition | null): QuestChainCondition | undefined {
  if (!cond) return undefined;
  return {
    minRealm: cond.minRealm,
    maxRealm: cond.maxRealm,
    minAge: cond.minAge,
    regionId: cond.regionId,
    regionTags: cond.regionTags,
    requiredQuests: cond.requiredQuests,
    requiredItems: cond.requiredItems,
    npcAffinity: cond.npcAffinity,
  };
}

function parseObjective(obj: JsonQuestObjective): QuestObjective {
  const type = obj.type as QuestObjectiveType;
  if (!VALID_OBJECTIVE_TYPES.has(type)) {
    console.warn(`[quest-loader] Unknown objective type: ${obj.type}`);
  }
  return {
    type,
    targetId: obj.targetId,
    count: obj.count ?? 1,
    description: obj.description,
    minRealmIndex: obj.minRealmIndex,
  };
}

function parseReward(reward?: JsonQuestReward): QuestReward {
  if (!reward) return {};
  return {
    exp: reward.exp,
    gold: reward.gold,
    items: reward.items,
    statBonus: reward.statBonus as QuestReward['statBonus'],
    affinityChange: reward.affinityChange,
  };
}

function parseStep(step: JsonQuestStep): QuestStep {
  return {
    id: step.id,
    name: step.name,
    description: step.description,
    objectives: step.objectives.map(parseObjective),
    rewards: step.rewards ? parseReward(step.rewards) : undefined,
    onStartEventId: step.onStartEventId,
    onCompleteEventId: step.onCompleteEventId,
    dialogueSnippet: step.dialogueSnippet,
    timeLimit: step.timeLimit,
  };
}

export function loadQuestsFromJson(jsonQuests: JsonQuestChain[]): QuestChainDef[] {
  const results: QuestChainDef[] = [];

  for (const json of jsonQuests) {
    if (!json.id || !json.steps || json.steps.length === 0) {
      console.warn(`[quest-loader] Skipping invalid quest: ${json.id ?? 'unknown'}`);
      continue;
    }

    const category = json.category as QuestChainCategory;
    if (!VALID_CATEGORIES.has(category)) {
      console.warn(`[quest-loader] Unknown category '${json.category}' for quest ${json.id}`);
    }

    results.push({
      id: json.id,
      name: json.name,
      description: json.description,
      icon: json.icon,
      category,
      condition: parseCondition(json.condition),
      steps: json.steps.map(parseStep),
      rewards: parseReward(json.rewards),
      repeatable: json.repeatable,
      autoAccept: json.autoAccept,
      failOnDeath: json.failOnDeath,
      onCompleteEventId: json.onCompleteEventId,
      maxConcurrent: json.maxConcurrent,
    });
  }

  return results;
}
