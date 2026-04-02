// ============================================================
// combat/run.ts — 战斗主循环（回合制）
// ============================================================

import type { Player } from '../player';
import type { MonsterDef, TechniqueDef } from '../types';
import type { SkillState, StatusEffect, CombatResult, RoundSnapshot } from './types';
import { calcDamage, tryUseSkill, calcSkillDamage } from './damage';
import { getActiveTechniqueBonus, getActiveSkillInfo, calcAptitudeBonus } from '../technique';
import {
  getDivineArtsState, calcDivineArtDamage, tryUseDivineArt,
  ELEMENT_EMOJI, ELEMENT_CN,
} from '../divine-arts';
import { getDivineArtDef } from '../registry/queries';
import { getEquipDef } from '../registry';
import { COMBAT_TEXTS } from '../../data/texts/combat';

export function runCombat(player: Player, monster: MonsterDef): CombatResult {
  const logs: string[] = [];
  const snapshots: RoundSnapshot[] = [];

  // 获取主动技能信息（需在 buffedPlayer 之前，因为 techType 匹配要用）
  const skillInfo = getActiveSkillInfo(player);
  const skill = skillInfo?.skill ?? null;
  const techniqueName = skillInfo?.def.name ?? '';
  const aptitudeBonus = skillInfo ? calcAptitudeBonus(player, skillInfo.def) : 1.0;

  // 叠加功法加成
  const techBonus = getActiveTechniqueBonus(player);
  let extraAtk = 0;

  // T0059 体修武器 physiqueBonusRate 加成
  const weaponId = player.equipped?.weapon;
  const weaponDef = weaponId ? getEquipDef(weaponId) : null;
  const activeTechDef: TechniqueDef | null = skillInfo?.def ?? null;
  if (weaponDef?.physiqueBonusRate && weaponDef.techType && activeTechDef) {
    if (weaponDef.techType.includes(activeTechDef.type)) {
      extraAtk = Math.floor(player.physique * weaponDef.physiqueBonusRate);
    }
  }

  const buffedPlayer = {
    ...player,
    atk: player.atk + (techBonus.atk ?? 0) + extraAtk,
    def: player.def + (techBonus.def ?? 0),
    speed: player.speed + (techBonus.speed ?? 0),
    critRate: player.critRate + (techBonus.critRate ?? 0),
    critDmgMultiplier: player.critDmgMultiplier + (techBonus.critDmgMultiplier ?? 0),
    hp: player.hp,
    maxHp: player.maxHp + (techBonus.hp ?? 0),
    physiqueDmgReduce: player.physiqueDmgReduce,
  };

  // 技能状态
  const skillState: SkillState = {
    cooldownLeft: 0,
    totalMpUsed: 0,
    totalStaminaUsed: 0,
    useCount: 0,
  };

  // ── 神通初始化 ──
  const divineArtsState = getDivineArtsState(player);
  const activeArt = divineArtsState.activeArtId
    ? getDivineArtDef(divineArtsState.activeArtId)
    : null;
  const divineSkillState: SkillState = {
    cooldownLeft: 0,
    totalMpUsed: 0,
    totalStaminaUsed: 0,
    useCount: 0,
  };
  const playerEffects: StatusEffect[] = []; // 玩家身上的持续效果（如护盾）

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

  logs.push(COMBAT_TEXTS.encounter(monster.name, mHp));
  if (techBonus.atk || techBonus.def) {
    const parts: string[] = [];
    if (techBonus.atk) parts.push(`攻击+${techBonus.atk}`);
    if (techBonus.def) parts.push(`防御+${techBonus.def}`);
    if (techBonus.speed) parts.push(`速度+${techBonus.speed}`);
    logs.push(COMBAT_TEXTS.techBonus(parts));
  }
  if (activeArt) {
    logs.push(COMBAT_TEXTS.activateArt(activeArt.name, ELEMENT_EMOJI[activeArt.element], ELEMENT_CN[activeArt.element]));
  }
  if (extraAtk > 0) {
    logs.push(COMBAT_TEXTS.physiqueBoost(weaponDef!.physiqueBonusRate ?? 0, extraAtk));
  }

  // 先手：speed 高的先攻
  const playerFirst = buffedPlayer.speed > monster.speed
    || (buffedPlayer.speed === monster.speed && Math.random() > 0.5);

  if (playerFirst) {
    logs.push(COMBAT_TEXTS.playerFirst);
  } else {
    logs.push(COMBAT_TEXTS.monsterFirst(monster.name));
  }

  let round = 0;
  const MAX_ROUNDS = 30;

  while (pHp > 0 && mHp > 0 && round < MAX_ROUNDS) {
    round++;
    logs.push(COMBAT_TEXTS.roundHeader(round));

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
        // ── 玩家行动 ──

        // 1. 神通独立触发（在功法技能之前判定）
        if (activeArt && tryUseDivineArt(activeArt, divineSkillState, availableMp)) {
          availableMp -= activeArt.mpCost;
          divineSkillState.totalMpUsed += activeArt.mpCost;
          divineSkillState.useCount++;
          divineSkillState.cooldownLeft = activeArt.cooldown;

          const { totalDamage, logs: artLogs } = calcDivineArtDamage(
            buffedPlayer,
            activeArt,
            currentMonster,
            mHp,
          );
          mHp -= totalDamage;

          if (activeArt.hitCount > 1) {
            logs.push(COMBAT_TEXTS.artMultiHit(
              activeArt.name, ELEMENT_EMOJI[activeArt.element], ELEMENT_CN[activeArt.element],
              activeArt.hitCount, totalDamage, activeArt.mpCost,
            ));
          } else {
            logs.push(COMBAT_TEXTS.artSingleHit(
              activeArt.name, ELEMENT_EMOJI[activeArt.element], ELEMENT_CN[activeArt.element],
              totalDamage, activeArt.mpCost,
            ));
          }
          logs.push(...artLogs);

          // 处理神通附加效果
          for (const eff of activeArt.effects ?? []) {
            if (mHp <= 0 && eff.type !== 'shield_self' && eff.type !== 'heal_self') continue;

            if (eff.type === 'heal_self') {
              const healAmt = Math.min(eff.value, buffedPlayer.maxHp - pHp);
              pHp += healAmt;
              if (healAmt > 0) {
                logs.push(COMBAT_TEXTS.artHeal(activeArt.name, healAmt));
              }
            } else if (eff.type === 'shield_self') {
              playerEffects.push({
                type: 'shield_self',
                value: eff.value,
                remainingRounds: eff.duration,
                sourceName: activeArt.name,
              });
              logs.push(COMBAT_TEXTS.artShield(activeArt.name, eff.value, eff.duration));
            } else if (eff.type === 'debuff_def') {
              monsterEffects.push({
                type: 'debuff_def',
                value: eff.value,
                remainingRounds: eff.duration,
                sourceName: activeArt.name,
              });
              monsterCurrentDef = Math.max(0, monsterCurrentDef - eff.value);
              logs.push(COMBAT_TEXTS.debuffDef(monster.name, eff.value, eff.duration));
            } else if (eff.type === 'debuff_atk') {
              monsterEffects.push({
                type: 'debuff_atk',
                value: eff.value,
                remainingRounds: eff.duration,
                sourceName: activeArt.name,
              });
              monsterCurrentAtk = Math.max(0, monsterCurrentAtk - eff.value);
              logs.push(COMBAT_TEXTS.debuffAtk(monster.name, eff.value, eff.duration));
            } else if (eff.type === 'dot') {
              monsterEffects.push({
                type: 'dot',
                value: eff.value,
                remainingRounds: eff.duration,
                sourceName: activeArt.name,
              });
              logs.push(COMBAT_TEXTS.artDot(monster.name, eff.value, eff.duration));
            }
          }
        }

        if (mHp <= 0) break;

        // 2. 功法主动技能（独立判定，与神通不互斥）
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
            logs.push(COMBAT_TEXTS.skillMultiHit(techniqueName, skill.name, skill.hitCount, totalDamage, skill.mpCost));
            logs.push(...hitLogs);
          } else {
            logs.push(COMBAT_TEXTS.skillSingleHit(techniqueName, skill.name, totalDamage, skill.mpCost));
          }

          // 处理附加效果
          if (skill.effect && mHp > 0) {
            const eff = skill.effect;
            if (eff.type === 'heal_self') {
              const healAmt = Math.min(eff.value, buffedPlayer.maxHp - pHp);
              pHp += healAmt;
              if (healAmt > 0) {
                logs.push(COMBAT_TEXTS.skillHeal(skill.name, healAmt));
              }
            } else {
              // dot / debuff_def / debuff_atk → 施加到怪物
              const effType = eff.type;
              if (effType === 'dot' || effType === 'debuff_def' || effType === 'debuff_atk') {
                monsterEffects.push({
                  type: effType,
                  value: eff.value,
                  remainingRounds: eff.duration,
                  sourceName: skill.name,
                });
              }
              if (eff.type === 'debuff_def') {
                monsterCurrentDef = Math.max(0, monsterCurrentDef - eff.value);
                logs.push(COMBAT_TEXTS.skillDebuffDef(monster.name, eff.value, eff.duration));
              } else if (eff.type === 'debuff_atk') {
                monsterCurrentAtk = Math.max(0, monsterCurrentAtk - eff.value);
                logs.push(COMBAT_TEXTS.skillDebuffAtk(monster.name, eff.value, eff.duration));
              } else if (eff.type === 'dot') {
                logs.push(COMBAT_TEXTS.skillDot(monster.name, eff.value, eff.duration));
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
        // ── 怪物行动：普通攻击 ──
        const result = calcDamage(
          { ...currentMonster, name: monster.name },
          { ...buffedPlayer, hp: pHp, name: '你' },
        );

        // 先输出攻击日志
        logs.push(...result.log);

        // 护盾减伤
        let actualDamage = result.damage;
        if (actualDamage > 0) {
          for (const eff of playerEffects) {
            if (eff.type === 'shield_self') {
              const shieldAmt = Math.min(eff.value, actualDamage);
              if (shieldAmt > 0) {
                actualDamage = Math.max(0, actualDamage - shieldAmt);
                logs.push(COMBAT_TEXTS.shieldBlock(eff.sourceName, shieldAmt));
              }
            }
          }
        }

        pHp -= actualDamage;
      }
    }

    // 回合结束：处理怪物持续效果
    for (let i = monsterEffects.length - 1; i >= 0; i--) {
      const eff = monsterEffects[i];
      if (eff.type === 'dot' && mHp > 0) {
        mHp -= eff.value;
        logs.push(COMBAT_TEXTS.dotTick(monster.name, eff.value));
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

    // 回合结束：处理玩家持续效果（护盾倒计时）
    for (let i = playerEffects.length - 1; i >= 0; i--) {
      const eff = playerEffects[i];
      eff.remainingRounds--;
      if (eff.remainingRounds <= 0) {
        logs.push(COMBAT_TEXTS.shieldExpire(eff.sourceName));
        playerEffects.splice(i, 1);
      }
    }

    // 冷却递减
    if (skillState.cooldownLeft > 0) {
      skillState.cooldownLeft--;
    }
    if (divineSkillState.cooldownLeft > 0) {
      divineSkillState.cooldownLeft--;
    }

    // 回合结束快照
    snapshots.push({ round, playerHp: Math.max(0, pHp), playerMp: availableMp, monsterHp: Math.max(0, mHp) });
  }

  if (round >= MAX_ROUNDS && pHp > 0 && mHp > 0) {
    // 超时也给体修修为（打了这么久肯定挨了不少打）
    const drawDmgTaken = Math.max(0, buffedPlayer.hp - pHp);
    const drawDmgRatio = drawDmgTaken / Math.max(1, buffedPlayer.maxHp);
    let drawBodyExp = 5 + Math.floor(drawDmgRatio * 30) + monster.realmIndex * 5;
    if (weaponDef?.techType?.some(t => t === 'fist' || t === 'finger')) drawBodyExp *= 2;
    logs.push(COMBAT_TEXTS.timeout);
    if (drawBodyExp > 0) logs.push(COMBAT_TEXTS.bodyExpGain(drawBodyExp));
    return {
      winner: 'draw', playerHpLeft: pHp, logs, expGained: 0, goldGained: 0,
      mpUsed: skillState.totalMpUsed + divineSkillState.totalMpUsed,
      skillUseCount: skillState.useCount,
      snapshots, monsterMaxHp: monster.hp, playerMaxHp: buffedPlayer.maxHp, playerMaxMp: player.mp,
      bodyExpGained: drawBodyExp,
    };
  }

  const playerWon = pHp > 0;

  // T0062 体修修为战斗结算（所有战斗都给，挨打越多越强）
  const damageTaken = Math.max(0, buffedPlayer.hp - pHp);
  const damageRatio = damageTaken / Math.max(1, buffedPlayer.maxHp);
  const baseBodyExp = 5;                                  // 只要打了就有
  const damageBonus = Math.floor(damageRatio * 30);       // 挨打越多越多（最高30）
  const monsterBonus = monster.realmIndex * 5;            // 怪物等级越高越多
  let bodyExpGained = baseBodyExp + damageBonus + monsterBonus;
  // 体修武器加倍
  if (weaponDef?.techType) {
    const hasFistOrFinger = weaponDef.techType.some(t => t === 'fist' || t === 'finger');
    if (hasFistOrFinger) bodyExpGained *= 2;
  }

  if (playerWon) {
    logs.push(COMBAT_TEXTS.victory(monster.name));
    logs.push(COMBAT_TEXTS.victoryRewards(monster.expReward, monster.goldReward));
    if (skillState.useCount > 0) {
      logs.push(COMBAT_TEXTS.skillUsage(skillState.useCount, skillState.totalMpUsed));
    }
    if (divineSkillState.useCount > 0) {
      logs.push(COMBAT_TEXTS.artUsage(divineSkillState.useCount, divineSkillState.totalMpUsed));
    }
    if (bodyExpGained > 0) {
      logs.push(COMBAT_TEXTS.bodyExpGain(bodyExpGained));
    }
  } else {
    logs.push(COMBAT_TEXTS.defeat(monster.name));
    logs.push(COMBAT_TEXTS.defeatHp);
  }

  return {
    winner: playerWon ? 'player' : 'monster',
    playerHpLeft: Math.max(0, pHp),
    logs,
    expGained: playerWon ? monster.expReward : 0,
    goldGained: playerWon ? monster.goldReward : 0,
    mpUsed: skillState.totalMpUsed + divineSkillState.totalMpUsed,
    skillUseCount: skillState.useCount,
    snapshots,
    monsterMaxHp: monster.hp,
    playerMaxHp: buffedPlayer.maxHp,
    playerMaxMp: player.mp,
    bodyExpGained,
  };
}
