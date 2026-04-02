// ============================================================
// panels/npc/NpcDetailModal.tsx — NPC 详情浮窗
// ============================================================

import { useState } from 'react';
import type { Player } from '../../../game/player';
import type { NpcDef, NpcRelationLevel } from '../../../game/types';
import { REALMS } from '../../../game/data';
import { getRelation, getNpcState, GIFT_CD } from '../../../game/npc';
import { NPC_RELATION_CN, NPC_RELATION_COLORS, NPC_RELATION_EMOJI, NPC_PERSONALITY_CN } from '../../shared/constants';
import GiftModal from './GiftModal';

interface NpcDetailModalProps {
  player: Player;
  npc: NpcDef;
  onClose: () => void;
  onMeet: (npcId: string) => void;
  onGift: (npcId: string, itemId: string) => void;
}

export default function NpcDetailModal({ player, npc, onClose, onMeet, onGift }: NpcDetailModalProps) {
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
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} onClick={onClose}>
        <div
          style={{
            background: '#1a1a2e', border: '1px solid #555', borderRadius: 8,
            padding: '1rem 1.2rem', width: 320, maxHeight: '80vh', overflow: 'auto',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* 头部 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2rem' }}>{npc.emoji}</span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#e0e0e0' }}>{npc.name}</div>
              {npc.title && <div style={{ fontSize: '0.72rem', color: '#888' }}>{npc.title}</div>}
            </div>
            <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>

          {/* 基本信息 */}
          <div style={{ fontSize: '0.78rem', color: '#aaa', marginBottom: '0.5rem', lineHeight: 1.6 }}>
            <div>境界：{realmName}期</div>
            <div>性格：{personalityCN}</div>
            <div style={{ fontSize: '0.72rem', color: '#777', marginTop: '0.2rem' }}>{npc.description}</div>
          </div>

          {/* 好感度条 */}
          <div style={{ margin: '0.6rem 0' }}>
            <div style={{ fontSize: '0.75rem', color: '#ccc', marginBottom: '0.25rem' }}>
              好感度 <span style={{ color: relColor }}>{rel.affinity}</span>/{maxAffinity}
              <span style={{ marginLeft: '0.5rem', color: relColor }}>{relEmoji} {relLabel}</span>
            </div>
            <div style={{ background: '#333', borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{
                width: `${barPct}%`,
                height: '100%',
                background: relColor,
                transition: 'width 0.3s',
                borderRadius: 4,
              }} />
            </div>
          </div>

          {/* 交谈消息 */}
          {chatMsg && (
            <div style={{
              background: '#252540', borderRadius: 6, padding: '0.4rem 0.6rem',
              fontSize: '0.78rem', color: '#e0c060', marginBottom: '0.5rem',
              border: '1px solid #444',
            }}>
              {npc.emoji} {npc.name}：{chatMsg}
            </div>
          )}

          {/* 交互按钮 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
            {!rel.met ? (
              <button className="btn" onClick={() => onMeet(npc.id)} style={{ fontSize: '0.8rem' }}>
                👋 邂逅
              </button>
            ) : (
              <>
                <button className="btn" onClick={handleChat} style={{ fontSize: '0.8rem' }}>
                  💬 交谈
                </button>
                <button
                  className="btn"
                  disabled={!canGift}
                  onClick={() => setShowGiftModal(true)}
                  style={{ fontSize: '0.8rem', opacity: canGift ? 1 : 0.5 }}
                  title={giftOnCd ? `冷却中，还需 ${cdMonths} 个月` : '选择物品赠送'}
                >
                  🎁 赠礼{giftOnCd ? `（${cdMonths}月）` : ''}
                </button>
                <button className="btn" disabled style={{ fontSize: '0.8rem', opacity: 0.4 }} title="T0064 论道系统待接入">
                  📖 论道
                </button>
                <button className="btn" disabled style={{ fontSize: '0.8rem', opacity: 0.4 }} title="T0028 切磋系统待实现">
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
