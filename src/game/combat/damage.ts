// ============================================================
// combat/damage.ts — 伤害计算 & 技能判定
// ============================================================

import type { Combatant, DamageResult, SkillState } from './types';
import type { TechniqueActiveSkill } from '../types';

// ── 随机浮点 ──
export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ── 单次攻击计算 ──
export function calcDamage(attacker: Combatant, defender: Combatant): DamageResult {
  const log: string[] = [];

  // 1. 基础伤害（±15% 浮动）
  const baseDmg = attacker.atk * rand(0.85, 1.15);

  // 2. 减防（防御折算 60%）
  let dmg = Math.max(1, baseDmg - defender.def * 0.6);

  // 3. 暴击判定
  let isCrit = false;
  const effectiveCrit = Math.max(0, attacker.critRate - defender.critResist);
  if (Math.random() * 100 < effectiveCrit) {
    dmg *= attacker.critDmgMultiplier || 1.5;
    isCrit = true;
  }

  // 4. 闪避判定
  let isDodge = false;
  const dodgeChance = defender.moveSpeed / (defender.moveSpeed + 100);
  if (Math.random() < dodgeChance) {
    dmg = 0;
    isDodge = true;
  }

  // 5. 体魄减伤（T0059，上限 50%）
  if (!isDodge && defender.physiqueDmgReduce && defender.physiqueDmgReduce > 0) {
    const reduceRate = Math.min(0.50, defender.physiqueDmgReduce / 100);
    dmg = Math.floor(dmg * (1 - reduceRate));
  }

  const finalDmg = Math.floor(dmg);

  if (isDodge) {
    log.push(`${defender.name} 闪避了攻击！`);
  } else if (isCrit) {
    log.push(`${attacker.name} 暴击！对 ${defender.name} 造成 ${finalDmg} 点伤害！`);
  } else {
    log.push(`${attacker.name} 攻击 ${defender.name}，造成 ${finalDmg} 点伤害。`);
  }

  return { damage: finalDmg, isCrit, isDodge, log };
}

// ── 判定是否使用技能 ──
export function tryUseSkill(
  skill: TechniqueActiveSkill,
  skillState: SkillState,
  availableMp: number,
  availableStamina: number,
): boolean {
  if (skillState.cooldownLeft > 0) return false;
  if (availableMp < skill.mpCost) return false;
  if (availableStamina < skill.staminaCost) return false;
  return Math.random() < skill.triggerRate;
}

// ── 技能伤害计算（多段攻击）──
export function calcSkillDamage(
  attacker: Combatant,
  defender: Combatant,
  skill: TechniqueActiveSkill,
  aptitudeBonus: number,
  defenderCurrentHp: number,
): { totalDamage: number; log: string[] } {
  const log: string[] = [];
  let totalDamage = 0;

  for (let hit = 0; hit < skill.hitCount; hit++) {
    if (defenderCurrentHp - totalDamage <= 0) break; // 目标已死亡

    // 基础伤害 = atk × 浮动 × 倍率 × 资质加成
    const baseDmg = attacker.atk * rand(0.85, 1.15) * skill.dmgMultiplier * aptitudeBonus;

    // 减防
    let dmg = Math.max(1, baseDmg - defender.def * 0.6);

    // 暴击判定
    let isCrit = false;
    const effectiveCrit = Math.max(0, attacker.critRate - defender.critResist);
    if (Math.random() * 100 < effectiveCrit) {
      dmg *= attacker.critDmgMultiplier || 1.5;
      isCrit = true;
    }

    // 闪避判定
    let isDodge = false;
    const dodgeChance = defender.moveSpeed / (defender.moveSpeed + 100);
    if (Math.random() < dodgeChance) {
      dmg = 0;
      isDodge = true;
    }

    // 体魄减伤（T0059）
    if (!isDodge && defender.physiqueDmgReduce && defender.physiqueDmgReduce > 0) {
      const reduceRate = Math.min(0.50, defender.physiqueDmgReduce / 100);
      dmg = Math.floor(dmg * (1 - reduceRate));
    }

    const finalDmg = Math.floor(dmg);
    totalDamage += finalDmg;

    if (skill.hitCount > 1) {
      // 多段攻击：每段独立显示
      if (isDodge) {
        log.push(`💨 第 ${hit + 1} 段被闪避！`);
      } else if (isCrit) {
        log.push(`💥 第 ${hit + 1} 段暴击！造成 ${finalDmg} 点伤害！`);
      } else {
        log.push(`第 ${hit + 1} 段命中，造成 ${finalDmg} 点伤害。`);
      }
    }
  }

  return { totalDamage, log };
}
