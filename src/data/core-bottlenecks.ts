// ============================================================
// data/core-bottlenecks.ts — 核心境界瓶颈定义（T0064）
// 4 条核心境界瓶颈，通过 registerDLC() 注册到全局表
// ============================================================

import type { BottleneckDef } from '../game/bottleneck/types';

export const CORE_BOTTLENECKS: BottleneckDef[] = [
  // ── 炼气大圆满瓶颈 ──
  {
    id: 'core:bottle_realm_1',
    type: 'realm',
    blockedAtRealmIndex: 1,
    name: '炼气大圆满瓶颈',
    description: '炼气期圆满，却感道路阻塞，有一道无形屏障横亘眼前。需一番机缘方能叩响筑基之门。',
    unlockMethods: [
      {
        id: 'combat',
        type: 'combat',
        description: '在生死战斗中感悟大道',
        condition: 'same_or_higher_realm',
      },
      {
        id: 'explore_insight',
        type: 'explore',
        description: '探索时偶获灵光一闪',
      },
      {
        id: 'discuss',
        type: 'discuss',
        description: '与筑基期以上修士论道（T0025 预留）',
        condition: 'npc_realm_min_2',
      },
    ],
    progressPerAction: {
      combat: 3,
      explore: 2,
      item: 50,
    },
    unlockProgressThreshold: 150,
  },

  // ── 金丹大圆满瓶颈（原表realmIndex=3）──
  {
    id: 'core:bottle_realm_3',
    type: 'realm',
    blockedAtRealmIndex: 3,
    name: '金丹大圆满瓶颈',
    description: '金丹圆满，元婴之道隐隐可见却如隔纱。身处金丹巅峰，却感大道止步，需历经生死或机缘方能迈入元婴。',
    unlockMethods: [
      {
        id: 'combat',
        type: 'combat',
        description: '在生死战斗中感悟元婴之道',
        condition: 'same_or_higher_realm',
      },
      {
        id: 'explore_insight',
        type: 'explore',
        description: '探索古迹偶获前人感悟',
      },
      {
        id: 'discuss',
        type: 'discuss',
        description: '与元婴期以上修士论道（T0025 预留）',
        condition: 'npc_realm_min_4',
      },
    ],
    progressPerAction: {
      combat: 3,
      explore: 2,
      item: 50,
    },
    unlockProgressThreshold: 150,
  },

  // ── 化神大圆满瓶颈（原表realmIndex=5）──
  {
    id: 'core:bottle_realm_5',
    type: 'realm',
    blockedAtRealmIndex: 5,
    name: '化神大圆满瓶颈',
    description: '化神期巅峰，渡劫之道需经生死大感悟。道途茫茫，唯有以命相搏、机缘相遇方能突破此关。',
    unlockMethods: [
      {
        id: 'combat',
        type: 'combat',
        description: '与高境界妖兽生死一搏，在极限中感悟',
        condition: 'higher_realm',
      },
      {
        id: 'explore_insight',
        type: 'explore',
        description: '探索秘境，偶遇前辈遗迹',
      },
      {
        id: 'quest',
        type: 'quest',
        description: '完成特殊试炼任务（T0057 预留）',
        condition: 'special_trial_quest',
      },
    ],
    progressPerAction: {
      combat: 3,
      explore: 2,
      item: 50,
    },
    unlockProgressThreshold: 250,
  },

  // ── 大乘大圆满瓶颈（原表realmIndex=7）──
  {
    id: 'core:bottle_realm_7',
    type: 'realm',
    blockedAtRealmIndex: 7,
    name: '大乘大圆满瓶颈',
    description: '大乘巅峰，飞升之道遥遥可见。然天道有常，飞升机缘需以道论道，悟透天地玄机方可得之。',
    unlockMethods: [
      {
        id: 'combat',
        type: 'combat',
        description: '与天地之威抗衡，在极限战斗中感悟',
        condition: 'same_or_higher_realm',
      },
      {
        id: 'discuss',
        type: 'discuss',
        description: '拜访化神期以上老祖论道（T0025 预留）',
        condition: 'npc_realm_min_7',
      },
      {
        id: 'explore_insight',
        type: 'explore',
        description: '寻访仙迹，悟道天书',
      },
    ],
    progressPerAction: {
      combat: 3,
      explore: 2,
      item: 50,
    },
    unlockProgressThreshold: 400,
  },
];
