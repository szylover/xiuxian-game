// ============================================================
// panels/npc/NpcDetailModal.tsx — NPC 详情浮窗
// ============================================================

import { useState } from 'react';
import './NpcDetailModal.css';
import type { Player } from '../../../game/player';
import type { NpcDef, NpcRelationLevel, DialogueChainDef, DialogueNode } from '../../../game/types';
import { REALMS } from '../../../game/data';
import { getRelation, getNpcState, GIFT_CD, getNpcsInRegion } from '../../../game/npc';
import { getQuestsForNpc } from '../../../game/quest';
import { getTopDialogue, getIdleChat } from '../../../game/dialogue';
import { NPC_RELATION_CN, NPC_RELATION_COLORS, NPC_RELATION_EMOJI, NPC_PERSONALITY_CN } from '../../shared/constants';
import { QUEST_TEXTS } from '../../../data/texts/quest';
import { DIALOGUE_TEXTS } from '../../../data/texts/dialogue';
import QuestRewardPreview from '../quest/QuestRewardPreview';
import GiftModal from './GiftModal';
import DialogueModal from '../../shared/DialogueModal';

interface NpcDetailModalProps {
  player: Player;
  npc: NpcDef;
  onClose: () => void;
  onMeet: (npcId: string) => void;
  onGift: (npcId: string, itemId: string) => void;
  onAcceptQuest: (questId: string) => void;
  onTurnInQuest: (questId: string) => void;
  onStartDialogue: (dialogueId: string) => { node: DialogueNode | null };
  onDialogueSelectChoice: (dialogueId: string, nodeId: string, choiceId: string) => {
    nextNode: DialogueNode | null; logs: string[]; combatTrigger?: string; questTrigger?: string;
  };
  onDialogueAdvance: (dialogueId: string, currentNodeId: string) => {
    nextNode: DialogueNode | null; logs: string[]; combatTrigger?: string; questTrigger?: string;
  };
}

export default function NpcDetailModal({ player, npc, onClose, onMeet, onGift, onAcceptQuest, onTurnInQuest, onStartDialogue, onDialogueSelectChoice, onDialogueAdvance }: NpcDetailModalProps) {
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [chatMsg, setChatMsg] = useState<string | null>(null);
  const [dialogueState, setDialogueState] = useState<{
    def: DialogueChainDef;
    node: DialogueNode;
    effectLogs: string[];
  } | null>(null);

  const rel = getRelation(player, npc.id);
  const npcState = getNpcState(player);
  const realmName = REALMS[npc.realmIndex]?.name ?? '???';
  const maxAffinity = npc.maxAffinity ?? 100;

  const relColor = NPC_RELATION_COLORS[rel.relationLevel];
  const relEmoji = NPC_RELATION_EMOJI[rel.relationLevel];
  const relLabel = NPC_RELATION_CN[rel.relationLevel];
  const personalityCN = NPC_PERSONALITY_CN[npc.personality] ?? npc.personality;

  const lastGiftAge = npcState.lastGiftAge[npc.id] ?? -Infinity;
  const giftCdRemaining = (lastGiftAge + GIFT_CD) - player.age;
  const giftOnCd = giftCdRemaining > 0;
  const canGift = rel.met && player.inventory.length > 0 && !giftOnCd;
  const cdMonths = giftOnCd ? giftCdRemaining : 0;

  const barPct = Math.max(0, Math.min(100, ((rel.affinity + 100) / (maxAffinity + 100)) * 100));

  // 检查 NPC 是否在当前区域
  const isInRegion = getNpcsInRegion(player).some(n => n.id === npc.id);

  const topDialogue = getTopDialogue(player, npc.id);

  const handleChat = () => {
    if (!rel.met) return;
    if (topDialogue) {
      // 有可用对话链 → 启动对话弹窗
      const result = onStartDialogue(topDialogue.id);
      if (result.node) {
        setDialogueState({ def: topDialogue, node: result.node, effectLogs: [] });
      }
    } else {
      // 无可用对话链 → 闲聊
      const msg = getIdleChat(npc.id, npc.personality);
      setChatMsg(msg);
    }
    // 交谈也触发 NPC 交互（推进任务目标 + 发现任务）
    onMeet(npc.id);
  };

  const handleDialogueSelectChoice = (choiceId: string) => {
    if (!dialogueState) return;
    const result = onDialogueSelectChoice(dialogueState.def.id, dialogueState.node.id, choiceId);
    if (result.nextNode) {
      setDialogueState({ def: dialogueState.def, node: result.nextNode, effectLogs: result.logs });
    } else {
      // 对话结束
      setDialogueState(null);
    }
  };

  const handleDialogueContinue = () => {
    if (!dialogueState) return;
    const result = onDialogueAdvance(dialogueState.def.id, dialogueState.node.id);
    if (result.nextNode) {
      setDialogueState({ def: dialogueState.def, node: result.nextNode, effectLogs: result.logs });
    } else {
      setDialogueState(null);
    }
  };

  const handleDialogueEnd = () => {
    setDialogueState(null);
  };

  return (
    <>
      <div
        className="npc-detail-overlay"
        onClick={onClose}
        style={{ '--rel-color': relColor } as React.CSSProperties}
      >
        <div
          className="npc-detail-modal"
          onClick={e => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="npc-detail-header">
            <span className="npc-detail-emoji">{npc.emoji}</span>
            <div>
              <div className="npc-detail-name">{npc.name}</div>
              {npc.title && <div className="npc-detail-title">{npc.title}</div>}
            </div>
            <button className="npc-detail-close" onClick={onClose}>✕</button>
          </div>

          {/* 基本信息 */}
          <div className="npc-detail-info">
            <div>境界：{realmName}期</div>
            <div>性格：{personalityCN}</div>
            <div className="npc-detail-description">{npc.description}</div>
          </div>

          {/* 好感度条 */}
          <div className="npc-detail-affinity">
            <div className="npc-detail-affinity-label">
              好感度{' '}
              <span className="npc-detail-affinity-value">{rel.affinity}</span>/{maxAffinity}
              <span className="npc-detail-affinity-status">{relEmoji} {relLabel}</span>
            </div>
            <div className="npc-affinity-track">
              <div
                className="npc-affinity-fill"
                style={{ '--bar-pct': `${barPct}%` } as React.CSSProperties}
              />
            </div>
          </div>

          {/* 交谈消息 */}
          {chatMsg && (
            <div className="npc-chat-bubble">
              {npc.emoji} {npc.name}：{chatMsg}
            </div>
          )}

          {/* 📜 任务区域 */}
          {(() => {
            const { available, pendingTurnIn } = getQuestsForNpc(player, npc.id);
            if (available.length === 0 && pendingTurnIn.length === 0) return null;
            return (
              <div className="npc-quest-section">
                <div className="npc-quest-section-title">
                  {QUEST_TEXTS.npcQuestsTitle}
                </div>
                {pendingTurnIn.map(({ def }) => (
                  <div key={def.id} className="npc-quest-item npc-quest-item-turnin">
                    <div className="npc-quest-item-name npc-quest-item-name-turnin">{def.icon} {def.name} ✅</div>
                    <div className="npc-quest-item-desc">{def.description}</div>
                    <QuestRewardPreview reward={def.rewards} />
                    <button className="btn btn-sm btn-primary npc-quest-item-btn" onClick={() => onTurnInQuest(def.id)}>
                      {QUEST_TEXTS.npcQuestTurnIn}
                    </button>
                  </div>
                ))}
                {available.map(def => (
                  <div key={def.id} className="npc-quest-item npc-quest-item-available">
                    <div className="npc-quest-item-name">{def.icon} {def.name}</div>
                    <div className="npc-quest-item-desc">{def.description}</div>
                    <QuestRewardPreview reward={def.rewards} />
                    <button className="btn btn-sm btn-primary npc-quest-item-btn" onClick={() => onAcceptQuest(def.id)}>
                      {QUEST_TEXTS.npcQuestAccept}
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* 交互按钮 */}
          <div className="npc-detail-actions">
            {!isInRegion && rel.met && (
              <div className="npc-not-here-hint">此人不在当前区域，无法交互</div>
            )}
            {!rel.met ? (
              <button className="btn" onClick={() => onMeet(npc.id)} disabled={!isInRegion}
                title={!isInRegion ? '此人不在当前区域' : ''}>
                👋 邂逅
              </button>
            ) : (
              <>
                <button className="btn" onClick={handleChat} disabled={!isInRegion}
                  title={!isInRegion ? '此人不在当前区域' : ''}>
                  {topDialogue ? DIALOGUE_TEXTS.chatBtnHasDialogue : DIALOGUE_TEXTS.chatBtnIdle}
                </button>
                <button
                  className="btn npc-btn-gift"
                  disabled={!canGift || !isInRegion}
                  onClick={() => setShowGiftModal(true)}
                  title={!isInRegion ? '此人不在当前区域' : giftOnCd ? `冷却中，还需 ${cdMonths} 个月` : '选择物品赠送'}
                >
                  🎁 赠礼{giftOnCd ? `（${cdMonths}月）` : ''}
                </button>
                <button className="btn npc-btn-disabled" disabled title="T0064 论道系统待接入">
                  📖 论道
                </button>
                <button className="btn npc-btn-disabled" disabled title="T0028 切磋系统待实现">
                  ⚔️ 切磋
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showGiftModal && (
        <GiftModal
          player={player}
          npc={npc}
          onGift={(itemId) => onGift(npc.id, itemId)}
          onClose={() => setShowGiftModal(false)}
        />
      )}

      {dialogueState && (
        <DialogueModal
          player={player}
          dialogueDef={dialogueState.def}
          currentNode={dialogueState.node}
          effectLogs={dialogueState.effectLogs}
          onSelectChoice={handleDialogueSelectChoice}
          onContinue={handleDialogueContinue}
          onEnd={handleDialogueEnd}
        />
      )}
    </>
  );
}

