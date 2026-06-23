// ============================================================
// game/reincarnation.ts — 转世重修核心逻辑（#101）
// ============================================================

import { createPlayer, rollPreview, recalcStats } from './player';
import type { Player, Aptitudes, PlayerSpiritRoots } from './player';
import { getRealmDef, getAllReincarnationEffects } from './registry';
import { getItemCount, removeItem } from './inventory';
import type { ReincarnationContext, ReincarnationLegacy, ReincarnationState, LegacySnapshot } from './types';
import { REINCARNATION_TEXTS } from '../data/texts';

export const REINCARNATION_ORB_ID = 'core:reincarnation_orb';

const EMPTY_LEGACY: ReincarnationLegacy = {
  cultivationSpeedBonus: 0,
  bodyExpBonus: 0,
  atkBonus: 0,
  defBonus: 0,
  hpBonus: 0,
  mpBonus: 0,
  speedBonus: 0,
  luckBonus: 0,
  comprehensionBonus: 0,
  charismaBonus: 0,
  aptitudeBonus: 0,
  spiritRootFloor: 0,
  inventoryCapacityBonus: 0,
  lifespanBonus: 0,
};

const LEGACY_CAPS: ReincarnationLegacy = {
  cultivationSpeedBonus: 0.5,
  bodyExpBonus: 0.3,
  atkBonus: 50,
  defBonus: 50,
  hpBonus: 300,
  mpBonus: 150,
  speedBonus: 20,
  luckBonus: 20,
  comprehensionBonus: 20,
  charismaBonus: 20,
  aptitudeBonus: 10,
  spiritRootFloor: 30,
  inventoryCapacityBonus: 20,
  lifespanBonus: 240,
};

export interface ReincarnationCheck {
  canReincarnate: boolean;
  context: ReincarnationContext;
  reason: string;
  multiplier: number;
  legacyPreview: ReincarnationLegacy;
  legacyDelta: ReincarnationLegacy;
}

export interface ReincarnationOptions {
  name?: string;
  gender?: 'male' | 'female';
  appearance?: number;
}

export interface ReincarnationResult {
  newPlayer: Player;
  logs: string[];
  legacySnapshot: LegacySnapshot;
}

export function createEmptyLegacy(): ReincarnationLegacy {
  return { ...EMPTY_LEGACY };
}

export function getReincarnationState(player: Player): ReincarnationState {
  const raw = player.systems.reincarnation as Partial<ReincarnationState> | undefined;
  return {
    count: raw?.count ?? 0,
    snapshots: raw?.snapshots ?? [],
    legacy: { ...EMPTY_LEGACY, ...(raw?.legacy ?? {}) },
  };
}

export function setReincarnationState(player: Player, state: ReincarnationState): Player {
  return { ...player, systems: { ...player.systems, reincarnation: state } };
}

export function checkReincarnation(player: Player, context: ReincarnationContext): ReincarnationCheck {
  const state = getReincarnationState(player);
  const multiplier = context === 'death' ? 0.5 : 1;
  let reason = '';
  let canReincarnate = true;

  if (context === 'death' && state.count < 1) {
    canReincarnate = false;
    reason = REINCARNATION_TEXTS.unavailable(REINCARNATION_TEXTS.deathHalfLegacy);
  }
  if (context === 'voluntary') {
    if (player.realmIndex < 7 || getItemCount(player, REINCARNATION_ORB_ID) < 1) {
      canReincarnate = false;
      reason = REINCARNATION_TEXTS.orbRequired;
    }
  }

  const delta = calculateLegacyDelta(player, multiplier);
  return {
    canReincarnate,
    context,
    reason,
    multiplier,
    legacyDelta: delta,
    legacyPreview: mergeLegacy(state.legacy, delta),
  };
}

export function calculateLegacyDelta(player: Player, multiplier: number): ReincarnationLegacy {
  const r = Math.max(0, player.realmIndex);
  const scale = 1 + r / 10;
  return {
    cultivationSpeedBonus: round2(0.02 * scale * multiplier),
    bodyExpBonus: round2(0.01 * scale * multiplier),
    atkBonus: Math.ceil(2 * (1 + r / 5) * multiplier),
    defBonus: Math.ceil(2 * (1 + r / 5) * multiplier),
    hpBonus: Math.ceil(10 * (1 + r / 3) * multiplier),
    mpBonus: Math.ceil(5 * (1 + r / 3) * multiplier),
    speedBonus: Math.ceil(1 * (1 + r / 8) * multiplier),
    luckBonus: Math.ceil(2 * multiplier),
    comprehensionBonus: Math.ceil(2 * multiplier),
    charismaBonus: Math.ceil(2 * multiplier),
    aptitudeBonus: Math.ceil(1 * multiplier),
    spiritRootFloor: Math.ceil(3 * multiplier),
    inventoryCapacityBonus: Math.ceil(2 * multiplier),
    lifespanBonus: Math.ceil(12 * (1 + r / 5) * multiplier),
  };
}

export function mergeLegacy(base: ReincarnationLegacy, delta: ReincarnationLegacy): ReincarnationLegacy {
  const next = { ...EMPTY_LEGACY };
  for (const key of Object.keys(next) as (keyof ReincarnationLegacy)[]) {
    next[key] = Math.min(LEGACY_CAPS[key], round2((base[key] ?? 0) + (delta[key] ?? 0)));
  }
  return next;
}

export function performReincarnation(
  oldPlayer: Player,
  context: ReincarnationContext,
  options: ReincarnationOptions = {},
): ReincarnationResult {
  const check = checkReincarnation(oldPlayer, context);
  if (!check.canReincarnate) {
    return {
      newPlayer: oldPlayer,
      logs: [check.reason],
      legacySnapshot: createSnapshot(oldPlayer, getReincarnationState(oldPlayer).count + 1, context),
    };
  }

  let source = oldPlayer;
  const logs: string[] = [];
  if (context === 'voluntary') {
    source = removeItem(source, REINCARNATION_ORB_ID, 1);
    logs.push(REINCARNATION_TEXTS.orbConsumed);
  }

  const oldState = getReincarnationState(source);
  const nextCount = oldState.count + 1;
  const snapshot = createSnapshot(source, nextCount, context);
  const legacy = check.legacyPreview;

  const preview = rollPreview();
  applyLegacyToPreview(preview, source, legacy);

  let newPlayer = createPlayer({
    name: options.name ?? source.name,
    gender: options.gender ?? source.gender,
    appearance: options.appearance ?? source.appearance,
    preview,
    enabledDLCs: source.enabledDLCs,
  });

  const preservedAchievement = source.systems.achievement;
  const preservedDestiny = source.systems.destiny;
  const legacyMultiplierBonus = getPrimordialLegacyMultiplierBonus(source);
  const finalLegacy = legacyMultiplierBonus > 0
    ? mergeLegacy(legacy, { ...EMPTY_LEGACY, cultivationSpeedBonus: legacyMultiplierBonus })
    : legacy;

  newPlayer = {
    ...newPlayer,
    destinyId: source.destinyId,
    talentIds: [...(source.talentIds ?? [])],
    karma: Math.floor((source.karma ?? 0) * 0.2),
    systems: {
      ...(preservedAchievement ? { achievement: preservedAchievement } : {}),
      ...(preservedDestiny ? { destiny: preservedDestiny } : {}),
      reincarnation: {
        count: nextCount,
        snapshots: [...oldState.snapshots, snapshot].slice(-10),
        legacy: finalLegacy,
      } satisfies ReincarnationState,
    },
  };

  newPlayer = applyLegacyToPlayer(newPlayer, finalLegacy);
  newPlayer = applyDlcReincarnationEffects(newPlayer, source);
  newPlayer = recalcStats(newPlayer);
  newPlayer.hp = newPlayer.maxHp;
  newPlayer.mp = newPlayer.maxMp;
  newPlayer.stamina = newPlayer.maxStamina;

  logs.push(REINCARNATION_TEXTS.reincarnationLog(nextCount));
  return { newPlayer, logs, legacySnapshot: snapshot };
}

export function applyLegacyToPlayer(player: Player, legacy = getReincarnationState(player).legacy): Player {
  const aptitudes = addAptitudeBonus(player.aptitudes, legacy.aptitudeBonus);
  const spiritRoots = applySpiritRootFloor(player.spiritRoots, legacy.spiritRootFloor);
  return {
    ...player,
    luck: Math.min(100, player.luck + legacy.luckBonus),
    comprehension: Math.min(100, player.comprehension + legacy.comprehensionBonus),
    charisma: Math.min(100, player.charisma + legacy.charismaBonus),
    aptitudes,
    spiritRoots,
    lifespan: player.lifespan + legacy.lifespanBonus,
    inventoryCapacity: player.inventoryCapacity + legacy.inventoryCapacityBonus,
  };
}

export function getLegacyCaps(): ReincarnationLegacy {
  return { ...LEGACY_CAPS };
}

function applyLegacyToPreview(preview: ReturnType<typeof rollPreview>, oldPlayer: Player, legacy: ReincarnationLegacy): void {
  preview.luck = Math.min(100, Math.max(preview.luck, Math.floor(oldPlayer.luck * 0.3)) + legacy.luckBonus);
  preview.comprehension = Math.min(100, Math.max(preview.comprehension, Math.floor(oldPlayer.comprehension * 0.3)) + legacy.comprehensionBonus);
  preview.charisma = Math.min(100, Math.max(preview.charisma, Math.floor(oldPlayer.charisma * 0.3)) + legacy.charismaBonus);
  preview.aptitudes = addAptitudeBonus(preview.aptitudes, legacy.aptitudeBonus);
  preview.spiritRoots = applySpiritRootFloor(preview.spiritRoots, legacy.spiritRootFloor);
}

function addAptitudeBonus(aptitudes: Aptitudes, bonus: number): Aptitudes {
  const next = { ...aptitudes };
  for (const key of Object.keys(next) as (keyof Aptitudes)[]) {
    next[key] = Math.min(100, next[key] + bonus);
  }
  return next;
}

function applySpiritRootFloor(spiritRoots: PlayerSpiritRoots, floor: number): PlayerSpiritRoots {
  if (floor <= 0) return spiritRoots;
  return {
    ...spiritRoots,
    roots: spiritRoots.roots.map(root => ({ ...root, affinity: Math.max(root.affinity, floor) })),
  };
}

function applyDlcReincarnationEffects(newPlayer: Player, oldPlayer: Player): Player {
  return getAllReincarnationEffects().reduce((p, effect) => {
    if (!effect.condition(oldPlayer)) return p;
    return effect.apply(p, oldPlayer);
  }, newPlayer);
}

function createSnapshot(player: Player, incarnationNo: number, context: ReincarnationContext): LegacySnapshot {
  return {
    incarnationNo,
    peakRealmIndex: player.realmIndex,
    peakBodyRealmIndex: player.bodyRealmIndex,
    outcome: context === 'ascension' ? 'ascended' : context === 'death' ? 'died' : 'voluntary',
    age: player.age,
  };
}

function getPrimordialLegacyMultiplierBonus(player: Player): number {
  const state = player.systems.primordialEndgame as { legacyMultiplierBonus?: number } | undefined;
  return state?.legacyMultiplierBonus ?? 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getRealmName(index: number): string {
  return getRealmDef(index)?.name ?? String(index);
}
