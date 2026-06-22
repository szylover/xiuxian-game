import type { Player } from './player';
import type { HeartDemonSource, HeartDemonSystemState } from './types';
import { getAlignment } from './karma';
import { getEnlightenmentState, gainComprehension } from './enlightenment';
import { HEART_DEMON_TEXTS } from '../data/texts';

const DEFAULT_MAX = 100;
const SUPPRESS_COST = 12;

const DEFAULT_STATE: HeartDemonSystemState = {
  value: 0,
  maxValue: DEFAULT_MAX,
  suppressedUntilAge: null,
  lastTriggerAge: -1,
  conqueredCount: 0,
  failedCount: 0,
  activeDebuffs: [],
  history: [],
};

export function getHeartDemonState(player: Player): HeartDemonSystemState {
  const raw = player.systems.heartDemon as Partial<HeartDemonSystemState> | undefined;
  return {
    value: clamp(raw?.value ?? 0, 0, raw?.maxValue ?? DEFAULT_MAX),
    maxValue: raw?.maxValue ?? DEFAULT_MAX,
    suppressedUntilAge: typeof raw?.suppressedUntilAge === 'number' ? raw.suppressedUntilAge : null,
    lastTriggerAge: typeof raw?.lastTriggerAge === 'number' ? raw.lastTriggerAge : -1,
    conqueredCount: raw?.conqueredCount ?? 0,
    failedCount: raw?.failedCount ?? 0,
    activeDebuffs: Array.isArray(raw?.activeDebuffs) ? raw.activeDebuffs : [],
    history: Array.isArray(raw?.history) ? raw.history : [],
  };
}

export function setHeartDemonState(player: Player, state: HeartDemonSystemState): Player {
  return { ...player, systems: { ...player.systems, heartDemon: state } };
}

export function addHeartDemon(player: Player, amount: number, source: HeartDemonSource): { player: Player; logs: string[] } {
  if (amount <= 0) return { player, logs: [] };
  const state = getHeartDemonState(player);
  if (state.suppressedUntilAge !== null && player.age < state.suppressedUntilAge) {
    amount = Math.max(1, Math.floor(amount * 0.4));
  }
  const alignment = getAlignment(player.karma ?? 0);
  if (alignment === 'evil') amount = Math.ceil(amount * 1.25);
  if (alignment === 'righteous') amount = Math.max(1, Math.floor(amount * 0.85));
  const nextValue = clamp(state.value + amount, 0, state.maxValue);
  const reason = source === 'breakthrough_fail' ? HEART_DEMON_TEXTS.reasons.breakthroughFail : HEART_DEMON_TEXTS.reasons[source];
  const nextState = {
    ...state,
    value: nextValue,
    history: [HEART_DEMON_TEXTS.history.gain(nextValue - state.value, reason, nextValue), ...state.history].slice(0, 8),
  };
  const logs = nextValue >= 60 && state.value < 60 ? [HEART_DEMON_TEXTS.logs.warning(nextValue)] : [];
  return { player: setHeartDemonState(player, nextState), logs };
}

export function suppressHeartDemon(player: Player): { player: Player; logs: string[] } {
  const state = getHeartDemonState(player);
  if (state.suppressedUntilAge !== null && player.age < state.suppressedUntilAge) {
    return { player, logs: [HEART_DEMON_TEXTS.logs.suppressCooldown] };
  }
  if (player.mentalPower < SUPPRESS_COST) return { player, logs: [HEART_DEMON_TEXTS.logs.suppressNoMind] };
  const insight = getEnlightenmentState(player).insightPoints;
  const amount = Math.min(state.value, 14 + Math.floor(player.comprehension / 12) + insight * 2);
  const nextState = {
    ...state,
    value: Math.max(0, state.value - amount),
    suppressedUntilAge: player.age + 3,
    history: [HEART_DEMON_TEXTS.history.suppress(amount), ...state.history].slice(0, 8),
  };
  return {
    player: setHeartDemonState({ ...player, mentalPower: player.mentalPower - SUPPRESS_COST, mood: Math.min(100, player.mood + 4) }, nextState),
    logs: [HEART_DEMON_TEXTS.logs.suppressed(amount, nextState.value)],
  };
}

export function tryHeartDemonTribulation(player: Player, force = false): { player: Player; triggered: boolean; success: boolean; logs: string[] } {
  const state = getHeartDemonState(player);
  const chance = force ? 1 : getTribulationChance(player, state);
  if (!force && Math.random() >= chance) return { player, triggered: false, success: false, logs: [] };
  const power = player.comprehension * 0.45 + player.mentalPower * 0.35 + player.mood * 0.2 + getEnlightenmentState(player).insightPoints * 8;
  const difficulty = 35 + state.value * 0.85 + player.realmIndex * 4 + Math.max(0, -player.karma) * 0.18;
  const success = force ? power + Math.random() * 40 >= difficulty : power + Math.random() * 60 >= difficulty;
  const logs: string[] = [HEART_DEMON_TEXTS.logs.tribulationStart];
  if (success) {
    const reduce = Math.min(state.value, 35 + Math.floor(player.comprehension / 6));
    const nextState = {
      ...state,
      value: state.value - reduce,
      lastTriggerAge: player.age,
      conqueredCount: state.conqueredCount + 1,
      history: [HEART_DEMON_TEXTS.history.conquer(reduce), ...state.history].slice(0, 8),
    };
    let nextPlayer = setHeartDemonState({ ...player, mood: Math.min(100, player.mood + 10) }, nextState);
    const insight = gainComprehension(nextPlayer, Math.max(8, Math.floor(reduce / 2)));
    nextPlayer = insight.player;
    logs.push(HEART_DEMON_TEXTS.logs.tribulationSuccess(reduce), ...insight.logs);
    return { player: nextPlayer, triggered: true, success: true, logs };
  }
  const debuff = {
    id: `heart-demon:${player.age}:${state.failedCount + 1}`,
    name: HEART_DEMON_TEXTS.debuffName,
    remainingMonths: 6,
    cultivationSpeedMultiplier: 0.7,
    breakthroughRatePenalty: 0.12,
  };
  const nextState = {
    ...state,
    value: Math.min(state.maxValue, state.value + 10),
    lastTriggerAge: player.age,
    failedCount: state.failedCount + 1,
    activeDebuffs: [...state.activeDebuffs, debuff].slice(-2),
    history: [HEART_DEMON_TEXTS.history.fail, ...state.history].slice(0, 8),
  };
  logs.push(HEART_DEMON_TEXTS.logs.tribulationFail);
  return {
    player: setHeartDemonState({
      ...player,
      hp: Math.max(1, Math.floor(player.hp * 0.75)),
      health: Math.max(0, player.health - 12),
      mood: Math.max(0, player.mood - 15),
    }, nextState),
    triggered: true,
    success: false,
    logs,
  };
}

export function tickHeartDemon(player: Player): { player: Player; logs: string[] } {
  const state = getHeartDemonState(player);
  const activeDebuffs = state.activeDebuffs
    .map(buff => ({ ...buff, remainingMonths: buff.remainingMonths - 1 }))
    .filter(buff => buff.remainingMonths > 0);
  const expired = state.activeDebuffs.filter(buff => !activeDebuffs.some(next => next.id === buff.id));
  const suppressedUntilAge = state.suppressedUntilAge !== null && player.age >= state.suppressedUntilAge ? null : state.suppressedUntilAge;
  if (activeDebuffs.length === state.activeDebuffs.length && suppressedUntilAge === state.suppressedUntilAge) {
    return { player, logs: [] };
  }
  return {
    player: setHeartDemonState(player, { ...state, activeDebuffs, suppressedUntilAge }),
    logs: expired.map(buff => HEART_DEMON_TEXTS.logs.debuffExpired(buff.name)),
  };
}

export function getHeartDemonEffects(player: Player): { cultivationSpeedMultiplier: number; breakthroughRatePenalty: number; riskLevel: number } {
  const state = getHeartDemonState(player);
  const valuePenalty = state.value >= 80 ? 0.8 : state.value >= 60 ? 0.9 : 1;
  return state.activeDebuffs.reduce((acc, buff) => ({
    cultivationSpeedMultiplier: acc.cultivationSpeedMultiplier * buff.cultivationSpeedMultiplier,
    breakthroughRatePenalty: acc.breakthroughRatePenalty + buff.breakthroughRatePenalty,
    riskLevel: acc.riskLevel,
  }), {
    cultivationSpeedMultiplier: valuePenalty,
    breakthroughRatePenalty: state.value >= 70 ? 0.04 : 0,
    riskLevel: state.value / state.maxValue,
  });
}

export function getHeartDemonSuppressCost(): number {
  return SUPPRESS_COST;
}

function getTribulationChance(player: Player, state: HeartDemonSystemState): number {
  if (state.value < 70) return 0;
  if (state.suppressedUntilAge !== null && player.age < state.suppressedUntilAge) return 0;
  const cooldown = Math.max(0, player.age - state.lastTriggerAge);
  const base = state.value >= 95 ? 0.45 : state.value >= 85 ? 0.28 : 0.14;
  return cooldown < 2 ? 0 : base + Math.max(0, -player.karma) / 500;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
