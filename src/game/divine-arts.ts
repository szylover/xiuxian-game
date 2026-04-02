// ============================================================
// game/divine-arts.ts — 神通系统核心逻辑
// 学习/激活/资质加成/元素克制/伤害计算
// ============================================================

import type { Player } from './player';
import type { DivineArtDef, ElementType, MonsterDef } from './types';
import { ELEMENT_COUNTER_TABLE, ELEMENT_COUNTER_MULTIPLIER } from './types';
import { getDivineArtDef, getAllDivineArtDefs } from './registry/queries';
import type { SkillState } from './combat/types';
import { REALMS } from './data';
import { DIVINE_ARTS_TEXTS } from '../data/texts/divine-arts';
import { COMBAT_TEXTS } from '../data/texts/combat';

// ── 元素显示常量 ──

export const ELEMENT_EMOJI: Record<ElementType, string> = {
  fire: '🔥', water: '💧', thunder: '⚡', wind: '🌪️', earth: '🪨', wood: '🌿', metal: '⚔️',
};

export const ELEMENT_CN: Record<ElementType, string> = {
  fire: '火', water: '水', thunder: '雷', wind: '风', earth: '土', wood: '木', metal: '金',
};

export const ELEMENT_COLOR: Record<ElementType, string> = {
  fire: '#e74c3c',
  water: '#3498db',
  thunder: '#f1c40f',
  wind: '#1abc9c',
  earth: '#795548',
  wood: '#27ae60',
  metal: '#DAA520',
};

// ── 玩家神通系统状态 ──

export interface DivineArtSlot {
  artId: string;
}

export interface DivineArtsSystemState {
  learned: DivineArtSlot[];     // 已学神通列表
  activeArtId: string | null;   // 当前激活神通 ID
}

const DEFAULT_STATE: DivineArtsSystemState = { learned: [], activeArtId: null };

/** 从 player.systems['divineArts'] 读取神通系统状态，不存在时返回初始值 */
export function getDivineArtsState(player: Player): DivineArtsSystemState {
  const s = player.systems['divineArts'];
  if (!s || typeof s !== 'object') return { ...DEFAULT_STATE, learned: [] };
  const state = s as Partial<DivineArtsSystemState>;
  return {
    learned: Array.isArray(state.learned) ? state.learned : [],
    activeArtId: state.activeArtId ?? null,
  };
}

/** 学习神通：检查境界 + 资质 + 未已学，写入 systems['divineArts'].learned */
export function learnDivineArt(player: Player, artId: string): { player: Player; message: string } {
  const artDef = getDivineArtDef(artId);
  if (!artDef) return { player, message: DIVINE_ARTS_TEXTS.notFound(artId) };

  const state = getDivineArtsState(player);
  if (state.learned.some(s => s.artId === artId)) {
    return { player, message: DIVINE_ARTS_TEXTS.alreadyLearned(artDef.name) };
  }

  if (player.realmIndex < artDef.minRealm) {
    const realmName = REALMS[artDef.minRealm]?.name ?? `境界${artDef.minRealm}`;
    return { player, message: DIVINE_ARTS_TEXTS.realmInsufficient(realmName, artDef.name) };
  }

  const aptitude = (player.aptitudes as unknown as Record<string, number>)[artDef.element] ?? 0;
  if (aptitude < artDef.minAptitude) {
    const elemCN = ELEMENT_CN[artDef.element];
    return {
      player,
      message: DIVINE_ARTS_TEXTS.aptitudeInsufficient(elemCN, aptitude, artDef.minAptitude, artDef.name),
    };
  }

  const newState: DivineArtsSystemState = {
    ...state,
    learned: [...state.learned, { artId }],
  };

  return {
    player: { ...player, systems: { ...player.systems, divineArts: newState } },
    message: DIVINE_ARTS_TEXTS.learned(artDef.name, ELEMENT_EMOJI[artDef.element], ELEMENT_CN[artDef.element]),
  };
}

/** 激活神通：只能激活已学的神通 */
export function activateDivineArt(player: Player, artId: string): { player: Player; message: string } {
  const artDef = getDivineArtDef(artId);
  if (!artDef) return { player, message: DIVINE_ARTS_TEXTS.activateNotFound(artId) };

  const state = getDivineArtsState(player);
  if (!state.learned.some(s => s.artId === artId)) {
    return { player, message: DIVINE_ARTS_TEXTS.activateNotLearned(artDef.name) };
  }

  const newState: DivineArtsSystemState = { ...state, activeArtId: artId };
  return {
    player: { ...player, systems: { ...player.systems, divineArts: newState } },
    message: DIVINE_ARTS_TEXTS.activated(artDef.name, ELEMENT_EMOJI[artDef.element], ELEMENT_CN[artDef.element]),
  };
}

/** 取消激活当前神通 */
export function deactivateDivineArt(player: Player): { player: Player; message: string } {
  const state = getDivineArtsState(player);
  if (!state.activeArtId) {
    return { player, message: DIVINE_ARTS_TEXTS.noActiveArt };
  }
  const artDef = getDivineArtDef(state.activeArtId);
  const artName = artDef ? artDef.name : state.activeArtId;
  const newState: DivineArtsSystemState = { ...state, activeArtId: null };
  return {
    player: { ...player, systems: { ...player.systems, divineArts: newState } },
    message: DIVINE_ARTS_TEXTS.deactivated(artName),
  };
}

/** 获取可学神通列表：境界达标 + 资质达标 + 未已学 */
export function getLearnableDivineArts(player: Player): DivineArtDef[] {
  const state = getDivineArtsState(player);
  const learnedIds = new Set(state.learned.map(s => s.artId));
  return getAllDivineArtDefs().filter(def => {
    if (learnedIds.has(def.id)) return false;
    if (player.realmIndex < def.minRealm) return false;
    const aptitude = (player.aptitudes as unknown as Record<string, number>)[def.element] ?? 0;
    if (aptitude < def.minAptitude) return false;
    return true;
  });
}

/** 获取所有未学神通（含不满足条件的），供 UI 展示 */
export function getAllUnlearnedDivineArts(player: Player): DivineArtDef[] {
  const state = getDivineArtsState(player);
  const learnedIds = new Set(state.learned.map(s => s.artId));
  return getAllDivineArtDefs().filter(def => !learnedIds.has(def.id));
}

/** 计算资质加成系数：1.0 + max(0, aptitude - 30) / 140 * artDef.aptitudeScaling */
export function calcAptitudePower(player: Player, artDef: DivineArtDef): number {
  const aptitude = (player.aptitudes as unknown as Record<string, number>)[artDef.element] ?? 0;
  return 1.0 + Math.max(0, aptitude - 30) / 140 * artDef.aptitudeScaling;
}

/** 判断攻击元素是否克制防御元素 */
export function isElementCountered(
  attackElement: ElementType,
  defendElement: ElementType | undefined,
): boolean {
  if (!defendElement) return false;
  return (ELEMENT_COUNTER_TABLE[attackElement] ?? []).includes(defendElement);
}

/**
 * 计算神通对指定怪物的总伤害
 * 含穿透、克制、多段、暴击、闪避
 */
export function calcDivineArtDamage(
  player: Player,
  artDef: DivineArtDef,
  monster: MonsterDef,
  currentMonsterHp: number,
): { totalDamage: number; logs: string[] } {
  const logs: string[] = [];
  let totalDamage = 0;

  const aptitudePower = calcAptitudePower(player, artDef);

  // 雷系穿透防御
  const effectiveDef = monster.def * (1 - (artDef.defPenetration ?? 0));

  // 元素克制
  const countered = isElementCountered(artDef.element, monster.element);
  const elementMultiplier = countered ? ELEMENT_COUNTER_MULTIPLIER : 1.0;

  // 怪物元素抗性
  const monsterResist = monster.elementResists?.[artDef.element] ?? 0;
  const resistMultiplier = 1 - monsterResist;

  for (let hit = 0; hit < artDef.hitCount; hit++) {
    if (currentMonsterHp - totalDamage <= 0) break;

    // 单段基础伤害
    const baseDmg = Math.max(1, player.atk * artDef.dmgMultiplier * aptitudePower - effectiveDef);

    let dmg = baseDmg * elementMultiplier * resistMultiplier;

    // 暴击判定
    let isCrit = false;
    const effectiveCritRate = Math.max(0, player.critRate - (monster.critResist ?? 0));
    if (Math.random() * 100 < effectiveCritRate) {
      dmg *= player.critDmgMultiplier || 1.5;
      isCrit = true;
    }

    // 闪避判定
    let isDodge = false;
    const dodgeChance = monster.moveSpeed / (monster.moveSpeed + 100);
    if (Math.random() < dodgeChance) {
      dmg = 0;
      isDodge = true;
    }

    const finalDmg = Math.floor(dmg);
    totalDamage += finalDmg;

    // 多段攻击才记录每段日志
    if (artDef.hitCount > 1) {
      if (isDodge) {
        logs.push(COMBAT_TEXTS.artSegDodge(hit + 1));
      } else if (isCrit) {
        logs.push(COMBAT_TEXTS.artSegCrit(hit + 1, finalDmg));
      } else {
        logs.push(COMBAT_TEXTS.artSegHit(hit + 1, finalDmg));
      }
    }
  }

  // 克制提示
  if (countered && monster.element) {
    logs.push(COMBAT_TEXTS.elementCounter(ELEMENT_EMOJI[artDef.element], ELEMENT_EMOJI[monster.element], ELEMENT_COUNTER_MULTIPLIER));
  }

  return { totalDamage, logs };
}

/**
 * 判断是否可以使用神通
 * DivineArtDef 没有 staminaCost，此函数独立于 tryUseSkill
 */
export function tryUseDivineArt(
  art: DivineArtDef,
  skillState: SkillState,
  availableMp: number,
): boolean {
  if (skillState.cooldownLeft > 0) return false;
  if (availableMp < art.mpCost) return false;
  return Math.random() < art.triggerRate;
}
