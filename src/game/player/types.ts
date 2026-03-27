// ============================================================
// player/types.ts — Player 接口 + 相关类型
// ============================================================

export interface Aptitudes {
  alchemy: number; smithing: number;
  fengshui: number; mining: number;
  blade: number; spear: number;
  sword: number; fist: number;
  palm: number; finger: number;
  fire: number; water: number;
  thunder: number; wind: number;
  earth: number; wood: number;
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
}

export interface TechniqueSlot {
  techniqueId: string;       // 功法定义 ID
  level: number;             // 当前等级（1 起步）
  exp: number;               // 当前熟练度（升级后清零）
}

export interface Player {
  name: string;
  avatar: string;
  realmIndex: number;
  exp: number;
  age: number;
  lifespan: number;
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
}

export interface SpiritRootGrade {
  grade: string;
  multiplier: number;
  color: string;
}
