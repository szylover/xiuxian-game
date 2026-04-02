// ============================================================
// events.ts — 事件内容注册（探索/奇遇/日常）
// 所有事件数据存储在 JSON 中，此文件只负责加载和注册
// ============================================================

import type { Player } from './player';
import { registerDLC, triggerEvent } from './registry';
import type { RecipeDef, EquipDef, SmithingRecipeDef, TechniqueDef, DeathTriggerDef, LifeSaverDef, RevivalMethodDef, MonsterDef } from './registry';
import type { RegionDef } from './types';
import { getCurrentRegion } from './map';
import { loadEventsFromJson } from './event-loader';
import { loadItemsFromJson } from './item-loader';
import type { JsonEvent } from './event-loader';
import type { JsonItem } from './item-loader';
import { CORE_BREAKTHROUGH_REQS, CORE_TRIBULATIONS } from '../data/core-breakthrough';
import { CORE_DIVINE_ARTS } from '../data/core-divine-arts';
import { CORE_BODY_REALMS, CORE_SPIRIT_ROOT_BODY_BONUSES } from '../data/core-body-config';
import { CORE_REALMS } from '../data/core-realms';
import { registerShopGoods } from './shop';
import type { ShopGoodsDef } from './shop';
import { getDeathSystemState } from './death';
import { recalcStats } from './player';
import { CORE_ACHIEVEMENTS } from './achievement/data';

// ── 核心死亡触发条件 ──

const CORE_DEATH_TRIGGERS: DeathTriggerDef[] = [
  {
    id: 'core:death_lifespan',
    name: '寿元耗尽',
    description: '大限将至，油尽灯枯…',
    severity: 'severe',
    check: (p) => p.lifespan !== Infinity && p.age >= p.lifespan,
    canBeBlocked: false,
    bypassRevival: true,
    priority: 0,
  },
  {
    id: 'core:death_combat_boss',
    name: 'Boss 击杀',
    description: '被强大妖兽击败，身受重创…',
    severity: 'moderate',
    check: (p) => p.hp <= 0,
    canBeBlocked: true,
    bypassRevival: false,
    priority: 5,
  },
  {
    id: 'core:death_combat',
    name: '战斗阵亡',
    description: '在战斗中落败，身受重伤…',
    severity: 'light',
    check: (p) => p.hp <= 0,
    canBeBlocked: true,
    bypassRevival: false,
    priority: 10,
  },
  {
    id: 'core:death_tribulation',
    name: '渡劫失败',
    description: '天劫降临，形神俱灭…',
    severity: 'severe',
    check: (p) => p.hp <= 0,
    canBeBlocked: false,
    bypassRevival: false,
    priority: 0,
  },
  {
    id: 'core:death_inner_demon',
    name: '心魔入体',
    description: '心魔趁虚而入，神识受损…',
    severity: 'moderate',
    check: (p) => {
      const tracking = p.tracking;
      return p.mood <= 10
        && (tracking.lowMoodStreak ?? 0) >= 5
        && (tracking.consecutiveBreakthroughFails ?? 0) >= 3;
    },
    canBeBlocked: true,
    bypassRevival: false,
    priority: 20,
  },
  {
    id: 'core:death_health',
    name: '气血耗尽',
    description: '气血枯竭，再难支撑…',
    severity: 'moderate',
    check: (p) => p.health <= 0,
    canBeBlocked: true,
    bypassRevival: false,
    priority: 15,
  },
];

// ── 核心护命道具 ──

const CORE_LIFE_SAVERS: LifeSaverDef[] = [
  {
    id: 'core:saver_talisman',
    itemId: 'core:life_talisman',
    name: '护身灵符',
    description: '蕴含灵力的护身符碎裂，抵消了致命伤害',
    priority: 10,
    consumeOnUse: true,
    blockSeverities: ['light', 'moderate'],
    afterEffect: (p) => ({ ...p, hp: Math.max(1, Math.floor(p.maxHp * 0.3)) }),
  },
  {
    id: 'core:saver_jade',
    itemId: 'core:jade_shield',
    name: '玉碎护身',
    description: '灵玉碎裂护主，化危为安',
    priority: 5,
    consumeOnUse: true,
    blockSeverities: ['light', 'moderate'],
    afterEffect: (p) => ({ ...p, hp: Math.max(1, p.hp) }),
  },
  {
    id: 'core:saver_soul_lamp',
    itemId: 'core:soul_lamp',
    name: '魂灯',
    description: '魂灯中的魂火闪烁，挡下了致命一击',
    priority: 0,
    consumeOnUse: true,
    blockSeverities: ['moderate'],
    afterEffect: (p) => ({ ...p, hp: Math.max(1, Math.floor(p.maxHp * 0.5)) }),
  },
  {
    id: 'core:saver_calming',
    itemId: 'core:calming_talisman',
    name: '定心符',
    description: '定心符光芒大盛，驱散了心魔',
    priority: 0,
    consumeOnUse: true,
    blockSeverities: ['moderate'],
    // 定心符只阻挡心魔
    condition: (p) => {
      const tracking = p.tracking;
      return p.mood <= 10
        && (tracking.lowMoodStreak ?? 0) >= 5
        && (tracking.consecutiveBreakthroughFails ?? 0) >= 3;
    },
    afterEffect: (p) => ({ ...p, mood: Math.min(100, p.mood + 30) }),
  },
];

// ── 核心复活手段 ──

const CORE_REVIVAL_METHODS: RevivalMethodDef[] = [
  {
    id: 'core:revival_nine_turn_pill',
    name: '九转还魂丹',
    description: '传说仙丹之力，令你起死回生',
    type: 'item',
    itemId: 'core:nine_turn_pill',
    consumeOnUse: true,
    priority: 0,
    effect: (p) => {
      let revived = { ...p, hp: p.maxHp, mp: p.maxMp };
      return revived;
    },
    penalty: {
      severity: 'severe',
      expLossRate: 0.2,
      goldLossRate: 0,
      inventoryLossCount: 0,
      healthLoss: 0,
      moodLoss: 0,
      realmDrop: 1,
      gameOver: false,
    },
  },
  {
    id: 'core:revival_loose_immortal',
    name: '散仙化',
    description: '肉身虽毁，散仙之躯重凝',
    type: 'passive',
    consumeOnUse: false,
    priority: 10,
    condition: (p) => {
      const ds = getDeathSystemState(p);
      return p.realmIndex >= 5 && !ds.isLooseImmortal; // 化神期以上且未成散仙
    },
    effect: (p) => {
      let revived = { ...p };
      // 保留 80% 属性
      revived.hp = Math.floor(revived.maxHp * 0.8);
      revived.mp = Math.floor(revived.maxMp * 0.8);
      revived.health = 80;
      revived.mood = 50;
      return revived;
    },
  },
  {
    id: 'core:revival_reincarnation',
    name: '转世重修',
    description: '以残存道韵转世，保留一缕修为',
    type: 'passive',
    consumeOnUse: false,
    priority: 20,
    condition: (p) => {
      const ds = getDeathSystemState(p);
      return p.realmIndex >= 3 && ds.deathCount <= 3; // 金丹期以上 + 死亡次数 ≤ 3
    },
    effect: (p) => {
      let revived = { ...p };
      revived.realmIndex = 0;
      revived = recalcStats(revived);
      revived.exp = Math.floor(p.exp * 0.1);
      revived.hp = revived.maxHp;
      revived.mp = revived.maxMp;
      revived.health = 100;
      revived.mood = 70;
      revived.gold = 0;
      revived.inventory = [];
      revived.equipped = { weapon: null, helmet: null, armor: null, boots: null, accessory1: null, accessory2: null };
      return revived;
    },
  },
];

// ── 核心妖兽表（DLC 化，含 emoji）──

const CORE_MONSTERS: MonsterDef[] = [
  { id: 'core:wild_wolf',    name: '野狼',     emoji: '🐺', realmIndex: 0, hp: 80,   atk: 7,   def: 2,  speed: 10, moveSpeed: 8,  critRate: 3,  critResist: 0,  critDmgMultiplier: 1.5, expReward: 15,   goldReward: 5,    regionTags: ['mountain', 'wilderness', 'wasteland'] },
  { id: 'core:viper',        name: '毒蛇',     emoji: '🐍', realmIndex: 0, hp: 60,   atk: 10,  def: 1,  speed: 12, moveSpeed: 12, critRate: 8,  critResist: 0,  critDmgMultiplier: 1.5, expReward: 18,   goldReward: 8,    regionTags: ['mountain', 'wilderness', 'valley'] },
  { id: 'core:iron_bear',    name: '铁背熊',   emoji: '🐻', realmIndex: 1, hp: 250,  atk: 18,  def: 12, speed: 8,  moveSpeed: 5,  critRate: 5,  critResist: 2,  critDmgMultiplier: 1.5, expReward: 40,   goldReward: 15,   regionTags: ['mountain', 'wilderness'] },
  { id: 'core:flame_python', name: '赤焰蟒',   emoji: '🔥', realmIndex: 1, hp: 200,  atk: 22,  def: 8,  speed: 14, moveSpeed: 10, critRate: 10, critResist: 0,  critDmgMultiplier: 1.5, expReward: 50,   goldReward: 20,   regionTags: ['mountain', 'wilderness', 'wasteland'] },
  { id: 'core:ice_spider',   name: '玄冰蛛',   emoji: '🕷️', realmIndex: 2, hp: 600,  atk: 45,  def: 25, speed: 16, moveSpeed: 14, critRate: 12, critResist: 5,  critDmgMultiplier: 1.5, expReward: 120,  goldReward: 50,   regionTags: ['wasteland', 'mystic'] },
  { id: 'core:soul_hawk',    name: '噬魂鹰',   emoji: '🦅', realmIndex: 2, hp: 500,  atk: 55,  def: 18, speed: 22, moveSpeed: 20, critRate: 15, critResist: 3,  critDmgMultiplier: 1.5, expReward: 140,  goldReward: 60,   regionTags: ['wasteland', 'mystic', 'dangerous'] },
  { id: 'core:fire_lizard',  name: '地火蜥蜴', emoji: '🦎', realmIndex: 3, hp: 1500, atk: 100, def: 55, speed: 20, moveSpeed: 12, critRate: 10, critResist: 8,  critDmgMultiplier: 1.5, expReward: 350,  goldReward: 120,  regionTags: ['mystic', 'dangerous'] },
  { id: 'core:silver_dragon',name: '银角蛟龙', emoji: '🐉', realmIndex: 3, hp: 1800, atk: 120, def: 65, speed: 28, moveSpeed: 18, critRate: 18, critResist: 10, critDmgMultiplier: 1.5, expReward: 500,  goldReward: 200,  regionTags: ['mystic', 'dangerous'] },
  { id: 'core:sky_tiger',    name: '天煞虎',   emoji: '🐯', realmIndex: 4, hp: 4000, atk: 250, def: 130,speed: 32, moveSpeed: 22, critRate: 15, critResist: 12, critDmgMultiplier: 1.5, expReward: 1200, goldReward: 500,  regionTags: ['mystic', 'dangerous', 'celestial'] },
  { id: 'core:kui_bull',     name: '夔牛',     emoji: '🐂', realmIndex: 5, hp: 9000, atk: 550, def: 280,speed: 45, moveSpeed: 30, critRate: 20, critResist: 15, critDmgMultiplier: 1.5, expReward: 4000, goldReward: 1500, regionTags: ['mystic', 'dangerous', 'celestial'] },
];

// ── 注册 core DLC ──
export async function registerCoreEvents(): Promise<void> {
  const [
    { default: coreEventsJson },
    { default: coreItemsJson },
    { default: coreRecipesJson },
    { default: coreEquipsJson },
    { default: coreShopJson },
    { default: coreSmithingJson },
    { default: coreTechniquesJson },
    { default: coreRegionsJson },
  ] = await Promise.all([
    import('../data/core-events.json'),
    import('../data/core-items.json'),
    import('../data/core-recipes.json'),
    import('../data/core-equips.json'),
    import('../data/core-shop.json'),
    import('../data/core-smithing.json'),
    import('../data/core-techniques.json'),
    import('../data/core-regions.json'),
  ]);

  const pack = loadEventsFromJson(coreEventsJson as JsonEvent[], {
    id: 'core',
    name: '基础内容包',
    description: '核心事件 + 物品 + 配方 + 装备 + 炼器 + 突破 + 天劫',
    version: '2.0.0',
  });
  const items = loadItemsFromJson(coreItemsJson as JsonItem[]);
  const recipes = coreRecipesJson as RecipeDef[];
  const equips = coreEquipsJson as EquipDef[];
  const smithingRecipes = coreSmithingJson as SmithingRecipeDef[];
  const techniques = coreTechniquesJson as TechniqueDef[];
  registerDLC({
    ...pack,
    items,
    recipes,
    equips,
    smithingRecipes,
    breakthroughReqs: CORE_BREAKTHROUGH_REQS,
    tribulations: CORE_TRIBULATIONS,
    techniques,
    deathTriggers: CORE_DEATH_TRIGGERS,
    lifeSavers: CORE_LIFE_SAVERS,
    revivalMethods: CORE_REVIVAL_METHODS,
    monsters: CORE_MONSTERS,
    divineArts: CORE_DIVINE_ARTS,
    achievements: CORE_ACHIEVEMENTS,
    bodyRealms: CORE_BODY_REALMS,
    spiritRootBodyBonuses: CORE_SPIRIT_ROOT_BODY_BONUSES,
    realms: CORE_REALMS,
    regions: coreRegionsJson as RegionDef[],
  });
  registerShopGoods(coreShopJson as ShopGoodsDef[]);
}

// ── 探索入口（T0021: 区域感知）──
export function triggerExploreEvent(player: Player): { player: Player; message: string } {
  const region = getCurrentRegion(player);
  const regionTags = region?.regionTags;

  // 10% 概率触发奇遇代替普通探索
  if (Math.random() < 0.10) {
    const adventure = triggerEvent('adventure', player, regionTags);
    if (adventure) {
      return { player: adventure.player, message: adventure.message };
    }
  }

  const result = triggerEvent('explore', player, regionTags);
  if (!result) {
    return { player, message: '🚶 四处探索了一番，未发现什么特别的东西。' };
  }
  return { player: result.player, message: result.message };
}

// ── 日常事件入口 ──
export function triggerDailyEvent(player: Player): { player: Player; message: string } | null {
  const result = triggerEvent('daily', player);
  if (!result || !result.message) return null;
  return { player: result.player, message: result.message };
}
