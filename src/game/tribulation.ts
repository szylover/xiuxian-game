// ============================================================
// tribulation.ts — 渡劫系统（T0029）
// 多波次天劫连战，波间不回血，特殊效果
// ============================================================

import type { Player } from './player';
import { recalcStats } from './player';
import { REALMS } from './data';
import { getTribulationDef, getItemDef } from './registry';
import type { TribulationDef, TribulationWave } from './registry';
import { addItem } from './inventory';

// ── 渡劫结果 ──

export interface TribulationResult {
  success: boolean;
  player: Player;
  logs: string[];
  wavesCleared: number;
  totalWaves: number;
}

// ── 单波次战斗 ──

function fightWave(playerHp: number, playerAtk: number, playerDef: number, playerSpeed: number, playerCritRate: number, wave: TribulationWave): { won: boolean; hpLeft: number; logs: string[] } {
  const logs: string[] = [];
  let pHp = playerHp;
  let wHp = wave.hp;

  // debuff 追踪
  let defMult = 1;
  let atkMult = 1;
  let healBlocked = false;
  let dotDmg = 0;

  // 应用特殊效果
  if (wave.specialEffect) {
    const eff = wave.specialEffect;
    switch (eff.type) {
      case 'dot':
        dotDmg = eff.value;
        logs.push(`⚡ ${eff.description}`);
        break;
      case 'debuff_def':
        defMult = 1 - eff.value / 100;
        logs.push(`🛡️ ${eff.description}`);
        break;
      case 'debuff_atk':
        atkMult = 1 - eff.value / 100;
        logs.push(`🗡️ ${eff.description}`);
        break;
      case 'heal_block':
        healBlocked = true;
        logs.push(`🚫 ${eff.description}`);
        break;
    }
  }

  const effectiveAtk = Math.floor(playerAtk * atkMult);
  const effectiveDef = Math.floor(playerDef * defMult);

  const playerFirst = playerSpeed >= wave.speed;
  let round = 0;
  const MAX_ROUNDS = 50;

  while (pHp > 0 && wHp > 0 && round < MAX_ROUNDS) {
    round++;

    if (playerFirst) {
      // 玩家攻击
      const pDmg = Math.max(1, Math.floor(effectiveAtk * (0.85 + Math.random() * 0.3) - wave.def * 0.6));
      const isCrit = Math.random() * 100 < playerCritRate;
      const finalPDmg = isCrit ? Math.floor(pDmg * 1.5) : pDmg;
      wHp -= finalPDmg;
      if (wHp <= 0) break;

      // 天劫攻击
      const wDmg = Math.max(1, Math.floor(wave.atk * (0.85 + Math.random() * 0.3) - effectiveDef * 0.6));
      pHp -= wDmg;
    } else {
      const wDmg = Math.max(1, Math.floor(wave.atk * (0.85 + Math.random() * 0.3) - effectiveDef * 0.6));
      pHp -= wDmg;
      if (pHp <= 0) break;

      const pDmg = Math.max(1, Math.floor(effectiveAtk * (0.85 + Math.random() * 0.3) - wave.def * 0.6));
      const isCrit = Math.random() * 100 < playerCritRate;
      const finalPDmg = isCrit ? Math.floor(pDmg * 1.5) : pDmg;
      wHp -= finalPDmg;
    }

    // DOT 伤害
    if (dotDmg > 0 && pHp > 0) {
      pHp -= dotDmg;
    }
  }

  const won = pHp > 0 && wHp <= 0;
  if (won) {
    logs.push(`✅ 扛住了 ${wave.name}！（剩余体力 ${Math.max(0, pHp)}）`);
  } else {
    logs.push(`❌ 未能抵挡 ${wave.name}…`);
  }

  return { won, hpLeft: Math.max(0, pHp), logs };
}

// ── 渡劫主逻辑 ──

export function runTribulation(player: Player): TribulationResult {
  const tribDef = getTribulationDef(player.realmIndex);
  if (!tribDef) {
    return { success: false, player, logs: ['⚠️ 未找到天劫定义。'], wavesCleared: 0, totalWaves: 0 };
  }

  const logs: string[] = [];
  logs.push(`⛈️ ${tribDef.name} 降临！${tribDef.description}`);
  logs.push(`共 ${tribDef.waves.length} 波天劫，波间不可恢复！`);

  let currentHp = player.hp;
  let wavesCleared = 0;

  for (let i = 0; i < tribDef.waves.length; i++) {
    const wave = tribDef.waves[i];
    logs.push(`── 第 ${i + 1}/${tribDef.waves.length} 波：${wave.name} ──`);

    const result = fightWave(currentHp, player.atk, player.def, player.speed, player.critRate, wave);
    logs.push(...result.logs);

    if (!result.won) {
      // 渡劫失败
      logs.push(`💥 渡劫失败！${tribDef.failureDescription}`);

      let p = { ...player, hp: 1 };

      switch (tribDef.failureType) {
        case 'realm_drop':
          if (p.realmIndex > 0) {
            p.realmIndex -= 1;
            p = recalcStats(p);
            p.health = 0;
            logs.push(`📉 跌落至 ${REALMS[p.realmIndex].name}期，健康归零。`);
          }
          break;
        case 'become_loose_immortal':
          p.systems = { ...p.systems, breakthrough: { ...(p.systems.breakthrough as Record<string, unknown> ?? {}), isLooseImmortal: true } };
          logs.push(`🌫️ 沦为散仙，无法走正统突破路线。`);
          break;
        case 'death':
          logs.push(`💀 形神俱灭！`);
          break;
      }

      return { success: false, player: p, logs, wavesCleared, totalWaves: tribDef.waves.length };
    }

    currentHp = result.hpLeft;
    wavesCleared++;
  }

  // 渡劫成功
  logs.push(`🌟 渡劫成功！天劫散去，道行大增！`);

  let p = { ...player, hp: currentHp };

  // 境界提升
  p.realmIndex += 1;
  const newRealm = REALMS[p.realmIndex];
  p.lifespan += newRealm.lifespanBonus;
  p = recalcStats(p);
  p.hp = p.maxHp;
  p.mp = p.maxMp;
  p.stamina = p.maxStamina;
  p.mood = Math.min(100, p.mood + 30);

  // 奖励
  p.exp += tribDef.rewards.bonusExp;
  logs.push(`📈 获得 ${tribDef.rewards.bonusExp} 修为奖励。`);

  for (const reward of tribDef.rewards.items) {
    const { player: p2, added } = addItem(p, reward.itemId, reward.count);
    p = p2;
    if (added > 0) {
      const def = getItemDef(reward.itemId);
      logs.push(`🎁 获得 ${def?.name ?? reward.itemId} ×${added}。`);
    }
  }

  // 记录通过
  const btSys = (p.systems.breakthrough ?? {}) as Record<string, unknown>;
  const passed = ((btSys.tribulationsPassed ?? []) as string[]).slice();
  passed.push(tribDef.id);
  p.systems = { ...p.systems, breakthrough: { ...btSys, tribulationsPassed: passed } };

  logs.push(`🎆 晋升 ${newRealm.name}期！寿限 +${newRealm.lifespanBonus}！`);

  return { success: true, player: p, logs, wavesCleared, totalWaves: tribDef.waves.length };
}
