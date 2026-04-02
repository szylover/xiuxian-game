// ============================================================
// layout/LeftPanel.tsx — 左栏：头像 + 道号 + 境界 + 核心属性
// ============================================================

import type { Player } from '../../game/player';
import { REALMS, MONTH_NAMES } from '../../game/data';
import { getActiveBottlenecks, ensureBottleneckState } from '../../game/bottleneck';
import { getNextRealm } from '../../game/player';
import { getNextBodyRealm } from '../../game/body-cultivation';
import { getBodyRealmDef, getTechniqueDef, getDivineArtDef } from '../../game/registry';
import { getDivineArtsState } from '../../game/divine-arts';
import { getCurrentRegion } from '../../game/map';
import Avatar from './Avatar';
import { CapacityBar, FloatingPanel, STAT_COLORS } from '../shared';
import StatusPanel from '../panels/StatusPanel';
import type { PanelKey } from './PanelButtons';

interface LeftPanelProps {
  player: Player;
  activePanel: PanelKey | null;
  onSelectPanel: (key: PanelKey) => void;
  onExit?: () => void;
}

export default function LeftPanel({ player, activePanel, onSelectPanel, onExit }: LeftPanelProps) {
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

  // 当前激活的功法和神通
  const activeTech = player.activeTechniqueId ? getTechniqueDef(player.activeTechniqueId) : null;
  const divineState = getDivineArtsState(player);
  const activeArt = divineState.activeArtId ? getDivineArtDef(divineState.activeArtId) : null;
  const currentRegion = getCurrentRegion(player);

  return (
    <>
      {/* 头像区域 */}
      <div className="left-avatar-area">
        <Avatar avatarId={player.avatar} realmIndex={player.realmIndex} size={100} />
        <div className="left-name">{player.name}</div>
        <div className="left-realm" style={{ color: realm.name.includes('大乘') ? '#FFD700' : undefined }}>
          【{realm.name}】
          {activeBns.length > 0 && (
            <span style={{
              fontSize: '0.7em',
              background: '#4a2800',
              color: '#ff9800',
              border: '1px solid #ff9800',
              borderRadius: 4,
              padding: '1px 5px',
              marginLeft: 4,
              verticalAlign: 'middle',
            }}>
              🚧 瓶颈
            </span>
          )}
        </div>
        {currentRegion && (
          <div style={{ fontSize: '0.85em', color: '#9E9E9E', marginTop: 2 }}>
            📍 {currentRegion.emoji} {currentRegion.name}
          </div>
        )}
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

        {/* 当前功法 & 神通 */}
        <div className="left-stat-row">
          <span>📖 功法</span>
          <span style={{ color: activeTech ? '#4FC3F7' : '#666' }}>
            {activeTech ? activeTech.name : '未装备'}
          </span>
        </div>
        <div className="left-stat-row">
          <span>✨ 神通</span>
          <span style={{ color: activeArt ? '#CE93D8' : '#666' }}>
            {activeArt ? activeArt.name : '未装备'}
          </span>
        </div>

        {/* T0062 体魄条 */}
        <div className="left-stat-row">
          <span>💪 体魄</span>
          <span>{player.physique}/{player.maxPhysique}</span>
        </div>
        <CapacityBar current={player.physique} max={player.maxPhysique} color={STAT_COLORS.physique} />

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

        {/* T0062 体修境界 + 修为 */}
        <div className="left-stat-row">
          <span>💪 体修</span>
          <span>【{bodyRealm?.name ?? '凡躯'}】{player.bodyRealmExp}{nextBodyRealm ? `/${nextBodyRealm.expReq}` : ''}</span>
        </div>
        <div className="left-exp-bar">
          <div className="left-exp-fill" style={{ width: `${bodyExpProgress}%`, background: STAT_COLORS.physique }} />
        </div>
        {nextBodyRealm && player.bodyRealmExp >= nextBodyRealm.expReq && player.physique < player.maxPhysique * 0.8 && (
          <div style={{ fontSize: '0.75em', color: '#FF9800', marginTop: 2 }}>
            ⚠️ 体魄不足（需 {Math.ceil(player.maxPhysique * 0.8)}），休息或战斗可恢复
          </div>
        )}
      </div>

      {/* 详细属性按钮 */}
      <button className={`btn left-detail-btn${activePanel === 'status' ? ' panel-btn-active' : ''}`} onClick={() => onSelectPanel('status')}>
        📋 详细属性
      </button>

      {/* 浮动详细属性面板 */}
      {activePanel === 'status' && (
        <FloatingPanel
          title="详细属性"
          icon="📋"
          width={420}
          onClose={() => onSelectPanel('status')}
        >
          <StatusPanel player={player} />
        </FloatingPanel>
      )}

      {/* T0038: 主菜单按钮 */}
      {onExit && (
        <button className="btn left-exit-btn" onClick={onExit} title="返回主菜单">
          🏠 主菜单
        </button>
      )}
    </>
  );
}
