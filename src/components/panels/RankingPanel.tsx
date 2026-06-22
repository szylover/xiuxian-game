import { useMemo, useState } from 'react';
import type { Player } from '../../game/player';
import { buildRankingSnapshots, getRankingState } from '../../game/ranking';
import { getRankingDimensionsByBoard, getRealmDef } from '../../game/registry';
import type { RankingBoardKind, RankingDimensionDef, RankingEntry, RankingSnapshot } from '../../game/types';
import { TabBar } from '../shared';
import { RANKING_TEXTS } from '../../data/texts';
import './RankingPanel.css';

const BOARD_TABS = [
  RANKING_TEXTS.boardTabs.leaderboard,
  RANKING_TEXTS.boardTabs.celestial,
] as { key: RankingBoardKind; label: string }[];

interface RankingPanelProps {
  player: Player;
}

export default function RankingPanel({ player }: RankingPanelProps) {
  const [board, setBoard] = useState<RankingBoardKind>('leaderboard');
  const dimensions = getRankingDimensionsByBoard(board);
  const [dimensionId, setDimensionId] = useState<string | null>(null);

  const activeDimension = dimensions.find(def => def.id === dimensionId) ?? dimensions[0];
  const snapshots = useMemo(() => {
    const persisted = getRankingState(player).snapshots;
    return Object.keys(persisted).length > 0 ? persisted : buildRankingSnapshots(player);
  }, [player]);
  const snapshot = activeDimension ? snapshots[activeDimension.id] : undefined;

  return (
    <div className="ranking-panel">
      <TabBar
        tabs={BOARD_TABS}
        activeKey={board}
        onChange={(next) => {
          setBoard(next);
          setDimensionId(null);
        }}
        className="ranking-board-tabs"
        tabClassName="ranking-board-tab"
      />

      <div className="ranking-intro">{RANKING_TEXTS.boardIntro[board]}</div>

      <div className="ranking-dimension-tabs">
        {dimensions.map(def => (
          <button
            key={def.id}
            className={`ranking-dimension-tab ${activeDimension?.id === def.id ? 'ranking-dimension-tab--active' : ''}`}
            onClick={() => setDimensionId(def.id)}
          >
            {getDimensionLabel(def)}
          </button>
        ))}
      </div>

      {activeDimension && snapshot ? (
        <RankingBoard dimension={activeDimension} snapshot={snapshot} />
      ) : (
        <div className="ranking-empty">{RANKING_TEXTS.empty}</div>
      )}
    </div>
  );
}

function RankingBoard({ dimension, snapshot }: { dimension: RankingDimensionDef; snapshot: RankingSnapshot }) {
  return (
    <div className="ranking-board">
      <div className="ranking-board-head">
        <div>
          <div className="ranking-title">{getDimensionLabel(dimension)}</div>
          <div className="ranking-hint">{RANKING_TEXTS.dimensionHints[dimension.id] ?? RANKING_TEXTS.unknownDimension}</div>
        </div>
        <div className="ranking-refresh">
          {RANKING_TEXTS.refreshedAt(snapshot.refreshedAtYear, snapshot.refreshedAtMonth)}
        </div>
      </div>

      <div className="ranking-player-summary">
        {snapshot.playerRank
          ? RANKING_TEXTS.playerRank(snapshot.playerRank)
          : RANKING_TEXTS.playerOffList}
      </div>

      <div className="ranking-entry-list">
        {snapshot.entries.length === 0 && <div className="ranking-empty">{RANKING_TEXTS.empty}</div>}
        {snapshot.entries.map(entry => (
          <RankingEntryRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function RankingEntryRow({ entry }: { entry: RankingEntry }) {
  const realm = getRealmDef(entry.realmIndex);
  return (
    <div className={`ranking-entry ${entry.isPlayer ? 'ranking-entry--player' : ''}`}>
      <div className="ranking-entry-rank">{RANKING_TEXTS.rankPrefix(entry.rank)}</div>
      <div className="ranking-entry-avatar">{entry.emoji}</div>
      <div className="ranking-entry-main">
        <div className="ranking-entry-name">
          <span>{entry.name}</span>
          {entry.isPlayer && <span className="ranking-player-badge">{RANKING_TEXTS.playerBadge}</span>}
        </div>
        <div className="ranking-entry-meta">
          <span>{realm?.name ?? RANKING_TEXTS.realmUnknown}</span>
          {entry.title && <span>{entry.title}</span>}
          <span>{RANKING_TEXTS.sourceLabels[entry.source]}</span>
        </div>
      </div>
      <div className="ranking-entry-score">{RANKING_TEXTS.score(entry.score)}</div>
    </div>
  );
}

function getDimensionLabel(def: RankingDimensionDef): string {
  return RANKING_TEXTS.dimensionLabels[def.id] ?? RANKING_TEXTS.unknownDimension;
}
