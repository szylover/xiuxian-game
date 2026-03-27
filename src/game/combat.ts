// ============================================================
// combat.ts — 战斗系统 v2
// A-3: 伤害公式（减防→暴击→抗性→闪避），先手规则
// ============================================================

import type { Player } from './player';
import type { Monster } from './data';
import { getActiveTechniqueBonus } from './technique';

// ── 战斗参与者（统一字段）──
interface Combatant {
  name: string;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  moveSpeed: number;
  critRate: number;
  critDmgMultiplier?: number;
  critResist: number;
}

interface DamageResult {
  damage: number;
  isCrit: boolean;
  isDodge: boolean;
  log: string[];
}

export interface CombatResult {
  winner: 'player' | 'monster' | 'draw';
  playerHpLeft: number;
  logs: string[];
  expGained: number;
  goldGained: number;
}

// ── 随机浮点 ──
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ── 单次攻击计算 ──
function calcDamage(attacker: Combatant, defender: Combatant): DamageResult {
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

// ── 战斗主循环（回合制）──
// 返回 { winner, playerHpLeft, logs, expGained, goldGained }
export function runCombat(player: Player, monster: Monster): CombatResult {
  const logs: string[] = [];

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

  let pHp = buffedPlayer.hp;
  let mHp = monster.hp;

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

    const attackOrder = playerFirst
      ? [{ atk: buffedPlayer, def: { ...monster, hp: mHp }, isPlayer: true },
         { atk: monster, def: { ...buffedPlayer, hp: pHp }, isPlayer: false }]
      : [{ atk: monster, def: { ...buffedPlayer, hp: pHp }, isPlayer: false },
         { atk: buffedPlayer, def: { ...monster, hp: mHp }, isPlayer: true }];

    for (const turn of attackOrder) {
      if (pHp <= 0 || mHp <= 0) break;

      const result = calcDamage(
        { ...turn.atk, name: turn.isPlayer ? '你' : monster.name },
        { ...turn.def, name: turn.isPlayer ? monster.name : '你' }
      );

      if (turn.isPlayer) {
        mHp -= result.damage;
      } else {
        pHp -= result.damage;
      }
      logs.push(...result.log);
    }
  }

  if (round >= MAX_ROUNDS && pHp > 0 && mHp > 0) {
    logs.push(`战斗超时，双方脱战。`);
    return { winner: 'draw', playerHpLeft: pHp, logs, expGained: 0, goldGained: 0 };
  }

  const playerWon = pHp > 0;

  if (playerWon) {
    logs.push(`🎉 你击败了 ${monster.name}！`);
    logs.push(`获得 ${monster.expReward} 修为，${monster.goldReward} 灵石。`);
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
  };
}
