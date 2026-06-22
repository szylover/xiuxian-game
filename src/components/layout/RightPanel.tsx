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
import LearningPanel from '../panels/LearningPanel';
import CraftingPanel from '../panels/CraftingPanel';
import EquipmentPanel from '../panels/EquipmentPanel';
import TechniquePanel from '../panels/TechniquePanel';
import DivineArtsPanel from '../panels/DivineArtsPanel';
import AchievementPanel from '../panels/AchievementPanel';
import MapPanel from '../panels/MapPanel';
import NpcPanel from '../panels/NpcPanel';
import QuestPanel from '../panels/QuestPanel';
import BountyPanel from '../panels/BountyPanel';
import SecretRealmPanel from '../panels/SecretRealmPanel';
import ChroniclePanel from '../panels/ChroniclePanel';
import RankingPanel from '../panels/RankingPanel';
import TalentPanel from '../panels/TalentPanel';
import EnlightenmentPanel from '../panels/EnlightenmentPanel';
import SectPanel from '../panels/SectPanel';
import CompanionPanel from '../panels/CompanionPanel';
import HeartDemonPanel from '../panels/HeartDemonPanel';
import PvpPanel from '../panels/PvpPanel';
import { UI_LABELS } from '../../data/texts/ui-labels';

// 'status' panel is rendered by LeftPanel, so excluded from this config
const PANEL_WIDTHS: Partial<Record<PanelKey, number>> = {
  inventory: 380, technique: 400, learning: 420, divine: 420,
  crafting: 380, equipment: 380, achievement: 420, map: 420, npc: 380,
  quest: 400, companion: 420, bounty: 420, secretRealm: 440, chronicle: 420, ranking: 520, pvp: 520, talent: 560, enlightenment: 500, heartDemon: 500, sect: 520,
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
  onPracticeTechnique: (techniqueId: string) => void;
  onActivateTechnique: (techniqueId: string) => void;
  onActivateDivineArt: (artId: string) => void;
  onDeactivateDivineArt: () => void;
  onStartStudy: (scrollItemId: string) => void;
  onCancelStudy: () => void;
  onUnlockTalentNode: (nodeId: string) => void;
  onContemplateEnlightenment: () => void;
  onTriggerEnlightenment: () => void;
  onSuppressHeartDemon: () => void;
  onConfrontHeartDemon: () => void;
  onChallengePvp: (opponentId: string) => void;
  onJoinSect: (sectId: string) => void;
  onClaimSectStipend: () => void;
  onAdvanceSectRank: () => void;
  onCompleteSectMission: (missionId: string) => void;
  onBuySectStoreItem: (itemId: string) => void;
  onFoundSectManagement: () => void;
  onRecruitSectMember: () => void;
  onCollectSectYield: () => void;
  onUpgradeSectFacility: (facilityId: string) => void;
  onAssignSectMemberTask: (memberId: string, task: import('../../game/types').SectMemberState['task']) => void;
  onTravel: (regionId: string) => void;
  onMeetNpc: (npcId: string) => void;
  onGiveGift: (npcId: string, itemId: string) => void;
  onFormDaoCompanion: (npcId: string) => void;
  onPerformDualCultivation: () => void;
  onDissolveDaoCompanion: () => void;
  onAcceptQuest: (questId: string) => void;
  onAbandonQuest: (questId: string) => void;
  onDeliverQuestItem: (questId: string, objectiveIndex: number) => void;
  onTrackQuest: (questId: string | null) => void;
  onAcceptBounty: (bountyId: string) => void;
  onClaimBounty: (bountyId: string) => void;
  onRefreshBounties: () => void;
  onStartRealm: (realmId: string) => void;
  onAdvanceRealm: () => void;
  onFinishRealm: () => void;
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
  onPracticeTechnique, onActivateTechnique,
  onActivateDivineArt, onDeactivateDivineArt, onStartStudy, onCancelStudy, onUnlockTalentNode,
  onContemplateEnlightenment, onTriggerEnlightenment,
  onSuppressHeartDemon, onConfrontHeartDemon, onChallengePvp,
  onJoinSect, onClaimSectStipend, onAdvanceSectRank, onCompleteSectMission, onBuySectStoreItem,
  onFoundSectManagement, onRecruitSectMember, onCollectSectYield, onUpgradeSectFacility, onAssignSectMemberTask,
  onTravel,
  onMeetNpc, onGiveGift, onFormDaoCompanion, onPerformDualCultivation, onDissolveDaoCompanion,
  onAcceptQuest, onAbandonQuest, onDeliverQuestItem, onTrackQuest,
  onAcceptBounty, onClaimBounty, onRefreshBounties,
  onStartRealm, onAdvanceRealm, onFinishRealm,
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
          {activePanel === 'technique' && <TechniquePanel player={player} onPractice={onPracticeTechnique} onActivate={onActivateTechnique} />}
          {activePanel === 'learning' && <LearningPanel player={player} onStartStudy={onStartStudy} onCancelStudy={onCancelStudy} />}
          {activePanel === 'divine' && <DivineArtsPanel player={player} onActivate={onActivateDivineArt} onDeactivate={onDeactivateDivineArt} />}
          {activePanel === 'crafting' && <CraftingPanel player={player} onCraft={onCraft} onSmith={onSmith} />}
          {activePanel === 'equipment' && <EquipmentPanel player={player} onEquip={onEquip} onUnequip={onUnequip} />}
          {activePanel === 'achievement' && <AchievementPanel player={player} />}
          {activePanel === 'map' && <MapPanel player={player} onTravel={onTravel} />}
          {activePanel === 'npc' && <NpcPanel player={player} onMeetNpc={onMeetNpc} onGiveGift={onGiveGift} onAcceptQuest={onAcceptQuest} onTurnInQuest={onTurnInQuest} onStartDialogue={onStartDialogue} onDialogueSelectChoice={onDialogueSelectChoice} onDialogueAdvance={onDialogueAdvance} />}
          {activePanel === 'companion' && <CompanionPanel player={player} onFormDaoCompanion={onFormDaoCompanion} onPerformDualCultivation={onPerformDualCultivation} onDissolveDaoCompanion={onDissolveDaoCompanion} />}
          {activePanel === 'quest' && <QuestPanel player={player} onAcceptQuest={onAcceptQuest} onAbandonQuest={onAbandonQuest} onDeliverQuestItem={onDeliverQuestItem} onTrackQuest={onTrackQuest} />}
          {activePanel === 'bounty' && <BountyPanel player={player} onAcceptBounty={onAcceptBounty} onClaimBounty={onClaimBounty} onRefreshBounties={onRefreshBounties} />}
          {activePanel === 'secretRealm' && <SecretRealmPanel player={player} onStartRealm={onStartRealm} onAdvanceRealm={onAdvanceRealm} onFinishRealm={onFinishRealm} />}
          {activePanel === 'chronicle' && <ChroniclePanel chronicle={chronicle} />}
          {activePanel === 'ranking' && <RankingPanel player={player} />}
          {activePanel === 'pvp' && <PvpPanel player={player} onChallenge={onChallengePvp} />}
          {activePanel === 'talent' && <TalentPanel player={player} onUnlockNode={onUnlockTalentNode} />}
          {activePanel === 'enlightenment' && <EnlightenmentPanel player={player} onContemplate={onContemplateEnlightenment} onTrigger={onTriggerEnlightenment} />}
          {activePanel === 'heartDemon' && <HeartDemonPanel player={player} onSuppress={onSuppressHeartDemon} onConfront={onConfrontHeartDemon} />}
          {activePanel === 'sect' && <SectPanel player={player} onJoinSect={onJoinSect} onClaimStipend={onClaimSectStipend} onAdvanceRank={onAdvanceSectRank} onCompleteMission={onCompleteSectMission} onBuyStoreItem={onBuySectStoreItem} onFoundManagement={onFoundSectManagement} onRecruitMember={onRecruitSectMember} onCollectYield={onCollectSectYield} onUpgradeFacility={onUpgradeSectFacility} onAssignMemberTask={onAssignSectMemberTask} />}
        </FloatingPanel>
      )}
    </>
  );
}
