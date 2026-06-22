import type { Player } from './player';
import type { Alignment, KarmaSystemState } from './types';
import type { NpcDef } from './types';
import { ALIGNMENT_CN, KARMA_TEXTS } from '../data/texts';

export const KARMA_MIN = -100;
export const KARMA_MAX = 100;
export const ALIGNMENT_THRESHOLDS = { righteous: 30, evil: -30 } as const;

const DEFAULT_STATE: KarmaSystemState = {
  totalGained: 0,
  totalLost: 0,
  lastChangeAge: -1,
  majorEvents: [],
};

export function normalizeKarmaPlayer(player: Player): Player {
  return typeof player.karma === 'number' ? player : { ...player, karma: 0 };
}

export function getAlignment(karma: number): Alignment {
  if (karma >= ALIGNMENT_THRESHOLDS.righteous) return 'righteous';
  if (karma <= ALIGNMENT_THRESHOLDS.evil) return 'evil';
  return 'neutral';
}

export function getKarmaState(player: Player): KarmaSystemState {
  const raw = player.systems.karma as Partial<KarmaSystemState> | undefined;
  return {
    totalGained: typeof raw?.totalGained === 'number' ? raw.totalGained : DEFAULT_STATE.totalGained,
    totalLost: typeof raw?.totalLost === 'number' ? raw.totalLost : DEFAULT_STATE.totalLost,
    lastChangeAge: typeof raw?.lastChangeAge === 'number' ? raw.lastChangeAge : DEFAULT_STATE.lastChangeAge,
    majorEvents: Array.isArray(raw?.majorEvents) ? raw.majorEvents : [],
  };
}

export function getKarmaTitle(karma: number): string {
  if (karma >= 80) return KARMA_TEXTS.titles.righteousMaster;
  if (karma >= 50) return KARMA_TEXTS.titles.righteousExpert;
  if (karma >= 30) return KARMA_TEXTS.titles.righteousCultivator;
  if (karma <= -80) return KARMA_TEXTS.titles.evilMaster;
  if (karma <= -50) return KARMA_TEXTS.titles.evilExpert;
  if (karma <= -30) return KARMA_TEXTS.titles.evilCultivator;
  return KARMA_TEXTS.titles.neutral;
}

export function changeKarma(player: Player, delta: number, reason: string, majorEventId?: string): { player: Player; logs: string[] } {
  const base = normalizeKarmaPlayer(player);
  if (delta === 0) return { player: base, logs: [] };
  const nextValue = clampKarma(base.karma + delta);
  const actual = nextValue - base.karma;
  if (actual === 0) return { player: base, logs: [] };
  const state = getKarmaState(base);
  const nextState: KarmaSystemState = {
    ...state,
    totalGained: state.totalGained + Math.max(0, actual),
    totalLost: state.totalLost + Math.max(0, -actual),
    lastChangeAge: base.age,
    majorEvents: majorEventId ? [...state.majorEvents, majorEventId].slice(-20) : state.majorEvents,
  };
  const nextPlayer = {
    ...base,
    karma: nextValue,
    systems: { ...base.systems, karma: nextState },
  };
  return {
    player: nextPlayer,
    logs: [KARMA_TEXTS.logs.changed(actual, reason, nextValue, getKarmaTitle(nextValue))],
  };
}

export function tickKarmaDecay(player: Player): { player: Player; logs: string[] } {
  const p = normalizeKarmaPlayer(player);
  if (Math.abs(p.karma) < 1) return { player: p, logs: [] };
  const delta = p.karma > 0 ? -Math.min(1, Math.ceil(Math.abs(p.karma) / 50)) : Math.min(1, Math.ceil(Math.abs(p.karma) / 50));
  const next = clampKarma(p.karma + delta);
  return { player: { ...p, karma: next }, logs: [KARMA_TEXTS.logs.decayed(delta, next)] };
}

export function calcAffinityKarmaModifier(player: Player, npc: NpcDef, delta: number): number {
  const npcAlignment = npc.alignment ?? 'neutral';
  const playerAlignment = getAlignment(normalizeKarmaPlayer(player).karma);
  if (npcAlignment === 'neutral' || playerAlignment === 'neutral') return delta;
  const same = npcAlignment === playerAlignment;
  const opposed = isOpposed(npcAlignment, playerAlignment);
  const sameFactor = npc.karmaAffinityModifier?.sameFaction ?? 1.2;
  const opposedFactor = npc.karmaAffinityModifier?.oppositeFaction ?? 0.5;
  if (same && delta > 0) return Math.round(delta * sameFactor);
  if (opposed && delta > 0) return Math.round(delta * opposedFactor);
  return delta;
}

export function getAlignmentLabel(alignment: Alignment): string {
  return ALIGNMENT_CN[alignment];
}

export function clampKarma(value: number): number {
  return Math.max(KARMA_MIN, Math.min(KARMA_MAX, Math.round(value)));
}

function isOpposed(a: Alignment, b: Alignment): boolean {
  return (a === 'righteous' && b === 'evil') || (a === 'evil' && b === 'righteous');
}
