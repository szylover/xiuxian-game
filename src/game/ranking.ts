import type { Player } from './player';
import type { NpcDef, RankingDimensionDef, RankingEntry, RankingSnapshot, RankingSystemState } from './types';
import { getAllNpcDefs, getAllRankingDimensionDefs } from './registry';

const DEFAULT_STATE: RankingSystemState = {
  snapshots: {},
  lastRefreshAge: -1,
};

export const CORE_RANKING_DIMENSIONS: RankingDimensionDef[] = [
  { id: 'core:realm_progress', board: 'leaderboard', scoreKey: 'realm', order: 10, limit: 50 },
  { id: 'core:combat_power', board: 'leaderboard', scoreKey: 'power', order: 20, limit: 50 },
  { id: 'core:wealth', board: 'leaderboard', scoreKey: 'wealth', order: 30, limit: 50 },
  { id: 'core:reputation', board: 'leaderboard', scoreKey: 'reputation', order: 40, limit: 50 },
  { id: 'core:technique_mastery', board: 'leaderboard', scoreKey: 'technique', order: 50, limit: 50 },
  { id: 'core:heaven_chosen', board: 'celestial', scoreKey: 'destiny', order: 10, limit: 30 },
  { id: 'core:prodigy', board: 'celestial', scoreKey: 'talent', order: 20, limit: 30 },
];

export function getRankingState(player: Player): RankingSystemState {
  const raw = player.systems.ranking;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STATE, snapshots: {} };
  const state = raw as Partial<RankingSystemState>;
  return {
    snapshots: state.snapshots ?? {},
    lastRefreshAge: typeof state.lastRefreshAge === 'number' ? state.lastRefreshAge : -1,
  };
}

export function refreshRankingState(player: Player, force = false): Player {
  const state = getRankingState(player);
  if (!force && state.lastRefreshAge === player.age) return player;
  return {
    ...player,
    systems: {
      ...player.systems,
      ranking: {
        snapshots: buildRankingSnapshots(player),
        lastRefreshAge: player.age,
      } satisfies RankingSystemState,
    },
  };
}

export function buildRankingSnapshots(player: Player): Record<string, RankingSnapshot> {
  const snapshots: Record<string, RankingSnapshot> = {};
  for (const dimension of getAllRankingDimensionDefs()) {
    snapshots[dimension.id] = buildRankingSnapshot(player, dimension);
  }
  return snapshots;
}

function buildRankingSnapshot(player: Player, dimension: RankingDimensionDef): RankingSnapshot {
  const entries = buildEntries(player, dimension);
  const playerEntry = entries.find(entry => entry.isPlayer);
  return {
    dimensionId: dimension.id,
    entries: entries.slice(0, dimension.limit),
    playerRank: playerEntry?.rank ?? null,
    playerScore: playerEntry?.score ?? 0,
    refreshedAtAge: player.age,
    refreshedAtYear: player.gameYear,
    refreshedAtMonth: player.gameMonth,
  };
}

function buildEntries(player: Player, dimension: RankingDimensionDef): RankingEntry[] {
  const entries: Omit<RankingEntry, 'rank'>[] = [];
  if (!dimension.playerEligible || dimension.playerEligible(player)) {
    entries.push({
      id: 'player',
      source: 'player',
      name: player.name,
      emoji: '🧑',
      realmIndex: player.realmIndex,
      score: scorePlayer(player, dimension.scoreKey),
      isPlayer: true,
    });
  }

  for (const npc of getAllNpcDefs()) {
    if (dimension.npcEligible && !dimension.npcEligible(npc, player)) continue;
    entries.push({
      id: npc.id,
      source: 'npc',
      name: npc.name,
      title: npc.title,
      emoji: npc.emoji,
      realmIndex: npc.realmIndex,
      score: scoreNpc(npc, dimension.scoreKey),
      isPlayer: false,
    });
  }

  return entries
    .sort((a, b) => compareEntries(a, b))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function compareEntries(a: Omit<RankingEntry, 'rank'>, b: Omit<RankingEntry, 'rank'>): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.realmIndex !== a.realmIndex) return b.realmIndex - a.realmIndex;
  const powerDiff = estimateEntryPower(b) - estimateEntryPower(a);
  if (powerDiff !== 0) return powerDiff;
  return a.id.localeCompare(b.id);
}

function scorePlayer(player: Player, key: RankingDimensionDef['scoreKey']): number {
  if (key === 'realm') return player.realmIndex * 100000 + player.exp;
  if (key === 'power') return calcPlayerPower(player);
  if (key === 'wealth') return player.gold + player.inventory.length * 25 + player.realmIndex * 500;
  if (key === 'reputation') return calcPlayerReputation(player);
  if (key === 'technique') return player.techniques.reduce((sum, slot) => sum + slot.level * 100 + slot.exp, 0);
  if (key === 'destiny') return calcPlayerPower(player) + player.luck * 40 + player.charisma * 25 + calcPlayerReputation(player) * 2;
  return player.comprehension * 45 + player.luck * 30 + player.charisma * 20 + player.techniques.length * 150 + player.realmIndex * 300;
}

function scoreNpc(npc: NpcDef, key: RankingDimensionDef['scoreKey']): number {
  if (key === 'realm') return npc.realmIndex * 100000 + npcPowerSeed(npc) % 50000;
  if (key === 'power') return calcNpcPower(npc);
  if (key === 'wealth') return npc.realmIndex * 800 + npc.charisma * 30 + npc.roles.length * 120 + npcPowerSeed(npc) % 700;
  if (key === 'reputation') return npc.realmIndex * 120 + npc.charisma * 4 + dispositionWeight(npc) + roleWeight(npc);
  if (key === 'technique') return npc.realmIndex * 260 + npc.charisma * 8 + npcPowerSeed(npc) % 450;
  if (key === 'destiny') return calcNpcPower(npc) + npc.realmIndex * 650 + npc.charisma * 28 + npcPowerSeed(npc) % 1200;
  return npc.realmIndex * 420 + npc.charisma * 34 + npcPowerSeed(npc) % 900;
}

function calcPlayerPower(player: Player): number {
  return Math.round(
    player.maxHp * 1.2
    + player.maxMp * 0.7
    + player.atk * 18
    + player.def * 14
    + player.speed * 8
    + player.critRate * 10
    + player.critResist * 8
    + player.realmIndex * 1000
    + player.bodyRealmIndex * 650,
  );
}

function calcNpcPower(npc: NpcDef): number {
  return Math.round(
    npc.hp * 1.2
    + npc.atk * 18
    + npc.def * 14
    + npc.speed * 8
    + npc.critRate * 10
    + npc.critResist * 8
    + npc.realmIndex * 1000,
  );
}

function calcPlayerReputation(player: Player): number {
  const achievementState = player.systems.achievement as { unlockedIds?: string[] } | undefined;
  return player.tracking.killCount * 8
    + player.tracking.bossKillCount * 80
    + (achievementState?.unlockedIds?.length ?? 0) * 120
    + player.realmIndex * 150
    + player.charisma * 3;
}

function estimateEntryPower(entry: Omit<RankingEntry, 'rank'>): number {
  return entry.score + entry.realmIndex * 1000;
}

function roleWeight(npc: NpcDef): number {
  return npc.roles.reduce((sum, role) => {
    if (role === 'sect_leader') return sum + 500;
    if (role === 'elder') return sum + 300;
    if (role === 'rival') return sum + 180;
    if (role === 'wanderer') return sum + 100;
    return sum + 60;
  }, 0);
}

function dispositionWeight(npc: NpcDef): number {
  if (npc.disposition === 'friendly') return 60;
  if (npc.disposition === 'hostile') return 140;
  return 100;
}

function npcPowerSeed(npc: NpcDef): number {
  let hash = 0;
  for (let i = 0; i < npc.id.length; i += 1) {
    hash = (hash * 31 + npc.id.charCodeAt(i)) >>> 0;
  }
  return hash;
}
