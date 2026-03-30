// ============================================================
// layout/LeftPanel.tsx — 左栏：头像 + 道号 + 境界 + 核心属性
// ============================================================

import { useState } from 'react';
import type { Player } from '../../game/player';
import { REALMS, MONTH_NAMES } from '../../game/data';
import { getNextRealm } from '../../game/player';
import Avatar from './Avatar';
import { CapacityBar, FloatingPanel, STAT_COLORS } from '../shared';
import StatusPanel from '../panels/StatusPanel';

interface LeftPanelProps {
  player: Player;
}

export default function LeftPanel({ player }: LeftPanelProps) {
  const [showDetail, setShowDetail] = useState(false);
  const realm = REALMS[player.realmIndex];
  const nextRealm = getNextRealm(player);
  const expProgress = nextRealm
    ? Math.min(100, (player.exp / nextRealm.expReq) * 100)
    : 100;

  return (
    <>
      {/* 头像区域 */}
      <div className="left-avatar-area">
        <Avatar avatarId={player.avatar} realmIndex={player.realmIndex} size={100} />
        <div className="left-name">{player.name}</div>
        <div className="left-realm" style={{ color: realm.name.includes('大乘') ? '#FFD700' : undefined }}>
          【{realm.name}】
        </div>
      </div>

      {/* 核心属性 */}
      <div className="left-stats">
        <div className="left-stat-row">
          <span>❤️ 体力</span>
          <span>{player.hp}/{player.maxHp}</span>
        </div>
        <CapacityBar current={player.hp} max={player.maxHp} color={STAT_COLORS.hp} />

        <div className="left-stat-row">
          <span>🔮 灵力</span>
          <span>{player.mp}/{player.maxMp}</span>
        </div>
        <CapacityBar current={player.mp} max={player.maxMp} color={STAT_COLORS.mp} />

        <div className="left-stat-row">
          <span>⚡ 精力</span>
          <span>{player.stamina}/{player.maxStamina}</span>
        </div>
        <CapacityBar current={player.stamina} max={player.maxStamina} color={STAT_COLORS.stamina} />

        <div className="left-stat-row">
          <span>📅 寿命</span>
          <span>{Math.floor(player.age)}岁/{player.lifespan === Infinity ? '∞' : player.lifespan}</span>
        </div>

        <div className="left-stat-row">
          <span>🗓️ 历法</span>
          <span>第{player.gameYear}年 {MONTH_NAMES[(player.gameMonth || 1) - 1]}</span>
        </div>

        <div className="left-stat-row">
          <span>💰 灵石</span>
          <span className="gold-value">{player.gold}</span>
        </div>

        <div className="left-stat-row">
          <span>📈 修为</span>
          <span>{player.exp}{nextRealm ? `/${nextRealm.expReq}` : ''}</span>
        </div>
        <div className="left-exp-bar">
          <div className="left-exp-fill" style={{ width: `${expProgress}%` }} />
        </div>
      </div>

      {/* 详细属性按钮 */}
      <button className="btn left-detail-btn" onClick={() => setShowDetail(v => !v)}>
        📋 详细属性
      </button>

      {/* 浮动详细属性面板 */}
      {showDetail && (
        <FloatingPanel
          title="详细属性"
          icon="📋"
          width={420}
          onClose={() => setShowDetail(false)}
        >
          <StatusPanel player={player} />
        </FloatingPanel>
      )}
    </>
  );
}
