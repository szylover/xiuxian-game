import type { ElementType } from './common';
import type { EventCategory, EventTone } from './events';
import type { EquipSlot, EquipStatBonus } from './equipment';
import type { TechniqueType, TechniqueRarity, TechniqueStatBonus } from './cultivation';

// ── 程序化事件生成系统类型定义（T0070）──

/** JSON 事件条件（复用 event-loader 中的结构） */
export interface JsonEventCondition {
  minRealm?: number;
  maxRealm?: number;
  minLuck?: number;
  maxLuck?: number;
  minComprehension?: number;
  minCharisma?: number;
  minGold?: number;
  maxMood?: number;
  minMood?: number;
  minHealth?: number;
  maxHealth?: number;
}

/** 变量约束定义 */
export interface VarConstraint {
  pool?: string;                      // 指定从哪个词库池抽取
  minRealm?: number;                  // 最低境界才出现此变量组合
  maxRealm?: number;
  linkedTo?: string;                  // 与另一个变量联动
}

/** 事件模板定义 */
export interface EventTemplate {
  id: string;                         // 'core:tpl_find_resource'
  category: EventCategory;
  tone: EventTone;
  weight: number;
  namePattern: string;                // '发现{resource}'
  messagePattern: string;             // '{emoji} 在{location}发现一处{resource}…'
  effectsPattern: Record<string, string>; // { "gold": "{amount}" }
  condition?: JsonEventCondition;
  once?: boolean;
  cooldown?: number;
  regionTags?: string[];
  variableSlots: string[];            // 该模板需要的变量名列表
  varConstraints?: Record<string, VarConstraint>;
}

/** 变量词库条目 */
export interface VariableEntry {
  value: string;
  linkedValues?: Record<string, string>;
  weight?: number;
  minRealm?: number;
  maxRealm?: number;
  regionTags?: string[];
}

/** 变量词库 */
export interface VariablePool {
  id: string;                         // 'core:pool_resources'
  namespace: string;
  variable: string;                   // 变量名 'resource'
  entries: VariableEntry[];
}

/** 程序化事件系统的存档状态 */
export interface ProceduralEventState {
  masterSeed: number;
  eventCounter: number;
}

// ── 程序化装备词缀系统类型定义（T0071）──

export type AffixPosition = 'prefix' | 'suffix';
export type ProceduralEquipQuality = 'mortal' | 'spirit' | 'treasure' | 'immortal' | 'ancient';

/** 装备基础模板 */
export interface EquipBaseTemplate {
  id: string;
  baseName: string;
  slot: EquipSlot;
  baseStats: EquipStatBonus;
  minRealm: number;
  baseSellPrice: number;
  allowedPrefixes?: string[];
  allowedSuffixes?: string[];
  techType?: TechniqueType[];
  descriptionPattern: string;
}

/** 词缀定义 */
export interface AffixDef {
  id: string;
  position: AffixPosition;
  name: string;
  description: string;
  statBonus: EquipStatBonus;
  weight: number;
  minRealm?: number;
  maxRealm?: number;
  slotRestriction?: EquipSlot[];
  excludeAffixes?: string[];
  regionTags?: string[];
}

/** 生成的装备实例 */
export interface GeneratedEquipInstance {
  instanceId: string;
  baseTemplateId: string;
  quality: ProceduralEquipQuality;
  prefixIds: string[];
  suffixIds: string[];
  seed: number;
  finalName: string;
  finalStats: EquipStatBonus;
  finalSellPrice: number;
  description: string;
}

/** 程序化物品系统的存档状态 */
export interface ProceduralItemState {
  masterSeed: number;
  equipCounter: number;
  generatedEquips: GeneratedEquipInstance[];
}

// ── 程序化妖兽变体系统类型定义（T0072）──

export type MutationType = 'element' | 'stat_boost' | 'elite' | 'boss' | 'region_adapt';

/** 妖兽基础模板 */
export interface MonsterTemplate {
  id: string;                         // 'core:tmpl_wolf'
  baseName: string;                   // '狼'
  emoji: string;                      // '🐺'
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    speed: number;
    moveSpeed: number;
    critRate: number;
    critResist: number;
    critDmgMultiplier?: number;
  };
  baseExpReward: number;
  baseGoldReward: number;
  element?: ElementType;
  elementResists?: Partial<Record<ElementType, number>>;
  regionTags?: string[];
  minRealm?: number;
  maxRealm?: number;
  allowedMutations?: string[];
  lootChance?: number;
  description?: string;
}

/** 变异定义 */
export interface MutationDef {
  id: string;
  type: MutationType;
  name: string;
  weight: number;
  statModifiers: Partial<Record<keyof MonsterTemplate['baseStats'], number>>;
  expBonus?: number;
  goldBonus?: number;
  element?: ElementType;
  elementResists?: Partial<Record<ElementType, number>>;
  emojiOverride?: string;
  namePrefix?: string;
  nameSuffix?: string;
  minRealm?: number;
  maxRealm?: number;
  regionTags?: string[];
  exclusive?: boolean;
  lootBonus?: number;
}

/** 程序化妖兽系统的存档状态 */
export interface ProceduralMonsterState {
  masterSeed: number;
  monsterCounter: number;
}

// ── 程序化功法词条系统类型定义（T0073）──

/** 词条等级 */
export type TechniqueTraitTier = 'minor' | 'major' | 'legendary';

/** 功法词条定义 */
export interface TechniqueTraitDef {
  id: string;                         // 'core:trait_atk_boost'
  name: string;                       // '刚猛'
  description: string;                // '攻击力提升 {value}'
  stat: keyof TechniqueStatBonus;     // 'atk'
  baseValue: number;                  // 基础值（凡品时的值）
  qualityScaling: number;             // 品质缩放系数
  weight: number;                     // 抽取权重
  tier: TechniqueTraitTier;           // 词条等级
  minRealm?: number;                  // 最低出现境界
  maxRealm?: number;
  typeRestriction?: TechniqueType[];  // 限制功法类型（空 = 全类型）
  excludeTraits?: string[];           // 互斥词条 ID
}

/** 品质词条配置 */
export interface TechniqueQualityConfig {
  rarity: TechniqueRarity;
  displayName: string;
  traitSlots: { minor: number; major: number; legendary: number };
  valueMultiplier: number;
  dropWeight: number;
}

/** 功法实例中已附加的单条词条 */
export interface TechniqueTraitSlot {
  traitId: string;
  tier: TechniqueTraitTier;
  finalValue: number;
  stat: keyof TechniqueStatBonus;
}

/** 功法词条实例（关联到基础功法） */
export interface TechniqueInstance {
  instanceId: string;                 // 'proc-tech:<seed_hex>'
  baseTechniqueId: string;            // 关联的基础功法 ID
  qualityOverride: TechniqueRarity;   // 生成时的品质
  traits: TechniqueTraitSlot[];       // 已附加的词条
  seed: number;                       // 生成种子
}

/** 程序化功法系统的存档状态 */
export interface ProceduralTechniqueState {
  masterSeed: number;
  techniqueCounter: number;
  instances: TechniqueInstance[];
}
