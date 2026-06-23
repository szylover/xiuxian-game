import { useState } from 'react';
import type { Player } from '../../game/player';
import { getInventoryEntries } from '../../game/inventory';
import { getItemDef } from '../../game/registry';
import { ensureAuctionHouse, getAuctionState, getAuctionTimeLeft, getNextBid } from '../../game/auction';
import { AUCTION_TEXTS } from '../../data/texts';
import { TabBar } from '../shared';
import './AuctionPanel.css';

interface AuctionPanelProps {
  player: Player;
  onBid: (lotId: string) => void;
  onConsign: (itemId: string, count: number, askPrice: number) => void;
  onRefresh: () => void;
  onSettle: () => void;
}

type AuctionTab = 'lots' | 'consign' | 'history';

const TABS = [
  { key: 'lots' as const, label: AUCTION_TEXTS.tabs.lots, icon: '🔨' },
  { key: 'consign' as const, label: AUCTION_TEXTS.tabs.consign, icon: '📦' },
  { key: 'history' as const, label: AUCTION_TEXTS.tabs.history, icon: '📜' },
];

export default function AuctionPanel({ player, onBid, onConsign, onRefresh, onSettle }: AuctionPanelProps) {
  const [tab, setTab] = useState<AuctionTab>('lots');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const normalized = ensureAuctionHouse(player).player;
  const state = getAuctionState(normalized);
  const inventory = getInventoryEntries(player);

  return (
    <div className="auction-panel">
      <div className="auction-intro">{AUCTION_TEXTS.panel.intro}</div>
      <TabBar
        tabs={TABS}
        activeKey={tab}
        onChange={setTab}
        className="auction-tabs"
        tabClassName="auction-tab"
        extra={<span className="auction-gold">{AUCTION_TEXTS.labels.gold(player.gold)}</span>}
      />
      <div className="auction-actions">
        <span className="auction-time">{AUCTION_TEXTS.labels.timeLeft(getAuctionTimeLeft(normalized))}</span>
        <button className="auction-action" onClick={onRefresh}>{AUCTION_TEXTS.panel.refresh}</button>
        <button className="auction-action" onClick={onSettle}>{AUCTION_TEXTS.panel.settle}</button>
      </div>
      {tab === 'lots' && <AuctionLots player={player} lots={state.lots} onBid={onBid} />}
      {tab === 'consign' && (
        <div className="auction-list">
          <section className="auction-consignments">
            <div className="auction-section-title">{AUCTION_TEXTS.panel.activeConsignments}</div>
            {state.consignments.length === 0 ? <div className="auction-empty">{AUCTION_TEXTS.panel.emptyConsignments}</div> : state.consignments.map(item => {
              const def = getItemDef(item.itemId);
              return <div key={item.id} className="auction-consignment-row">{AUCTION_TEXTS.labels.itemCount(def?.name ?? item.itemId, item.count)} · {AUCTION_TEXTS.labels.currentBid(item.askPrice)} · {AUCTION_TEXTS.labels.consignmentEnds(Math.max(0, item.endsAt - player.age))}</div>;
            })}
          </section>
          {inventory.length === 0 ? <div className="auction-empty">{AUCTION_TEXTS.panel.emptyInventory}</div> : inventory.map(({ slot, def }) => {
            const count = counts[slot.itemId] ?? 1;
            const price = prices[slot.itemId] ?? Math.max(1, def.sellPrice * count * 3);
            return (
              <article key={slot.itemId} className="auction-card">
                <div className="auction-card-title">{AUCTION_TEXTS.labels.itemCount(def.name, slot.count)}</div>
                <div className="auction-desc">{def.description}</div>
                <div className="auction-inputs">
                  <label>{AUCTION_TEXTS.labels.count}<input type="number" min="1" max={slot.count} value={count} onChange={e => setCounts(prev => ({ ...prev, [slot.itemId]: Math.max(1, Math.min(slot.count, Number(e.target.value) || 1)) }))} /></label>
                  <label>{AUCTION_TEXTS.labels.askPrice}<input type="number" min="1" value={price} onChange={e => setPrices(prev => ({ ...prev, [slot.itemId]: Math.max(1, Number(e.target.value) || 1) }))} /></label>
                </div>
                <button className="auction-action" onClick={() => onConsign(slot.itemId, count, price)}>{AUCTION_TEXTS.panel.consign}</button>
              </article>
            );
          })}
        </div>
      )}
      {tab === 'history' && (
        <div className="auction-history">
          {state.history.length === 0 ? <div className="auction-empty">{AUCTION_TEXTS.panel.emptyHistory}</div> : state.history.map(line => <div key={line}>{line}</div>)}
        </div>
      )}
    </div>
  );
}

function AuctionLots({ player, lots, onBid }: { player: Player; lots: ReturnType<typeof getAuctionState>['lots']; onBid: (lotId: string) => void }) {
  return (
    <div className="auction-list">
      {lots.length === 0 ? <div className="auction-empty">{AUCTION_TEXTS.panel.emptyLots}</div> : lots.map(lot => {
        const def = getItemDef(lot.itemId);
        const nextBid = getNextBid(lot.currentBid || lot.basePrice);
        const highest = lot.highestBidder === 'player' ? AUCTION_TEXTS.labels.player : lot.highestBidder === 'none' ? AUCTION_TEXTS.labels.noBid : lot.highestBidder;
        return (
          <article key={lot.id} className="auction-card">
            <div className="auction-card-title">{AUCTION_TEXTS.labels.itemCount(def?.name ?? lot.itemId, lot.count)}</div>
            <div className="auction-desc">{def?.description}</div>
            <div className="auction-meta">{AUCTION_TEXTS.labels.basePrice(lot.basePrice)}</div>
            <div className="auction-meta">{AUCTION_TEXTS.labels.currentBid(lot.currentBid)}</div>
            <div className="auction-meta">{AUCTION_TEXTS.labels.highest(highest)}</div>
            <button className="auction-action" disabled={player.gold < nextBid - lot.playerBid} onClick={() => onBid(lot.id)}>
              {AUCTION_TEXTS.labels.nextBid(nextBid)}
            </button>
          </article>
        );
      })}
    </div>
  );
}
