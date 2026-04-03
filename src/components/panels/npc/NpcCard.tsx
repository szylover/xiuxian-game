// ============================================================
// panels/npc/NpcCard.tsx — NPC 卡片组件
// ============================================================

import './NpcCard.css';
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
      style={{ '--rel-color': relColor } as React.CSSProperties}
    >
      <span className="npc-card-emoji">{npc.emoji}</span>
      <div className="npc-card-info">
        <div className="npc-card-name">{npc.name}</div>
        <div className="npc-card-realm">{realmName}期</div>
      </div>
      <div className="npc-card-relation">
        {met ? (
          <span className="npc-card-relation-label">
            {relEmoji} {relLabel}
            <span className="npc-card-affinity">({affinity})</span>
          </span>
        ) : (
          <span className="npc-card-unmet">未邂逅</span>
        )}
      </div>
    </div>
  );
}

