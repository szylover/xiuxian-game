// ============================================================
// dlc/cp-01-fanren/loader.ts — 凡人修仙内容包加载入口
// ============================================================

import { registerDLC } from '../../../game/registry';
import type { RecipeDef, EquipDef, SmithingRecipeDef, TechniqueDef, DeathTriggerDef, LifeSaverDef, RevivalMethodDef, MonsterDef } from '../../../game/registry';
import type { RegionDef, NpcDef, IdleChatPool, EventTemplate, VariablePool, EquipBaseTemplate, AffixDef, MonsterTemplate, MutationDef, TechniqueTraitDef } from '../../../game/types';
import { loadEventsFromJson } from '../../../game/event-loader';
import { loadItemsFromJson } from '../../../game/item-loader';
import { loadQuestsFromJson } from '../../../game/quest-loader';
import { loadDialoguesFromJson } from '../../../game/dialogue-loader';
import { loadMonsterTemplatesFromJson, loadMutationDefsFromJson } from '../../../game/procedural/monster-loader';
import type { JsonEvent } from '../../../game/event-loader';
import type { JsonItem } from '../../../game/item-loader';
import type { JsonQuestChain } from '../../../game/quest-loader';
import type { JsonDialogueChain } from '../../../game/dialogue-loader';
import { registerShopGoods } from '../../../game/shop';
import type { ShopGoodsDef } from '../../../game/shop';
import { recalcStats } from '../../../game/player';
import { getDeathSystemState } from '../../../game/death';

import { CP01_DLC_META } from './manifest';
import { CP01_BREAKTHROUGH_REQS, CP01_TRIBULATIONS } from './breakthrough';
import { CP01_DIVINE_ARTS } from './divine-arts';
import { CP01_BODY_REALMS, CP01_SPIRIT_ROOT_BODY_BONUSES } from './body-config';
import { CP01_REALMS } from './realms';
import { CP01_BOTTLENECKS } from './bottlenecks';

// ── 死亡触发条件 ──
const CP01_DEATH_TRIGGERS: DeathTriggerDef[] = [
  {
    id: 'cp-01:death_lifespan', name: '寿元耗尽', description: '大限将至，油尽灯枯…',
    severity: 'severe', check: (p) => p.lifespan !== Infinity && p.age >= p.lifespan,
    canBeBlocked: false, bypassRevival: true, priority: 0,
  },
  {
    id: 'cp-01:death_combat', name: '战斗阵亡', description: '在战斗中落败，身受重伤…',
    severity: 'light', check: (p) => p.hp <= 0,
    canBeBlocked: true, bypassRevival: false, priority: 10,
  },
  {
    id: 'cp-01:death_tribulation', name: '渡劫失败', description: '天劫降临，形神俱灭…',
    severity: 'severe', check: (p) => p.hp <= 0,
    canBeBlocked: false, bypassRevival: false, priority: 0,
  },
  {
    id: 'cp-01:death_inner_demon', name: '心魔入体', description: '心魔趁虚而入，神识受损…',
    severity: 'moderate',
    check: (p) => p.mood <= 10 && (p.tracking.lowMoodStreak ?? 0) >= 5 && (p.tracking.consecutiveBreakthroughFails ?? 0) >= 3,
    canBeBlocked: true, bypassRevival: false, priority: 20,
  },
  {
    id: 'cp-01:death_health', name: '气血耗尽', description: '气血枯竭，再难支撑…',
    severity: 'moderate', check: (p) => p.health <= 0,
    canBeBlocked: true, bypassRevival: false, priority: 15,
  },
];

// ── 护命道具 ──
const CP01_LIFE_SAVERS: LifeSaverDef[] = [
  {
    id: 'cp-01:saver_talisman', itemId: 'cp-01:life_talisman', name: '护身灵符',
    description: '蕴含灵力的护身符碎裂，抵消了致命伤害',
    priority: 10, consumeOnUse: true, blockSeverities: ['light', 'moderate'],
    afterEffect: (p) => ({ ...p, hp: Math.max(1, Math.floor(p.maxHp * 0.3)) }),
  },
  {
    id: 'cp-01:saver_jade', itemId: 'cp-01:jade_shield', name: '护身玉佩',
    description: '玉佩碎裂护主，化危为安',
    priority: 5, consumeOnUse: true, blockSeverities: ['light', 'moderate'],
    afterEffect: (p) => ({ ...p, hp: Math.max(1, p.hp) }),
  },
  {
    id: 'cp-01:saver_calming', itemId: 'cp-01:calming_talisman', name: '定心符',
    description: '定心符光芒大盛，驱散了心魔',
    priority: 0, consumeOnUse: true, blockSeverities: ['moderate'],
    condition: (p) => p.mood <= 10 && (p.tracking.lowMoodStreak ?? 0) >= 5 && (p.tracking.consecutiveBreakthroughFails ?? 0) >= 3,
    afterEffect: (p) => ({ ...p, mood: Math.min(100, p.mood + 30) }),
  },
  {
    id: 'cp-01:saver_soul_lamp', itemId: 'cp-01:soul_lamp', name: '魂灯',
    description: '魂灯中的魂火闪烁，挡下了致命一击',
    priority: 0, consumeOnUse: true, blockSeverities: ['moderate'],
    afterEffect: (p) => ({ ...p, hp: Math.max(1, Math.floor(p.maxHp * 0.5)) }),
  },
];

// ── 复活手段 ──
const CP01_REVIVAL_METHODS: RevivalMethodDef[] = [
  {
    id: 'cp-01:revival_nine_turn_pill', name: '九转回魂丹',
    description: '传说仙丹之力，令你起死回生',
    type: 'item', itemId: 'cp-01:nine_turn_pill', consumeOnUse: true, priority: 0,
    effect: (p) => ({ ...p, hp: p.maxHp, mp: p.maxMp }),
    penalty: { severity: 'severe', expLossRate: 0.2, goldLossRate: 0, inventoryLossCount: 0, healthLoss: 0, moodLoss: 0, realmDrop: 1, gameOver: false },
  },
  {
    id: 'cp-01:revival_loose_immortal', name: '散仙化',
    description: '肉身虽毁，散仙之躯重凝',
    type: 'passive', consumeOnUse: false, priority: 10,
    condition: (p) => { const ds = getDeathSystemState(p); return p.realmIndex >= 5 && !ds.isLooseImmortal; },
    effect: (p) => ({ ...p, hp: Math.floor(p.maxHp * 0.8), mp: Math.floor(p.maxMp * 0.8), health: 80, mood: 50 }),
  },
  {
    id: 'cp-01:revival_reincarnation', name: '转世重修',
    description: '以残存道韵转世，保留一缕修为',
    type: 'passive', consumeOnUse: false, priority: 20,
    condition: (p) => { const ds = getDeathSystemState(p); return p.realmIndex >= 3 && ds.deathCount <= 3; },
    effect: (p) => {
      let r = { ...p, realmIndex: 0 };
      r = recalcStats(r);
      return { ...r, exp: Math.floor(p.exp * 0.1), hp: r.maxHp, mp: r.maxMp, health: 100, mood: 70, gold: 0, inventory: [], equipped: { weapon: null, helmet: null, armor: null, boots: null, accessory1: null, accessory2: null } };
    },
  },
];

// ── 固定妖兽（从 JSON 加载） ──
import monstersJson from './monsters.json';
const CP01_MONSTERS: MonsterDef[] = monstersJson as MonsterDef[];

// ── 成就（CP-01 暂不定义独有成就，使用空数组）──
import type { AchievementDef } from '../../../game/achievement/types';
const CP01_ACHIEVEMENTS: AchievementDef[] = [];

// ── 注册 CP-01 DLC ──
export async function registerCP01(): Promise<void> {
  const [
    { default: eventsJson },
    { default: itemsJson },
    { default: recipesJson },
    { default: equipsJson },
    { default: shopJson },
    { default: smithingJson },
    { default: techniquesJson },
    { default: regionsJson },
    { default: npcsJson },
    { default: questsJson },
    { default: eventTemplatesJson },
    { default: eventVocabJson },
    { default: equipTemplatesJson },
    { default: affixesJson },
    { default: monsterTemplatesJson },
    { default: mutationsJson },
    { default: techniqueTraitsJson },
  ] = await Promise.all([
    import('./events.json'),
    import('./items.json'),
    import('./recipes.json'),
    import('./equips.json'),
    import('./shop.json'),
    import('./smithing.json'),
    import('./techniques.json'),
    import('./regions.json'),
    import('./npcs.json'),
    import('./quests.json'),
    import('./event-templates.json'),
    import('./event-vocab.json'),
    import('./equip-templates.json'),
    import('./affixes.json'),
    import('./monster-templates.json'),
    import('./mutations.json'),
    import('./technique-traits.json'),
  ]);

  // 对话文件按 NPC 拆分
  const dialogueModules = import.meta.glob<{ default: JsonDialogueChain[] }>(
    './dialogues/!(idle-chat).json',
    { eager: true },
  );
  const allDialogueChains: JsonDialogueChain[] = [];
  for (const mod of Object.values(dialogueModules)) {
    allDialogueChains.push(...mod.default);
  }
  const dialogues = loadDialoguesFromJson(allDialogueChains);

  // 闲聊池
  const { default: idleChatJson } = await import('./dialogues/idle-chat.json');

  const pack = loadEventsFromJson(eventsJson as JsonEvent[], CP01_DLC_META);
  const items = loadItemsFromJson(itemsJson as JsonItem[]);
  const recipes = recipesJson as RecipeDef[];
  const equips = equipsJson as EquipDef[];
  const smithingRecipes = smithingJson as SmithingRecipeDef[];
  const techniques = techniquesJson as TechniqueDef[];
  const questChains = loadQuestsFromJson(questsJson as JsonQuestChain[]);

  registerDLC({
    ...pack,
    items,
    recipes,
    equips,
    smithingRecipes,
    breakthroughReqs: CP01_BREAKTHROUGH_REQS,
    tribulations: CP01_TRIBULATIONS,
    techniques,
    deathTriggers: CP01_DEATH_TRIGGERS,
    lifeSavers: CP01_LIFE_SAVERS,
    revivalMethods: CP01_REVIVAL_METHODS,
    monsters: CP01_MONSTERS,
    divineArts: CP01_DIVINE_ARTS,
    achievements: CP01_ACHIEVEMENTS,
    bodyRealms: CP01_BODY_REALMS,
    spiritRootBodyBonuses: CP01_SPIRIT_ROOT_BODY_BONUSES,
    realms: CP01_REALMS,
    regions: regionsJson as RegionDef[],
    bottlenecks: CP01_BOTTLENECKS,
    npcs: npcsJson as NpcDef[],
    questChains,
    dialogues,
    idleChat: idleChatJson as IdleChatPool,
    eventTemplates: eventTemplatesJson as unknown as EventTemplate[],
    variablePools: eventVocabJson as unknown as VariablePool[],
    equipBaseTemplates: equipTemplatesJson as unknown as EquipBaseTemplate[],
    affixDefs: affixesJson as unknown as AffixDef[],
    monsterTemplates: loadMonsterTemplatesFromJson(monsterTemplatesJson as unknown as MonsterTemplate[]),
    mutations: loadMutationDefsFromJson(mutationsJson as unknown as MutationDef[]),
    techniqueTraits: techniqueTraitsJson as unknown as TechniqueTraitDef[],
  });
  registerShopGoods(shopJson as ShopGoodsDef[]);
}
