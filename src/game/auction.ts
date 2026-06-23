import type { Player } from './player';
import { addItem, hasItem, removeItem } from './inventory';
import { getCurrentRegion } from './map';
import { getItemDef } from './registry';
import { AUCTION_TEXTS } from '../data/texts';

export interface AuctionLotDef {
  id: string;
  itemId: string;
  count: number;
  basePrice: number;
  minRealm: number;
  weight: number;
  regionTags: string[];
}

export interface AuctionLotState {
  id: string;
  templateId: string;
  itemId: string;
  count: number;
  basePrice: number;
  currentBid: number;
  highestBidder: 'none' | 'player' | string;
  playerBid: number;
  endsAt: number;
  aiBids: number;
}

export interface AuctionConsignmentState {
  id: string;
  itemId: string;
  count: number;
  askPrice: number;
  listedAt: number;
  endsAt: number;
}

export interface AuctionSystemState {
  lots: AuctionLotState[];
  consignments: AuctionConsignmentState[];
  lastRefreshAge: number;
  cycleIndex: number;
  history: string[];
}

export interface AuctionActionResult {
  player: Player;
  logs: string[];
}

const AUCTION_SIZE = 4;
const REFRESH_MONTHS = 6;
const CONSIGN_MONTHS = 6;
const SELL_FEE_RATE = 0.1;
const DEFAULT_STATE: AuctionSystemState = { lots: [], consignments: [], lastRefreshAge: -1, cycleIndex: 0, history: [] };
const auctionLotRegistry: AuctionLotDef[] = [];

export function registerAuctionLots(lots: AuctionLotDef[]): void {
  for (const lot of lots) {
    if (!auctionLotRegistry.some(x => x.id === lot.id)) auctionLotRegistry.push(lot);
  }
}

export function clearAuctionLots(): void {
  auctionLotRegistry.length = 0;
}

export function getAllAuctionLotDefs(): AuctionLotDef[] {
  return auctionLotRegistry;
}

export function getAuctionState(player: Player): AuctionSystemState {
  const raw = player.systems.auction as Partial<AuctionSystemState> | undefined;
  return {
    lots: raw?.lots ?? DEFAULT_STATE.lots,
    consignments: raw?.consignments ?? DEFAULT_STATE.consignments,
    lastRefreshAge: typeof raw?.lastRefreshAge === 'number' ? raw.lastRefreshAge : DEFAULT_STATE.lastRefreshAge,
    cycleIndex: typeof raw?.cycleIndex === 'number' ? raw.cycleIndex : DEFAULT_STATE.cycleIndex,
    history: raw?.history ?? DEFAULT_STATE.history,
  };
}

export function setAuctionState(player: Player, state: AuctionSystemState): Player {
  return { ...player, systems: { ...player.systems, auction: state } };
}

export function ensureAuctionHouse(player: Player, force = false): AuctionActionResult {
  let p = player;
  const settled = settleDueAuctions(p);
  p = settled.player;
  const state = getAuctionState(p);
  const shouldRefresh = force || state.lastRefreshAge < 0 || p.age - state.lastRefreshAge >= REFRESH_MONTHS || state.lots.length === 0;
  if (!shouldRefresh) return { player: p, logs: settled.logs };
  const nextState: AuctionSystemState = {
    ...state,
    lots: generateLots(p, state.cycleIndex + 1),
    lastRefreshAge: p.age,
    cycleIndex: state.cycleIndex + 1,
    history: [AUCTION_TEXTS.logs.refreshed, ...state.history].slice(0, 12),
  };
  return { player: setAuctionState(p, nextState), logs: [...settled.logs, AUCTION_TEXTS.logs.refreshed] };
}

export function refreshAuctionHouse(player: Player): AuctionActionResult {
  return ensureAuctionHouse(player, true);
}

export function placeAuctionBid(player: Player, lotId: string, bidAmount?: number): AuctionActionResult {
  const ensured = ensureAuctionHouse(player);
  let p = ensured.player;
  const state = getAuctionState(p);
  const lot = state.lots.find(x => x.id === lotId);
  if (!lot) return { player: p, logs: [...ensured.logs, AUCTION_TEXTS.logs.lotMissing] };
  const nextBid = bidAmount ?? getNextBid(lot.currentBid || lot.basePrice);
  const minimum = getNextBid(lot.currentBid || lot.basePrice);
  if (nextBid < minimum) return { player: p, logs: [...ensured.logs, AUCTION_TEXTS.logs.bidTooLow(minimum)] };
  const extraCost = nextBid - (lot.highestBidder === 'player' ? lot.playerBid : 0);
  if (p.gold < extraCost) return { player: p, logs: [...ensured.logs, AUCTION_TEXTS.logs.goldInsufficient(extraCost, p.gold)] };
  p = { ...p, gold: p.gold - extraCost };
  let nextLot: AuctionLotState = { ...lot, currentBid: nextBid, highestBidder: 'player', playerBid: nextBid };
  const ai = runAiCompetition(nextLot, p);
  nextLot = ai.lot;
  const logs = [...ensured.logs, AUCTION_TEXTS.logs.playerBid(describeLot(lot), nextBid)];
  if (nextLot.highestBidder !== 'player') {
    p = { ...p, gold: p.gold + nextBid };
    nextLot = { ...nextLot, playerBid: 0 };
    logs.push(AUCTION_TEXTS.logs.aiOutbid(nextLot.highestBidder, nextLot.currentBid));
  } else if (ai.raised) {
    logs.push(AUCTION_TEXTS.logs.playerLeading(nextLot.currentBid));
  }
  const lots = state.lots.map(x => x.id === lotId ? nextLot : x);
  p = setAuctionState(p, { ...getAuctionState(p), lots });
  return { player: p, logs };
}

export function consignAuctionItem(player: Player, itemId: string, count: number, askPrice: number): AuctionActionResult {
  const ensured = ensureAuctionHouse(player);
  let p = ensured.player;
  const def = getItemDef(itemId);
  if (!def) return { player: p, logs: [...ensured.logs, AUCTION_TEXTS.logs.itemMissing] };
  const safeCount = Math.max(1, Math.floor(count));
  const safeAsk = Math.max(1, Math.floor(askPrice));
  if (!hasItem(p, itemId, safeCount)) return { player: p, logs: [...ensured.logs, AUCTION_TEXTS.logs.itemInsufficient(def.name)] };
  p = removeItem(p, itemId, safeCount);
  const state = getAuctionState(p);
  const consignment: AuctionConsignmentState = {
    id: `consign:${p.age}:${state.consignments.length}:${itemId}`,
    itemId,
    count: safeCount,
    askPrice: safeAsk,
    listedAt: p.age,
    endsAt: p.age + CONSIGN_MONTHS,
  };
  p = setAuctionState(p, { ...state, consignments: [...state.consignments, consignment] });
  return { player: p, logs: [...ensured.logs, AUCTION_TEXTS.logs.consigned(def.name, safeCount, safeAsk)] };
}

export function settleDueAuctions(player: Player, force = false): AuctionActionResult {
  let p = player;
  const state = getAuctionState(p);
  const logs: string[] = [];
  const remainingLots: AuctionLotState[] = [];
  for (const lot of state.lots) {
    if (!force && lot.endsAt > p.age) {
      remainingLots.push(lot);
      continue;
    }
    if (lot.highestBidder === 'player') {
      const added = addItem(p, lot.itemId, lot.count);
      p = added.player;
      const name = describeLot(lot);
      logs.push(added.overflow > 0 ? AUCTION_TEXTS.logs.winOverflow(name, lot.currentBid, added.overflow) : AUCTION_TEXTS.logs.winLot(name, lot.currentBid));
      if (added.overflow > 0) p = { ...p, gold: p.gold + Math.floor(lot.currentBid * added.overflow / lot.count) };
    } else if (lot.playerBid > 0) {
      p = { ...p, gold: p.gold + lot.playerBid };
    }
  }
  const remainingConsignments: AuctionConsignmentState[] = [];
  for (const item of state.consignments) {
    if (!force && item.endsAt > p.age) {
      remainingConsignments.push(item);
      continue;
    }
    const def = getItemDef(item.itemId);
    const sale = resolveConsignment(item, p);
    if (sale.sold) {
      p = { ...p, gold: p.gold + sale.payout };
      logs.push(AUCTION_TEXTS.logs.consignmentSold(def?.name ?? item.itemId, item.count, sale.payout));
    } else {
      const added = addItem(p, item.itemId, item.count);
      p = added.player;
      logs.push(AUCTION_TEXTS.logs.consignmentReturned(def?.name ?? item.itemId, added.added));
    }
  }
  const nextState: AuctionSystemState = {
    ...getAuctionState(p),
    lots: remainingLots,
    consignments: remainingConsignments,
    history: [...logs, ...state.history].slice(0, 12),
  };
  return { player: setAuctionState(p, nextState), logs };
}

export function getAuctionTimeLeft(player: Player): number {
  const state = getAuctionState(player);
  if (state.lastRefreshAge < 0) return 0;
  return Math.max(0, state.lastRefreshAge + REFRESH_MONTHS - player.age);
}

export function getNextBid(current: number): number {
  return Math.max(current + 1, Math.ceil(current * 1.12));
}

function generateLots(player: Player, cycleIndex: number): AuctionLotState[] {
  const tags = getCurrentRegion(player)?.regionTags ?? [];
  const pool = auctionLotRegistry.filter(l => player.realmIndex >= l.minRealm && (!l.regionTags.length || l.regionTags.some(t => tags.includes(t))));
  const result: AuctionLotState[] = [];
  const used = new Set<string>();
  for (let i = 0; i < AUCTION_SIZE && used.size < pool.length; i += 1) {
    const picked = weightedPick(pool.filter(x => !used.has(x.id)), player.age + cycleIndex * 17 + i * 31);
    if (!picked) break;
    used.add(picked.id);
    result.push({
      id: `${picked.id}:${player.age}:${cycleIndex}:${i}`,
      templateId: picked.id,
      itemId: picked.itemId,
      count: picked.count,
      basePrice: picked.basePrice,
      currentBid: picked.basePrice,
      highestBidder: 'none',
      playerBid: 0,
      endsAt: player.age + REFRESH_MONTHS,
      aiBids: 0,
    });
  }
  return result;
}

function runAiCompetition(lot: AuctionLotState, player: Player): { lot: AuctionLotState; raised: boolean } {
  let next = { ...lot };
  let raised = false;
  const pressure = 0.35 + player.realmIndex * 0.04 - player.charisma * 0.001;
  for (let i = 0; i < AUCTION_TEXTS.labels.aiBidders.length; i += 1) {
    const chance = Math.max(0.12, Math.min(0.78, pressure + next.aiBids * 0.06 + i * 0.03));
    if (Math.random() < chance && next.currentBid < next.basePrice * (1.8 + player.realmIndex * 0.12)) {
      next = { ...next, currentBid: getNextBid(next.currentBid), highestBidder: AUCTION_TEXTS.labels.aiBidders[i], aiBids: next.aiBids + 1 };
      raised = true;
      if (Math.random() < 0.45) break;
    }
  }
  return { lot: next, raised };
}

function resolveConsignment(item: AuctionConsignmentState, player: Player): { sold: boolean; payout: number } {
  const def = getItemDef(item.itemId);
  const fair = Math.max(1, (def?.sellPrice ?? item.askPrice) * item.count * 3);
  const priceFactor = item.askPrice / fair;
  const chance = Math.max(0.18, Math.min(0.92, 0.75 - (priceFactor - 1) * 0.35 + player.charisma * 0.002 + player.luck * 0.001));
  const sold = Math.random() < chance;
  const hammer = Math.max(item.askPrice, Math.floor(item.askPrice * (1 + Math.random() * 0.25)));
  return { sold, payout: Math.floor(hammer * (1 - SELL_FEE_RATE)) };
}

function weightedPick(items: AuctionLotDef[], seed: number): AuctionLotDef | undefined {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (total <= 0) return items[0];
  let roll = seeded(seed) * total;
  for (const item of items) {
    roll -= Math.max(0, item.weight);
    if (roll <= 0) return item;
  }
  return items[0];
}

function seeded(seed: number): number {
  const x = Math.sin(seed * 999 + 7) * 10000;
  return x - Math.floor(x);
}

function describeLot(lot: Pick<AuctionLotState, 'itemId' | 'count'>): string {
  const def = getItemDef(lot.itemId);
  return AUCTION_TEXTS.labels.itemCount(def?.name ?? lot.itemId, lot.count);
}
