// ============================================================
// combat/types.ts — 战斗系统类型定义
// ============================================================

// ── 战斗参与者（统一字段）──
export interface Combatant {
  name: string;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  moveSpeed: number;
  critRate: number;
  critDmgMultiplier?: number;
  critResist: number;
  physiqueDmgReduce?: number;     // T0059 体魄减伤（%）
}

export interface DamageResult {
  damage: number;
  isCrit: boolean;
  isDodge: boolean;
  log: string[];
}

/** 战斗中的技能状态 */
export interface SkillState {
  cooldownLeft: number;             // 剩余冷却回合
  totalMpUsed: number;              // 本场战斗累计消耗灵力
  totalStaminaUsed: number;         // 本场战斗累计消耗精力
  useCount: number;                 // 技能释放次数
}

/** 持续效果 */
export interface StatusEffect {
  type: 'dot' | 'debuff_def' | 'debuff_atk' | 'shield_self';
  value: number;
  remainingRounds: number;
  sourceName: string;               // 来源技能名
}

/** 每回合结束时的 HP/MP 快照（用于 UI 逐回合驱动血条） */
export interface RoundSnapshot {
  round: number;       // 回合序号（0 = 战斗开始前，1+ = 回合结束后）
  playerHp: number;
  playerMp: number;
  monsterHp: number;
}

export interface CombatResult {
  winner: 'player' | 'monster' | 'draw';
  playerHpLeft: number;
  logs: string[];
  expGained: number;
  goldGained: number;
  mpUsed: number;                   // 本场战斗消耗的灵力总量
  skillUseCount: number;            // 技能释放次数
  snapshots: RoundSnapshot[];       // 每回合结束快照（含 round=0 初始状态）
  monsterMaxHp: number;             // 怪物最大 HP（用于血条百分比）
  playerMaxHp: number;              // 玩家最大 HP（含功法加成）
  playerMaxMp: number;              // 玩家最大 MP（战斗开始时）
  bodyExpGained: number;            // T0059 本场获得的体修修为
}
