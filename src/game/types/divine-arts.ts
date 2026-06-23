import type { ElementType } from './common';

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
  requiredAlignment?: import('./karma').Alignment;
}
