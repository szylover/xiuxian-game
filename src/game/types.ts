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
  bottlenecks?: import('./bottleneck/types').BottleneckDef[]; // T0064 瓶颈定义
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
