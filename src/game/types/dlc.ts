import type { GameEvent } from './events';
import type { ItemDef } from './items';
import type { RecipeDef } from './alchemy';
import type { EquipDef } from './equipment';
import type { SmithingRecipeDef } from './smithing';
import type { BreakthroughReqDef, TribulationDef } from './breakthrough';
import type { TechniqueDef, BodyRealmDef, RealmDef, SpiritRootBodyBonus } from './cultivation';
import type { DeathTriggerDef, LifeSaverDef, RevivalMethodDef } from './death';
import type { MonsterDef } from './combat';
import type { DivineArtDef } from './divine-arts';
import type { RegionDef } from './map';
import type { BottleneckDef } from './bottleneck';
import type { NpcDef } from './npc';
import type { QuestChainDef } from './quest';
import type { DialogueChainDef, IdleChatPool } from './dialogue';
import type { AscensionDef } from './ascension';
import type { RankingDimensionDef } from './ranking';
import type { DestinyDef, TalentDef, TalentTreeNodeDef } from './destiny';
import type { BountyTemplateDef } from './bounty';
import type { SecretRealmDef } from './secret-realm';
import type {
  EventTemplate,
  VariablePool,
  EquipBaseTemplate,
  AffixDef,
  MonsterTemplate,
  MutationDef,
  TechniqueTraitDef,
} from './procedural';

// ── DLC 包定义 ──

// 预留，Phase 1 不实现
export type SkillStrategy = 'random' | 'smart';

export interface DLCPack {
  id: string;                              // DLC 标识，如 'core', 'dlc-1'
  name: string;                            // 显示名称
  description: string;                     // 简介
  version: string;                         // 版本号
  events?: GameEvent[];                    // 该 DLC 提供的事件
  items?: ItemDef[];                       // 该 DLC 提供的物品定义
  recipes?: RecipeDef[];                   // 该 DLC 提供的炼丹配方
  equips?: EquipDef[];                     // 该 DLC 提供的装备定义
  smithingRecipes?: SmithingRecipeDef[];   // 该 DLC 提供的炼器配方
  breakthroughReqs?: BreakthroughReqDef[]; // 该 DLC 提供的突破需求
  tribulations?: TribulationDef[];         // 该 DLC 提供的天劫定义
  techniques?: TechniqueDef[];             // 该 DLC 提供的功法定义
  deathTriggers?: DeathTriggerDef[];       // 该 DLC 提供的死亡触发条件
  lifeSavers?: LifeSaverDef[];             // 该 DLC 提供的护命道具定义
  revivalMethods?: RevivalMethodDef[];     // 该 DLC 提供的复活手段定义
  monsters?: MonsterDef[];                 // 该 DLC 提供的妖兽定义
  divineArts?: DivineArtDef[];             // 该 DLC 提供的神通定义
  achievements?: import('../achievement/types').AchievementDef[]; // 该 DLC 提供的成就定义
  bodyRealms?: BodyRealmDef[];              // T0059 体修境界定义
  spiritRootBodyBonuses?: SpiritRootBodyBonus[]; // T0059 灵根对体修的加成配置
  realms?: RealmDef[];                       // T0058 气修境界定义
  regions?: RegionDef[];                     // T0021 区域定义
  bottlenecks?: BottleneckDef[];             // T0064 瓶颈定义
  npcs?: NpcDef[];                           // T0025 NPC 定义
  questChains?: QuestChainDef[];             // T0057 任务链定义
  dialogues?: DialogueChainDef[];            // T0026 对话链定义
  idleChat?: IdleChatPool;                   // T0026 闲聊池数据
  eventTemplates?: EventTemplate[];          // T0070 程序化事件模板
  variablePools?: VariablePool[];            // T0070 变量词库
  equipBaseTemplates?: EquipBaseTemplate[];   // T0071 装备基础模板
  affixDefs?: AffixDef[];                    // T0071 词缀定义
  monsterTemplates?: MonsterTemplate[];      // T0072 妖兽基础模板
  mutations?: MutationDef[];                 // T0072 变异定义
  techniqueTraits?: TechniqueTraitDef[];     // T0073 功法词条定义
  ascensions?: AscensionDef[];               // T0033 飞升定义
  rankingDimensions?: RankingDimensionDef[]; // #102/#118 排名维度定义
  destinies?: DestinyDef[];                      // #110 命格定义
  talents?: TalentDef[];                          // #110 天赋定义
  talentTreeNodes?: TalentTreeNodeDef[];          // #215 天赋树节点定义
  bountyTemplates?: BountyTemplateDef[];          // #117 悬赏模板
  secretRealms?: SecretRealmDef[];                // #95 秘境定义
}
