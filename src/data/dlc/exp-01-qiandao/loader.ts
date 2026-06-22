// ============================================================
// dlc/exp-01-qiandao/loader.ts — 签到模拟器扩展包加载入口
// ============================================================

import { registerDLC } from '../../../game/registry';
import type { MonsterDef, TechniqueDef } from '../../../game/registry';
import type { RegionDef, NpcDef } from '../../../game/types';
import { loadEventsFromJson } from '../../../game/event-loader';
import { loadItemsFromJson } from '../../../game/item-loader';
import { loadQuestsFromJson } from '../../../game/quest-loader';
import type { JsonEvent } from '../../../game/event-loader';
import type { JsonItem } from '../../../game/item-loader';
import type { JsonQuestChain } from '../../../game/quest-loader';

import { EXP01_DLC_META } from './manifest';

export async function registerEXP01(): Promise<void> {
  const [
    { default: eventsJson },
    { default: itemsJson },
    { default: techniquesJson },
    { default: monstersJson },
    { default: regionsJson },
    { default: npcsJson },
    { default: questsJson },
  ] = await Promise.all([
    import('./events.json'),
    import('./items.json'),
    import('./techniques.json'),
    import('./monsters.json'),
    import('./regions.json'),
    import('./npcs.json'),
    import('./quests.json'),
  ]);

  const pack = loadEventsFromJson(eventsJson as unknown as JsonEvent[], EXP01_DLC_META);

  registerDLC({
    ...pack,
    items: loadItemsFromJson(itemsJson as unknown as JsonItem[]),
    techniques: techniquesJson as unknown as TechniqueDef[],
    monsters: monstersJson as unknown as MonsterDef[],
    regions: regionsJson as unknown as RegionDef[],
    npcs: npcsJson as unknown as NpcDef[],
    questChains: loadQuestsFromJson(questsJson as unknown as JsonQuestChain[]),
  });
}
