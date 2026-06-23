// ============================================================
// layout/LeftPanel.tsx — 左栏：头像 + 道号 + 境界 + 核心属性
// ============================================================

import './LeftPanel.css';
import type { Player } from '../../game/player';
import { REALMS } from '../../game/data';
import { getActiveBottlenecks, ensureBottleneckState } from '../../game/bottleneck';
import { getNextRealm, formatAge } from '../../game/player';
import { getNextBodyRealm } from '../../game/body-cultivation';
import { getBodyRealmDef } from '../../game/registry';
import { getCurrentRegion } from '../../game/map';
import Avatar from './Avatar';
import { CapacityBar, FloatingPanel, STAT_COLORS } from '../shared';
import StatusPanel from '../panels/StatusPanel';
import type { PanelKey } from './PanelButtons';
import { UI_LABELS } from '../../data/texts/ui-labels';
import { getAlignment, getKarmaTitle } from '../../game/karma';
import { KARMA_TEXTS, ALIGNMENT_CN } from '../../data/texts';

interface LeftPanelProps {
  player: Player;
  activePanel: PanelKey | null;
  onSelectPanel: (key: PanelKey) => void;
}

export default function LeftPanel({ player, activePanel, onSelectPanel }: LeftPanelProps) {
  const realm = REALMS[player.realmIndex];
  const nextRealm = getNextRealm(player);
  const expProgress = nextRealm
    ? Math.min(100, (player.exp / nextRealm.expReq) * 100)
    : 100;
  const bodyRealm = getBodyRealmDef(player.bodyRealmIndex);
  const nextBodyRealm = getNextBodyRealm(player);
  const bodyExpProgress = nextBodyRealm
    ? Math.min(100, (player.bodyRealmExp / nextBodyRealm.expReq) * 100)
    : 100;

  // T0064: 激活的瓶颈
  const pWithBn = ensureBottleneckState(player);
  const activeBns = getActiveBottlenecks(pWithBn);

  const currentRegion = getCurrentRegion(player);
  const karma = player.karma ?? 0;
  const karmaPct = `${((karma + 100) / 200) * 100}%`;
  const alignment = getAlignment(karma);

  return (
    <>
      {/* 头像区域 */}
      <div className="left-avatar-area">
        <Avatar avatarId={player.avatar} realmIndex={player.realmIndex} size={100} />
        <div className="left-name">{player.name}</div>
        <div className={`left-realm${realm.name.includes('大乘') ? ' left-realm--golden' : ''}`}>
          【{realm.name}】
          {activeBns.length > 0 && (
            <span className="bottleneck-badge">
              {UI_LABELS.bottleneck}
            </span>
          )}
        </div>
        {currentRegion && (
          <div className="left-region">
            📍 {currentRegion.emoji} {currentRegion.name}
          </div>
        )}
        <div className="left-karma">
          <div className="left-karma-title">
            {KARMA_TEXTS.panel.alignment(getKarmaTitle(karma), ALIGNMENT_CN[alignment])}
          </div>
          <div className="left-karma-bar" title={KARMA_TEXTS.panel.value(karma)}>
            <div className="left-karma-marker" style={{ '--karma-pos': karmaPct } as React.CSSProperties} />
          </div>
          <div className="left-karma-scale">
            <span>{ALIGNMENT_CN.evil}</span>
            <span>{KARMA_TEXTS.panel.value(karma)}</span>
            <span>{ALIGNMENT_CN.righteous}</span>
          </div>
        </div>
      </div>

      {/* 核心属性 */}
      <div className="left-stats">
        <div className="left-stat-row">
          <span>{UI_LABELS.stats.hp}</span>
          <span>{player.hp}/{player.maxHp}</span>
        </div>
        <CapacityBar current={player.hp} max={player.maxHp} color={STAT_COLORS.hp} />

        <div className="left-stat-row">
          <span>{UI_LABELS.stats.mp}</span>
          <span>{player.mp}/{player.maxMp}</span>
        </div>
        <CapacityBar current={player.mp} max={player.maxMp} color={STAT_COLORS.mp} />

        <div className="left-stat-row">
          <span>{UI_LABELS.stats.stamina}</span>
          <span>{player.stamina}/{player.maxStamina}</span>
        </div>
        <CapacityBar current={player.stamina} max={player.maxStamina} color={STAT_COLORS.stamina} />

        {/* T0062 体魄条 */}
        <div className="left-stat-row">
          <span>{UI_LABELS.stats.physique}</span>
          <span>{player.physique}/{player.maxPhysique}</span>
        </div>
        <CapacityBar current={player.physique} max={player.maxPhysique} color={STAT_COLORS.physique} />

        <div className="left-stat-row">
          <span>{UI_LABELS.stats.lifespan}</span>
          <span>{formatAge(player.age)}/{player.lifespan === Infinity ? '∞' : Math.floor(player.lifespan / 12) + UI_LABELS.age}</span>
        </div>

        <div className="left-stat-row">
          <span>{UI_LABELS.stats.gold}</span>
          <span className="gold-value">{player.gold}</span>
        </div>

        <div className="left-stat-row">
          <span>{UI_LABELS.stats.exp}</span>
          <span>{player.exp}{nextRealm ? `/${nextRealm.expReq}` : ''}</span>
        </div>
        <div className="left-exp-bar">
          <div className="left-exp-fill" style={{ '--fill-width': `${expProgress}%` } as React.CSSProperties} />
        </div>

        {/* T0062 体修境界 + 修为 */}
        <div className="left-stat-row">
          <span>{UI_LABELS.stats.bodyRealm}</span>
          <span>【{bodyRealm?.name ?? '凡躯'}】{player.bodyRealmExp}{nextBodyRealm ? `/${nextBodyRealm.expReq}` : ''}</span>
        </div>
        <div className="left-exp-bar">
          <div className="left-exp-fill left-body-exp-fill" style={{ '--fill-width': `${bodyExpProgress}%` } as React.CSSProperties} />
        </div>
        {nextBodyRealm && player.bodyRealmExp >= nextBodyRealm.expReq && player.physique < player.maxPhysique * 0.8 && (
          <div className="left-physique-warning">
            ⚠️ 体魄不足（需 {Math.ceil(player.maxPhysique * 0.8)}），休息或战斗可恢复
          </div>
        )}
      </div>

      {/* 详细属性按钮 */}
      <button className={`btn left-detail-btn${activePanel === 'status' ? ' panel-btn-active' : ''}`} onClick={() => onSelectPanel('status')}>
        {UI_LABELS.detailBtn}
      </button>

      {/* 浮动详细属性面板 */}
      {activePanel === 'status' && (
        <FloatingPanel
          title={UI_LABELS.panels.status.title}
          icon={UI_LABELS.panels.status.icon}
          width={420}
          onClose={() => onSelectPanel('status')}
        >
          <StatusPanel player={player} />
        </FloatingPanel>
      )}

    </>
  );
}
