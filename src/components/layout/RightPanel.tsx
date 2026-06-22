// ============================================================
// layout/RightPanel.tsx — 右栏按钮组 + 浮动面板
// 点击按钮弹出可拖拽浮动窗口
// ============================================================

import type { Player } from '../../game/player';
import type { CultivationChronicle } from '../../game/chronicle';
import type { EquipSlot } from '../../game/registry';
import { FloatingPanel } from '../shared';
import PanelButtons from './PanelButtons';
import type { PanelKey } from './PanelButtons';
import InventoryPanel from '../panels/InventoryPanel';
import ShopPanel from '../panels/ShopPanel';
import CraftingPanel from '../panels/CraftingPanel';
import EquipmentPanel from '../panels/EquipmentPanel';
import TechniquePanel from '../panels/TechniquePanel';
import DivineArtsPanel from '../panels/DivineArtsPanel';
import AchievementPanel from '../panels/AchievementPanel';
import MapPanel from '../panels/MapPanel';
import NpcPanel from '../panels/NpcPanel';
import QuestPanel from '../panels/QuestPanel';
import ChroniclePanel from '../panels/ChroniclePanel';
import RankingPanel from '../panels/RankingPanel';
import { UI_LABELS } from '../../data/texts/ui-labels';

// 'status' panel is rendered by LeftPanel, so excluded from this config
const PANEL_WIDTHS: Partial<Record<PanelKey, number>> = {
  inventory: 380, shop: 380, technique: 400, divine: 420,
  crafting: 380, equipment: 380, achievement: 420, map: 420, npc: 380,
  quest: 400, chronicle: 420, ranking: 520,
};

interface RightPanelProps {
  player: Player;
  activePanel: PanelKey | null;
  onSelectPanel: (key: PanelKey) => void;
  onUseItem: (itemId: string) => void;
  onCraft: (recipeId: string) => void;
  onSmith: (recipeId: string) => void;
  onEquip: (equipId: string) => void;
  onUnequip: (slot: EquipSlot) => void;
  onBuy: (itemId: string) => void;
  onSell: (itemId: string) => void;
  onLearnTechnique: (techniqueId: string) => void;
  onPracticeTechnique: (techniqueId: string) => void;
  onActivateTechnique: (techniqueId: string) => void;
  onLearnDivineArt: (artId: string) => void;
  onActivateDivineArt: (artId: string) => void;
  onDeactivateDivineArt: () => void;
  onTravel: (regionId: string) => void;
  onMeetNpc: (npcId: string) => void;
  onGiveGift: (npcId: string, itemId: string) => void;
  onAcceptQuest: (questId: string) => void;
  onAbandonQuest: (questId: string) => void;
  onDeliverQuestItem: (questId: string, objectiveIndex: number) => void;
  onTrackQuest: (questId: string | null) => void;
  onStartDialogue: (dialogueId: string) => { node: import('../../game/types').DialogueNode | null };
  onDialogueSelectChoice: (dialogueId: string, nodeId: string, choiceId: string) => {
    nextNode: import('../../game/types').DialogueNode | null; logs: string[]; combatTrigger?: string; questTrigger?: string;
  };
  onDialogueAdvance: (dialogueId: string, currentNodeId: string) => {
    nextNode: import('../../game/types').DialogueNode | null; logs: string[]; combatTrigger?: string; questTrigger?: string;
  };
  onTurnInQuest: (questId: string) => void;
  chronicle: CultivationChronicle;
}

export default function RightPanel({
  player, activePanel, onSelectPanel,
  onUseItem, onCraft, onSmith, onEquip, onUnequip, onBuy, onSell,
  onLearnTechnique, onPracticeTechnique, onActivateTechnique,
  onLearnDivineArt, onActivateDivineArt, onDeactivateDivineArt,
  onTravel,
  onMeetNpc, onGiveGift,
  onAcceptQuest, onAbandonQuest, onDeliverQuestItem, onTrackQuest,
  onTurnInQuest,
  onStartDialogue, onDialogueSelectChoice, onDialogueAdvance,
  chronicle,
}: RightPanelProps) {
  const closePanel = () => onSelectPanel(activePanel!);
  const panelLabel = activePanel ? UI_LABELS.panels[activePanel] : null;
  const panelWidth = activePanel ? PANEL_WIDTHS[activePanel] : undefined;

  return (
    <>
      <PanelButtons player={player} activePanel={activePanel} onSelect={onSelectPanel} />

      {activePanel && activePanel !== 'status' && panelLabel && (
        <FloatingPanel
          title={panelLabel.title}
          icon={panelLabel.icon}
          width={panelWidth}
          onClose={closePanel}
        >
          {activePanel === 'inventory' && <InventoryPanel player={player} onUseItem={onUseItem} />}
          {activePanel === 'shop' && <ShopPanel player={player} onBuy={onBuy} onSell={onSell} />}
          {activePanel === 'technique' && <TechniquePanel player={player} onLearn={onLearnTechnique} onPractice={onPracticeTechnique} onActivate={onActivateTechnique} />}
          {activePanel === 'divine' && <DivineArtsPanel player={player} onLearn={onLearnDivineArt} onActivate={onActivateDivineArt} onDeactivate={onDeactivateDivineArt} />}
          {activePanel === 'crafting' && <CraftingPanel player={player} onCraft={onCraft} onSmith={onSmith} />}
          {activePanel === 'equipment' && <EquipmentPanel player={player} onEquip={onEquip} onUnequip={onUnequip} />}
          {activePanel === 'achievement' && <AchievementPanel player={player} />}
          {activePanel === 'map' && <MapPanel player={player} onTravel={onTravel} />}
          {activePanel === 'npc' && <NpcPanel player={player} onMeetNpc={onMeetNpc} onGiveGift={onGiveGift} onAcceptQuest={onAcceptQuest} onTurnInQuest={onTurnInQuest} onStartDialogue={onStartDialogue} onDialogueSelectChoice={onDialogueSelectChoice} onDialogueAdvance={onDialogueAdvance} />}
          {activePanel === 'quest' && <QuestPanel player={player} onAcceptQuest={onAcceptQuest} onAbandonQuest={onAbandonQuest} onDeliverQuestItem={onDeliverQuestItem} onTrackQuest={onTrackQuest} />}
          {activePanel === 'chronicle' && <ChroniclePanel chronicle={chronicle} />}
          {activePanel === 'ranking' && <RankingPanel player={player} />}
        </FloatingPanel>
      )}
    </>
  );
}
