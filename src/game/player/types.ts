// ============================================================
// player/types.ts — Player 接口 + 相关类型
// ============================================================

import type { PlayerSpiritRoots } from '../spirit-root';
export type { PlayerSpiritRoots };

export interface Aptitudes {
  alchemy: number; smithing: number;
  fengshui: number; mining: number;
  blade: number; spear: number;
  sword: number; fist: number;
  palm: number; finger: number;
  fire: number; water: number;
  thunder: number; wind: number;
  earth: number; wood: number;
  metal: number;
}

export interface InventorySlot {
  itemId: string;
  count: number;
}

export interface EquippedSlots {
  weapon: string | null;
  helmet: string | null;
  armor: string | null;
  boots: string | null;
  accessory1: string | null;
  accessory2: string | null;
}

export interface PlayerTracking {
  killCount: number;
  bossKillCount: number;
  consecutiveRests: number;
  consecutiveCultivates: number;
  hasBeenBelow10Hp: boolean;
  defeatedHigherRealm: boolean;
  lowMoodStreak: number;
  consecutiveBreakthroughFails: number;
}

export interface TechniqueSlot {
  techniqueId: string;       // 功法定义 ID
  level: number;             // 当前等级（1 起步）
  exp: number;               // 当前熟练度（升级后清零）
  instanceId?: string;       // T0073 关联的词条实例 ID（可选，无则为无词条版本）
}

export interface Player {
  name: string;
  avatar: string;
  realmIndex: number;
  exp: number;
  age: number;                             // T0067 年龄（整数月）
  lifespan: number;                        // T0067 寿限（整数月）
  mood: number;
  health: number;
  stamina: number;
  maxStamina: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  mentalPower: number;
  maxMentalPower: number;
  atk: number;
  def: number;
  speed: number;
  skillResist: number;
  spellResist: number;
  critRate: number;
  critDmgMultiplier: number;
  critResist: number;
  moveSpeed: number;
  luck: number;
  comprehension: number;
  charisma: number;
  aptitudes: Aptitudes;
  gold: number;
  inventory: InventorySlot[];
  inventoryCapacity: number;
  equipped: EquippedSlots;
  techniques: TechniqueSlot[];             // 已学功法列表
  activeTechniqueId: string | null;        // 当前激活功法 ID
  items: Record<string, unknown>;
  passives: Record<string, unknown>;
  systems: Record<string, unknown>;
  tracking: PlayerTracking;
  gameYear: number;                        // 历法年份（从 1 开始）
  gameMonth: number;                       // 当前月份（1-12）
  spiritRoots: PlayerSpiritRoots;          // T0056 五行灵根
  gender: 'male' | 'female';              // T0056 性别
  appearance: number;                      // T0056 外貌（头像序号）
  // ─── T0059 体修专属属性 ───
  physique: number;                        // 当前体魄值
  maxPhysique: number;                     // 体魄上限（由体修境界+功法被动叠加）
  bodyRealmIndex: number;                  // 体修境界索引（0=凡躯，1-6）
  bodyRealmExp: number;                    // 当前体修修为
  physiqueDmgReduce: number;               // 体魄减伤%（上限50）
  bodyTempering: number;                   // 淬体次数
  enabledDLCs: string[];                   // T0074 本局加载的 DLC ID 列表
}

export interface SpiritRootGrade {
  grade: string;
  multiplier: number;
  color: string;
}
