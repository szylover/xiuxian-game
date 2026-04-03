// ============================================================
// panels/npc/NpcDetailModal.tsx — NPC 详情浮窗
// ============================================================

import { useState } from 'react';
import './NpcDetailModal.css';
import type { Player } from '../../../game/player';
import type { NpcDef, NpcRelationLevel } from '../../../game/types';
import { REALMS } from '../../../game/data';
import { getRelation, getNpcState, GIFT_CD } from '../../../game/npc';
import { getQuestsForNpc } from '../../../game/quest';
import { NPC_RELATION_CN, NPC_RELATION_COLORS, NPC_RELATION_EMOJI, NPC_PERSONALITY_CN } from '../../shared/constants';
import { QUEST_TEXTS } from '../../../data/texts/quest';
import QuestRewardPreview from '../quest/QuestRewardPreview';
import GiftModal from './GiftModal';

interface NpcDetailModalProps {
  player: Player;
  npc: NpcDef;
  onClose: () => void;
  onMeet: (npcId: string) => void;
  onGift: (npcId: string, itemId: string) => void;
  onAcceptQuest: (questId: string) => void;
  onTurnInQuest: (questId: string) => void;
}

export default function NpcDetailModal({ player, npc, onClose, onMeet, onGift, onAcceptQuest, onTurnInQuest }: NpcDetailModalProps) {
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [chatMsg, setChatMsg] = useState<string | null>(null);

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

  const CHAT_LINES: Record<string, string[]> = {
    gentle:       ['「修行之路，贵在坚持。」', '「心怀善念，自有天助。」', '「前辈有何指教？」'],
    cold:         ['「……」', '「无事勿扰。」', '「你还不够资格。」'],
    hot_tempered: ['「废话少说！有事快讲！」', '「哼，又来了。」', '「要切磋就痛快点！」'],
    cunning:      ['「嘿嘿，有好东西吗？」', '「做生意讲个诚信。」', '「这笔买卖不亏。」'],
    righteous:    ['「正义之道，不可偏废。」', '「守护弱者，乃修士本分。」', '「你心中有正气。」'],
    mysterious:   ['「天机不可泄露……」', '「或许……某日你会明白。」', '「有缘再见。」'],
  };

  const handleChat = () => {
    if (!rel.met) return;
    const lines = CHAT_LINES[npc.personality] ?? ['「你好。」'];
    setChatMsg(lines[Math.floor(Math.random() * lines.length)]);
    // T0067: 交谈也触发 NPC 交互（推进任务目标 + 发现任务）
    onMeet(npc.id);
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
            {!rel.met ? (
              <button className="btn" onClick={() => onMeet(npc.id)}>
                👋 邂逅
              </button>
            ) : (
              <>
                <button className="btn" onClick={handleChat}>
                  💬 交谈
                </button>
                <button
                  className="btn npc-btn-gift"
                  disabled={!canGift}
                  onClick={() => setShowGiftModal(true)}
                  title={giftOnCd ? `冷却中，还需 ${cdMonths} 个月` : '选择物品赠送'}
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
    </>
  );
}

