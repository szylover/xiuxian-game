// ============================================================
// tribulation/run.ts — 渡劫主逻辑
// ============================================================

import type { Player } from '../player';
import { recalcStats } from '../player';
import { REALMS } from '../data';
import { getTribulationDef, getItemDef } from '../registry';
import { addItem } from '../inventory';
import { fightWave } from './wave-combat';
import { TRIBULATION_TEXTS } from '../../data/texts/breakthrough';

export interface TribulationResult {
  success: boolean;
  player: Player;
  logs: string[];
  wavesCleared: number;
  totalWaves: number;
}

export function runTribulation(player: Player): TribulationResult {
  const tribDef = getTribulationDef(player.realmIndex);
  if (!tribDef) return { success: false, player, logs: [TRIBULATION_TEXTS.notFound], wavesCleared: 0, totalWaves: 0 };

  const startMsgs = TRIBULATION_TEXTS.start(tribDef.name, tribDef.description, tribDef.waves.length);
  const logs: string[] = [...startMsgs];
  let currentHp = player.hp;
  let wavesCleared = 0;

  for (let i = 0; i < tribDef.waves.length; i++) {
    const wave = tribDef.waves[i];
    logs.push(TRIBULATION_TEXTS.waveHeader(i + 1, tribDef.waves.length, wave.name));
    const result = fightWave(currentHp, player.atk, player.def, player.speed, player.critRate, wave);
    logs.push(...result.logs);

    if (!result.won) {
      logs.push(TRIBULATION_TEXTS.failed(tribDef.failureDescription));
      let p = { ...player, hp: 1 };
      if (tribDef.failureType === 'realm_drop' && p.realmIndex > 0) {
        p.realmIndex -= 1; p = recalcStats(p); p.health = 0;
        logs.push(TRIBULATION_TEXTS.realmDrop(REALMS[p.realmIndex].name));
      } else if (tribDef.failureType === 'become_loose_immortal') {
        p.systems = { ...p.systems, breakthrough: { ...(p.systems.breakthrough as Record<string, unknown> ?? {}), isLooseImmortal: true } };
        logs.push(TRIBULATION_TEXTS.looseImmortal);
      } else { logs.push(TRIBULATION_TEXTS.annihilated); }
      return { success: false, player: p, logs, wavesCleared, totalWaves: tribDef.waves.length };
    }
    currentHp = result.hpLeft;
    wavesCleared++;
  }

  // 成功
  logs.push(TRIBULATION_TEXTS.success);
  let p = { ...player, hp: currentHp };
  p.realmIndex += 1;
  const newRealm = REALMS[p.realmIndex];
  p.lifespan += newRealm.lifespanBonus;
  p = recalcStats(p);
  p.hp = p.maxHp; p.mp = p.maxMp; p.stamina = p.maxStamina;
  p.mood = Math.min(100, p.mood + 30);
  p.exp += tribDef.rewards.bonusExp;
  logs.push(TRIBULATION_TEXTS.bonusExp(tribDef.rewards.bonusExp));

  for (const reward of tribDef.rewards.items) {
    const { player: p2, added } = addItem(p, reward.itemId, reward.count);
    p = p2;
    if (added > 0) {
      const def = getItemDef(reward.itemId);
      logs.push(TRIBULATION_TEXTS.rewardItem(def?.name ?? reward.itemId, added));
    }
  }

  const btSys = (p.systems.breakthrough ?? {}) as Record<string, unknown>;
  const passed = ((btSys.tribulationsPassed ?? []) as string[]).slice();
  passed.push(tribDef.id);
  p.systems = { ...p.systems, breakthrough: { ...btSys, tribulationsPassed: passed } };
  logs.push(TRIBULATION_TEXTS.advance(newRealm.name, newRealm.lifespanBonus));

  return { success: true, player: p, logs, wavesCleared, totalWaves: tribDef.waves.length };
}
