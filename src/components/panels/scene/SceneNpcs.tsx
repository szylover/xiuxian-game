// ============================================================
// SceneNpcs.tsx — 当前区域 NPC 展示（T0069）
// 横向卡片列表，点击打开 NpcDetailModal
// ============================================================

import './SceneNpcs.css';
import { useState } from 'react';
import type { Player } from '../../../game/player';
import type { NpcDef } from '../../../game/types';
import { getNpcsInRegion, getRelation } from '../../../game/npc';
import { getQuestsForNpc } from '../../../game/quest';
import NpcCard from '../npc/NpcCard';
import NpcDetailModal from '../npc/NpcDetailModal';
import type { PanelKey } from '../../layout/PanelButtons';

interface SceneNpcsProps {
  player: Player;
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
  onOpenContacts: (key: PanelKey) => void;
}

export default function SceneNpcs({
  player, onMeetNpc, onGiveGift, onAcceptQuest, onTurnInQuest, onStartDialogue, onDialogueSelectChoice, onDialogueAdvance, onOpenContacts,
}: SceneNpcsProps) {
  const [selectedNpc, setSelectedNpc] = useState<NpcDef | null>(null);
  const npcs = getNpcsInRegion(player);

  return (
    <div className="scene-npcs">
      <div className="scene-section-header">
        <span className="scene-section-title">此地之人</span>
        <button
          className="scene-section-action"
          onClick={() => onOpenContacts('npc')}
          title="查看所有已邂逅的 NPC"
        >
          📋 人脉总览
        </button>
      </div>

      {npcs.length === 0 ? (
        <div className="scene-npcs-empty">此地空无一人，只有风声呼啸</div>
      ) : (
        <div className="scene-npcs-list">
          {npcs.map(npc => {
            const rel = getRelation(player, npc.id);
            const quests = getQuestsForNpc(player, npc.id);
            return (
              <NpcCard
                key={npc.id}
                npc={npc}
                relationLevel={rel.relationLevel}
                affinity={rel.affinity}
                met={rel.met}
                hasQuest={quests.available.length > 0}
                hasTurnIn={quests.pendingTurnIn.length > 0}
                onClick={() => setSelectedNpc(npc)}
              />
            );
          })}
        </div>
      )}

      {selectedNpc && (
        <NpcDetailModal
          player={player}
          npc={selectedNpc}
          onClose={() => setSelectedNpc(null)}
          onMeet={onMeetNpc}
          onGift={onGiveGift}
          onAcceptQuest={onAcceptQuest}
          onTurnInQuest={onTurnInQuest}
          onStartDialogue={onStartDialogue}
          onDialogueSelectChoice={onDialogueSelectChoice}
          onDialogueAdvance={onDialogueAdvance}
        />
      )}
    </div>
  );
}
