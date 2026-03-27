// ============================================================
// tribulation/run.ts — 渡劫主逻辑
// ============================================================

import type { Player } from '../player';
import { recalcStats } from '../player';
import { REALMS } from '../data';
import { getTribulationDef, getItemDef } from '../registry';
import { addItem } from '../inventory';
import { fightWave } from './wave-combat';

export interface TribulationResult {
  success: boolean;
  player: Player;
  logs: string[];
  wavesCleared: number;
  totalWaves: number;
}

export function runTribulation(player: Player): TribulationResult {
  const tribDef = getTribulationDef(player.realmIndex);
  if (!tribDef) return { success: false, player, logs: ['⚠️ 未找到天劫定义。'], wavesCleared: 0, totalWaves: 0 };

  const logs: string[] = [`⛈️ ${tribDef.name} 降临！${tribDef.description}`, `共 ${tribDef.waves.length} 波天劫，波间不可恢复！`];
  let currentHp = player.hp;
  let wavesCleared = 0;

  for (let i = 0; i < tribDef.waves.length; i++) {
    const wave = tribDef.waves[i];
    logs.push(`── 第 ${i + 1}/${tribDef.waves.length} 波：${wave.name} ──`);
    const result = fightWave(currentHp, player.atk, player.def, player.speed, player.critRate, wave);
    logs.push(...result.logs);

    if (!result.won) {
      logs.push(`💥 渡劫失败！${tribDef.failureDescription}`);
      let p = { ...player, hp: 1 };
      if (tribDef.failureType === 'realm_drop' && p.realmIndex > 0) {
        p.realmIndex -= 1; p = recalcStats(p); p.health = 0;
        logs.push(`📉 跌落至 ${REALMS[p.realmIndex].name}期，健康归零。`);
      } else if (tribDef.failureType === 'become_loose_immortal') {
        p.systems = { ...p.systems, breakthrough: { ...(p.systems.breakthrough as Record<string, unknown> ?? {}), isLooseImmortal: true } };
        logs.push(`🌫️ 沦为散仙，无法走正统突破路线。`);
      } else { logs.push(`💀 形神俱灭！`); }
      return { success: false, player: p, logs, wavesCleared, totalWaves: tribDef.waves.length };
    }
    currentHp = result.hpLeft;
    wavesCleared++;
  }

  // 成功
  logs.push(`🌟 渡劫成功！天劫散去，道行大增！`);
  let p = { ...player, hp: currentHp };
  p.realmIndex += 1;
  const newRealm = REALMS[p.realmIndex];
  p.lifespan += newRealm.lifespanBonus;
  p = recalcStats(p);
  p.hp = p.maxHp; p.mp = p.maxMp; p.stamina = p.maxStamina;
  p.mood = Math.min(100, p.mood + 30);
  p.exp += tribDef.rewards.bonusExp;
  logs.push(`📈 获得 ${tribDef.rewards.bonusExp} 修为奖励。`);

  for (const reward of tribDef.rewards.items) {
    const { player: p2, added } = addItem(p, reward.itemId, reward.count);
    p = p2;
    if (added > 0) { const def = getItemDef(reward.itemId); logs.push(`🎁 获得 ${def?.name ?? reward.itemId} ×${added}。`); }
  }

  const btSys = (p.systems.breakthrough ?? {}) as Record<string, unknown>;
  const passed = ((btSys.tribulationsPassed ?? []) as string[]).slice();
  passed.push(tribDef.id);
  p.systems = { ...p.systems, breakthrough: { ...btSys, tribulationsPassed: passed } };
  logs.push(`🎆 晋升 ${newRealm.name}期！寿限 +${newRealm.lifespanBonus}！`);

  return { success: true, player: p, logs, wavesCleared, totalWaves: tribDef.waves.length };
}
