// ============================================================
// dlc/cp-04-honghuang/endgame.ts — 洪荒终局内容定义（#104）
// ============================================================

import type { PrimordialEndgameDef } from '../../../game/types';

const baseRequirement = {
  realmIndex: 15,
  minExp: 520000000,
  requiredItems: [{ itemId: 'cp-04:primordial_jade', count: 3 }],
  description: '混元圆满，修为达到终局门槛，并持有洪荒玉髓 ×3',
};

export const CP04_PRIMORDIAL_ENDGAMES: PrimordialEndgameDef[] = [
  {
    id: 'cp-04:endgame_righteous_sage',
    name: '以德合道',
    description: '以无量功德承载天道，证得洪荒圣位。',
    route: 'righteous',
    requirement: { ...baseRequirement, condition: p => (p.karma ?? 0) >= 30 },
    boss: {
      id: 'cp-04:boss_heaven_will_righteous', name: '天道意志', emoji: '🌌', realmIndex: 15,
      hp: 15000000, atk: 620000, def: 420000, speed: 1280, moveSpeed: 1000,
      critRate: 22, critResist: 42, critDmgMultiplier: 2.1, expReward: 8000000, goldReward: 1200000,
      element: 'thunder', regionTags: ['primordial', 'final'],
    },
    rewards: { title: '洪荒圣人', legacyMultiplierBonus: 0.05, items: [{ itemId: 'cp-04:chaos_breath', count: 3 }] },
    endingTitle: '正道成圣',
    endingText: '你以德行补全天道缺漏，诸天万族俯首称圣。自此一念花开，一念众生安宁。',
  },
  {
    id: 'cp-04:endgame_evil_demon',
    name: '逆天成魔',
    description: '斩碎天道锁链，以魔心重铸洪荒秩序。',
    route: 'evil',
    requirement: { ...baseRequirement, condition: p => (p.karma ?? 0) <= -30 },
    boss: {
      id: 'cp-04:boss_heaven_chain', name: '天道锁链', emoji: '⛓️', realmIndex: 15,
      hp: 13500000, atk: 700000, def: 360000, speed: 1320, moveSpeed: 1080,
      critRate: 28, critResist: 36, critDmgMultiplier: 2.3, expReward: 8200000, goldReward: 1250000,
      element: 'metal', regionTags: ['primordial', 'final'],
    },
    rewards: { title: '混沌魔主', legacyMultiplierBonus: 0.05, items: [{ itemId: 'cp-04:chaos_breath', count: 3 }] },
    endingTitle: '逆天成魔',
    endingText: '你踏碎天道枷锁，以魔焰照彻混沌。旧秩序崩塌，洪荒从此以你的意志为劫。',
  },
  {
    id: 'cp-04:endgame_transcendent',
    name: '超脱轮回',
    description: '不争圣魔，只取一线遁去之一，跳出因果轮回。',
    route: 'transcendent',
    requirement: { ...baseRequirement, condition: p => (p.karma ?? 0) > -30 && (p.karma ?? 0) < 30 },
    boss: {
      id: 'cp-04:boss_cycle_shadow', name: '轮回终影', emoji: '♾️', realmIndex: 15,
      hp: 14200000, atk: 650000, def: 390000, speed: 1400, moveSpeed: 1200,
      critRate: 24, critResist: 40, critDmgMultiplier: 2.2, expReward: 8100000, goldReward: 1220000,
      element: 'water', regionTags: ['primordial', 'final'],
    },
    rewards: { title: '轮回超脱者', legacyMultiplierBonus: 0.05, items: [{ itemId: 'cp-04:chaos_breath', count: 3 }] },
    endingTitle: '超脱轮回',
    endingText: '你斩断善恶与因果，不入圣位，不堕魔道。三千大道之外，自有一处逍遥。',
  },
];
