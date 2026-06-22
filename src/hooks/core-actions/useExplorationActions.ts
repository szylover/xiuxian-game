import { useCallback } from 'react';
import type { Player } from '../../game/player';
import { ACTION_COSTS } from '../../game/data';
import { triggerExploreEvent } from '../../game/events';
import { addItem } from '../../game/inventory';
import { getItemDef } from '../../game/registry';
import { getCurrentRegion } from '../../game/map';
import { ensureBottleneckState, tryEpiphanyUnlock } from '../../game/bottleneck';
import { getNpcsInRegion, meetNpc as meetNpcFn } from '../../game/npc';
import { tickQuestObjectives, checkQuestDiscovery } from '../../game/quest';
import type { RegionDef } from '../../game/types';
import type { CoreActionDeps, LogQueue } from './types';
import type { LogCategory } from '../useGameLog';
import { COMBAT_TEXTS } from '../../data/texts/combat';
import { EXPLORE_TEXTS } from '../../data/texts/explore';
import { playSound } from '../../game/audio';

// ── T0022: 区域掉落表辅助函数 ──
const DEFAULT_EXPLORE_LOOT: [string, number][] = [
  ['core:iron_ore', 0.15],
  ['core:spirit_stone_shard', 0.20],
  ['core:herb_lingzhi', 0.08],
  ['core:herb_snow_lotus', 0.03],
  ['core:jade_slip', 0.05],
  ['core:hp_pill', 0.10],
  ['core:spirit_water', 0.06],
  ['core:map_fragment', 0.02],
];

function getRegionLootTable(region: RegionDef | undefined): [string, number][] {
  if (region?.lootTable?.length) {
    return region.lootTable.map(e => [e.itemId, e.chance]);
  }
  return DEFAULT_EXPLORE_LOOT;
}

export function useExplorationActions(
  deps: Pick<CoreActionDeps, 'addLog' | 'setPlayer' | 'advanceTime' | 'canAct'>,
  pendingRef: React.MutableRefObject<LogQueue>,
  flushLogs: () => void,
) {
  const { addLog, setPlayer, advanceTime, canAct } = deps;

  const queueLog = (msg: string, cat: LogCategory = 'default') => {
    pendingRef.current.msgs.push(msg);
    pendingRef.current.categories.push(cat);
  };

  const queueLogs = (msgs: string[], cat: LogCategory = 'default') => {
    for (const m of msgs) {
      pendingRef.current.msgs.push(m);
      pendingRef.current.categories.push(cat);
    }
  };

  const explore = useCallback(() => {
    if (!canAct('explore')) {
      addLog(COMBAT_TEXTS.noStamina, 'system');
      return;
    }
    pendingRef.current = { msgs: [], categories: [] };
    let gainedItem = false;
    setPlayer(prev => {
      if (!prev) return prev;
      let p: Player = { ...prev };
      const cost = ACTION_COSTS.explore;
      p.stamina -= cost.stamina;
      p.tracking = { ...p.tracking, consecutiveRests: 0, consecutiveCultivates: 0 };

      const { player: updated, message } = triggerExploreEvent(p);
      p = { ...updated };

      pendingRef.current = { msgs: [], categories: [] };
      let exploreMsg = message;

      // T0064: 探索时尝试顿悟解锁瓶颈
      p = ensureBottleneckState(p);
      const currentRegion = getCurrentRegion(p);
      const locationTag = currentRegion?.id ?? '';
      const epiphanyResult = tryEpiphanyUnlock(p, locationTag);
      if (epiphanyResult.triggered && epiphanyResult.log) {
        p = epiphanyResult.player;
        exploreMsg += ` ✨${epiphanyResult.log}`;
      }

      // T0022: 优先使用区域专属掉落表，若区域无掉落表则使用默认表
      const exploreLoot = getRegionLootTable(currentRegion);
      for (const [itemId, chance] of exploreLoot) {
        if (Math.random() < chance) {
          const { player: p2, added } = addItem(p, itemId, 1);
          if (added > 0) {
            p = p2;
            gainedItem = true;
            const def = getItemDef(itemId);
            exploreMsg += EXPLORE_TEXTS.lootGained(def?.name ?? itemId);
          }
          break;
        }
      }

      // T0025: 探索时随机邂逅 NPC（20% 概率）
      if (Math.random() < 0.2) {
        const npcsHere = getNpcsInRegion(p);
        if (npcsHere.length > 0) {
          const npc = npcsHere[Math.floor(Math.random() * npcsHere.length)];
          const meetResult = meetNpcFn(p, npc.id);
          p = meetResult.player;
          exploreMsg += ` ${meetResult.message}`;
        }
      }

      // T0057: 探索后推进任务目标
      const questExplore = tickQuestObjectives(p, { type: 'explore' });
      p = questExplore.player;
      queueLogs(questExplore.logs, 'system');
      // Also check item_change (explore may drop items)
      const questItemChange = tickQuestObjectives(p, { type: 'item_change' });
      p = questItemChange.player;
      queueLogs(questItemChange.logs, 'system');

      // T0067: 探索时检查可发现的任务
      const questDiscover = checkQuestDiscovery(p, { type: 'explore' });
      p = questDiscover.player;
      queueLogs(questDiscover.logs, 'system');

      queueLog(exploreMsg, exploreMsg.includes('【奇遇】') ? 'adventure' : 'explore');

      p = advanceTime(p, 'explore');
      return p;
    });
    if (gainedItem) {
      playSound('itemGain');
    }
    setTimeout(flushLogs, 0);
  }, [canAct, advanceTime, addLog, setPlayer]);

  return { explore };
}
