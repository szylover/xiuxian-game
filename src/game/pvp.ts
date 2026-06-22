import type { Player } from './player';
import type { MonsterDef, PvpDuelRecord, PvpSystemState, RankingEntry } from './types';
import { runCombat } from './combat';
import { buildRankingSnapshots, refreshRankingState } from './ranking';
import { getNpcDef } from './registry';
import { gainBodyRealmExp } from './body-cultivation';
import { PVP_TEXTS } from '../data/texts';

const DEFAULT_RATING = 1000;
const COOLDOWN_MONTHS = 1;
const RECORD_LIMIT = 8;

const DEFAULT_STATE: PvpSystemState = {
  rating: DEFAULT_RATING,
  wins: 0,
  losses: 0,
  cooldownUntilAge: 0,
  lastOpponentId: null,
  records: [],
};

export function getPvpState(player: Player): PvpSystemState {
  const raw = player.systems.pvp as Partial<PvpSystemState> | undefined;
  return {
    rating: typeof raw?.rating === 'number' ? raw.rating : DEFAULT_STATE.rating,
    wins: raw?.wins ?? 0,
    losses: raw?.losses ?? 0,
    cooldownUntilAge: raw?.cooldownUntilAge ?? 0,
    lastOpponentId: raw?.lastOpponentId ?? null,
    records: Array.isArray(raw?.records) ? raw.records : [],
  };
}

export function setPvpState(player: Player, state: PvpSystemState): Player {
  return { ...player, systems: { ...player.systems, pvp: state } };
}

export function getPvpCandidates(player: Player): RankingEntry[] {
  const snapshots = buildRankingSnapshots(player);
  const board = snapshots['core:combat_power'];
  if (!board) return [];
  const playerRank = board.playerRank ?? board.entries.length + 1;
  return board.entries
    .filter(entry => !entry.isPlayer && entry.source === 'npc')
    .filter(entry => Math.abs(entry.rank - playerRank) <= 12 || Math.abs(entry.realmIndex - player.realmIndex) <= 1)
    .slice(0, 12);
}

export function challengePvpOpponent(player: Player, opponentId: string) {
  const state = getPvpState(player);
  if (player.age < state.cooldownUntilAge) {
    return { player, success: false, message: PVP_TEXTS.logs.cooldown(state.cooldownUntilAge - player.age) };
  }
  const candidates = getPvpCandidates(player);
  const entry = candidates.find(candidate => candidate.id === opponentId);
  const npc = getNpcDef(opponentId);
  if (!entry || !npc) return { player, success: false, message: PVP_TEXTS.logs.invalidOpponent };

  const beforeRank = getPlayerCombatRank(player);
  const monster = npcToMonster(entry, npc);
  const result = runCombat(player, monster);
  let nextPlayer = { ...player };
  nextPlayer.hp = Math.max(1, result.playerHpLeft);
  nextPlayer.mp = Math.max(0, nextPlayer.mp - result.mpUsed);
  if (result.bodyExpGained > 0) nextPlayer = gainBodyRealmExp(nextPlayer, Math.max(1, Math.floor(result.bodyExpGained / 2))).player;

  const won = result.winner === 'player';
  const draw = result.winner === 'draw';
  const rewardExp = won ? Math.max(20, Math.floor(entry.score / 18)) : 0;
  const rewardGold = won ? Math.max(10, 20 + entry.rank * 3) : 0;
  nextPlayer.exp += rewardExp;
  nextPlayer.gold += rewardGold;

  const ratingDelta = won ? Math.max(12, Math.floor((entry.score - state.rating) / 40) + 25) : draw ? 3 : -18;
  const nextState = {
    ...state,
    rating: Math.max(100, state.rating + ratingDelta),
    wins: state.wins + (won ? 1 : 0),
    losses: state.losses + (!won && !draw ? 1 : 0),
    cooldownUntilAge: player.age + COOLDOWN_MONTHS,
    lastOpponentId: opponentId,
  };
  nextPlayer = setPvpState(nextPlayer, nextState);
  nextPlayer = refreshRankingState(nextPlayer, true);
  const afterRank = getPlayerCombatRank(nextPlayer);
  const record: PvpDuelRecord = {
    id: `pvp:${player.age}:${nextState.wins}:${nextState.losses}`,
    opponentId,
    opponentName: entry.name,
    opponentRank: entry.rank,
    playerWon: won,
    rankBefore: beforeRank,
    rankAfter: afterRank,
    rewardGold,
    rewardExp,
    age: player.age,
    year: player.gameYear,
    month: player.gameMonth,
    logs: result.logs.slice(-8),
  };
  nextPlayer = setPvpState(nextPlayer, { ...getPvpState(nextPlayer), records: [record, ...state.records].slice(0, RECORD_LIMIT) });

  const message = won
    ? PVP_TEXTS.logs.victory(entry.name, rewardExp, rewardGold, afterRank)
    : draw
      ? PVP_TEXTS.logs.draw(entry.name)
      : PVP_TEXTS.logs.defeat(entry.name);
  return { player: nextPlayer, success: won, message, record, combatResult: result };
}

function getPlayerCombatRank(player: Player): number | null {
  return buildRankingSnapshots(player)['core:combat_power']?.playerRank ?? null;
}

function npcToMonster(entry: RankingEntry, npc: NonNullable<ReturnType<typeof getNpcDef>>): MonsterDef {
  const scale = 1 + Math.max(0, entry.rank <= 3 ? 0.18 : entry.rank <= 10 ? 0.08 : 0);
  return {
    id: npc.id,
    name: npc.name,
    emoji: npc.emoji,
    realmIndex: npc.realmIndex,
    hp: Math.round(npc.hp * scale),
    atk: Math.round(npc.atk * scale),
    def: Math.round(npc.def * scale),
    speed: Math.round(npc.speed * scale),
    moveSpeed: Math.max(5, npc.speed),
    critRate: npc.critRate,
    critResist: npc.critResist,
    critDmgMultiplier: npc.critDmgMultiplier,
    expReward: 0,
    goldReward: 0,
  };
}

