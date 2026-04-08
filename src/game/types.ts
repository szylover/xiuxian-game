// ============================================================
// types.ts — 游戏核心类型定义
// 所有 DLC 扩展系统的接口/类型集中在此，供各模块引用
// ============================================================

import type { Player } from './player';

// ── 元素类型 ──

export type ElementType = 'fire' | 'water' | 'thunder' | 'wind' | 'earth' | 'wood' | 'metal';

/** 元素克制表：攻击元素 → 可克制的防御元素列表（伤害 ×1.3） */
export const ELEMENT_COUNTER_TABLE: Record<ElementType, ElementType[]> = {
  water:   ['fire'],     // 水克火
  fire:    ['wood'],     // 火克木
  wood:    ['earth'],    // 木克土
  earth:   ['water'],    // 土克水
  thunder: ['water'],    // 雷克水
  wind:    ['fire'],     // 风克火（辅助克制）
  metal:   ['wood'],     // 金克木（对应五行相克，与 T0056 灵根系统对齐）
};

export const ELEMENT_COUNTER_MULTIPLIER = 1.3;

// ── 神通技能附加效果 ──

export interface DivineArtSkillEffect {
  type: 'dot'          // 持续伤害（每回合扣 HP）
      | 'debuff_def'   // 降低防御
      | 'debuff_atk'   // 降低攻击
      | 'heal_self'    // 恢复玩家 HP
      | 'shield_self'; // 护盾（每回合减免固定伤害）
  value: number;       // 效果量
  duration: number;    // 持续回合数
}

// ── 神通定义 ──

export interface DivineArtDef {
  id: string;                       // 命名空间 ID，如 'core:divine_fire_blast'
  name: string;                     // 显示名称，如 '烈焰斩'
  element: ElementType;             // 所属元素系
  description: string;              // 技能描述
  minRealm: number;                 // 最低学习境界（realmIndex）
  minAptitude: number;              // 最低对应灵根资质（默认 30）
  mpCost: number;                   // 每次释放消耗灵力
  dmgMultiplier: number;            // 基础伤害倍率（相对普通攻击）
  hitCount: number;                 // 攻击段数（每段独立判定暴击/闪避）
  cooldown: number;                 // 冷却回合数
  triggerRate: number;              // 战斗中随机触发概率（0~1）
  defPenetration?: number;          // 防御穿透系数 0~1（仅雷系；无视怪物防御的比例）
  effects?: DivineArtSkillEffect[]; // 附加效果列表（支持多效果并发）
  aptitudeScaling: number;          // 资质加成系数
}

// ── 物品类型定义 ──

export type ItemCategory = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'technique' | 'misc';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ItemDef {
  id: string;                              // 命名空间 ID，如 core:hp_pill
  name: string;                            // 显示名称
  category: ItemCategory;                  // 物品分类
  rarity: ItemRarity;                      // 品质
  description: string;                     // 描述
  stackable: boolean;                      // 是否可堆叠
  maxStack: number;                        // 最大堆叠数
  usable: boolean;                         // 是否可使用（消耗品）
  effect?: (p: Player) => Player;          // 使用效果
  effectMessage?: string;                  // 使用后日志消息
  sellPrice: number;                       // 售卖价格（灵石）
}

// ── 炼丹配方定义 ──

export type RecipeQuality = 'normal' | 'good' | 'excellent';

// ── 装备定义 ──

export type EquipSlot = 'weapon' | 'helmet' | 'armor' | 'boots' | 'accessory1' | 'accessory2';

export interface EquipStatBonus {
  atk?: number;
  def?: number;
  speed?: number;
  hp?: number;
  mp?: number;
  critRate?: number;
  critDmgMultiplier?: number;     // 暴击伤害倍率加成（如 +0.1 = 暴击伤害×10%）
  critResist?: number;
  moveSpeed?: number;
  // ─── T0059 体修装备加成 ───
  physique?: number;              // 装备提供的体魄上限加成
  physiqueDmgReduce?: number;     // 装备提供的减伤%
}

export interface EquipDef {
  id: string;                              // 命名空间 ID，如 core:iron_sword
  name: string;                            // 显示名称
  slot: EquipSlot;                         // 装备槽位
  rarity: ItemRarity;                      // 品质
  description: string;                     // 描述
  stats: EquipStatBonus;                   // 属性加成
  minRealm: number;                        // 最低佩戴境界
  sellPrice: number;                       // 售卖价格
  // ─── T0059 体修武器 ───
  techType?: TechniqueType[];              // 武器兼容的功法类型
  physiqueBonusRate?: number;              // 体魄值按此比例追加攻击
}

export interface RecipeDef {
  id: string;                              // 命名空间 ID，如 core:recipe_hp_pill
  name: string;                            // 配方名称
  description: string;                     // 描述
  inputs: { itemId: string; count: number }[]; // 输入材料
  outputItemId: string;                    // 产出物品 ID
  outputCount: number;                     // 基础产出数量
  baseSuccessRate: number;                 // 基础成功率 (0~1)
  mentalCost: number;                      // 念力消耗
  minRealm: number;                        // 最低境界要求
  qualityBonusMultipliers: Record<RecipeQuality, number>; // 品质倍率
}

// ── 炼器配方定义 ──

export interface SmithingRecipeDef {
  id: string;                              // 命名空间 ID，如 core:smith_iron_sword
  name: string;                            // 配方名称
  description: string;                     // 描述
  inputs: { itemId: string; count: number }[]; // 输入材料
  goldCost: number;                        // 灵石消耗
  outputItemId: string;                    // 产出装备 ID
  baseSuccessRate: number;                 // 基础成功率 (0~1)
  mentalCost: number;                      // 念力消耗
  minRealm: number;                        // 最低境界要求
}

// ── 突破需求定义 ──

export interface BreakthroughItemCost {
  itemId: string;
  count: number;
}

export interface BreakthroughCondition {
  id: string;
  description: string;
  check: (p: Player) => boolean;
}

export interface BreakthroughReqDef {
  id: string;
  fromRealmIndex: number;
  toRealmIndex: number;
  itemCosts: BreakthroughItemCost[];
  conditions: BreakthroughCondition[];
  requiresTribulation: boolean;
  baseSuccessRate?: number;
  failurePenalty?: {
    expLossRate?: number;
    moodLoss?: number;
    healthLoss?: number;
  };
  description?: string;
}

// ── 天劫定义 ──

export interface TribulationWave {
  name: string;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  specialEffect?: {
    type: 'dot' | 'debuff_def' | 'debuff_atk' | 'heal_block';
    value: number;
    description: string;
  };
}

export interface TribulationDef {
  id: string;
  name: string;
  description: string;
  forRealmIndex: number;
  waves: TribulationWave[];
  rewards: {
    bonusExp: number;
    items: Array<{ itemId: string; count: number }>;
  };
  failureType: 'realm_drop' | 'become_loose_immortal' | 'death';
  failureDescription: string;
}

// ── 功法类型定义 ──

export type TechniqueType = 'sword' | 'blade' | 'fist' | 'palm' | 'finger' | 'spear';
export type TechniqueRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface TechniqueStatBonus {
  atk?: number;
  def?: number;
  speed?: number;
  critRate?: number;
  critDmgMultiplier?: number;
  hp?: number;
  mp?: number;
  // ─── T0059 体修被动加成 ───
  physique?: number;              // 提升体魄上限
  bodyRealmExp?: number;          // 每次修炼额外获得的体修修为
  physiqueDmgReduce?: number;     // 额外减伤%（累加，总上限 50%）
}

/** 功法主动技能定义 */
export interface TechniqueActiveSkill {
  name: string;                     // 技能名称，如"疾风三剑"
  description: string;              // 技能描述
  mpCost: number;                   // 基础灵力消耗
  staminaCost: number;              // 基础精力消耗（每次释放额外扣精力）
  dmgMultiplier: number;            // 伤害倍率（相对普通攻击，如 1.5 = 150%）
  hitCount: number;                 // 攻击段数（多段攻击，每段独立判定暴击/闪避）
  cooldown: number;                 // 冷却回合数（0 = 无冷却）
  triggerRate: number;              // AI 随机释放概率（0~1，Phase 1 使用）
  effect?: {                        // 附加效果（可选）
    type: 'dot' | 'debuff_def' | 'debuff_atk' | 'heal_self';
    value: number;                  // 效果值（dot=每回合伤害, debuff=减少值, heal=恢复量）
    duration: number;               // 持续回合数
  };
}

/** 单条被动效果——对应一个熟练度阈值解锁的永久加成（T0019）*/
export interface PassiveEffect {
  minLevel: number;                        // 解锁所需最低等级（含）
  stat: keyof TechniqueStatBonus;          // 作用的属性字段
  value: number;                           // 加成数值（flat 绝对值）
  description: string;                     // 展示给玩家的描述
}

export interface TechniqueDef {
  id: string;                              // 命名空间 ID，如 core:basic_sword
  name: string;                            // 显示名称
  type: TechniqueType;                     // 功法类型（对应资质）
  rarity: TechniqueRarity;                 // 品质
  description: string;                     // 描述
  minRealm: number;                        // 最低修炼境界
  maxLevel: number;                        // 基础最大等级（灵根亲和度可突破此上限）
  expPerLevel: number;                     // 每级所需熟练度
  statBonusPerLevel: TechniqueStatBonus;   // 每级属性加成
  aptitudeKey: keyof import('./player').Aptitudes; // 对应资质字段
  activeSkill?: TechniqueActiveSkill;      // 主动技能定义（无则该功法只有被动加成）
  passiveEffects?: PassiveEffect[];        // 多级被动效果，按 minLevel 升序排列（T0019）
  spiritRootElement?: import('./spirit-root').SpiritRootType; // 功法五行属性（T0056）：对应灵根亲和度越高修炼越快、上限越高
  requiredSpiritRoot?: import('./spirit-root').SpiritRootType; // 学习门槛（T0056）：必须拥有此灵根才能习得
  bodyExpRate?: number;                     // T0059 体修修为系数（0-1，修炼此功法时按此比例给予体修修为）
  levelBottlenecks?: number[];               // T0064 哪些等级会触发瓶颈
}

// ── 事件类型定义 ──

export type EventCategory = 'explore' | 'adventure' | 'daily';
export type EventTone = 'good' | 'bad' | 'neutral';

export interface GameEvent {
  id: string;                              // 命名空间 ID，如 core:find_ore
  category: EventCategory;                 // 事件分类
  tone: EventTone;                         // 好/坏/中性（影响 luck 权重）
  name: string;                            // 显示名称
  weight: number;                          // 基础权重
  condition?: (p: Player) => boolean;      // 触发条件谓词（默认 always true）
  effect: (p: Player) => Player;           // 效果：返回新 Player
  message: (p: Player) => string;          // 日志消息（可动态生成）
  once?: boolean;                          // 是否只触发一次
  cooldown?: number;                       // 冷却（年）：触发后多久不再出现
  regionTags?: string[];                   // T0021 区域标签（空/未设置 = 全区域通用）
}

// ── 妖兽定义（DLC 化） ──

export interface MonsterDef {
  id: string;                // 命名空间 ID，如 'core:wild_wolf'
  name: string;
  emoji: string;             // 显示用 emoji，如 '🐺'
  realmIndex: number;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  moveSpeed: number;
  critRate: number;
  critResist: number;
  critDmgMultiplier?: number;
  expReward: number;
  goldReward: number;
  element?: ElementType;                            // 怪物元素属性
  elementResists?: Partial<Record<ElementType, number>>; // 各系元素抗性 0~1（减免比例）
  regionTags?: string[];                             // T0021 区域标签（空/未设置 = 全区域通用）
}

// ── 区域定义（T0021）──

export interface RegionDef {
  id: string;                     // 命名空间 ID，如 'core:qingyun_town'
  name: string;                   // 显示名称
  emoji: string;                  // 显示用 emoji
  description: string;            // 区域描述
  minRealm: number;               // 最低进入境界（realmIndex）
  regionTags: string[];           // 区域标签，用于筛选事件/妖兽/商品
  travelCostBase: number;         // 基础移动精力消耗
  travelTimeMonths: number;       // 移动耗时（月数）
  parentId?: string;              // 父区域 ID（树状结构，无则为根节点）
  isContainer?: boolean;          // 容器节点（世界/大陆），不可移动到，仅分组
  safeZone?: boolean;             // 安全区：无法触发战斗
  explorationBonus?: number;      // 探索事件额外权重加成（0~1）
  combatBonus?: number;           // 战斗经验加成（0~1）
  shopDiscount?: number;          // 商店折扣加成（0~1）
  connections?: string[];         // 可直接移动到的相邻区域 ID 列表（预留）
  lootTable?: Array<{ itemId: string; chance: number }>;  // T0022 区域专属掉落表
}

export interface MapSystemState {
  currentRegionId: string;
  unlockedRegions: string[];
  travelCount: number;
}

// ── 体修境界定义（T0059）──

export interface BodyRealmDef {
  id: string;                     // 'core:body_mortal'
  name: string;                   // '凡躯' | '铜皮' | …
  index: number;                  // 0–6
  maxPhysique: number;            // 该境界体魄上限
  expReq: number;                 // 升阶所需体修修为
  physiqueDmgReduce: number;      // 提供的减伤百分比
  hpBonus: number;                // 额外 HP 加成
  atkBonus: number;               // 额外攻击加成
  defBonus: number;               // 额外防御加成
  description: string;
}

// ── 气修境界定义（T0058）──

export interface RealmDef {
  id: string;                     // 'core:realm_mortal'
  name: string;                   // '凡人' | '炼气' | …
  index: number;                  // 0–7+（DLC 可追加更高境界）
  expReq: number;                 // 突破所需修为
  lifespanBonus: number;          // 寿命加成
  hpBase: number;                 // 基础 HP
  mpBase: number;                 // 基础 MP
  atkBase: number;                // 基础攻击
  defBase: number;                // 基础防御
  speedBase: number;              // 基础速度
  mentalBase: number;             // 基础念力
  // ── T0033 新增字段（可选，向后兼容）──
  tier?: 'mortal' | 'immortal' | 'primordial';  // 境界阶层，缺省为 'mortal'
  ascensionRequired?: boolean;    // 是否需要飞升才能进入此境界
  tierTransition?: 'ascension' | 'primordial_ascension'; // 跨阶转换类型
}

// ── 飞升定义（T0033）──

export type RealmTier = 'mortal' | 'immortal' | 'primordial';

export interface AscensionItemCost {
  itemId: string;
  count: number;
}

export interface AscensionCondition {
  id: string;
  description: string;
  check: (p: Player) => boolean;
}

export interface AscensionDef {
  id: string;                         // 'cp-03:ascension_mortal_to_immortal'
  name: string;                       // '飞升仙界'
  description: string;                // '大乘圆满，天道感应，飞升仙界…'
  fromTier: RealmTier;                // 源阶层
  toTier: RealmTier;                  // 目标阶层
  fromRealmIndex: number;             // 源阶层最高境界 index
  toRealmIndex: number;               // 目标阶层最低境界 index
  minExp: number;                     // 修为下限
  itemCosts: AscensionItemCost[];     // 消耗物品
  conditions: AscensionCondition[];   // 额外谓词条件
  tribulationId?: string;             // 飞升天劫 ID
  rewards: {
    bonusExp: number;
    lifespanBonus: number;
    items: { itemId: string; count: number }[];
  };
  statReset?: {
    hpMultiplier?: number;
    mpMultiplier?: number;
    expReset?: boolean;
  };
}

export interface AscensionState {
  hasAscended: boolean;
  currentTier: RealmTier;
  ascensionHistory: {
    fromTier: string;
    toTier: string;
    atAge: number;
    realmIndexBefore: number;
  }[];
  ascensionFailCount: number;
}

/** 灵根对体修的加成配置（数据驱动，通过 DLC 注册） */
export interface SpiritRootBodyBonus {
  rootType: import('./spirit-root').SpiritRootType;
  bodyExpMultiplier?: number;     // 体修修为获取倍率（1.3 = +30%）
  physiqueRegenRate?: number;     // 体魄恢复速率倍率（1.2 = +20%）
  dmgReduceBonus?: number;        // 额外减伤%
  hpBonusRate?: number;           // HP 加成比例（0.15 = +15%）
}

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
  achievements?: import('./achievement/types').AchievementDef[]; // 该 DLC 提供的成就定义
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
}

// ── 死亡系统类型定义 ──

export type DeathSeverity = 'light' | 'moderate' | 'severe';

export interface DeathTriggerDef {
  id: string;                        // 'core:death_lifespan'
  name: string;                      // '寿元耗尽'
  description: string;               // '大限将至，油尽灯枯…'
  severity: DeathSeverity;           // 后果等级
  check: (p: Player) => boolean;     // 触发条件谓词
  canBeBlocked: boolean;             // 是否可被护命道具阻挡
  bypassRevival: boolean;            // 是否跳过复活判定
  priority: number;                  // 检查优先级（数值小的先检查）
}

export interface DeathPenaltyDef {
  severity: DeathSeverity;
  expLossRate: number;
  goldLossRate: number;
  inventoryLossCount: number;
  healthLoss: number;
  moodLoss: number;
  realmDrop: number;
  gameOver: boolean;
}

export interface LifeSaverDef {
  id: string;                        // 'core:saver_talisman'
  itemId: string;                    // 对应背包中的物品 ID
  name: string;
  description: string;
  priority: number;
  consumeOnUse: boolean;
  blockSeverities: DeathSeverity[];
  afterEffect?: (p: Player) => Player;
  condition?: (p: Player) => boolean;
}

export interface RevivalMethodDef {
  id: string;                        // 'core:revival_nine_turn_pill'
  name: string;
  description: string;
  type: 'item' | 'passive' | 'realm';
  itemId?: string;
  passiveId?: string;
  consumeOnUse: boolean;
  priority: number;
  condition?: (p: Player) => boolean;
  effect: (p: Player) => Player;
  penalty?: Partial<DeathPenaltyDef>;
}

export interface DeathSystemState {
  deathCount: number;
  lastDeathCause: string | null;
  revivalCount: number;
  lifeSaverTriggered: string[];
  isLooseImmortal: boolean;
}

// ── 瓶颈系统类型定义（T0064）──

export type BottleneckUnlockMethod =
  | { type: 'quest';       questId: string }
  | { type: 'combat';      monsterId: string; minRealmIndex?: number }
  | { type: 'discourse';   npcId: string; cost: { itemId: string; count: number }[] }
  | { type: 'epiphany';    locationTag: string; baseChance: number }
  | { type: 'persistence'; cultivationCount: number }
  | { type: 'overflow' };

export interface BottleneckDef {
  id: string;
  targetType: 'realm' | 'technique' | 'body_realm';
  fromRealmIndex?: number;
  fromBodyRealmIndex?: number;
  techniqueId?: string;
  atLevel?: number;
  name: string;
  description: string;
  hint: string;
  unlockMethods: BottleneckUnlockMethod[];

  /** 修为溢出比例，达到下一境界 expReq * overflowRatio 时自动消除。
   *  仅对 realm / body_realm 类型生效。默认 1.5。设为 0 或 Infinity 可禁用。 */
  overflowRatio?: number;
  unlockBonus?: {
    expBonus?: number;
    statBonus?: Partial<Record<'atk' | 'def' | 'comprehension' | 'luck', number>>;
    items?: { itemId: string; count: number }[];
  };
  condition?: (player: Player) => boolean;
}

export interface BottleneckState {
  active: Record<string, {
    bottleneckId: string;
    activatedAt: number;
    progress: {
      persistenceCultivationCount?: number;
    };
  }>;
  unlocked: Record<string, {
    bottleneckId: string;
    unlockedAt: number;
    method: BottleneckUnlockMethod['type'];
  }>;
}

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

// ── 对话系统类型定义（T0026）──

/** 对话节点类型 */
export type DialogueNodeType = 'npc_talk' | 'player_choice' | 'narration';

/** 对话选项效果 */
export interface DialogueEffect {
  affinityChange?: number;
  giveItems?: { itemId: string; count: number }[];
  takeItems?: { itemId: string; count: number }[];
  goldChange?: number;
  expChange?: number;
  triggerQuestId?: string;
  triggerEventId?: string;
  triggerCombatNpcId?: string;
  setNpcFlag?: { key: string; value: unknown };
  setDialogueFlag?: { key: string; value: unknown };
  unlockDialogueId?: string;
  statBonus?: Partial<Record<'atk' | 'def' | 'hp' | 'mp' | 'luck' | 'comprehension', number>>;
}

/** 对话选项条件（决定该选项是否显示） */
export interface DialogueChoiceCondition {
  minAffinity?: number;
  minRealm?: number;
  hasItem?: { itemId: string; count: number };
  hasNpcFlag?: { key: string; value: unknown };
  hasDialogueFlag?: { key: string; value: unknown };
  completedQuest?: string;
  hasActiveQuest?: string;
}

/** 单个对话选项 */
export interface DialogueChoice {
  id: string;
  text: string;
  condition?: DialogueChoiceCondition;
  nextNodeId?: string;
  effects?: DialogueEffect;
  tooltip?: string;
}

/** 对话节点 */
export interface DialogueNode {
  id: string;
  type: DialogueNodeType;
  speaker?: string;
  speakerEmoji?: string;
  text: string;
  choices?: DialogueChoice[];
  nextNodeId?: string;
  effects?: DialogueEffect;
}

/** 对话链触发条件 */
export interface DialogueCondition {
  minAffinity?: number;
  maxAffinity?: number;
  minRealm?: number;
  maxRealm?: number;
  relationLevel?: NpcRelationLevel[];
  regionId?: string;
  regionTags?: string[];
  requiredQuests?: string[];
  hasActiveQuest?: string;
  requiredItems?: { itemId: string; count: number }[];
  hasNpcFlag?: { key: string; value: unknown };
  hasDialogueFlag?: { key: string; value: unknown };
  requiredDialogues?: string[];           // 前置对话链 ID（必须已触发才解锁）
  custom?: (p: Player) => boolean;
}

/** 对话链定义 */
export interface DialogueChainDef {
  id: string;
  npcId: string;
  name: string;
  priority: number;
  condition?: DialogueCondition;
  nodes: DialogueNode[];
  startNodeId: string;
  once?: boolean;
  cooldown?: number;
  tags?: string[];
}

/** 对话系统运行时状态 */
export interface DialogueSystemState {
  triggeredOnce: string[];
  lastTriggerAge: Record<string, number>;
  flags: Record<string, unknown>;
}

/** 闲聊池数据 */
export type IdleChatPool = Record<string, string[]>;

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
