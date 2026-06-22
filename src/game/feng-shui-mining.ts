import type { Player } from './player';
import { addItem } from './inventory';
import { getCurrentRegion, checkRegionAccess } from './map';
import { getItemDef } from './registry';
import { MINING_TEXTS } from '../data/texts';

export interface MiningYieldDef {
  itemId: string;
  min: number;
  max: number;
  weight: number;
  rare?: boolean;
}

export interface MiningSiteDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  regionId?: string;
  regionTags: string[];
  minRealm: number;
  fengShui: number;
  staminaCost: number;
  months: number;
  baseYields: number;
  yields: MiningYieldDef[];
}

export interface MiningSystemState {
  minedCount: number;
  lastSiteId?: string;
  lastMinedAt?: number;
  totalFengShui: number;
}

export interface MiningActionResult {
  player: Player;
  logs: string[];
}

const DEFAULT_STATE: MiningSystemState = { minedCount: 0, totalFengShui: 0 };
const miningSiteRegistry: MiningSiteDef[] = [];

export function registerMiningSites(sites: MiningSiteDef[]): void {
  for (const site of sites) {
    if (!miningSiteRegistry.some(x => x.id === site.id)) miningSiteRegistry.push(site);
  }
}

export function clearMiningSites(): void {
  miningSiteRegistry.length = 0;
}

export function getAllMiningSites(): MiningSiteDef[] {
  return miningSiteRegistry;
}

export function getMiningState(player: Player): MiningSystemState {
  const raw = player.systems.mining as Partial<MiningSystemState> | undefined;
  return {
    minedCount: typeof raw?.minedCount === 'number' ? raw.minedCount : DEFAULT_STATE.minedCount,
    lastSiteId: raw?.lastSiteId,
    lastMinedAt: raw?.lastMinedAt,
    totalFengShui: typeof raw?.totalFengShui === 'number' ? raw.totalFengShui : DEFAULT_STATE.totalFengShui,
  };
}

export function setMiningState(player: Player, state: MiningSystemState): Player {
  return { ...player, systems: { ...player.systems, mining: state } };
}

export function getAvailableMiningSites(player: Player): MiningSiteDef[] {
  const region = getCurrentRegion(player);
  const tags = region?.regionTags ?? [];
  return miningSiteRegistry.filter(site => player.realmIndex >= site.minRealm
    && (!site.regionId || site.regionId === region?.id)
    && (!site.regionTags.length || site.regionTags.some(tag => tags.includes(tag))));
}

export function getMiningLockReason(player: Player, siteId: string): string | null {
  const site = miningSiteRegistry.find(s => s.id === siteId);
  if (!site) return MINING_TEXTS.logs.siteMissing;
  if (player.realmIndex < site.minRealm) return MINING_TEXTS.panel.lockRealm;
  if (player.stamina < site.staminaCost) return MINING_TEXTS.logs.staminaInsufficient(site.staminaCost, player.stamina);
  if (site.regionId) {
    const access = checkRegionAccess(player, site.regionId);
    if (!access.canEnter) return access.reason ?? MINING_TEXTS.panel.lockRegion;
    if (getCurrentRegion(player)?.id !== site.regionId) return MINING_TEXTS.panel.lockRegion;
  }
  return null;
}

export function performMining(player: Player, siteId: string): MiningActionResult {
  const site = miningSiteRegistry.find(s => s.id === siteId);
  if (!site) return { player, logs: [MINING_TEXTS.logs.siteMissing] };
  const lock = getMiningLockReason(player, siteId);
  if (lock) return { player, logs: [lock] };
  let p = { ...player, stamina: player.stamina - site.staminaCost };
  p = advanceMonths(p, site.months);
  const yields = rollYields(p, site);
  const parts: string[] = [];
  for (const [itemId, count] of yields.entries()) {
    const result = addItem(p, itemId, count);
    p = result.player;
    const def = getItemDef(itemId);
    parts.push(MINING_TEXTS.logs.rewardItem(def?.name ?? itemId, result.added));
  }
  const state = getMiningState(p);
  p = setMiningState(p, {
    minedCount: state.minedCount + 1,
    lastSiteId: site.id,
    lastMinedAt: p.age,
    totalFengShui: state.totalFengShui + site.fengShui,
  });
  return { player: p, logs: [MINING_TEXTS.logs.mined(site.name, site.fengShui, parts.join(MINING_TEXTS.labels.separator))] };
}

export function getFengShuiGrade(value: number): string {
  if (value >= 5) return MINING_TEXTS.grades.excellent;
  if (value >= 4) return MINING_TEXTS.grades.good;
  if (value >= 3) return MINING_TEXTS.grades.normal;
  if (value >= 2) return MINING_TEXTS.grades.poor;
  return MINING_TEXTS.grades.bad;
}

function rollYields(player: Player, site: MiningSiteDef): Map<string, number> {
  const miningApt = player.aptitudes.mining ?? 0;
  const fengApt = player.aptitudes.fengshui ?? 0;
  const attempts = Math.max(1, site.baseYields + Math.floor(site.fengShui / 2) + Math.floor(miningApt / 45));
  const rareBoost = site.fengShui * 0.06 + player.luck * 0.002 + fengApt * 0.003;
  const result = new Map<string, number>();
  for (let i = 0; i < attempts; i += 1) {
    const pool = site.yields.map(y => ({ ...y, weight: y.weight * (y.rare ? (1 + rareBoost) : 1) }));
    const picked = weightedPick(pool);
    if (!picked) continue;
    const bonus = Math.random() < (site.fengShui * 0.08 + miningApt * 0.002) ? 1 : 0;
    const count = randInt(picked.min, picked.max) + bonus;
    result.set(picked.itemId, (result.get(picked.itemId) ?? 0) + count);
  }
  return result;
}

function advanceMonths(player: Player, months: number): Player {
  let gameMonth = player.gameMonth + months;
  let gameYear = player.gameYear;
  if (gameMonth > 12) {
    gameYear += Math.floor((gameMonth - 1) / 12);
    gameMonth = ((gameMonth - 1) % 12) + 1;
  }
  return { ...player, age: player.age + months, gameYear, gameMonth };
}

function weightedPick(items: MiningYieldDef[]): MiningYieldDef | undefined {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= Math.max(0, item.weight);
    if (roll <= 0) return item;
  }
  return items[0];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
