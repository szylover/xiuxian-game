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
  aptitudeKey: keyof import('../player').Aptitudes; // 对应资质字段
  activeSkill?: TechniqueActiveSkill;      // 主动技能定义（无则该功法只有被动加成）
  passiveEffects?: PassiveEffect[];        // 多级被动效果，按 minLevel 升序排列（T0019）
  spiritRootElement?: import('../spirit-root').SpiritRootType; // 功法五行属性（T0056）：对应灵根亲和度越高修炼越快、上限越高
  requiredSpiritRoot?: import('../spirit-root').SpiritRootType; // 学习门槛（T0056）：必须拥有此灵根才能习得
  bodyExpRate?: number;                     // T0059 体修修为系数（0-1，修炼此功法时按此比例给予体修修为）
  levelBottlenecks?: number[];               // T0064 哪些等级会触发瓶颈
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

/** 灵根对体修的加成配置（数据驱动，通过 DLC 注册） */
export interface SpiritRootBodyBonus {
  rootType: import('../spirit-root').SpiritRootType;
  bodyExpMultiplier?: number;     // 体修修为获取倍率（1.3 = +30%）
  physiqueRegenRate?: number;     // 体魄恢复速率倍率（1.2 = +20%）
  dmgReduceBonus?: number;        // 额外减伤%
  hpBonusRate?: number;           // HP 加成比例（0.15 = +15%）
}
