// ============================================================
// player/create.ts — 新建玩家角色 (T0056: 初始随机属性系统)
// ============================================================

import { REALMS } from '../data';
import { rollSpiritRoots } from '../spirit-root';
import type { PlayerSpiritRoots } from '../spirit-root';
import type { Player, Aptitudes } from './types';
import { rollDestinyId, setDestinyTalentState } from '../destiny';
import { getDestinyDef } from '../registry';

/** 建角色时预先随机好的核心属性（可用于UI展示+重掷） */
export interface PreviewRoll {
  spiritRoots: PlayerSpiritRoots;
  luck: number;
  comprehension: number;
  charisma: number;
  aptitudes: Aptitudes;
  mood: number;
  health: number;
}

/** 生成一套随机预览属性 */
export function rollPreview(): PreviewRoll {
  const spiritRoots = rollSpiritRoots();
  return {
    spiritRoots,
    luck: rollInnateAttr(),
    comprehension: rollInnateAttr(),
    charisma: rollInnateAttr(),
    aptitudes: rollAptitudesWithSpiritRoots(spiritRoots),
    mood: randInt(50, 90),
    health: randInt(80, 100),
  };
}

export interface CreatePlayerOptions {
  name: string;
  gender: 'male' | 'female';
  appearance: number;
  preview?: PreviewRoll; // 可选：允许外部传入预先随机好的属性
  enabledDLCs?: string[]; // T0074: 本局加载的 DLC 列表
  /** @deprecated use preview instead */
  spiritRoots?: PlayerSpiritRoots;
}

export function randInt(min: number, max: number): number {
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

// 先天属性加权随机：低(50%) 中(30%) 高(15%) 极(5%)
export function rollInnateAttr(): number {
  const roll = Math.random() * 100;
  if (roll < 50) return randInt(1, 30);
  if (roll < 80) return randInt(31, 60);
  if (roll < 95) return randInt(61, 85);
  return randInt(86, 100);
}

/** 生成资质（含灵根加成），供 rollPreview 和 createPlayer 共用 */
export function rollAptitudesWithSpiritRoots(spiritRoots: PlayerSpiritRoots): Aptitudes {
  const aptitudes: Aptitudes = {
    alchemy: rollAptitude(), smithing: rollAptitude(),
    fengshui: rollAptitude(), mining: rollAptitude(),
    blade: rollAptitude(), spear: rollAptitude(),
    sword: rollAptitude(), fist: rollAptitude(),
    palm: rollAptitude(), finger: rollAptitude(),
    fire: rollAptitude(), water: rollAptitude(),
    thunder: rollAptitude(), wind: rollAptitude(),
    earth: rollAptitude(), wood: rollAptitude(),
    metal: rollAptitude(),
  };

  // 根据灵根对对应元素资质施加加成
  // metal → thunder + wind；其余直接对应
  for (const root of spiritRoots.roots) {
    const bonus = randInt(20, 40);
    switch (root.type) {
      case 'fire':  aptitudes.fire  = Math.min(100, aptitudes.fire  + bonus); break;
      case 'water': aptitudes.water = Math.min(100, aptitudes.water + bonus); break;
      case 'earth': aptitudes.earth = Math.min(100, aptitudes.earth + bonus); break;
      case 'wood':  aptitudes.wood  = Math.min(100, aptitudes.wood  + bonus); break;
      case 'metal': {
        // 金灵根对应雷系与风系（锐利/穿透），各自独立随机加成
        const b2 = randInt(20, 40);
        aptitudes.thunder = Math.min(100, aptitudes.thunder + bonus);
        aptitudes.wind    = Math.min(100, aptitudes.wind    + b2);
        break;
      }
    }
  }

  // 单灵根：对应主元素资质保证 ≥ 80
  if (spiritRoots.combo === 'single' && spiritRoots.roots.length === 1) {
    const root = spiritRoots.roots[0];
    if (root.type === 'fire'  && aptitudes.fire  < 80) aptitudes.fire  = randInt(80, 100);
    if (root.type === 'water' && aptitudes.water < 80) aptitudes.water = randInt(80, 100);
    if (root.type === 'earth' && aptitudes.earth < 80) aptitudes.earth = randInt(80, 100);
    if (root.type === 'wood'  && aptitudes.wood  < 80) aptitudes.wood  = randInt(80, 100);
    if (root.type === 'metal') {
      if (aptitudes.thunder < 80) aptitudes.thunder = randInt(80, 100);
      if (aptitudes.wind    < 80) aptitudes.wind    = randInt(80, 100);
    }
  }

  return aptitudes;
}

export function createPlayer(options: CreatePlayerOptions): Player {
  const { name, gender, appearance } = options;
  const realm = REALMS[0];
  const destinyId = rollDestinyId();

  // 决定灵根（优先使用预览中的值，兼容旧 spiritRoots 字段）
  const spiritRoots = options.preview?.spiritRoots ?? options.spiritRoots ?? rollSpiritRoots();

  // 资质优先使用预览值，否则重新生成（含灵根加成）
  const aptitudes = options.preview?.aptitudes ?? rollAptitudesWithSpiritRoots(spiritRoots);

  const player: Player = {
    name: name || '无名散修',
    avatar: `${gender}-${appearance}`,
    gender,
    appearance,
    realmIndex: 0, exp: 0,
    age: 16 * 12, lifespan: 100 * 12,
    mood:   options.preview?.mood   ?? randInt(50, 90),
    health: options.preview?.health ?? randInt(80, 100),
    stamina: 100, maxStamina: 100,
    hp: realm.hpBase, maxHp: realm.hpBase,
    mp: realm.mpBase, maxMp: realm.mpBase,
    mentalPower: realm.mentalBase, maxMentalPower: realm.mentalBase,
    atk: realm.atkBase, def: realm.defBase, speed: realm.speedBase,
    skillResist: 0, spellResist: 0,
    critRate: 5, critDmgMultiplier: 1.5, critResist: 0, moveSpeed: 10,
    luck:          options.preview?.luck          ?? rollInnateAttr(),
    comprehension: options.preview?.comprehension ?? rollInnateAttr(),
    charisma:      options.preview?.charisma      ?? rollInnateAttr(),
    karma: getDestinyDef(destinyId ?? '')?.initialKarma ?? 0,
    aptitudes,
    spiritRoots,
    gold: 0, inventory: [], inventoryCapacity: 20,
    equipped: { weapon: null, helmet: null, armor: null, boots: null, accessory1: null, accessory2: null },
    techniques: [], activeTechniqueId: null,
    destinyId, talentIds: [],
    items: {}, passives: {}, systems: {},
    tracking: { killCount: 0, bossKillCount: 0, consecutiveRests: 0, consecutiveCultivates: 0, hasBeenBelow10Hp: false, defeatedHigherRealm: false, lowMoodStreak: 0, consecutiveBreakthroughFails: 0 },
    gameYear: 1, gameMonth: 1,
    // T0059 体修
    physique: 0, maxPhysique: 50, bodyRealmIndex: 0, bodyRealmExp: 0,
    physiqueDmgReduce: 0, bodyTempering: 0,
    // T0074 DLC 列表
    enabledDLCs: options.enabledDLCs ?? ['core'],
  };

  return setDestinyTalentState(player, { talentPoints: 0, unlockedNodeIds: [], acquiredTalentIds: [] });
}
