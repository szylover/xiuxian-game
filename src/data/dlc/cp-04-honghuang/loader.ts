// ============================================================
// dlc/cp-04-honghuang/loader.ts — 洪荒天地内容包加载入口
// ============================================================

import { registerDLC } from '../../../game/registry';
import type { MonsterDef } from '../../../game/registry';
import type { RegionDef, NpcDef } from '../../../game/types';
import { loadEventsFromJson } from '../../../game/event-loader';
import { loadItemsFromJson } from '../../../game/item-loader';
import { loadQuestsFromJson } from '../../../game/quest-loader';
import type { JsonEvent } from '../../../game/event-loader';
import type { JsonItem } from '../../../game/item-loader';
import type { JsonQuestChain } from '../../../game/quest-loader';

import { CP04_DLC_META } from './manifest';
import { CP04_REALMS } from './realms';
import { CP04_BREAKTHROUGH_REQS, CP04_TRIBULATIONS } from './breakthrough';
import { CP04_ASCENSIONS } from './ascensions';

export async function registerCP04(): Promise<void> {
  const [
    { default: eventsJson },
    { default: itemsJson },
    { default: monstersJson },
    { default: regionsJson },
    { default: npcsJson },
    { default: questsJson },
  ] = await Promise.all([
    import('./events.json'),
    import('./items.json'),
    import('./monsters.json'),
    import('./regions.json'),
    import('./npcs.json'),
    import('./quests.json'),
  ]);

  const pack = loadEventsFromJson(eventsJson as unknown as JsonEvent[], CP04_DLC_META);

  registerDLC({
    ...pack,
    items: loadItemsFromJson(itemsJson as unknown as JsonItem[]),
    monsters: monstersJson as unknown as MonsterDef[],
    regions: regionsJson as unknown as RegionDef[],
    npcs: npcsJson as unknown as NpcDef[],
    questChains: loadQuestsFromJson(questsJson as unknown as JsonQuestChain[]),
    realms: CP04_REALMS,
    breakthroughReqs: CP04_BREAKTHROUGH_REQS,
    tribulations: CP04_TRIBULATIONS,
    ascensions: CP04_ASCENSIONS,
  });
}
