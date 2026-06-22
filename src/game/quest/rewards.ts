// ============================================================
// quest/rewards.ts — 奖励发放
// ============================================================

import type { Player } from '../player';
import type { QuestReward } from '../types';
import { addItem } from '../inventory';
import { getItemDef } from '../registry';
import { ATTR_NAMES } from '../../data/texts/common';
import { changeKarma } from '../karma';
import { QUEST_TEXTS } from '../../data/texts/quest';

export function applyReward(player: Player, reward: QuestReward | undefined): { player: Player; logs: string[] } {
  if (!reward) return { player, logs: [] };
  let p = { ...player };
  const logs: string[] = [];

  if (reward.exp) {
    p.exp += reward.exp;
    logs.push(QUEST_TEXTS.rewardExp(reward.exp));
  }
  if (reward.gold) {
    p.gold += reward.gold;
    logs.push(QUEST_TEXTS.rewardGold(reward.gold));
  }
  if (reward.items) {
    for (const { itemId, count } of reward.items) {
      const { player: p2 } = addItem(p, itemId, count);
      p = p2;
      const def = getItemDef(itemId);
      logs.push(QUEST_TEXTS.rewardItem(def?.name ?? itemId, count));
    }
  }
  if (reward.statBonus) {
    for (const [key, value] of Object.entries(reward.statBonus)) {
      if (value && key in p) {
        (p as Record<string, unknown>)[key] = (p[key as keyof Player] as number) + value;
        const cnName = ATTR_NAMES[key as keyof typeof ATTR_NAMES] ?? key;
        logs.push(QUEST_TEXTS.rewardStat(cnName, value));
      }
    }
  }
  if (reward.karmaChange) {
    const result = changeKarma(p, reward.karmaChange, QUEST_TEXTS.karmaReason);
    p = result.player;
    logs.push(...result.logs);
  }

  return { player: p, logs };
}
