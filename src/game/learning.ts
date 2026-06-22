import type { Player } from './player';
import type { ActiveStudy, ItemDef, LearningSystemState, ScrollStudyType } from './types';
import { getAllRecipes, getAllSmithingRecipes, getDivineArtDef, getItemDef, getRecipe, getRealmDef, getSmithingRecipe, getTechniqueDef } from './registry';
import { hasItem, removeItem } from './inventory';
import { learnTechnique } from './technique';
import { getDivineArtsState, learnDivineArt } from './divine-arts';
import { LEARNING_TEXTS } from '../data/texts';
import { getAlignment } from './karma';

const LEARNING_SYSTEM_KEY = 'learning';
const LEARNING_MIGRATION_VERSION = 1;

function defaultState(): LearningSystemState {
  return {
    activeStudy: null,
    learnedRecipes: [],
    learnedSmithingRecipes: [],
    migrationVersion: LEARNING_MIGRATION_VERSION,
  };
}

export function getLearningState(player: Player): LearningSystemState {
  const raw = player.systems[LEARNING_SYSTEM_KEY] as Partial<LearningSystemState> | undefined;
  if (!raw || typeof raw !== 'object') {
    return {
      activeStudy: null,
      learnedRecipes: getAllRecipes().map(r => r.id),
      learnedSmithingRecipes: getAllSmithingRecipes().map(r => r.id),
      migrationVersion: LEARNING_MIGRATION_VERSION,
    };
  }
  return {
    activeStudy: normalizeActiveStudy(raw.activeStudy),
    learnedRecipes: Array.isArray(raw.learnedRecipes) ? raw.learnedRecipes : [],
    learnedSmithingRecipes: Array.isArray(raw.learnedSmithingRecipes) ? raw.learnedSmithingRecipes : [],
    migrationVersion: typeof raw.migrationVersion === 'number' ? raw.migrationVersion : LEARNING_MIGRATION_VERSION,
  };
}

export function createInitialLearningState(): LearningSystemState {
  return defaultState();
}

export function setLearningState(player: Player, state: LearningSystemState): Player {
  return {
    ...player,
    systems: {
      ...player.systems,
      [LEARNING_SYSTEM_KEY]: state,
    },
  };
}

export function calcActualStudyMonths(baseMonths: number, comprehension: number): number {
  return Math.max(1, Math.ceil(baseMonths * (100 / (100 + Math.max(0, comprehension)))));
}

export function getScrollTargetName(scroll: ItemDef): string | null {
  if (!scroll.scrollType || !scroll.scrollTargetId) return null;
  return getTargetName(scroll.scrollType, scroll.scrollTargetId);
}

export function startStudy(player: Player, scrollItemId: string): { player: Player; message: string } {
  const scroll = getItemDef(scrollItemId);
  if (!scroll || scroll.category !== 'scroll') {
    return { player, message: LEARNING_TEXTS.logs.notScroll };
  }
  if (!hasItem(player, scrollItemId)) {
    return { player, message: LEARNING_TEXTS.logs.itemMissing };
  }
  if (!scroll.scrollType || !scroll.scrollTargetId || !scroll.scrollStudyMonths) {
    return { player, message: LEARNING_TEXTS.logs.scrollBroken };
  }
  const state = getLearningState(player);
  if (state.activeStudy) {
    return { player, message: LEARNING_TEXTS.logs.alreadyStudying(state.activeStudy.targetName) };
  }

  const targetName = getTargetName(scroll.scrollType, scroll.scrollTargetId);
  if (!targetName) return { player, message: LEARNING_TEXTS.logs.targetMissing };

  const minRealm = getScrollMinRealm(scroll);
  if (player.realmIndex < minRealm) {
    return { player, message: LEARNING_TEXTS.logs.realmInsufficient(getRealmDef(minRealm)?.name ?? String(minRealm)) };
  }
  if (hasLearnedTarget(player, scroll.scrollType, scroll.scrollTargetId)) {
    return { player, message: LEARNING_TEXTS.logs.alreadyLearned(targetName) };
  }
  if (!canComprehendTarget(player, scroll.scrollType, scroll.scrollTargetId)) {
    return { player, message: LEARNING_TEXTS.logs.aptitudeInsufficient(targetName) };
  }

  const totalMonths = calcActualStudyMonths(scroll.scrollStudyMonths, player.comprehension);
  const activeStudy: ActiveStudy = {
    scrollItemId,
    scrollType: scroll.scrollType,
    targetId: scroll.scrollTargetId,
    targetName,
    progressMonths: 0,
    totalMonths,
  };

  const withoutScroll = removeItem(player, scrollItemId, 1);
  const next = setLearningState(withoutScroll, { ...state, activeStudy });
  return { player: next, message: LEARNING_TEXTS.logs.started(targetName, totalMonths) };
}

export function tickStudy(player: Player, months = 1): { player: Player; messages: string[]; completed: boolean } {
  let p = player;
  const messages: string[] = [];
  let completed = false;
  for (let i = 0; i < months; i += 1) {
    const state = getLearningState(p);
    if (!state.activeStudy) break;
    const activeStudy = {
      ...state.activeStudy,
      progressMonths: state.activeStudy.progressMonths + 1,
    };
    if (activeStudy.progressMonths >= activeStudy.totalMonths) {
      const result = completeStudy(setLearningState(p, { ...state, activeStudy }));
      p = result.player;
      messages.push(result.message);
      completed = true;
    } else {
      p = setLearningState(p, { ...state, activeStudy });
      messages.push(LEARNING_TEXTS.logs.progressed(activeStudy.targetName, activeStudy.progressMonths, activeStudy.totalMonths));
    }
  }
  return { player: p, messages, completed };
}

export function completeStudy(player: Player): { player: Player; message: string } {
  const state = getLearningState(player);
  const study = state.activeStudy;
  if (!study) return { player, message: LEARNING_TEXTS.logs.noActiveStudy };

  let p = player;
  if (study.scrollType === 'technique') {
    p = learnTechnique(player, study.targetId).player;
  } else if (study.scrollType === 'divineArt') {
    p = learnDivineArt(player, study.targetId).player;
  } else if (study.scrollType === 'recipe') {
    p = setLearningState(player, { ...state, learnedRecipes: addUnique(state.learnedRecipes, study.targetId) });
  } else {
    p = setLearningState(player, { ...state, learnedSmithingRecipes: addUnique(state.learnedSmithingRecipes, study.targetId) });
  }

  const nextState = { ...getLearningState(p), activeStudy: null };
  return { player: setLearningState(p, nextState), message: LEARNING_TEXTS.logs.completed(study.targetName) };
}

export function cancelStudy(player: Player): { player: Player; message: string } {
  const state = getLearningState(player);
  if (!state.activeStudy) return { player, message: LEARNING_TEXTS.logs.noActiveStudy };
  const name = state.activeStudy.targetName;
  return {
    player: setLearningState(player, { ...state, activeStudy: null }),
    message: LEARNING_TEXTS.logs.cancelled(name),
  };
}

export function hasLearnedRecipe(player: Player, recipeId: string): boolean {
  return getLearningState(player).learnedRecipes.includes(recipeId);
}

export function hasLearnedSmithingRecipe(player: Player, recipeId: string): boolean {
  return getLearningState(player).learnedSmithingRecipes.includes(recipeId);
}

function normalizeActiveStudy(value: unknown): ActiveStudy | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ActiveStudy>;
  if (!raw.scrollItemId || !raw.scrollType || !raw.targetId || !raw.targetName) return null;
  return {
    scrollItemId: raw.scrollItemId,
    scrollType: raw.scrollType,
    targetId: raw.targetId,
    targetName: raw.targetName,
    progressMonths: typeof raw.progressMonths === 'number' ? raw.progressMonths : 0,
    totalMonths: typeof raw.totalMonths === 'number' ? raw.totalMonths : 1,
  };
}

function getTargetName(scrollType: ScrollStudyType, targetId: string): string | null {
  if (scrollType === 'technique') return getTechniqueDef(targetId)?.name ?? null;
  if (scrollType === 'divineArt') return getDivineArtDef(targetId)?.name ?? null;
  if (scrollType === 'recipe') return getRecipe(targetId)?.name ?? null;
  return getSmithingRecipe(targetId)?.name ?? null;
}

function getScrollMinRealm(scroll: ItemDef): number {
  if (typeof scroll.scrollMinRealm === 'number') return scroll.scrollMinRealm;
  if (scroll.scrollType === 'technique') return getTechniqueDef(scroll.scrollTargetId ?? '')?.minRealm ?? 0;
  if (scroll.scrollType === 'divineArt') return getDivineArtDef(scroll.scrollTargetId ?? '')?.minRealm ?? 0;
  if (scroll.scrollType === 'recipe') return getRecipe(scroll.scrollTargetId ?? '')?.minRealm ?? 0;
  return getSmithingRecipe(scroll.scrollTargetId ?? '')?.minRealm ?? 0;
}

function hasLearnedTarget(player: Player, scrollType: ScrollStudyType, targetId: string): boolean {
  if (scrollType === 'technique') return player.techniques.some(t => t.techniqueId === targetId);
  if (scrollType === 'divineArt') return getDivineArtsState(player).learned.some(s => s.artId === targetId);
  if (scrollType === 'recipe') return hasLearnedRecipe(player, targetId);
  return hasLearnedSmithingRecipe(player, targetId);
}

function canComprehendTarget(player: Player, scrollType: ScrollStudyType, targetId: string): boolean {
  if (scrollType === 'divineArt') {
    const def = getDivineArtDef(targetId);
    if (!def) return false;
    if (def.requiredAlignment && getAlignment(player.karma ?? 0) !== def.requiredAlignment) return false;
    const aptitude = (player.aptitudes as unknown as Record<string, number>)[def.element] ?? 0;
    return aptitude >= def.minAptitude;
  }
  if (scrollType === 'technique') {
    const def = getTechniqueDef(targetId);
    if (!def) return false;
    if (def.requiredAlignment && getAlignment(player.karma ?? 0) !== def.requiredAlignment) return false;
    if (def.requiredSpiritRoot && !player.spiritRoots?.roots.some(r => r.type === def.requiredSpiritRoot)) return false;
  }
  return true;
}

function addUnique(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}
