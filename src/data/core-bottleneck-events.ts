// ============================================================
// data/core-bottleneck-events.ts — 瓶颈灵光一闪探索事件（T0064）
// 这些事件在探索时以低权重触发，为玩家提供解锁瓶颈的机会
// ============================================================

import type { GameEvent } from '../game/types';
import {
  resolveRealmBottleneckByExplore,
  addExploreProgressToBottleneck,
  hasLockedRealmBottleneck,
  hasLockedBottleneck,
  getFirstLockedRealmBottleneck,
} from '../game/bottleneck';

export const CORE_BOTTLENECK_EVENTS: GameEvent[] = [
  // ── 黎明顿悟（探索/好事）──
  // 条件：存在未解锁的境界瓶颈
  // 效果：立即解除境界瓶颈
  {
    id: 'core:bottle_dawn_insight',
    category: 'explore',
    tone: 'good',
    name: '黎明顿悟',
    weight: 5,
    condition: (p) => hasLockedRealmBottleneck(p),
    effect: (p) => {
      const result = resolveRealmBottleneckByExplore(p);
      return result ? result.player : p;
    },
    message: (p) => {
      const ab = getFirstLockedRealmBottleneck(p);
      if (!ab) return '💡 黎明时分，心境豁然开朗，道路清晰！';
      return `💡 黎明时分，在晨曦中静思，灵感乍现——瓶颈豁然开朗！突破契机已至！`;
    },
    once: false,
    cooldown: 30,
  },

  // ── 古碑感悟（探索/好事）──
  // 条件：存在未解锁的境界瓶颈 + 境界 >= 3
  // 效果：解除境界瓶颈 + 修为 +500
  {
    id: 'core:bottle_ancient_stele',
    category: 'explore',
    tone: 'good',
    name: '古碑感悟',
    weight: 3,
    condition: (p) => hasLockedRealmBottleneck(p) && p.realmIndex >= 3,
    effect: (p) => {
      const result = resolveRealmBottleneckByExplore(p);
      let p2 = result ? result.player : p;
      p2 = { ...p2, exp: p2.exp + 500 };
      return p2;
    },
    message: () => '🗿 探索中发现一块古老碑刻，前人留下的道韵感悟涌入心田！瓶颈消融，修为 +500！',
    once: false,
    cooldown: 50,
  },

  // ── 灵息低语（探索/中性）──
  // 条件：存在任何未解锁的瓶颈
  // 效果：给积累进度 +15（不直接解锁）
  {
    id: 'core:bottle_spirit_whisper',
    category: 'explore',
    tone: 'neutral',
    name: '灵息低语',
    weight: 8,
    condition: (p) => hasLockedBottleneck(p),
    effect: (p) => addExploreProgressToBottleneck(p, 15),
    message: () => '🌬️ 山间灵气流动，隐约传来天地道韵的低语，心中瓶颈似有松动……（积累进度 +15）',
    once: false,
    cooldown: 10,
  },

  // ── 梦中显化（日常/好事）──
  // 条件：存在未解锁的境界瓶颈 + 心情 >= 70
  // 效果：立即解除境界瓶颈
  {
    id: 'core:bottle_dream_vision',
    category: 'daily',
    tone: 'good',
    name: '梦中显化',
    weight: 4,
    condition: (p) => hasLockedRealmBottleneck(p) && p.mood >= 70,
    effect: (p) => {
      const result = resolveRealmBottleneckByExplore(p);
      return result ? result.player : p;
    },
    message: () => '🌙 夜间闭关修炼，梦中大道显化，前路豁然开朗——境界瓶颈已解除，突破之机已至！',
    once: false,
    cooldown: 40,
  },
];
