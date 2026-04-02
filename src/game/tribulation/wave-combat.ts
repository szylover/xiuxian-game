// ============================================================
// tribulation/wave-combat.ts — 单波天劫战斗
// ============================================================

import type { TribulationWave } from '../registry';
import { TRIBULATION_TEXTS } from '../../data/texts/breakthrough';

export interface WaveResult { won: boolean; hpLeft: number; logs: string[]; }

export function fightWave(playerHp: number, playerAtk: number, playerDef: number, playerSpeed: number, playerCritRate: number, wave: TribulationWave): WaveResult {
  const logs: string[] = [];
  let pHp = playerHp;
  let wHp = wave.hp;
  let defMult = 1, atkMult = 1, dotDmg = 0;

  if (wave.specialEffect) {
    const eff = wave.specialEffect;
    if (eff.type === 'dot') { dotDmg = eff.value; logs.push(`⚡ ${eff.description}`); }
    else if (eff.type === 'debuff_def') { defMult = 1 - eff.value / 100; logs.push(`🛡️ ${eff.description}`); }
    else if (eff.type === 'debuff_atk') { atkMult = 1 - eff.value / 100; logs.push(`🗡️ ${eff.description}`); }
    else if (eff.type === 'heal_block') { logs.push(`🚫 ${eff.description}`); }
  }

  const effAtk = Math.floor(playerAtk * atkMult);
  const effDef = Math.floor(playerDef * defMult);
  const playerFirst = playerSpeed >= wave.speed;
  let round = 0;

  while (pHp > 0 && wHp > 0 && round < 50) {
    round++;
    const pDmg = () => {
      const base = Math.max(1, Math.floor(effAtk * (0.85 + Math.random() * 0.3) - wave.def * 0.6));
      return Math.random() * 100 < playerCritRate ? Math.floor(base * 1.5) : base;
    };
    const wDmg = () => Math.max(1, Math.floor(wave.atk * (0.85 + Math.random() * 0.3) - effDef * 0.6));

    if (playerFirst) {
      wHp -= pDmg(); if (wHp <= 0) break;
      pHp -= wDmg();
    } else {
      pHp -= wDmg(); if (pHp <= 0) break;
      wHp -= pDmg();
    }
    if (dotDmg > 0 && pHp > 0) pHp -= dotDmg;
  }

  const won = pHp > 0 && wHp <= 0;
  logs.push(won ? TRIBULATION_TEXTS.waveWin(wave.name, Math.max(0, pHp)) : TRIBULATION_TEXTS.waveLose(wave.name));
  return { won, hpLeft: Math.max(0, pHp), logs };
}
