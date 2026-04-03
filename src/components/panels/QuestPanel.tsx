// ============================================================
// panels/QuestPanel.tsx — 任务面板（进行中 / 已发现 / 已完成）
// ============================================================

import { useState } from 'react';
import type { Player } from '../../game/player';
import { getQuestState, getDiscoveredQuests, getTrackedQuestInfo } from '../../game/quest';
import { getQuestChainDef, getNpcDef } from '../../game/registry';
import { TabBar } from '../shared';
import { QUEST_TEXTS } from '../../data/texts/quest';
import QuestCard from './quest/QuestCard';
import './QuestPanel.css';

const TABS = [
  { key: 'active' as const, label: QUEST_TEXTS.tabActive, icon: '📌' },
  { key: 'discovered' as const, label: QUEST_TEXTS.tabDiscovered, icon: '🆕' },
  { key: 'completed' as const, label: QUEST_TEXTS.tabCompleted, icon: '✅' },
];

interface QuestPanelProps {
  player: Player;
  onAcceptQuest: (questId: string) => void;
  onAbandonQuest: (questId: string) => void;
  onDeliverQuestItem: (questId: string, objectiveIndex: number) => void;
  onTrackQuest: (questId: string | null) => void;
}

export default function QuestPanel({
  player, onAcceptQuest, onAbandonQuest, onDeliverQuestItem, onTrackQuest,
}: QuestPanelProps) {
  const [tab, setTab] = useState<'active' | 'discovered' | 'completed'>('active');
  const state = getQuestState(player);

  const activeEntries = Object.values(state.activeQuests).filter(q => q.status === 'active' || q.status === 'pending_turnin');
  const discoveredQuests = getDiscoveredQuests(player);
  const completedEntries = Object.values(state.completedQuests);

  const tabsWithCount = TABS.map(t => ({
    ...t,
    label: t.key === 'active'
      ? `${t.label} (${activeEntries.length})`
      : t.key === 'discovered'
        ? `${t.label} (${discoveredQuests.length})`
        : `${t.label} (${completedEntries.length})`,
  }));

  return (
    <div className="quest-panel">
      {/* 任务追踪器 */}
      {(() => {
        const tracked = getTrackedQuestInfo(player);
        if (!tracked) return null;
        const { def, progress } = tracked;
        const isPending = progress.status === 'pending_turnin';
        const step = def.steps[progress.currentStepIndex];
        return (
          <div className="quest-tracker">
            <div className="quest-tracker-title">📜 {def.name}</div>
            {isPending ? (
              <div className="quest-tracker-step quest-tracker-step-complete">
                {QUEST_TEXTS.pendingTurnInHint(getNpcDef(def.turnInNpcId ?? '')?.name ?? '???')}
              </div>
            ) : (
              <>
                <div className="quest-tracker-step">{step.name}</div>
                {step.objectives.map((obj, i) => {
                  const op = progress.objectiveProgress[i];
                  const total = obj.count ?? 1;
                  return (
                    <div key={i} className={`quest-objective-row${op?.completed ? ' completed' : ''}`}>
                      <span className="quest-objective-check">{op?.completed ? '✅' : '▸'}</span>
                      <span className="quest-objective-desc">{obj.description}</span>
                      {total > 1 && <span className="quest-objective-count">({op?.currentCount ?? 0}/{total})</span>}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );
      })()}

      <TabBar
        tabs={tabsWithCount}
        activeKey={tab}
        onChange={setTab}
        className="shop-tabs"
        tabClassName="shop-tab"
      />

      {tab === 'active' && (
        <div className="quest-list">
          {activeEntries.length === 0 ? (
            <div className="quest-empty">{QUEST_TEXTS.noActiveQuests}</div>
          ) : (
            activeEntries.map(progress => {
              const def = getQuestChainDef(progress.questId);
              if (!def) return null;
              return (
                <QuestCard
                  key={progress.questId}
                  mode="active"
                  def={def}
                  progress={progress}
                  isTracked={state.trackedQuestId === progress.questId}
                  onTrack={() => onTrackQuest(state.trackedQuestId === progress.questId ? null : progress.questId)}
                  onAbandon={() => onAbandonQuest(progress.questId)}
                  onDeliver={(idx) => onDeliverQuestItem(progress.questId, idx)}
                />
              );
            })
          )}
        </div>
      )}

      {tab === 'discovered' && (
        <div className="quest-list">
          {discoveredQuests.length === 0 ? (
            <div className="quest-empty">{QUEST_TEXTS.noDiscoveredQuests}</div>
          ) : (
            discoveredQuests.map(def => (
              <QuestCard
                key={def.id}
                mode="discovered"
                def={def}
                onAccept={() => onAcceptQuest(def.id)}
              />
            ))
          )}
        </div>
      )}

      {tab === 'completed' && (
        <div className="quest-list">
          {completedEntries.length === 0 ? (
            <div className="quest-empty">{QUEST_TEXTS.noCompletedQuests}</div>
          ) : (
            completedEntries.map(entry => {
              const def = getQuestChainDef(entry.questId);
              if (!def) return null;
              return (
                <QuestCard
                  key={entry.questId}
                  mode="completed"
                  def={def}
                  completedAt={entry.completedAt}
                  repeatCount={entry.repeatCount}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
