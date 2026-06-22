import type { Player } from '../player';
import type { Alignment } from './karma';

// ── NPC 系统类型定义（T0025）──

/** NPC 态度类型 */
export type NpcDisposition = 'friendly' | 'neutral' | 'hostile';

/** NPC 角色标签 */
export type NpcRole =
  | 'merchant'
  | 'elder'
  | 'wanderer'
  | 'guard'
  | 'alchemist'
  | 'smith'
  | 'sect_leader'
  | 'rival'
  | 'companion';

/** NPC 性格标签 */
export type NpcPersonality =
  | 'gentle'
  | 'cold'
  | 'hot_tempered'
  | 'cunning'
  | 'righteous'
  | 'mysterious';

export interface NpcDef {
  id: string;
  name: string;
  title?: string;
  emoji: string;
  gender: 'male' | 'female';
  description: string;
  realmIndex: number;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  critRate: number;
  critResist: number;
  critDmgMultiplier?: number;
  disposition: NpcDisposition;
  roles: NpcRole[];
  personality: NpcPersonality;
  charisma: number;
  regionTags: string[];
  homeRegionId?: string;
  minRealm?: number;
  condition?: (p: Player) => boolean;
  dialoguePoolId?: string;
  sectId?: string;
  shopGoodsIds?: string[];
  aiTags?: string[];
  maxAffinity?: number;
  affinityDecayRate?: number;
  alignment?: Alignment;
  karmaAffinityModifier?: {
    sameFaction: number;
    oppositeFaction: number;
  };
  giftPreferences?: {
    loved: string[];
    liked: string[];
    disliked: string[];
  };
}

/** 单个 NPC 的运行时关系状态 */
export interface NpcRelation {
  npcId: string;
  affinity: number;
  met: boolean;
  metAt: number;
  interactionCount: number;
  lastInteractionYear: number;
  relationLevel: NpcRelationLevel;
  flags: Record<string, unknown>;
}

/** 关系等级 */
export type NpcRelationLevel =
  | 'hostile'
  | 'cold'
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close_friend'
  | 'soulmate';

/** NPC 系统整体状态 */
export interface NpcSystemState {
  relations: Record<string, NpcRelation>;
  discoveredNpcs: string[];
  /** 每个 NPC 最后一次赠礼时的 player.age，用于 CD 计算 */
  lastGiftAge: Record<string, number>;
}
