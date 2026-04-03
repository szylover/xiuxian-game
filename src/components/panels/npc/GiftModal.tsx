// ============================================================
// panels/npc/GiftModal.tsx — 赠礼弹窗
// ============================================================

import { useState } from 'react';
import './GiftModal.css';
import type { Player } from '../../../game/player';
import type { NpcDef } from '../../../game/types';
import { getItemDef } from '../../../game/registry';
import { RARITY_COLORS } from '../../shared/constants';

interface GiftModalProps {
  player: Player;
  npc: NpcDef;
  onGift: (itemId: string) => void;
  onClose: () => void;
}

export default function GiftModal({ player, npc, onGift, onClose }: GiftModalProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // 过滤可赠送的物品（排除装备中的），保留原始索引
  const giftableItems = player.inventory
    .map((slot, idx) => ({ slot, idx }))
    .filter(({ slot }) => !!getItemDef(slot.itemId));

  const prefs = npc.giftPreferences;

  const getPreferenceLabel = (itemId: string): { label: string; color: string } | null => {
    if (prefs?.loved.includes(itemId)) return { label: '喜爱', color: '#E91E63' };
    if (prefs?.liked.includes(itemId)) return { label: '喜欢', color: '#4CAF50' };
    if (prefs?.disliked.includes(itemId)) return { label: '厌恶', color: '#F44336' };
    return null;
  };

  return (
    <div className="gift-modal-overlay" onClick={onClose}>
      <div className="gift-modal" onClick={e => e.stopPropagation()}>
        <div className="gift-modal-title">
          🎁 赠礼给 {npc.emoji} {npc.name}
        </div>

        {giftableItems.length === 0 ? (
          <div className="gift-modal-empty">
            背包空空如也…
          </div>
        ) : (
          <div className="gift-item-list">
            {giftableItems.map(({ slot, idx }) => {
              const def = getItemDef(slot.itemId)!;
              const pref = getPreferenceLabel(slot.itemId);
              const isSelected = selectedIdx === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedIdx(idx)}
                  className={`gift-item-row${isSelected ? ' gift-item-selected' : ''}`}
                >
                  <span
                    className="gift-item-name"
                    style={{ '--item-rarity-color': RARITY_COLORS[def.rarity] } as React.CSSProperties}
                  >
                    {def.name}（赠送 1 个，持有 {slot.count}）
                  </span>
                  {pref && (
                    <span
                      className="gift-pref-label"
                      style={{ '--pref-color': pref.color } as React.CSSProperties}
                    >
                      {pref.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="gift-modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button
            className="btn gift-btn-confirm"
            disabled={selectedIdx === null}
            onClick={() => {
              if (selectedIdx !== null) {
                const item = giftableItems.find(g => g.idx === selectedIdx);
                if (item) { onGift(item.slot.itemId); onClose(); }
              }
            }}
          >
            赠送
          </button>
        </div>
      </div>
    </div>
  );
}

