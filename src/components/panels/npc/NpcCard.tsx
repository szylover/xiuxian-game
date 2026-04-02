// ============================================================
// panels/npc/NpcCard.tsx — NPC 卡片组件
// ============================================================

import { REALMS } from '../../../game/data';
import type { NpcDef, NpcRelationLevel } from '../../../game/types';
import { NPC_RELATION_CN, NPC_RELATION_COLORS, NPC_RELATION_EMOJI } from '../../shared/constants';

interface NpcCardProps {
  npc: NpcDef;
  relationLevel: NpcRelationLevel;
  affinity: number;
  met: boolean;
  onClick: () => void;
}

export default function NpcCard({ npc, relationLevel, affinity, met, onClick }: NpcCardProps) {
  const realmName = REALMS[npc.realmIndex]?.name ?? '???';
  const relColor = NPC_RELATION_COLORS[relationLevel];
  const relEmoji = NPC_RELATION_EMOJI[relationLevel];
  const relLabel = NPC_RELATION_CN[relationLevel];

  return (
    <div
      className="npc-card"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.6rem',
        borderRadius: 6,
        border: '1px solid #444',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        background: '#1a1a2e',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = relColor)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#444')}
    >
      <span style={{ fontSize: '1.4rem' }}>{npc.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#e0e0e0' }}>
          {npc.name}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#888' }}>
          {realmName}期
        </div>
      </div>
      <div style={{ textAlign: 'right', fontSize: '0.75rem' }}>
        {met ? (
          <span style={{ color: relColor }}>
            {relEmoji} {relLabel}
            <span style={{ fontSize: '0.65rem', marginLeft: 4, color: '#888' }}>({affinity})</span>
          </span>
        ) : (
          <span style={{ color: '#666' }}>未邂逅</span>
        )}
      </div>
    </div>
  );
}
