// ============================================================
// panels/npc/GiftModal.tsx — 赠礼弹窗
// ============================================================

import { useState } from 'react';
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
  const [selected, setSelected] = useState<string | null>(null);

  // 过滤可赠送的物品（排除装备中的）
  const giftableItems = player.inventory.filter(slot => {
    const def = getItemDef(slot.itemId);
    return !!def;
  });

  const prefs = npc.giftPreferences;

  const getPreferenceLabel = (itemId: string): { label: string; color: string } | null => {
    if (prefs?.loved.includes(itemId)) return { label: '喜爱', color: '#E91E63' };
    if (prefs?.liked.includes(itemId)) return { label: '喜欢', color: '#4CAF50' };
    if (prefs?.disliked.includes(itemId)) return { label: '厌恶', color: '#F44336' };
    return null;
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: '#1a1a2e', border: '1px solid #555', borderRadius: 8,
          padding: '1rem', width: 340, maxHeight: '60vh', overflow: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '0.6rem', fontSize: '0.9rem' }}>
          🎁 赠礼给 {npc.emoji} {npc.name}
        </div>

        {giftableItems.length === 0 ? (
          <div style={{ color: '#888', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
            背包空空如也…
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {giftableItems.map(slot => {
              const def = getItemDef(slot.itemId)!;
              const pref = getPreferenceLabel(slot.itemId);
              const isSelected = selected === slot.itemId;
              return (
                <div
                  key={slot.itemId}
                  onClick={() => setSelected(slot.itemId)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.35rem 0.5rem', borderRadius: 4,
                    border: isSelected ? '1px solid #4CAF50' : '1px solid #333',
                    cursor: 'pointer', background: isSelected ? '#1e3a1e' : 'transparent',
                  }}
                >
                  <span style={{ color: RARITY_COLORS[def.rarity], fontSize: '0.8rem', flex: 1 }}>
                    {def.name} ×{slot.count}
                  </span>
                  {pref && (
                    <span style={{ fontSize: '0.65rem', color: pref.color, whiteSpace: 'nowrap' }}>
                      {pref.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} style={{ fontSize: '0.8rem' }}>取消</button>
          <button
            className="btn"
            disabled={!selected}
            onClick={() => { if (selected) { onGift(selected); onClose(); } }}
            style={{ fontSize: '0.8rem', opacity: selected ? 1 : 0.5 }}
          >
            赠送
          </button>
        </div>
      </div>
    </div>
  );
}
