// ============================================================
// SceneView.tsx — 场景视图容器（T0069）
// 中央区域主组件，展示当前区域、NPC、出口、修炼进度、操作按钮
// ============================================================

import './SceneView.css';
import type { Player } from '../../../game/player';
import type { PanelKey } from '../../layout/PanelButtons';
import SceneHeader from './SceneHeader';
import SceneNpcs from './SceneNpcs';
import SceneExits from './SceneExits';
import SceneFooter from './SceneFooter';
import ActionPanel from '../ActionPanel';

interface SceneViewProps {
  player: Player;
  onCultivate: () => void;
  onFight: () => void;
  onExplore: () => void;
  onRest: () => void;
  onBreakthrough: () => void;
  onBodyBreakthrough: () => void;
  onOpenLog: () => void;
  onTravel: (regionId: string) => void;
  onSelectPanel: (key: PanelKey) => void;
  onMeetNpc: (npcId: string) => void;
  onGiveGift: (npcId: string, itemId: string) => void;
  onAcceptQuest: (questId: string) => void;
  onTurnInQuest: (questId: string) => void;
  gameOver: boolean;
}

export default function SceneView({
  player,
  onCultivate,
  onFight,
  onExplore,
  onRest,
  onBreakthrough,
  onBodyBreakthrough,
  onOpenLog,
  onTravel,
  onSelectPanel,
  onMeetNpc,
  onGiveGift,
  onAcceptQuest,
  onTurnInQuest,
  gameOver,
}: SceneViewProps) {
  return (
    <div className="scene-view">
      {/* 区域标题栏 */}
      <SceneHeader player={player} />

      {/* 此地之人 */}
      <SceneNpcs
        player={player}
        onMeetNpc={onMeetNpc}
        onGiveGift={onGiveGift}
        onAcceptQuest={onAcceptQuest}
        onTurnInQuest={onTurnInQuest}
        onOpenContacts={onSelectPanel}
      />

      {/* 出口导航 */}
      <SceneExits player={player} onTravel={onTravel} onOpenMap={onSelectPanel} />

      {/* 操作按钮区 */}
      <ActionPanel
        player={player}
        onCultivate={onCultivate}
        onFight={onFight}
        onExplore={onExplore}
        onRest={onRest}
        onBreakthrough={onBreakthrough}
        onBodyBreakthrough={onBodyBreakthrough}
        gameOver={gameOver}
      />

      {/* 底部状态栏 */}
      <SceneFooter player={player} onOpenLog={onOpenLog} />
    </div>
  );
}
