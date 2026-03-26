// ============================================================
// combat.js — 战斗系统 v2
// A-3: 伤害公式（减防→暴击→抗性→闪避），先手规则
// ============================================================

// ── 随机浮点 ──
function rand(min, max) {
  return min + Math.random() * (max - min);
}

// ── 单次攻击计算 ──
function calcDamage(attacker, defender) {
  const log = [];

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
export function runCombat(player, monster) {
  const logs = [];
  // 复制 HP 避免直接修改原对象
  let pHp = player.hp;
  let mHp = monster.hp;

  logs.push(`⚔️ 遭遇 ${monster.name}（${mHp} HP）！`);

  // 先手：speed 高的先攻
  const playerFirst = player.speed > monster.speed
    || (player.speed === monster.speed && Math.random() > 0.5);

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
      ? [{ atk: player, def: { ...monster, hp: mHp }, isPlayer: true },
         { atk: monster, def: { ...player, hp: pHp }, isPlayer: false }]
      : [{ atk: monster, def: { ...player, hp: pHp }, isPlayer: false },
         { atk: player, def: { ...monster, hp: mHp }, isPlayer: true }];

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
