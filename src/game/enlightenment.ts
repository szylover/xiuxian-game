import type { Player } from './player';
import type { DestinyTalentStatKey, EnlightenmentBuff, EnlightenmentInsightDef, EnlightenmentState, EnlightenmentTriggerResult } from './types';
import { getAllEnlightenmentInsightDefs } from './registry';
import { getAlignment } from './karma';
import { grantTalentPoints } from './destiny';
import { ATTR_NAMES, ENLIGHTENMENT_TEXTS } from '../data/texts';

const DEFAULT_STATE: EnlightenmentState = {
  comprehensionExp: 0,
  insightPoints: 0,
  unlockedInsightIds: [],
  activeBuffs: [],
  lastEventAge: -1,
  totalTriggers: 0,
};

export const ENLIGHTENMENT_POINT_EXP = 100;
export const CONTEMPLATE_COST = 1;

export function getEnlightenmentState(player: Player): EnlightenmentState {
  const raw = player.systems.enlightenment as Partial<EnlightenmentState> | undefined;
  return {
    comprehensionExp: typeof raw?.comprehensionExp === 'number' ? raw.comprehensionExp : 0,
    insightPoints: typeof raw?.insightPoints === 'number' ? raw.insightPoints : 0,
    unlockedInsightIds: Array.isArray(raw?.unlockedInsightIds) ? raw.unlockedInsightIds : [],
    activeBuffs: Array.isArray(raw?.activeBuffs) ? raw.activeBuffs : [],
    lastEventAge: typeof raw?.lastEventAge === 'number' ? raw.lastEventAge : -1,
    totalTriggers: typeof raw?.totalTriggers === 'number' ? raw.totalTriggers : 0,
  };
}

export function setEnlightenmentState(player: Player, state: EnlightenmentState): Player {
  return { ...player, systems: { ...player.systems, enlightenment: state } };
}

export function gainComprehension(player: Player, baseGain: number): { player: Player; logs: string[] } {
  const state = getEnlightenmentState(player);
  const gain = Math.max(1, Math.floor(baseGain * (1 + player.comprehension / 200)));
  const total = state.comprehensionExp + gain;
  const points = Math.floor(total / ENLIGHTENMENT_POINT_EXP);
  const nextState = {
    ...state,
    comprehensionExp: total % ENLIGHTENMENT_POINT_EXP,
    insightPoints: state.insightPoints + points,
  };
  const logs = [ENLIGHTENMENT_TEXTS.logs.progress(gain)];
  if (points > 0) logs.push(ENLIGHTENMENT_TEXTS.logs.pointGained(points));
  return { player: setEnlightenmentState(player, nextState), logs };
}

export function tryTriggerEnlightenment(player: Player, expGain: number, force = false): EnlightenmentTriggerResult {
  const state = getEnlightenmentState(player);
  const alignment = getAlignment(player.karma ?? 0);
  const chance = force ? 1 : getTriggerChance(player, alignment);
  if (!force && Math.random() >= chance) return { player, triggered: false, logs: [] };

  const routeDefs = getAvailableInsightDefs(player);
  const def = routeDefs[Math.floor(Math.random() * routeDefs.length)];
  const multiplier = alignment === 'evil' ? 2.4 : alignment === 'righteous' ? 1.35 : 1.75;
  const bonusExp = Math.max(5, Math.floor(expGain * multiplier * (1 + state.insightPoints * 0.04)));
  const buff: EnlightenmentBuff = {
    id: `buff:${player.age}:${state.totalTriggers + 1}`,
    name: def?.name ?? ENLIGHTENMENT_TEXTS.routes[alignment],
    remainingMonths: alignment === 'evil' ? 2 : 3,
    effect: def?.effect ?? { cultivationSpeedBonus: 0.08, breakthroughRateBonus: 0.02 },
  };
  const nextState = {
    ...state,
    activeBuffs: [...state.activeBuffs, buff].slice(-3),
    lastEventAge: player.age,
    totalTriggers: state.totalTriggers + 1,
  };
  const logs = [
    alignment === 'evil'
      ? ENLIGHTENMENT_TEXTS.logs.sudden(buff.name, bonusExp)
      : ENLIGHTENMENT_TEXTS.logs.gradual(buff.name, bonusExp),
  ];
  return {
    player: setEnlightenmentState({ ...player, exp: player.exp + bonusExp }, nextState),
    triggered: true,
    logs,
  };
}

export function contemplateInsight(player: Player): { player: Player; message: string } {
  const state = getEnlightenmentState(player);
  if (state.insightPoints < CONTEMPLATE_COST) {
    return { player, message: ENLIGHTENMENT_TEXTS.panel.contemplateHint(CONTEMPLATE_COST) };
  }
  const target = getNextUnlockableInsight(player);
  if (!target) return { player, message: ENLIGHTENMENT_TEXTS.logs.noInsightReady };
  const nextState = {
    ...state,
    insightPoints: state.insightPoints - CONTEMPLATE_COST,
    unlockedInsightIds: [...state.unlockedInsightIds, target.id],
  };
  let p = setEnlightenmentState(player, nextState);
  if (target.id === 'core:heaven_mind') p = grantTalentPoints(p, 1);
  return { player: p, message: ENLIGHTENMENT_TEXTS.logs.insightUnlocked(target.name) };
}

export function tickEnlightenmentBuffs(player: Player): Player {
  const state = getEnlightenmentState(player);
  const activeBuffs = state.activeBuffs
    .map(buff => ({ ...buff, remainingMonths: buff.remainingMonths - 1 }))
    .filter(buff => buff.remainingMonths > 0);
  if (activeBuffs.length === state.activeBuffs.length && activeBuffs.every((b, i) => b.remainingMonths === state.activeBuffs[i].remainingMonths)) return player;
  return setEnlightenmentState(player, { ...state, activeBuffs });
}

export function getEnlightenmentEffects(player: Player) {
  const effects = { cultivationSpeedBonus: 0, breakthroughRateBonus: 0, statBonuses: {} as Partial<Record<DestinyTalentStatKey, number>>, statMultipliers: {} as Partial<Record<DestinyTalentStatKey, number>> };
  const state = getEnlightenmentState(player);
  const defsById = new Map(getAllEnlightenmentInsightDefs().map(def => [def.id, def]));
  for (const id of state.unlockedInsightIds) mergeEffect(effects, defsById.get(id)?.effect);
  for (const buff of state.activeBuffs) mergeEffect(effects, buff.effect);
  return effects;
}

export function describeEnlightenmentEffect(effect: EnlightenmentInsightDef['effect']): string[] {
  const lines: string[] = [];
  if (effect.cultivationSpeedBonus) lines.push(ENLIGHTENMENT_TEXTS.effects.cultivation(Math.round(effect.cultivationSpeedBonus * 100)));
  if (effect.breakthroughRateBonus) lines.push(ENLIGHTENMENT_TEXTS.effects.breakthrough(Math.round(effect.breakthroughRateBonus * 100)));
  for (const [key, value] of Object.entries(effect.statBonuses ?? {}) as [DestinyTalentStatKey, number][]) {
    lines.push(ENLIGHTENMENT_TEXTS.effects.stat(ATTR_NAMES[key] ?? key, value));
  }
  for (const [key, value] of Object.entries(effect.statMultipliers ?? {}) as [DestinyTalentStatKey, number][]) {
    lines.push(ENLIGHTENMENT_TEXTS.effects.statPct(ATTR_NAMES[key] ?? key, Math.round(value * 100)));
  }
  return lines;
}

function getTriggerChance(player: Player, alignment: ReturnType<typeof getAlignment>): number {
  const comp = Math.min(0.06, player.comprehension / 2500);
  if (alignment === 'righteous') return 0.08 + comp;
  if (alignment === 'evil') return 0.04 + comp;
  return 0.06 + comp;
}

function getAvailableInsightDefs(player: Player): EnlightenmentInsightDef[] {
  const alignment = getAlignment(player.karma ?? 0);
  const state = getEnlightenmentState(player);
  const routeDefs = getAllEnlightenmentInsightDefs().filter(def =>
    (def.route === 'any' || def.route === alignment) && !state.unlockedInsightIds.includes(def.id));
  return routeDefs.length > 0 ? routeDefs : getAllEnlightenmentInsightDefs();
}

function getNextUnlockableInsight(player: Player): EnlightenmentInsightDef | undefined {
  const alignment = getAlignment(player.karma ?? 0);
  const state = getEnlightenmentState(player);
  return getAllEnlightenmentInsightDefs().find(def =>
    !state.unlockedInsightIds.includes(def.id)
    && state.insightPoints >= def.requiredInsight
    && (def.route === 'any' || def.route === alignment));
}

function mergeEffect(target: ReturnType<typeof getEnlightenmentEffects>, effect?: EnlightenmentInsightDef['effect']): void {
  if (!effect) return;
  target.cultivationSpeedBonus += effect.cultivationSpeedBonus ?? 0;
  target.breakthroughRateBonus += effect.breakthroughRateBonus ?? 0;
  for (const [key, value] of Object.entries(effect.statBonuses ?? {}) as [DestinyTalentStatKey, number][]) {
    target.statBonuses[key] = (target.statBonuses[key] ?? 0) + value;
  }
  for (const [key, value] of Object.entries(effect.statMultipliers ?? {}) as [DestinyTalentStatKey, number][]) {
    target.statMultipliers[key] = (target.statMultipliers[key] ?? 0) + value;
  }
}
