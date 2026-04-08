// ============================================================
// SceneView.tsx — 场景视图容器（T0069）
// 中央区域主组件，展示当前区域、NPC、出口、修炼进度、操作按钮
// ============================================================

import './SceneView.css';
import type { Player } from '../../../game/player';
import type { PanelKey } from '../../layout/PanelButtons';
import SceneHeader from './SceneHeader';
import SceneNpcs from './SceneNpcs';
import ActionPanel from '../ActionPanel';

interface SceneViewProps {
  player: Player;
  onCultivate: () => void;
  onFight: () => void;
  onExplore: () => void;
  onRest: () => void;
  onBreakthrough: () => void;
  onBodyBreakthrough: () => void;
  onAscend: () => void;
  onOpenLog: () => void;
  onTravel: (regionId: string) => void;
  onSelectPanel: (key: PanelKey) => void;
  onMeetNpc: (npcId: string) => void;
  onGiveGift: (npcId: string, itemId: string) => void;
  onAcceptQuest: (questId: string) => void;
  onTurnInQuest: (questId: string) => void;
  onStartDialogue: (dialogueId: string) => { node: import('../../../game/types').DialogueNode | null };
  onDialogueSelectChoice: (dialogueId: string, nodeId: string, choiceId: string) => {
    nextNode: import('../../../game/types').DialogueNode | null; logs: string[]; combatTrigger?: string; questTrigger?: string;
  };
  onDialogueAdvance: (dialogueId: string, currentNodeId: string) => {
    nextNode: import('../../../game/types').DialogueNode | null; logs: string[]; combatTrigger?: string; questTrigger?: string;
  };
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
  onAscend,
  onOpenLog,
  onTravel,
  onSelectPanel,
  onMeetNpc,
  onGiveGift,
  onAcceptQuest,
  onTurnInQuest,
  onStartDialogue,
  onDialogueSelectChoice,
  onDialogueAdvance,
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
        onStartDialogue={onStartDialogue}
        onDialogueSelectChoice={onDialogueSelectChoice}
        onDialogueAdvance={onDialogueAdvance}
        onOpenContacts={onSelectPanel}
      />

      {/* 操作按钮区 */}
      <ActionPanel
        player={player}
        onCultivate={onCultivate}
        onFight={onFight}
        onExplore={onExplore}
        onRest={onRest}
        onBreakthrough={onBreakthrough}
        onBodyBreakthrough={onBodyBreakthrough}
        onAscend={onAscend}
        onOpenMap={() => onSelectPanel('map')}
        gameOver={gameOver}
      />
    </div>
  );
}
