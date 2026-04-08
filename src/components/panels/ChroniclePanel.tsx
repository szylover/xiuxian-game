// ============================================================
// ChroniclePanel.tsx — 修仙履历面板（T0068）
// 展示当前角色的关键事件时间线
// ============================================================

import './ChroniclePanel.css';
import type { CultivationChronicle, ChronicleEventType } from '../../game/chronicle';
import { MONTH_NAMES } from '../../game/data';

const EVENT_ICONS: Record<ChronicleEventType, string> = {
  realm_breakthrough: '⚡',
  body_realm_breakthrough: '🔥',
  tribulation_pass: '☁️',
  tribulation_fail: '⛈️',
  ascension_success: '🌟',
  ascension_fail: '💫',
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

interface ChroniclePanelProps {
  chronicle: CultivationChronicle;
}

export default function ChroniclePanel({ chronicle }: ChroniclePanelProps) {
  const record = chronicle.current;

  if (!record) {
    return (
      <div className="chronicle-panel">
        <div className="chronicle-empty">
          修仙之路，从此启程。
        </div>
      </div>
    );
  }

  const ageYears = Math.floor(record.finalAge / 12);

  return (
    <div className="chronicle-panel">
      {/* 角色摘要 */}
      <div className="chronicle-summary">
        <span className="chronicle-summary-name">{record.characterName}</span>
        <span className="chronicle-summary-realm">{record.finalRealmName}期</span>
        <span className="chronicle-summary-age">{ageYears}岁</span>
        <span className="chronicle-summary-stats">
          击杀 {record.totalKills} · 死亡 {record.totalDeaths} · 复活 {record.totalRevives}
        </span>
      </div>

      {/* 关键事件时间线 */}
      {record.events.length === 0 ? (
        <div className="chronicle-no-events">尚无关键事件记录</div>
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
  );
}
