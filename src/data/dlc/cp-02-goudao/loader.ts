// ============================================================
// dlc/cp-02-goudao/loader.ts — 苟道求真内容包加载入口
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

import { CP02_DLC_META } from './manifest';

export async function registerCP02(): Promise<void> {
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

  const pack = loadEventsFromJson(eventsJson as JsonEvent[], CP02_DLC_META);

  registerDLC({
    ...pack,
    items: loadItemsFromJson(itemsJson as JsonItem[]),
    techniques: techniquesJson as TechniqueDef[],
    monsters: monstersJson as MonsterDef[],
    regions: regionsJson as RegionDef[],
    npcs: npcsJson as NpcDef[],
    questChains: loadQuestsFromJson(questsJson as JsonQuestChain[]),
  });
}

