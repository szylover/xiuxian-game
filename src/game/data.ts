// ============================================================
// data.ts — 游戏数据表（境界 / 妖兽 / 丹药 / 常量）
// 所有游戏数值集中管理，逻辑层通过数据表驱动行为
// ============================================================

// ── 类型定义 ──
export interface Realm {
  name: string;
  index: number;
  expReq: number;
  lifespanBonus: number;
  hpBase: number;
  mpBase: number;
  atkBase: number;
  defBase: number;
  speedBase: number;
  mentalBase: number;
}

export interface ActionCost {
  stamina: number;
  time: number;
}

export interface Monster {
  name: string;
  realmIndex: number;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  moveSpeed: number;
  critRate: number;
  critResist: number;
  expReward: number;
  goldReward: number;
}

export interface PillEffect {
  hp?: number;
  mp?: number;
  stamina?: number;
  exp?: number;
  mood?: number;
  health?: number;
}

export interface Pill {
  id: string;
  name: string;
  effect: PillEffect;
  desc: string;
}

// ── 境界表 ──
// index 对应 realmIndex，属性值为该境界的基础数值
export const REALMS: Realm[] = [
  { name: '凡人',   index: 0,  expReq: 0,      lifespanBonus: 0,     hpBase: 100,  mpBase: 30,   atkBase: 8,   defBase: 3,   speedBase: 8,   mentalBase: 20  },
  { name: '炼气',   index: 1,  expReq: 100,    lifespanBonus: 50,    hpBase: 200,  mpBase: 60,   atkBase: 15,  defBase: 8,   speedBase: 12,  mentalBase: 40  },
  { name: '筑基',   index: 2,  expReq: 500,    lifespanBonus: 100,   hpBase: 500,  mpBase: 150,  atkBase: 35,  defBase: 20,  speedBase: 18,  mentalBase: 80  },
  { name: '金丹',   index: 3,  expReq: 2000,   lifespanBonus: 200,   hpBase: 1200, mpBase: 400,  atkBase: 80,  defBase: 45,  speedBase: 25,  mentalBase: 150 },
  { name: '元婴',   index: 4,  expReq: 8000,   lifespanBonus: 500,   hpBase: 3000, mpBase: 1000, atkBase: 180, defBase: 100, speedBase: 35,  mentalBase: 300 },
  { name: '化神',   index: 5,  expReq: 30000,  lifespanBonus: 1000,  hpBase: 7000, mpBase: 2500, atkBase: 400, defBase: 220, speedBase: 50,  mentalBase: 600 },
  { name: '渡劫',   index: 6,  expReq: 100000, lifespanBonus: 2000,  hpBase: 15000,mpBase: 5000, atkBase: 900, defBase: 500, speedBase: 70,  mentalBase: 1200},
  { name: '大乘',   index: 7,  expReq: 500000, lifespanBonus: 5000,  hpBase: 35000,mpBase: 12000,atkBase: 2000,defBase: 1100,speedBase: 100, mentalBase: 2500},
];

// ── 操作消耗 & 时间推进 ──
export const ACTION_COSTS: Record<string, ActionCost> = {
  cultivate: { stamina: 10, time: 0.1 },
  explore:   { stamina: 15, time: 0.05 },
  combat:    { stamina: 20, time: 0.02 },
  alchemy:   { stamina: 10, time: 0.05 },
  rest:      { stamina: 0,  time: 0.01 },
};

// ── 妖兽表（按境界分级）──
export const MONSTERS: Monster[] = [
  { name: '野狼',     realmIndex: 0, hp: 80,   atk: 7,   def: 2,  speed: 10, moveSpeed: 8,  critRate: 3,  critResist: 0, expReward: 15,  goldReward: 5   },
  { name: '毒蛇',     realmIndex: 0, hp: 60,   atk: 10,  def: 1,  speed: 12, moveSpeed: 12, critRate: 8,  critResist: 0, expReward: 18,  goldReward: 8   },
  { name: '铁背熊',   realmIndex: 1, hp: 250,  atk: 18,  def: 12, speed: 8,  moveSpeed: 5,  critRate: 5,  critResist: 2, expReward: 40,  goldReward: 15  },
  { name: '赤焰蟒',   realmIndex: 1, hp: 200,  atk: 22,  def: 8,  speed: 14, moveSpeed: 10, critRate: 10, critResist: 0, expReward: 50,  goldReward: 20  },
  { name: '玄冰蛛',   realmIndex: 2, hp: 600,  atk: 45,  def: 25, speed: 16, moveSpeed: 14, critRate: 12, critResist: 5, expReward: 120, goldReward: 50  },
  { name: '噬魂鹰',   realmIndex: 2, hp: 500,  atk: 55,  def: 18, speed: 22, moveSpeed: 20, critRate: 15, critResist: 3, expReward: 140, goldReward: 60  },
  { name: '地火蜥蜴', realmIndex: 3, hp: 1500, atk: 100, def: 55, speed: 20, moveSpeed: 12, critRate: 10, critResist: 8, expReward: 350, goldReward: 120 },
  { name: '银角蛟龙', realmIndex: 3, hp: 1800, atk: 120, def: 65, speed: 28, moveSpeed: 18, critRate: 18, critResist: 10,expReward: 500, goldReward: 200 },
  { name: '天煞虎',   realmIndex: 4, hp: 4000, atk: 250, def: 130,speed: 32, moveSpeed: 22, critRate: 15, critResist: 12,expReward: 1200,goldReward: 500 },
  { name: '夔牛',     realmIndex: 5, hp: 9000, atk: 550, def: 280,speed: 45, moveSpeed: 30, critRate: 20, critResist: 15,expReward: 4000,goldReward: 1500},
];

// ── 丹药表 ──
export const PILLS: Pill[] = [
  { id: 'hp_pill',      name: '回血丹',   effect: { hp: 50 },          desc: '恢复 50 HP' },
  { id: 'mp_pill',      name: '回灵丹',   effect: { mp: 30 },          desc: '恢复 30 MP' },
  { id: 'stamina_pill', name: '聚气丹',   effect: { stamina: 30 },     desc: '恢复 30 精力' },
  { id: 'exp_pill',     name: '筑基丹',   effect: { exp: 50 },         desc: '获得 50 修为' },
  { id: 'mood_pill',    name: '静心丹',   effect: { mood: 20 },        desc: '心情 +20' },
  { id: 'health_pill',  name: '养生丹',   effect: { health: 20 },      desc: '健康 +20' },
];

// ── 修炼基础经验 ──
export const BASE_CULTIVATE_EXP: number = 10;

// ── 突破成功率公式参数 ──
export const BREAKTHROUGH_BASE_RATE = 0.5; // 基础 50%
export const BREAKTHROUGH_COMP_BONUS = 0.003; // 每点悟性 +0.3%
export const BREAKTHROUGH_LUCK_BONUS = 0.002; // 每点幸运 +0.2%
export const BREAKTHROUGH_FAIL_EXP_LOSS = 0.1; // 失败损失 10% 修为

// ── 道号列表（随机取）──
export const RANDOM_NAMES: string[] = [
  '无名散修', '青云子', '玄灵', '紫霄', '太虚道人',
  '碧落', '沧海客', '明月仙', '孤鸿', '凌云',
  '幽兰', '寒霜', '落尘', '清风', '素心',
];
