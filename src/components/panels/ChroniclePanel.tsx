// ============================================================
// ChroniclePanel.tsx — 修仙履历面板（T0068）
// 展示跨局永久保存的修炼历程
// ============================================================

import './ChroniclePanel.css';
import { useState } from 'react';
import type { CultivationChronicle, IncarnationRecord, ChronicleEventType } from '../../game/chronicle';
import { MONTH_NAMES } from '../../game/data';

const EVENT_ICONS: Record<ChronicleEventType, string> = {
  realm_breakthrough: '⚡',
  body_realm_breakthrough: '🔥',
  tribulation_pass: '☁️',
  tribulation_fail: '⛈️',
  death: '💀',
  revival: '✨',
  first_boss_kill: '🗡️',
  rare_item_obtained: '💎',
  technique_acquired: '📖',
  bottleneck_broken: '🔓',
  special_adventure: '🌟',
  achievement_unlocked: '🏆',
  npc_milestone: '❤️',
  game_over: '🏁',
};

const OUTCOME_LABELS: Record<string, { text: string; className: string }> = {
  died: { text: '道消魂灭', className: 'outcome-died' },
  ascended: { text: '羽化飞升', className: 'outcome-ascended' },
  active: { text: '修炼中', className: 'outcome-active' },
};

interface ChroniclePanelProps {
  chronicle: CultivationChronicle;
}

export default function ChroniclePanel({ chronicle }: ChroniclePanelProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const allRecords: IncarnationRecord[] = [];
  if (chronicle.current) allRecords.push(chronicle.current);
  allRecords.push(...[...chronicle.incarnations].reverse());

  const toggleExpand = (no: number) => {
    setExpandedId(prev => prev === no ? null : no);
  };

  if (allRecords.length === 0) {
    return (
      <div className="chronicle-panel">
        <div className="chronicle-empty">
          此生尚是第一轮回，修仙之路，从此启程。
        </div>
      </div>
    );
  }

  return (
    <div className="chronicle-panel">
      {allRecords.map(record => {
        const isExpanded = expandedId === record.incarnationNo;
        const isCurrent = record.outcome === 'active';
        const outcome = OUTCOME_LABELS[record.outcome] ?? OUTCOME_LABELS.died;
        const ageYears = Math.floor(record.finalAge / 12);
        const ageMonths = record.finalAge % 12;
        const duration = record.endGameYear && record.startGameYear
          ? record.endGameYear - record.startGameYear
          : null;

        return (
          <div key={record.incarnationNo} className="chronicle-card">
            <div
              className={`chronicle-card-header ${isExpanded ? 'expanded' : ''}`}
              onClick={() => toggleExpand(record.incarnationNo)}
            >
              <div className="chronicle-card-main">
                <span className="chronicle-card-no">
                  {isCurrent ? '📜' : `#${record.incarnationNo}`}
                </span>
                <span className="chronicle-card-name">{record.characterName}</span>
                <span className="chronicle-card-realm">{record.finalRealmName}期</span>
              </div>
              <div className="chronicle-card-meta">
                <span className={`chronicle-outcome ${outcome.className}`}>
                  {outcome.text}
                </span>
                <span className="chronicle-card-age">
                  {ageYears}岁{ageMonths > 0 ? `${ageMonths}月` : ''}
                </span>
                {duration !== null && (
                  <span className="chronicle-card-duration">
                    历{duration}年
                  </span>
                )}
                <span className="chronicle-expand-arrow">{isExpanded ? '▼' : '▶'}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="chronicle-card-detail">
                <div className="chronicle-stats">
                  <span>击杀: {record.totalKills}</span>
                  <span>死亡: {record.totalDeaths}</span>
                  <span>复活: {record.totalRevives}</span>
                  {record.finalBodyRealmIndex > 0 && (
                    <span>体修: 阶{record.finalBodyRealmIndex}</span>
                  )}
                </div>

                {record.events.length === 0 ? (
                  <div className="chronicle-no-events">暂无关键事件</div>
                ) : (
                  <div className="chronicle-timeline">
                    {record.events.map((event, idx) => (
                      <div
                        key={idx}
                        className={`chronicle-event ${event.type === 'death' ? 'chronicle-event-death' : ''} ${event.type === 'game_over' ? 'chronicle-event-end' : ''}`}
                      >
                        <span className="chronicle-event-icon">
                          {EVENT_ICONS[event.type] ?? '📌'}
                        </span>
                        <span className="chronicle-event-time">
                          第{event.year}年 {MONTH_NAMES[event.month - 1] ?? `${event.month}月`}
                        </span>
                        <span className="chronicle-event-desc">{event.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
