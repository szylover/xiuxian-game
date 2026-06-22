// ============================================================
// game/primordial-endgame.ts — 洪荒终局核心逻辑（#104）
// ============================================================

import type { Player } from './player';
import type { PrimordialEndgameDef, PrimordialEndgameState } from './types';
import { getAllPrimordialEndgameDefs, getItemDef } from './registry';
import { getItemCount, removeItem, addItem } from './inventory';
import { runCombat } from './combat';
import { PRIMORDIAL_ENDGAME_TEXTS } from '../data/texts';

const DEFAULT_STATE: PrimordialEndgameState = {
  attemptedIds: [],
  completedId: null,
  endingRoute: null,
  endingTitle: null,
  endingText: null,
  completedAtAge: null,
};

export interface PrimordialEndgameStatus {
  availableDefs: PrimordialEndgameDef[];
  selectedDef: PrimordialEndgameDef | null;
  canChallenge: boolean;
  completed: boolean;
  missing: string[];
  state: PrimordialEndgameState;
}

export interface PrimordialEndgameResult {
  player: Player;
  success: boolean;
  logs: string[];
  def: PrimordialEndgameDef | null;
}

export function getPrimordialEndgameState(player: Player): PrimordialEndgameState {
  const raw = player.systems.primordialEndgame as Partial<PrimordialEndgameState> | undefined;
  return { ...DEFAULT_STATE, ...(raw ?? {}) };
}

export function setPrimordialEndgameState(player: Player, state: PrimordialEndgameState): Player {
  return { ...player, systems: { ...player.systems, primordialEndgame: state } };
}

export function getPrimordialEndgameStatus(player: Player): PrimordialEndgameStatus {
  const state = getPrimordialEndgameState(player);
  const defs = getAllPrimordialEndgameDefs();
  const eligible = defs.filter(def => def.requirement.realmIndex <= player.realmIndex);
  const selectedDef = chooseEndgameDef(player, eligible);
  const missing = selectedDef ? getMissingRequirements(player, selectedDef) : [PRIMORDIAL_ENDGAME_TEXTS.notReady];
  return {
    availableDefs: eligible,
    selectedDef,
    canChallenge: !!selectedDef && !state.completedId && missing.length === 0,
    completed: !!state.completedId,
    missing,
    state,
  };
}

export function attemptPrimordialEndgame(player: Player, defId?: string): PrimordialEndgameResult {
  const defs = getAllPrimordialEndgameDefs();
  const def = defId ? defs.find(d => d.id === defId) : chooseEndgameDef(player, defs);
  if (!def) return { player, success: false, logs: [PRIMORDIAL_ENDGAME_TEXTS.notReady], def: null };
  const missing = getMissingRequirements(player, def);
  if (missing.length > 0) return { player, success: false, logs: missing, def };

  let p = { ...player };
  for (const cost of def.requirement.requiredItems) {
    p = removeItem(p, cost.itemId, cost.count);
  }

  const combat = runCombat(p, def.boss);
  const logs = [...combat.logs];
  const state = getPrimordialEndgameState(p);
  const attemptedIds = Array.from(new Set([...state.attemptedIds, def.id]));

  if (combat.winner !== 'player') {
    p = setPrimordialEndgameState({ ...p, hp: Math.max(1, Math.floor(p.maxHp * 0.1)) }, { ...state, attemptedIds });
    logs.push(PRIMORDIAL_ENDGAME_TEXTS.defeatLog);
    return { player: p, success: false, logs, def };
  }

  p.exp += combat.expGained;
  p.gold += combat.goldGained;
  p.hp = Math.max(1, combat.playerHpLeft);
  for (const reward of def.rewards.items) {
    p = addItem(p, reward.itemId, reward.count).player;
  }
  p = setPrimordialEndgameState(p, {
    attemptedIds,
    completedId: def.id,
    endingRoute: def.route,
    endingTitle: def.endingTitle,
    endingText: def.endingText,
    completedAtAge: p.age,
  });
  p.systems = {
    ...p.systems,
    primordialEndgame: {
      ...(p.systems.primordialEndgame as object),
      legacyMultiplierBonus: def.rewards.legacyMultiplierBonus,
    },
  };
  logs.push(PRIMORDIAL_ENDGAME_TEXTS.victoryLog(def.endingTitle));
  return { player: p, success: true, logs, def };
}

function chooseEndgameDef(player: Player, defs: PrimordialEndgameDef[]): PrimordialEndgameDef | null {
  if (defs.length === 0) return null;
  const karma = player.karma ?? 0;
  const preferred = karma >= 30 ? 'righteous' : karma <= -30 ? 'evil' : 'transcendent';
  return defs.find(def => def.route === preferred) ?? defs[0] ?? null;
}

function getMissingRequirements(player: Player, def: PrimordialEndgameDef): string[] {
  const missing: string[] = [];
  if (player.realmIndex < def.requirement.realmIndex || player.exp < def.requirement.minExp) {
    missing.push(def.requirement.description);
  }
  for (const cost of def.requirement.requiredItems) {
    const have = getItemCount(player, cost.itemId);
    if (have < cost.count) {
      missing.push(PRIMORDIAL_ENDGAME_TEXTS.missingItem(getItemDef(cost.itemId)?.name ?? cost.itemId, have, cost.count));
    }
  }
  if (!def.requirement.condition(player)) missing.push(def.requirement.description);
  return Array.from(new Set(missing));
}
