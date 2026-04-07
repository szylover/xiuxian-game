import type { Player } from '../../game/player';
import { recalcStats } from '../../game/player';
import { getAllNpcDefs } from '../../game/registry';
import { getNpcState, calcRelationLevel } from '../../game/npc';
import { getDialogueState, resetDialogueState } from '../../game/dialogue';
import type { NpcSystemState, NpcRelation } from '../../game/types';
import { NPC_RELATION_CN } from '../shared/constants';
import './DebugNpcTab.css';

interface Props {
  player: Player;
  onUpdate: (updater: (prev: Player | null) => Player | null) => void;
}

export default function DebugNpcTab({ player, onUpdate }: Props) {
  const allNpcs = getAllNpcDefs();
  const npcState = getNpcState(player);

  const setAffinity = (npcId: string, value: number) => {
    onUpdate(prev => {
      if (!prev) return prev;
      const state = getNpcState(prev);
      const rel: NpcRelation = state.relations[npcId] ?? {
        npcId, affinity: 0, met: true, metAt: prev.gameYear, interactionCount: 0,
        lastInteractionYear: prev.gameYear, relationLevel: 'stranger', flags: {},
      };
      const clamped = Math.max(-100, Math.min(value, 100));
      const newRel: NpcRelation = { ...rel, affinity: clamped, met: true, relationLevel: calcRelationLevel(clamped) };
      const newState: NpcSystemState = {
        ...state,
        relations: { ...state.relations, [npcId]: newRel },
        discoveredNpcs: state.discoveredNpcs.includes(npcId)
          ? state.discoveredNpcs
          : [...state.discoveredNpcs, npcId],
      };
      return recalcStats({ ...prev, systems: { ...prev.systems, npc: newState } });
    });
  };

  const meetAll = () => {
    onUpdate(prev => {
      if (!prev) return prev;
      const state = getNpcState(prev);
      const relations = { ...state.relations };
      const discovered = new Set(state.discoveredNpcs);
      for (const npc of allNpcs) {
        if (!relations[npc.id]) {
          relations[npc.id] = {
            npcId: npc.id, affinity: 5, met: true, metAt: prev.gameYear,
            interactionCount: 0, lastInteractionYear: prev.gameYear,
            relationLevel: 'stranger', flags: {},
          };
        } else {
          relations[npc.id] = { ...relations[npc.id], met: true };
        }
        discovered.add(npc.id);
      }
      const newState: NpcSystemState = { ...state, relations, discoveredNpcs: Array.from(discovered) };
      return { ...prev, systems: { ...prev.systems, npc: newState } };
    });
  };

  const resetAll = () => {
    onUpdate(prev => {
      if (!prev) return prev;
      const newState: NpcSystemState = { relations: {}, discoveredNpcs: [], lastGiftAge: {} };
      return { ...prev, systems: { ...prev.systems, npc: newState } };
    });
  };

  const setAllAffinity = (value: number) => {
    onUpdate(prev => {
      if (!prev) return prev;
      const state = getNpcState(prev);
      const relations = { ...state.relations };
      for (const id of Object.keys(relations)) {
        const clamped = Math.max(-100, Math.min(value, 100));
        relations[id] = { ...relations[id], affinity: clamped, relationLevel: calcRelationLevel(clamped) };
      }
      return { ...prev, systems: { ...prev.systems, npc: { ...state, relations } } };
    });
  };

  return (
    <div className="debug-stats">
      <div className="debug-row debug-npc-header">
        <span className="debug-label debug-npc-header-label">👥 NPC 系统调试</span>
        <div className="debug-npc-info">
          <div>已注册 NPC：{allNpcs.length}</div>
          <div>已邂逅：{npcState.discoveredNpcs.length}</div>
        </div>
      </div>

      <div className="debug-row debug-npc-controls-bar">
        <button className="btn debug-btn" onClick={meetAll}>👋 全部邂逅</button>
        <button className="btn debug-btn" onClick={resetAll}>🗑️ 重置 NPC 状态</button>
        <button className="btn debug-btn" onClick={() => setAllAffinity(90)}>❤️ 全部设为知己</button>
        <button className="btn debug-btn" onClick={() => setAllAffinity(0)}>🤍 全部设为陌生</button>
        <button className="btn debug-btn" onClick={() => setAllAffinity(-60)}>💢 全部设为敌对</button>
      </div>

      <div className="debug-npc-list">
        <span className="debug-label debug-npc-list-label">📋 NPC 好感度</span>
        {allNpcs.map(npc => {
          const rel = npcState.relations[npc.id];
          const affinity = rel?.affinity ?? 0;
          const level = rel ? rel.relationLevel : 'stranger';
          const met = rel?.met ?? false;
          return (
            <div key={npc.id} className="debug-npc-card">
              <span>{npc.emoji}</span>
              <span className={met ? 'debug-npc-name-met' : 'debug-npc-name-unmet'}>{npc.name}</span>
              <span className={`debug-npc-rel debug-npc-rel-${level}`}>
                {NPC_RELATION_CN[level]}
              </span>
              <span className="debug-npc-affinity">({affinity})</span>
              <div className="debug-npc-control-group">
                {[-30, -10, 10, 30].map(d => (
                  <button key={d} className="btn debug-btn debug-btn-tiny"
                    onClick={() => setAffinity(npc.id, affinity + d)}>
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
                <input
                  type="number"
                  className="debug-input-sm debug-npc-input-narrow"
                  placeholder="="
                  onKeyDown={e => {
                    if (e.key === 'Enter') setAffinity(npc.id, Number((e.target as HTMLInputElement).value) || 0);
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 对话系统调试 ── */}
      <div className="debug-npc-list">
        <span className="debug-label debug-npc-list-label">💬 对话系统</span>
        <div className="debug-npc-card">
          <span>已触发: {getDialogueState(player).triggeredOnce.length} 条</span>
          <span>冷却中: {Object.keys(getDialogueState(player).lastTriggerAge).length} 条</span>
          <span>Flags: {Object.keys(getDialogueState(player).flags).length} 个</span>
        </div>
        <div className="debug-npc-card">
          <button className="btn debug-btn debug-btn-sm" onClick={() => {
            onUpdate(prev => prev ? resetDialogueState(prev) : prev);
          }}>🔄 重置所有对话</button>
        </div>
      </div>
    </div>
  );
}
