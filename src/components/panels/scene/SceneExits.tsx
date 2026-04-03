// ============================================================
// SceneExits.tsx — 出口导航（T0069）
// 显示从当前区域可前往的相邻区域列表
// ============================================================

import './SceneExits.css';
import { useState } from 'react';
import type { Player } from '../../../game/player';
import { getSceneExits } from '../../../game/map';
import type { PanelKey } from '../../layout/PanelButtons';

const MAX_VISIBLE = 5;

const DIRECTION_ICONS: Record<string, string> = {
  up: '⬆',
  down: '→',
  sibling: '→',
};

interface SceneExitsProps {
  player: Player;
  onTravel: (regionId: string) => void;
  onOpenMap: (key: PanelKey) => void;
}

export default function SceneExits({ player, onTravel, onOpenMap }: SceneExitsProps) {
  const exits = getSceneExits(player);
  const [expanded, setExpanded] = useState(false);
  const visibleExits = expanded ? exits : exits.slice(0, MAX_VISIBLE);
  const hasMore = exits.length > MAX_VISIBLE;

  return (
    <div className="scene-exits">
      <div className="scene-section-header">
        <span className="scene-section-title">可去之处</span>
        <button
          className="scene-section-action"
          onClick={() => onOpenMap('map')}
          title="打开世界地图"
        >
          🗺️ 全图
        </button>
      </div>

      {exits.length === 0 ? (
        <div className="scene-exits-empty">此处无路可去</div>
      ) : (
        <div className="scene-exits-list">
          {visibleExits.map(exit => {
            const canGo = exit.canEnter && player.stamina >= exit.travelCost;
            const dirIcon = DIRECTION_ICONS[exit.direction] ?? '→';
            let title = '';
            if (!exit.canEnter) title = exit.lockReason ?? '无法进入';
            else if (player.stamina < exit.travelCost) title = `精力不足（需要 ${exit.travelCost}，当前 ${player.stamina}）`;

            return (
              <div key={exit.region.id} className={`scene-exit-item ${!exit.canEnter ? 'scene-exit-locked' : ''}`}>
                <span className="scene-exit-info">
                  <span className="scene-exit-dir">{dirIcon}</span>
                  <span className="scene-exit-emoji">{exit.region.emoji}</span>
                  <span className="scene-exit-name">{exit.region.name}</span>
                  {exit.canEnter ? (
                    <span className="scene-exit-cost">{exit.travelCost}⚡</span>
                  ) : (
                    <span className="scene-exit-lock">🔒 {exit.lockReason}</span>
                  )}
                </span>
                {exit.canEnter && (
                  <button
                    className="scene-exit-btn"
                    onClick={() => onTravel(exit.region.id)}
                    disabled={!canGo}
                    title={title || `前往${exit.region.name}`}
                  >
                    前往
                  </button>
                )}
              </div>
            );
          })}
          {hasMore && !expanded && (
            <button className="scene-exits-more" onClick={() => setExpanded(true)}>
              还有 {exits.length - MAX_VISIBLE} 个区域...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
