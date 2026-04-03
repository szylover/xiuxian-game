// ============================================================
// quest/QuestRewardPreview.tsx — 奖励预览组件
// ============================================================

import type { QuestReward } from '../../../game/types';
import { getItemDef } from '../../../game/registry';
import { QUEST_TEXTS } from '../../../data/texts/quest';
import { ATTR_NAMES } from '../../../data/texts/common';

interface QuestRewardPreviewProps {
  reward: QuestReward;
}

export default function QuestRewardPreview({ reward }: QuestRewardPreviewProps) {
  const parts: string[] = [];

  if (reward.exp) parts.push(QUEST_TEXTS.rewardExp(reward.exp));
  if (reward.gold) parts.push(QUEST_TEXTS.rewardGold(reward.gold));
  if (reward.items) {
    for (const { itemId, count } of reward.items) {
      const def = getItemDef(itemId);
      parts.push(QUEST_TEXTS.rewardItem(def?.name ?? itemId, count));
    }
  }
  if (reward.statBonus) {
    for (const [key, value] of Object.entries(reward.statBonus)) {
      if (value) {
        const cnName = ATTR_NAMES[key as keyof typeof ATTR_NAMES] ?? key;
        parts.push(QUEST_TEXTS.rewardStat(cnName, value));
      }
    }
  }

  if (parts.length === 0) return null;

  return (
    <div className="quest-reward-preview">
      <span className="quest-reward-label">{QUEST_TEXTS.rewardLabel}：</span>
      <span className="quest-reward-items">{parts.join(' · ')}</span>
    </div>
  );
}
