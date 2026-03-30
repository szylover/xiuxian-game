// ============================================================
// combat/run.ts — 战斗主循环（回合制）
// ============================================================

import type { Player } from '../player';
import type { MonsterDef } from '../types';
import type { SkillState, StatusEffect, CombatResult, RoundSnapshot } from './types';
import { calcDamage, tryUseSkill, calcSkillDamage } from './damage';
import { getActiveTechniqueBonus, getActiveSkillInfo, calcAptitudeBonus } from '../technique';

export function runCombat(player: Player, monster: MonsterDef): CombatResult {
  const logs: string[] = [];
  const snapshots: RoundSnapshot[] = [];

  // 叠加功法加成
  const techBonus = getActiveTechniqueBonus(player);
  const buffedPlayer = {
    ...player,
    atk: player.atk + (techBonus.atk ?? 0),
    def: player.def + (techBonus.def ?? 0),
    speed: player.speed + (techBonus.speed ?? 0),
    critRate: player.critRate + (techBonus.critRate ?? 0),
    critDmgMultiplier: player.critDmgMultiplier + (techBonus.critDmgMultiplier ?? 0),
    hp: player.hp,
    maxHp: player.maxHp + (techBonus.hp ?? 0),
  };

  // 获取主动技能信息
  const skillInfo = getActiveSkillInfo(player);
  const skill = skillInfo?.skill ?? null;
  const techniqueName = skillInfo?.def.name ?? '';
  const aptitudeBonus = skillInfo ? calcAptitudeBonus(player, skillInfo.def) : 1.0;

  // 技能状态
  const skillState: SkillState = {
    cooldownLeft: 0,
    totalMpUsed: 0,
    totalStaminaUsed: 0,
    useCount: 0,
  };

  // 可用灵力/精力（战斗中实时递减，战斗结束后统一从玩家扣减）
  let availableMp = player.mp;
  let availableStamina = player.stamina;

  let pHp = buffedPlayer.hp;
  let mHp = monster.hp;

  // 初始快照（回合 0 = 战斗开始前）
  snapshots.push({ round: 0, playerHp: pHp, playerMp: availableMp, monsterHp: mHp });

  // 怪物身上的持续效果
  const monsterEffects: StatusEffect[] = [];
  // 怪物原始属性（用于 debuff 恢复）
  const monsterBaseDef = monster.def;
  const monsterBaseAtk = monster.atk;
  // 当前实际属性（受 debuff 影响）
  let monsterCurrentDef = monster.def;
  let monsterCurrentAtk = monster.atk;

  logs.push(`⚔️ 遭遇 ${monster.name}（${mHp} HP）！`);
  if (techBonus.atk || techBonus.def) {
    const parts: string[] = [];
    if (techBonus.atk) parts.push(`攻击+${techBonus.atk}`);
    if (techBonus.def) parts.push(`防御+${techBonus.def}`);
    if (techBonus.speed) parts.push(`速度+${techBonus.speed}`);
    logs.push(`📖 功法加成：${parts.join(' ')}`);
  }

  // 先手：speed 高的先攻
  const playerFirst = buffedPlayer.speed > monster.speed
    || (buffedPlayer.speed === monster.speed && Math.random() > 0.5);

  if (playerFirst) {
    logs.push(`你的脚力更快，获得先手！`);
  } else {
    logs.push(`${monster.name} 先发制人！`);
  }

  let round = 0;
  const MAX_ROUNDS = 30;

  while (pHp > 0 && mHp > 0 && round < MAX_ROUNDS) {
    round++;
    logs.push(`── 第 ${round} 回合 ──`);

    // 构造当前怪物状态（应用 debuff）
    const currentMonster = {
      ...monster,
      hp: mHp,
      def: monsterCurrentDef,
      atk: monsterCurrentAtk,
    };

    const attackOrder = playerFirst
      ? [{ isPlayer: true }, { isPlayer: false }]
      : [{ isPlayer: false }, { isPlayer: true }];

    for (const turn of attackOrder) {
      if (pHp <= 0 || mHp <= 0) break;

      if (turn.isPlayer) {
        // 玩家行动：尝试使用技能
        let usedSkill = false;

        if (skill && tryUseSkill(skill, skillState, availableMp, availableStamina)) {
          // 使用技能
          availableMp -= skill.mpCost;
          availableStamina -= skill.staminaCost;
          skillState.totalMpUsed += skill.mpCost;
          skillState.totalStaminaUsed += skill.staminaCost;
          skillState.useCount++;
          skillState.cooldownLeft = skill.cooldown;

          const { totalDamage, log: hitLogs } = calcSkillDamage(
            { ...buffedPlayer, name: '你' },
            { ...currentMonster, name: monster.name },
            skill,
            aptitudeBonus,
            mHp,
          );

          mHp -= totalDamage;
          if (skill.hitCount > 1) {
            logs.push(`⚔️ 你使出【${techniqueName}·${skill.name}】，连斩 ${skill.hitCount} 次，造成 ${totalDamage} 点伤害！（灵力-${skill.mpCost}）`);
            logs.push(...hitLogs);
          } else {
            logs.push(`⚔️ 你使出【${techniqueName}·${skill.name}】，造成 ${totalDamage} 点伤害！（灵力-${skill.mpCost}）`);
          }

          // 处理附加效果
          if (skill.effect && mHp > 0) {
            const eff = skill.effect;
            if (eff.type === 'heal_self') {
              const healAmt = Math.min(eff.value, buffedPlayer.maxHp - pHp);
              pHp += healAmt;
              if (healAmt > 0) {
                logs.push(`💚 ${skill.name} 恢复 ${healAmt} 点生命！`);
              }
            } else {
              // dot / debuff_def / debuff_atk → 施加到怪物
              monsterEffects.push({
                type: eff.type,
                value: eff.value,
                remainingRounds: eff.duration,
                sourceName: skill.name,
              });
              if (eff.type === 'debuff_def') {
                monsterCurrentDef = Math.max(0, monsterCurrentDef - eff.value);
                logs.push(`🛡️ ${monster.name} 防御降低 ${eff.value}！（持续 ${eff.duration} 回合）`);
              } else if (eff.type === 'debuff_atk') {
                monsterCurrentAtk = Math.max(0, monsterCurrentAtk - eff.value);
                logs.push(`⚡ ${monster.name} 攻击降低 ${eff.value}！（持续 ${eff.duration} 回合）`);
              } else if (eff.type === 'dot') {
                logs.push(`🔥 ${monster.name} 被附加灼烧！每回合 ${eff.value} 点伤害（持续 ${eff.duration} 回合）`);
              }
            }
          }

          usedSkill = true;
        }

        if (!usedSkill) {
          // 普通攻击
          const result = calcDamage(
            { ...buffedPlayer, name: '你' },
            { ...currentMonster, name: monster.name },
          );
          mHp -= result.damage;
          logs.push(...result.log);
        }
      } else {
        // 怪物行动：普通攻击
        const result = calcDamage(
          { ...currentMonster, name: monster.name },
          { ...buffedPlayer, hp: pHp, name: '你' },
        );
        pHp -= result.damage;
        logs.push(...result.log);
      }
    }

    // 回合结束：处理持续效果
    for (let i = monsterEffects.length - 1; i >= 0; i--) {
      const eff = monsterEffects[i];
      if (eff.type === 'dot' && mHp > 0) {
        mHp -= eff.value;
        logs.push(`🔥 ${monster.name} 受到灼烧伤害 ${eff.value} 点！`);
      }

      eff.remainingRounds--;
      if (eff.remainingRounds <= 0) {
        // debuff 到期恢复
        if (eff.type === 'debuff_def') {
          monsterCurrentDef = Math.min(monsterBaseDef, monsterCurrentDef + eff.value);
        } else if (eff.type === 'debuff_atk') {
          monsterCurrentAtk = Math.min(monsterBaseAtk, monsterCurrentAtk + eff.value);
        }
        monsterEffects.splice(i, 1);
      }
    }

    // 冷却递减
    if (skillState.cooldownLeft > 0) {
      skillState.cooldownLeft--;
    }

    // 回合结束快照
    snapshots.push({ round, playerHp: Math.max(0, pHp), playerMp: availableMp, monsterHp: Math.max(0, mHp) });
  }

  if (round >= MAX_ROUNDS && pHp > 0 && mHp > 0) {
    logs.push(`战斗超时，双方脱战。`);
    return {
      winner: 'draw', playerHpLeft: pHp, logs, expGained: 0, goldGained: 0,
      mpUsed: skillState.totalMpUsed, skillUseCount: skillState.useCount,
      snapshots, monsterMaxHp: monster.hp, playerMaxHp: buffedPlayer.maxHp, playerMaxMp: player.mp,
    };
  }

  const playerWon = pHp > 0;

  if (playerWon) {
    logs.push(`🎉 你击败了 ${monster.name}！`);
    logs.push(`获得 ${monster.expReward} 修为，${monster.goldReward} 灵石。`);
    if (skillState.useCount > 0) {
      logs.push(`📖 本场使用技能 ${skillState.useCount} 次，消耗灵力 ${skillState.totalMpUsed} 点。`);
    }
  } else {
    logs.push(`💀 你被 ${monster.name} 击败了…`);
    logs.push(`身受重伤，健康值大幅下降。`);
  }

  return {
    winner: playerWon ? 'player' : 'monster',
    playerHpLeft: Math.max(0, pHp),
    logs,
    expGained: playerWon ? monster.expReward : 0,
    goldGained: playerWon ? monster.goldReward : 0,
    mpUsed: skillState.totalMpUsed,
    skillUseCount: skillState.useCount,
    snapshots,
    monsterMaxHp: monster.hp,
    playerMaxHp: buffedPlayer.maxHp,
    playerMaxMp: player.mp,
  };
}
