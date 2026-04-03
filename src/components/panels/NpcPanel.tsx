// ============================================================
// panels/NpcPanel.tsx — NPC 面板入口
// 当前区域 + 人脉总览 两个 Tab
// ============================================================

import { useState } from 'react';
import type { Player } from '../../game/player';
import { TabBar } from '../shared';
import { getNpcsInRegion, getRelation, getNpcState } from '../../game/npc';
import { getCurrentRegion } from '../../game/map';
import { getAllNpcDefs } from '../../game/registry';
import { getQuestsForNpc } from '../../game/quest';
import type { NpcDef } from '../../game/types';
import NpcCard from './npc/NpcCard';
import NpcDetailModal from './npc/NpcDetailModal';
import './NpcPanel.css';

const TABS = [
  { key: 'region' as const, label: '当前区域', icon: '📍' },
  { key: 'contacts' as const, label: '人脉总览', icon: '📋' },
];

interface NpcPanelProps {
  player: Player;
  onMeetNpc: (npcId: string) => void;
  onGiveGift: (npcId: string, itemId: string) => void;
  onAcceptQuest: (questId: string) => void;
  onTurnInQuest: (questId: string) => void;
}

export default function NpcPanel({ player, onMeetNpc, onGiveGift, onAcceptQuest, onTurnInQuest }: NpcPanelProps) {
  const [tab, setTab] = useState<'region' | 'contacts'>('region');
  const [selectedNpc, setSelectedNpc] = useState<NpcDef | null>(null);

  const region = getCurrentRegion(player);
  const regionNpcs = getNpcsInRegion(player);
  const npcState = getNpcState(player);

  // 人脉列表：所有已邂逅的 NPC
  const contactNpcs = npcState.discoveredNpcs
    .map(id => getAllNpcDefs().find(d => d.id === id))
    .filter((d): d is NpcDef => !!d);

  // T0067: 检查哪些 NPC 有可发现的任务或可交付的任务
  const npcQuestFlags = new Map<string, { hasQuest: boolean; hasTurnIn: boolean }>();
  const allRegionAndContactNpcs = [...regionNpcs, ...contactNpcs];
  const seenNpc = new Set<string>();
  for (const npc of allRegionAndContactNpcs) {
    if (seenNpc.has(npc.id)) continue;
    seenNpc.add(npc.id);
    const { available, pendingTurnIn } = getQuestsForNpc(player, npc.id);
    npcQuestFlags.set(npc.id, { hasQuest: available.length > 0, hasTurnIn: pendingTurnIn.length > 0 });
  }

  const renderNpcList = (npcs: NpcDef[], emptyMsg: string) => {
    if (npcs.length === 0) {
      return (
        <div className="npc-list-empty">
          {emptyMsg}
        </div>
      );
    }
    return (
      <div className="npc-list-column">
        {npcs.map(npc => {
          const rel = getRelation(player, npc.id);
          const flags = npcQuestFlags.get(npc.id);
          return (
            <NpcCard
              key={npc.id}
              npc={npc}
              relationLevel={rel.relationLevel}
              affinity={rel.affinity}
              met={rel.met}
              hasQuest={flags?.hasQuest}
              hasTurnIn={flags?.hasTurnIn}
              onClick={() => setSelectedNpc(npc)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <TabBar
        tabs={TABS}
        activeKey={tab}
        onChange={setTab}
        className="shop-tabs"
        tabClassName="shop-tab"
      />

      {tab === 'region' && (
        <div className="npc-tab-section">
          <div className="npc-tab-section-label">
            📍 当前区域：{region?.emoji} {region?.name ?? '未知'}
          </div>
          {renderNpcList(regionNpcs, '当前区域无 NPC')}
        </div>
      )}

      {tab === 'contacts' && (
        <div className="npc-tab-section">
          <div className="npc-tab-section-label">
            已邂逅 {contactNpcs.length} 位修士
          </div>
          {renderNpcList(contactNpcs, '尚未邂逅任何人')}
        </div>
      )}

      {selectedNpc && (
        <NpcDetailModal
          player={player}
          npc={selectedNpc}
          onClose={() => setSelectedNpc(null)}
          onMeet={(npcId) => { onMeetNpc(npcId); setSelectedNpc(null); }}
          onGift={(npcId, itemId) => { onGiveGift(npcId, itemId); }}
          onAcceptQuest={(questId) => { onAcceptQuest(questId); }}
          onTurnInQuest={(questId) => { onTurnInQuest(questId); }}
        />
      )}
    </div>
  );
}
