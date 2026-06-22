// ============================================================
// dlc/cp-03-xiandao/loader.ts — 仙道飞升内容包加载入口
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

import { CP03_DLC_META } from './manifest';
import { CP03_REALMS } from './realms';
import { CP03_BREAKTHROUGH_REQS, CP03_TRIBULATIONS } from './breakthrough';
import { CP03_ASCENSIONS } from './ascensions';

export async function registerCP03(): Promise<void> {
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

  const pack = loadEventsFromJson(eventsJson as unknown as JsonEvent[], CP03_DLC_META);

  registerDLC({
    ...pack,
    items: loadItemsFromJson(itemsJson as unknown as JsonItem[]),
    techniques: techniquesJson as unknown as TechniqueDef[],
    monsters: monstersJson as unknown as MonsterDef[],
    regions: regionsJson as unknown as RegionDef[],
    npcs: npcsJson as unknown as NpcDef[],
    questChains: loadQuestsFromJson(questsJson as unknown as JsonQuestChain[]),
    realms: CP03_REALMS,
    breakthroughReqs: CP03_BREAKTHROUGH_REQS,
    tribulations: CP03_TRIBULATIONS,
    ascensions: CP03_ASCENSIONS,
  });
}
