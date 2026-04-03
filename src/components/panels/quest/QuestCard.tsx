// ============================================================
// quest/QuestCard.tsx — 任务卡片（active/discovered/completed）
// ============================================================

import type { QuestChainDef, QuestChainProgress } from '../../../game/types';
import { getNpcDef } from '../../../game/registry';
import { QUEST_TEXTS } from '../../../data/texts/quest';
import QuestObjectiveRow from './QuestObjectiveRow';
import QuestRewardPreview from './QuestRewardPreview';

const CATEGORY_COLORS: Record<string, string> = {
  main: '#e6ac00',
  side: '#4a9eff',
  daily: '#59b300',
  bounty: '#ff6b35',
  dialogue: '#c080ff',
  event: '#9E9E9E',
};

const CATEGORY_CN: Record<string, string> = {
  main: QUEST_TEXTS.categoryMain,
  side: QUEST_TEXTS.categorySide,
  daily: QUEST_TEXTS.categoryDaily,
  bounty: QUEST_TEXTS.categoryBounty,
  dialogue: QUEST_TEXTS.categoryDialogue,
  event: QUEST_TEXTS.categoryEvent,
};

interface QuestCardActiveProps {
  mode: 'active';
  def: QuestChainDef;
  progress: QuestChainProgress;
  isTracked: boolean;
  onTrack: () => void;
  onAbandon: () => void;
  onDeliver: (objectiveIndex: number) => void;
}

interface QuestCardDiscoveredProps {
  mode: 'discovered';
  def: QuestChainDef;
  onAccept: () => void;
}

interface QuestCardCompletedProps {
  mode: 'completed';
  def: QuestChainDef;
  completedAt: number;
  repeatCount: number;
}

type QuestCardProps = QuestCardActiveProps | QuestCardDiscoveredProps | QuestCardCompletedProps;

export default function QuestCard(props: QuestCardProps) {
  const { mode, def } = props;
  const catColor = CATEGORY_COLORS[def.category] ?? '#888';
  const catLabel = CATEGORY_CN[def.category] ?? def.category;

  return (
    <div className={`quest-card quest-card-${mode}`}>
      <div className="quest-card-header">
        <span className="quest-card-icon">{def.icon ?? '📜'}</span>
        <span className="quest-card-name">{def.name}</span>
        <span className="quest-category-tag" style={{ background: catColor + '22', color: catColor, borderColor: catColor }}>
          {catLabel}
        </span>
      </div>

      <div className="quest-card-body">
        {mode === 'active' && <ActiveBody {...props as QuestCardActiveProps} />}
        {mode === 'discovered' && <DiscoveredBody {...props as QuestCardDiscoveredProps} />}
        {mode === 'completed' && <CompletedBody {...props as QuestCardCompletedProps} />}
      </div>
    </div>
  );
}

function ActiveBody({ def, progress, isTracked, onTrack, onAbandon, onDeliver }: QuestCardActiveProps) {
  const step = def.steps[progress.currentStepIndex];
  const isPendingTurnIn = progress.status === 'pending_turnin';

  return (
    <>
      {isPendingTurnIn ? (
        <div className="quest-step-info">
          <span className="quest-step-name" style={{ color: '#8f8' }}>
            {QUEST_TEXTS.pendingTurnInHint(getNpcDef(def.turnInNpcId ?? '')?.name ?? '???')}
          </span>
        </div>
      ) : (
        <>
          <div className="quest-step-info">
            <span className="quest-step-name">
              {QUEST_TEXTS.stepProgress(progress.currentStepIndex + 1, def.steps.length)}：{step.name}
            </span>
          </div>

          {step.objectives.map((obj, i) => {
            const objProgress = progress.objectiveProgress[i];
            return (
              <div key={i}>
                <QuestObjectiveRow
                  description={obj.description}
                  current={objProgress?.currentCount ?? 0}
                  target={obj.count ?? 1}
                  completed={objProgress?.completed ?? false}
                />
                {obj.type === 'deliver_item' && !objProgress?.completed && (
                  <button className="btn btn-sm quest-deliver-btn" onClick={() => onDeliver(i)}>
                    {QUEST_TEXTS.deliverBtn}
                  </button>
                )}
              </div>
            );
          })}
        </>
      )}

      <div className="quest-card-actions">
        <button
          className={`btn btn-sm ${isTracked ? 'btn-active' : ''}`}
          onClick={onTrack}
        >
          {isTracked ? QUEST_TEXTS.untrackBtn : QUEST_TEXTS.trackBtn}
        </button>
        <button className="btn btn-sm btn-danger" onClick={onAbandon}>
          {QUEST_TEXTS.abandonBtn}
        </button>
      </div>
    </>
  );
}

function DiscoveredBody({ def, onAccept }: QuestCardDiscoveredProps) {
  return (
    <>
      <div className="quest-card-desc">{def.description}</div>
      <QuestRewardPreview reward={def.rewards} />
      <div className="quest-card-actions">
        <button className="btn btn-sm btn-primary" onClick={onAccept}>
          {QUEST_TEXTS.acceptBtn}
        </button>
      </div>
    </>
  );
}

function CompletedBody({ def, completedAt, repeatCount }: QuestCardCompletedProps) {
  return (
    <>
      <div className="quest-card-desc" style={{ opacity: 0.7 }}>{def.description}</div>
      <div className="quest-completed-info">
        <span>{QUEST_TEXTS.completedAt(completedAt)}</span>
        {repeatCount > 1 && <span style={{ marginLeft: 8 }}>{QUEST_TEXTS.repeatCount(repeatCount)}</span>}
      </div>
    </>
  );
}
