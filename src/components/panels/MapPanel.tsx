// ============================================================
// panels/MapPanel.tsx — 地图面板（T0021）
// 树状区域结构 + 折叠展开，DLC 可通过 parentId 挂载子区域
// ============================================================

import { useState } from 'react';
import type { Player } from '../../game/player';
import type { RegionDef } from '../../game/types';
import { getAllRegions } from '../../game/registry';
import { getMapState, calcTravelCost, checkRegionAccess } from '../../game/map';
import { REALMS } from '../../game/data';
import { getBodyRealmDef } from '../../game/registry';

interface MapPanelProps {
  player: Player;
  onTravel: (regionId: string) => void;
}

/** 构建树状结构：根节点 + 子节点 Map */
interface RegionNode {
  region: RegionDef;
  children: RegionNode[];
}

function buildRegionTree(regions: RegionDef[]): RegionNode[] {
  const childrenMap = new Map<string, RegionNode[]>();
  const roots: RegionNode[] = [];

  // 先创建所有节点
  const nodeMap = new Map<string, RegionNode>();
  for (const r of regions) {
    nodeMap.set(r.id, { region: r, children: [] });
  }

  // 分配父子关系
  for (const r of regions) {
    const node = nodeMap.get(r.id)!;
    if (r.parentId && nodeMap.has(r.parentId)) {
      nodeMap.get(r.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // 按 minRealm 排序
  const sortNodes = (nodes: RegionNode[]) => {
    nodes.sort((a, b) => a.region.minRealm - b.region.minRealm);
    for (const n of nodes) sortNodes(n.children);
  };
  sortNodes(roots);
  return roots;
}

export default function MapPanel({ player, onTravel }: MapPanelProps) {
  const state = getMapState(player);
  const allRegions = getAllRegions();
  const tree = buildRegionTree(allRegions);

  // 折叠状态：记录被折叠的节点 ID
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="technique-panel">
      {/* 当前位置 */}
      <div className="divine-active-header">
        <span className="divine-active-label">📍 当前位置：</span>
        {(() => {
          const cur = allRegions.find(r => r.id === state.currentRegionId);
          return cur ? (
            <span className="divine-active-name" style={{ color: '#4FC3F7' }}>
              {cur.emoji} {cur.name}
            </span>
          ) : (
            <span className="divine-active-none">未知</span>
          );
        })()}
      </div>

      {/* 区域树 */}
      <div className="technique-section-title">
        🗺️ 世界区域（{allRegions.length}）
      </div>
      <div className="technique-list">
        {tree.map(node => (
          <RegionTreeNode
            key={node.region.id}
            node={node}
            depth={0}
            player={player}
            currentRegionId={state.currentRegionId}
            collapsed={collapsed}
            onToggle={toggleCollapse}
            onTravel={onTravel}
          />
        ))}
      </div>
    </div>
  );
}

// ── 递归树节点 ──

interface RegionTreeNodeProps {
  node: RegionNode;
  depth: number;
  player: Player;
  currentRegionId: string;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onTravel: (regionId: string) => void;
}

function RegionTreeNode({ node, depth, player, currentRegionId, collapsed, onToggle, onTravel }: RegionTreeNodeProps) {
  const { region, children } = node;
  const hasChildren = children.length > 0;
  const isCollapsed = collapsed.has(region.id);
  const isCurrent = currentRegionId === region.id;
  const access = checkRegionAccess(player, region.id);
  const cost = calcTravelCost(player, region);
  const canAfford = player.stamina >= cost;
  const realmName = REALMS[region.minRealm]?.name ?? '???';
  const bodyRealmName = getBodyRealmDef(region.minRealm)?.name;

  return (
    <>
      <div style={{ marginLeft: depth * 16 }}>
        <RegionCard
          region={region}
          isCurrent={isCurrent}
          isUnlocked={access.canEnter}
          travelCost={cost}
          canAfford={canAfford}
          realmName={realmName}
          bodyRealmName={bodyRealmName}
          hasChildren={hasChildren}
          isCollapsed={isCollapsed}
          onToggle={() => onToggle(region.id)}
          onTravel={() => onTravel(region.id)}
        />
      </div>
      {hasChildren && !isCollapsed && children.map(child => (
        <RegionTreeNode
          key={child.region.id}
          node={child}
          depth={depth + 1}
          player={player}
          currentRegionId={currentRegionId}
          collapsed={collapsed}
          onToggle={onToggle}
          onTravel={onTravel}
        />
      ))}
    </>
  );
}

// ── 区域卡片 ──

interface RegionCardProps {
  region: RegionDef;
  isCurrent: boolean;
  isUnlocked: boolean;
  travelCost: number;
  canAfford: boolean;
  realmName: string;
  bodyRealmName?: string;
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  onTravel: () => void;
}

function RegionCard({ region, isCurrent, isUnlocked, travelCost, canAfford, realmName, bodyRealmName, hasChildren, isCollapsed, onToggle, onTravel }: RegionCardProps) {
  // 容器节点：只显示折叠头部，不显示具体卡片内容
  if (region.isContainer) {
    return (
      <div
        className="technique-section-title"
        onClick={hasChildren ? onToggle : undefined}
        style={{ cursor: hasChildren ? 'pointer' : 'default', userSelect: 'none', marginTop: '0.4rem' }}
      >
        {hasChildren && (
          <span style={{ marginRight: 4, fontSize: '0.85em' }}>{isCollapsed ? '▶' : '▼'}</span>
        )}
        {region.emoji} {region.name}
        {!isUnlocked && <span style={{ color: '#FF9800', fontSize: '0.8em', marginLeft: 6 }}>🔒</span>}
      </div>
    );
  }

  const borderColor = isCurrent ? '#4FC3F7' : isUnlocked ? '#66BB6A' : '#555';

  const tags: string[] = [];
  if (region.safeZone) tags.push('🛡️ 安全区');
  if (region.combatBonus) tags.push(`⚔️ 战斗+${Math.round(region.combatBonus * 100)}%`);
  if (region.explorationBonus) tags.push(`🔍 探索+${Math.round(region.explorationBonus * 100)}%`);
  if (region.shopDiscount) tags.push(`🏪 折扣${Math.round(region.shopDiscount * 100)}%`);

  return (
    <div
      className={`technique-card ${isCurrent ? 'technique-active' : ''}`}
      style={{ borderLeftColor: borderColor }}
    >
      <div className="technique-header">
        {/* 折叠按钮 */}
        {hasChildren && (
          <span
            onClick={onToggle}
            style={{ cursor: 'pointer', marginRight: 4, fontSize: '0.9em', userSelect: 'none' }}
          >
            {isCollapsed ? '▶' : '▼'}
          </span>
        )}
        <span className="technique-name" style={{ color: isUnlocked ? '#e0e0e0' : '#666' }}>
          {region.emoji} {region.name}
        </span>
        <span className="technique-type" style={{ color: '#9E9E9E' }}>
          {realmName}
        </span>
        {isCurrent && <span className="technique-active-badge">📍 当前</span>}
        {!isUnlocked && <span style={{ color: '#FF9800', fontSize: '0.8em' }}>🔒</span>}
      </div>
      <div className="technique-desc">{region.description}</div>
      {tags.length > 0 && (
        <div className="divine-effects">
          {tags.map((tag, i) => (
            <span key={i} className="divine-effect-tag">{tag}</span>
          ))}
        </div>
      )}
      <div className="technique-actions">
        {isCurrent ? (
          <span style={{ color: '#4FC3F7', fontSize: '0.85em' }}>📍 您在这里</span>
        ) : isUnlocked ? (
          <button
            className="btn btn-technique-activate"
            onClick={onTravel}
            disabled={!canAfford}
            title={canAfford ? `消耗 ${travelCost} 精力` : `精力不足（需 ${travelCost}）`}
          >
            🗺️ 前往（{travelCost}精力）
          </button>
        ) : (
          <span style={{ color: '#FF9800', fontSize: '0.85em' }}>
            🔒 需达到 {realmName}(气修){bodyRealmName ? ` 或 ${bodyRealmName}(体修)` : ''}
          </span>
        )}
      </div>
    </div>
  );
}
