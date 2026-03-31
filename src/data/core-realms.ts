// ============================================================
// data/core-realms.ts — 气修境界定义（T0058）
// 8 阶核心境界通过 registerDLC() 注册。
// 调数值只改此文件，不需要动系统代码。
// DLC 可追加更高境界（如散仙→金仙），index 从 8 开始。
// ============================================================

import type { RealmDef } from '../game/types';

export const CORE_REALMS: RealmDef[] = [
  { id: 'core:realm_mortal',        name: '凡人', index: 0, expReq: 0,      lifespanBonus: 0,    hpBase: 100,   mpBase: 30,    atkBase: 8,    defBase: 3,    speedBase: 8,   mentalBase: 20   },
  { id: 'core:realm_qi_refining',   name: '炼气', index: 1, expReq: 100,    lifespanBonus: 50,   hpBase: 200,   mpBase: 60,    atkBase: 15,   defBase: 8,    speedBase: 12,  mentalBase: 40   },
  { id: 'core:realm_foundation',    name: '筑基', index: 2, expReq: 500,    lifespanBonus: 100,  hpBase: 500,   mpBase: 150,   atkBase: 35,   defBase: 20,   speedBase: 18,  mentalBase: 80   },
  { id: 'core:realm_golden_core',   name: '金丹', index: 3, expReq: 2000,   lifespanBonus: 200,  hpBase: 1200,  mpBase: 400,   atkBase: 80,   defBase: 45,   speedBase: 25,  mentalBase: 150  },
  { id: 'core:realm_nascent_soul',  name: '元婴', index: 4, expReq: 8000,   lifespanBonus: 500,  hpBase: 3000,  mpBase: 1000,  atkBase: 180,  defBase: 100,  speedBase: 35,  mentalBase: 300  },
  { id: 'core:realm_deity_trans',   name: '化神', index: 5, expReq: 30000,  lifespanBonus: 1000, hpBase: 7000,  mpBase: 2500,  atkBase: 400,  defBase: 220,  speedBase: 50,  mentalBase: 600  },
  { id: 'core:realm_tribulation',   name: '渡劫', index: 6, expReq: 100000, lifespanBonus: 2000, hpBase: 15000, mpBase: 5000,  atkBase: 900,  defBase: 500,  speedBase: 70,  mentalBase: 1200 },
  { id: 'core:realm_mahayana',      name: '大乘', index: 7, expReq: 500000, lifespanBonus: 5000, hpBase: 35000, mpBase: 12000, atkBase: 2000, defBase: 1100, speedBase: 100, mentalBase: 2500 },
];
