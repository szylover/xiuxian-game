// ============================================================
// player.js — 玩家角色 & 属性系统
// A-1: 四类属性（基础/战斗/先天/资质）完整实现
// ============================================================

import { REALMS } from './data.js';

// ── 工具函数 ──
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 资质生成：分品级加权随机
// 1-20 废灵根(40%)  21-50 普通(30%)  51-80 良好(20%)  81-95 优秀(8%)  96-100 天灵根(2%)
function rollAptitude() {
  const roll = Math.random() * 100;
  if (roll < 40) return randInt(1, 20);
  if (roll < 70) return randInt(21, 50);
  if (roll < 90) return randInt(51, 80);
  if (roll < 98) return randInt(81, 95);
  return randInt(96, 100);
}

// ── 灵根品级评定 ──
export function getSpiritRootGrade(aptitudes) {
  const roots = [aptitudes.fire, aptitudes.water, aptitudes.thunder, aptitudes.wind, aptitudes.earth, aptitudes.wood];
  const avg = roots.reduce((s, v) => s + v, 0) / 6;

  // 单灵根检测：单属性 > 90 且其余 < 30
  const high = roots.filter(v => v > 90);
  const low = roots.filter(v => v < 30);
  if (high.length === 1 && low.length === 5) {
    return { grade: '单灵根', multiplier: 3.0, color: '#FFD700' };
  }

  if (avg > 85) return { grade: '天灵根', multiplier: 2.0, color: '#FFD700' };
  if (avg > 65) return { grade: '异灵根', multiplier: 1.5, color: '#9C27B0' };
  if (avg > 40) return { grade: '灵根',   multiplier: 1.0, color: '#4CAF50' };
  if (avg > 20) return { grade: '杂灵根', multiplier: 0.7, color: '#FF9800' };
  return { grade: '废灵根', multiplier: 0.4, color: '#9E9E9E' };
}

// ── 创建新玩家 ──
export function createPlayer(name = '无名散修') {
  const realm = REALMS[0];
  const aptitudes = {
    alchemy: rollAptitude(), smithing: rollAptitude(),
    fengshui: rollAptitude(), mining: rollAptitude(),
    blade: rollAptitude(), spear: rollAptitude(),
    sword: rollAptitude(), fist: rollAptitude(),
    palm: rollAptitude(), finger: rollAptitude(),
    fire: rollAptitude(), water: rollAptitude(),
    thunder: rollAptitude(), wind: rollAptitude(),
    earth: rollAptitude(), wood: rollAptitude(),
  };

  const maxStamina = 100 + realm.index * 10;

  return {
    name,
    realmIndex: 0,
    exp: 0,

    // ── 基础属性 ──
    age: 16,
    lifespan: 100,
    mood: 70,
    health: 100,
    stamina: maxStamina,
    maxStamina,
    hp: realm.hpBase,
    maxHp: realm.hpBase,
    mp: realm.mpBase,
    maxMp: realm.mpBase,
    mentalPower: realm.mentalBase,
    maxMentalPower: realm.mentalBase,

    // ── 战斗属性 ──
    atk: realm.atkBase,
    def: realm.defBase,
    speed: realm.speedBase,
    skillResist: 0,
    spellResist: 0,
    critRate: 5,
    critDmgMultiplier: 1.5,
    critResist: 0,
    moveSpeed: 10,

    // ── 先天属性（创建时随机）──
    luck: randInt(1, 100),
    comprehension: randInt(1, 100),
    charisma: randInt(1, 100),

    // ── 资质 ──
    aptitudes,

    // ── 资源 ──
    gold: 0,   // 灵石

    // ── 小说事件扩展 ──
    items: {},
    passives: {},
    systems: {},
    tracking: {
      killCount: 0,
      bossKillCount: 0,
      consecutiveRests: 0,
      consecutiveCultivates: 0,
      hasBeenBelow10Hp: false,
      defeatedHigherRealm: false,
    },
  };
}

// ── 根据境界刷新派生属性 ──
export function recalcStats(player) {
  const realm = REALMS[player.realmIndex];
  if (!realm) return player;

  const p = { ...player };
  p.maxStamina = 100 + realm.index * 10;
  p.maxHp = realm.hpBase;
  p.maxMp = realm.mpBase;
  p.maxMentalPower = realm.mentalBase;
  p.atk = realm.atkBase;
  p.def = realm.defBase;
  p.speed = realm.speedBase;

  // 确保当前值不超过上限
  p.hp = Math.min(p.hp, p.maxHp);
  p.mp = Math.min(p.mp, p.maxMp);
  p.stamina = Math.min(p.stamina, p.maxStamina);
  p.mentalPower = Math.min(p.mentalPower, p.maxMentalPower);

  return p;
}

// ── 获取境界信息 ──
export function getRealmInfo(player) {
  return REALMS[player.realmIndex] || REALMS[0];
}

// ── 获取下一个境界（如果有）──
export function getNextRealm(player) {
  return REALMS[player.realmIndex + 1] || null;
}
