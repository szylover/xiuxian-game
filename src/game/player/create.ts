// ============================================================
// player/create.ts — 新建玩家角色
// ============================================================

import { REALMS } from '../data';
import type { Player, Aptitudes } from './types';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 资质加权随机：1-20(40%) 21-50(30%) 51-80(20%) 81-95(8%) 96-100(2%)
function rollAptitude(): number {
  const roll = Math.random() * 100;
  if (roll < 40) return randInt(1, 20);
  if (roll < 70) return randInt(21, 50);
  if (roll < 90) return randInt(51, 80);
  if (roll < 98) return randInt(81, 95);
  return randInt(96, 100);
}

export function createPlayer(name: string = '无名散修'): Player {
  const realm = REALMS[0];
  const aptitudes: Aptitudes = {
    alchemy: rollAptitude(), smithing: rollAptitude(),
    fengshui: rollAptitude(), mining: rollAptitude(),
    blade: rollAptitude(), spear: rollAptitude(),
    sword: rollAptitude(), fist: rollAptitude(),
    palm: rollAptitude(), finger: rollAptitude(),
    fire: rollAptitude(), water: rollAptitude(),
    thunder: rollAptitude(), wind: rollAptitude(),
    earth: rollAptitude(), wood: rollAptitude(),
  };

  return {
    name, avatar: 'default', realmIndex: 0, exp: 0,
    age: 16, lifespan: 100, mood: 70, health: 100,
    stamina: 100, maxStamina: 100,
    hp: realm.hpBase, maxHp: realm.hpBase,
    mp: realm.mpBase, maxMp: realm.mpBase,
    mentalPower: realm.mentalBase, maxMentalPower: realm.mentalBase,
    atk: realm.atkBase, def: realm.defBase, speed: realm.speedBase,
    skillResist: 0, spellResist: 0,
    critRate: 5, critDmgMultiplier: 1.5, critResist: 0, moveSpeed: 10,
    luck: randInt(1, 100), comprehension: randInt(1, 100), charisma: randInt(1, 100),
    aptitudes,
    gold: 0, inventory: [], inventoryCapacity: 20,
    equipped: { weapon: null, helmet: null, armor: null, boots: null, accessory1: null, accessory2: null },
    techniques: [], activeTechniqueId: null,
    items: {}, passives: {}, systems: {},
    tracking: { killCount: 0, bossKillCount: 0, consecutiveRests: 0, consecutiveCultivates: 0, hasBeenBelow10Hp: false, defeatedHigherRealm: false },
  };
}
