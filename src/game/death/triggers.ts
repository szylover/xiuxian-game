// ============================================================
// death/triggers.ts — 死亡触发检查 + 护命道具判定
// ============================================================

import type { Player } from '../player';
import { hasItem, removeItem } from '../inventory';
import { getAllDeathTriggers, getAllLifeSavers } from '../registry';
import type { DeathSeverity, LifeSaverDef } from '../types';
import { DEATH_TEXTS } from '../../data/texts/death';
import { getDeathSystemState, setDeathSystemState } from './state';
import type { DeathContext, DeathCheckResult } from './state';

// ── 检查死亡触发 ──

export function checkDeathTriggers(player: Player, context: DeathContext): DeathCheckResult {
  const triggers = getAllDeathTriggers()
    .filter(t => {
      // 按来源过滤
      if (t.id === 'core:death_combat_boss') {
        return context.source === 'combat' && context.data?.isBoss === true;
      }
      if (t.id === 'core:death_combat') {
        return context.source === 'combat' && context.data?.isBoss !== true;
      }
      if (t.id === 'core:death_lifespan') return context.source === 'time';
      if (t.id === 'core:death_tribulation') return context.source === 'tribulation';
      if (t.id === 'core:death_alchemy_fail') return context.source === 'alchemy';
      // 通用触发条件不限来源
      return true;
    })
    .sort((a, b) => a.priority - b.priority);

  for (const trigger of triggers) {
    if (!trigger.check(player)) continue;

    // 触发了死亡条件
    if (trigger.canBeBlocked) {
      const saverResult = checkLifeSavers(player, trigger.severity);
      if (saverResult.blocked && saverResult.saver) {
        // 护命道具拦截
        let p = saverResult.player;
        const ds = getDeathSystemState(p);
        ds.lifeSaverTriggered = [...ds.lifeSaverTriggered, saverResult.saver.id];
        p = setDeathSystemState(p, ds);

        return {
          triggered: true,
          trigger,
          blocked: true,
          blockedBy: saverResult.saver,
          player: p,
          logs: [DEATH_TEXTS.lifeSaverBlock(saverResult.saver.name)],
        };
      }
    }

    return {
      triggered: true,
      trigger,
      blocked: false,
      blockedBy: null,
      player,
      logs: [],
    };
  }

  return {
    triggered: false,
    trigger: null,
    blocked: false,
    blockedBy: null,
    player,
    logs: [],
  };
}

// ── 检查护命道具 ──

interface LifeSaverCheckResult {
  blocked: boolean;
  saver: LifeSaverDef | null;
  player: Player;
}

function checkLifeSavers(player: Player, severity: DeathSeverity): LifeSaverCheckResult {
  const savers = getAllLifeSavers()
    .filter(s => s.blockSeverities.includes(severity))
    .sort((a, b) => a.priority - b.priority);

  for (const saver of savers) {
    if (!hasItem(player, saver.itemId)) continue;
    if (saver.condition && !saver.condition(player)) continue;

    let p = { ...player };
    if (saver.consumeOnUse) {
      p = removeItem(p, saver.itemId, 1);
    }
    if (saver.afterEffect) {
      p = saver.afterEffect(p);
    }

    return { blocked: true, saver, player: p };
  }

  return { blocked: false, saver: null, player };
}
