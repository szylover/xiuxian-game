// ============================================================
// DebugPanel.tsx — 调试面板
// 仅在角色名为 "Debug" 时显示，提供修改数值/添加物品等功能
// ============================================================

import { useState } from 'react';
import type { Player } from '../../game/player';
import { recalcStats } from '../../game/player';
import { getAllItemDefs, getAllEquipDefs, getAllTechniqueDefs, getAllDivineArtDefs, getAllAchievementDefs } from '../../game/registry';
import { addItem } from '../../game/inventory';
import { getAllTechniquePassiveBonus } from '../../game/technique';
import { getDivineArtsState, ELEMENT_EMOJI, ELEMENT_CN, ELEMENT_COLOR } from '../../game/divine-arts';
import type { DivineArtsSystemState } from '../../game/divine-arts';
import { getAchievementState, checkAchievements, ONCE_BONUS_KEYS } from '../../game/achievement/engine';

// 颜色映射（供模板字面量中使用）

import { CollapsiblePanel, TabBar } from '../shared';
import DebugStatsTab from './DebugStatsTab';
import DebugItemsTab from './DebugItemsTab';
import DebugChangelogTab from './DebugChangelogTab';

interface DebugPanelProps {
  player: Player;
  onUpdate: (updater: (prev: Player | null) => Player | null) => void;
}

const DEBUG_TABS = [
  { key: 'stats' as const, label: '数值', icon: '📊' },
  { key: 'items' as const, label: '物品', icon: '📦' },
  { key: 'technique' as const, label: '功法', icon: '✨' },
  { key: 'divine' as const, label: '神通', icon: '🌟' },
  { key: 'achievement' as const, label: '成就', icon: '🏆' },
  { key: 'changelog' as const, label: '更新日志', icon: '📋' },
];

export default function DebugPanel({ player, onUpdate }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'stats' | 'items' | 'technique' | 'divine' | 'achievement' | 'changelog'>('stats');
  const [itemQty, setItemQty] = useState<Record<string, number>>({});

  if (!player || player.name !== 'Debug') return null;

  const allItems = getAllItemDefs();
  const allEquips = getAllEquipDefs();

  const setStat = (key: string, value: number) => {
    onUpdate(prev => {
      if (!prev) return prev;
      const p = { ...prev };
      (p as unknown as Record<string, number>)[key] = value;
      return p;
    });
  };

  const fullRestore = () => {
    onUpdate(prev => {
      if (!prev) return prev;
      return { ...prev, hp: prev.maxHp, mp: prev.maxMp, stamina: prev.maxStamina, mentalPower: prev.maxMentalPower, mood: 100, health: 100 };
    });
  };

  const giveItem = (itemId: string) => {
    const count = itemQty[itemId] || 1;
    onUpdate(prev => {
      if (!prev) return prev;
      const { player: p } = addItem(prev, itemId, count);
      return p;
    });
  };

  // ── 功法调试操作 ──
  const forceUpgradeActiveTechnique = () => {
    onUpdate(prev => {
      if (!prev || !prev.activeTechniqueId) return prev;
      const idx = prev.techniques.findIndex(t => t.techniqueId === prev.activeTechniqueId);
      if (idx === -1) return prev;
      const slot = prev.techniques[idx];
      const allDefs = getAllTechniqueDefs();
      const def = allDefs.find(d => d.id === slot.techniqueId);
      if (!def || slot.level >= def.maxLevel) return prev;
      const newTechniques = [...prev.techniques];
      newTechniques[idx] = { ...slot, level: slot.level + 1, exp: 0 };
      return recalcStats({ ...prev, techniques: newTechniques });
    });
  };

  const forceMaxAllTechniques = () => {
    onUpdate(prev => {
      if (!prev) return prev;
      const allDefs = getAllTechniqueDefs();
      const defMap = new Map(allDefs.map(d => [d.id, d]));
      const newTechniques = prev.techniques.map(slot => {
        const def = defMap.get(slot.techniqueId);
        return def ? { ...slot, level: def.maxLevel, exp: 0 } : slot;
      });
      return recalcStats({ ...prev, techniques: newTechniques });
    });
  };

  const getQty = (id: string) => itemQty[id] || 1;
  const setQty = (id: string, v: number) => setItemQty(prev => ({ ...prev, [id]: Math.max(1, v) }));

  // ── 神通调试操作 ──
  const learnAllDivineArts = () => {
    onUpdate(prev => {
      if (!prev) return prev;
      const allArtDefs = getAllDivineArtDefs();
      const newState: DivineArtsSystemState = {
        learned: allArtDefs.map(d => ({ artId: d.id })),
        activeArtId: (prev.systems['divineArts'] as DivineArtsSystemState | undefined)?.activeArtId ?? null,
      };
      return { ...prev, systems: { ...prev.systems, divineArts: newState } };
    });
  };

  const setElementAptitude = (element: string, value: number) => {
    onUpdate(prev => {
      if (!prev) return prev;
      return { ...prev, aptitudes: { ...prev.aptitudes, [element]: value } };
    });
  };

  // ── 成就调试操作 ──
  const unlockAllAchievements = () => {
    onUpdate(prev => {
      if (!prev) return prev;
      const allAchs = getAllAchievementDefs();
      let p = { ...prev };
      const state = getAchievementState(p);
      const unlockedSet = new Set(state.unlockedIds);
      for (const ach of allAchs) {
        if (unlockedSet.has(ach.id)) continue;
        unlockedSet.add(ach.id);
        if (ach.bonusStats) {
          for (const key of ONCE_BONUS_KEYS) {
            const val = (ach.bonusStats as Record<string, number | undefined>)[key];
            if (val) (p as unknown as Record<string, number>)[key] = ((p as unknown as Record<string, number>)[key] ?? 0) + val;
          }
        }
      }
      p = {
        ...p,
        systems: {
          ...p.systems,
          achievement: { unlockedIds: Array.from(unlockedSet), pendingToast: [] },
        },
      };
      return recalcStats(p);
    });
  };

  const clearAllAchievements = () => {
    onUpdate(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        systems: { ...prev.systems, achievement: { unlockedIds: [], pendingToast: [] } },
      };
    });
  };

  const triggerAchievementCheck = () => {
    onUpdate(prev => {
      if (!prev) return prev;
      const { player: checked } = checkAchievements(prev);
      return checked;
    });
  };

  const setKillCount = (v: number) => {
    onUpdate(prev => {
      if (!prev) return prev;
      return { ...prev, tracking: { ...prev.tracking, killCount: v } };
    });
  };

  const setBossKillCount = (v: number) => {
    onUpdate(prev => {
      if (!prev) return prev;
      return { ...prev, tracking: { ...prev.tracking, bossKillCount: v } };
    });
  };

  return (
    <CollapsiblePanel
      className="debug-panel"
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      openLabel="🐛 收起调试"
      closedLabel="🐛 调试"
      toggleClass="debug-toggle"
    >
      <div className="debug-content">
        <div className="debug-warning">⚠️ Debug Mode — 角色名 "Debug" 激活</div>

        <TabBar
          tabs={DEBUG_TABS}
          activeKey={tab}
          onChange={setTab}
          className="shop-tabs"
          tabClassName="shop-tab"
        />

        {tab === 'stats' && (
          <DebugStatsTab player={player} onSetStat={setStat} onFullRestore={fullRestore} />
        )}

        {tab === 'items' && (
          <DebugItemsTab
            items={allItems}
            equips={allEquips}
            getQty={getQty}
            onQtyChange={setQty}
            onGive={giveItem}
          />
        )}

        {tab === 'technique' && (
          <div className="debug-stats">
            <div className="debug-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
              <span className="debug-label" style={{ fontWeight: 'bold' }}>🔮 功法被动调试</span>
              <div className="debug-btns" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
                <button
                  className="btn debug-btn"
                  onClick={forceUpgradeActiveTechnique}
                  disabled={!player.activeTechniqueId}
                  title="将当前激活功法等级 +1 并刷新属性"
                >
                  ⬆️ 激活功法 Lv+1
                </button>
                <button
                  className="btn debug-btn"
                  onClick={forceMaxAllTechniques}
                  title="将所有已学功法设为最大等级，测试被动峰值"
                >
                  🌟 全部功法满级
                </button>
              </div>
            </div>

            {/* 当前被动加成汇总 */}
            <div className="debug-row" style={{ flexDirection: 'column', alignItems: 'flex-start', marginTop: '0.6rem' }}>
              <span className="debug-label" style={{ fontWeight: 'bold' }}>📊 当前被动加成汇总</span>
              <div style={{ fontSize: '0.75rem', color: '#4CAF50', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                {Object.entries(getAllTechniquePassiveBonus(player))
                  .filter(([, v]) => v)
                  .map(([k, v]) => `${k}: +${v}`)
                  .join('  ') || '（无被动加成）'}
              </div>
            </div>

            {/* 各功法被动详情 */}
            <div style={{ marginTop: '0.6rem' }}>
              <span className="debug-label" style={{ fontWeight: 'bold' }}>📖 各功法被动状态</span>
              {player.techniques.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: '#9E9E9E', marginTop: '0.25rem' }}>尚未习得任何功法</div>
              )}
              {player.techniques.map(slot => {
                const allDefs = getAllTechniqueDefs();
                const def = allDefs.find(d => d.id === slot.techniqueId);
                if (!def?.passiveEffects?.length) return null;
                const unlocked = def.passiveEffects.filter(pe => slot.level >= pe.minLevel);
                return (
                  <div key={slot.techniqueId} style={{ marginTop: '0.3rem', fontSize: '0.73rem', border: '1px solid #333', borderRadius: '4px', padding: '0.3rem 0.5rem' }}>
                    <div style={{ color: '#ccc', marginBottom: '0.15rem' }}>
                      {def.name} Lv.{slot.level}/{def.maxLevel}
                      <span style={{ color: '#4CAF50', marginLeft: '0.5rem' }}>
                        ({unlocked.length}/{def.passiveEffects.length} 已解锁)
                      </span>
                    </div>
                    {def.passiveEffects.map((pe, i) => {
                      const isUnlocked = slot.level >= pe.minLevel;
                      return (
                        <div key={i} style={{ color: isUnlocked ? '#81C784' : '#757575', paddingLeft: '0.5rem' }}>
                          {isUnlocked ? '● ' : '○ '}Lv{pe.minLevel} {pe.description}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'divine' && (
          <div className="debug-stats">
            {/* 神通状态概览 */}
            <div className="debug-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
              <span className="debug-label" style={{ fontWeight: 'bold' }}>🌟 神通系统状态</span>
              {(() => {
                const daState = getDivineArtsState(player);
                return (
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#ccc' }}>
                    <div>激活神通：<span style={{ color: '#f1c40f' }}>{daState.activeArtId ?? '无'}</span></div>
                    <div>已学神通：{daState.learned.length > 0
                      ? daState.learned.map(s => {
                          const def = getAllDivineArtDefs().find(d => d.id === s.artId);
                          return def ? `${ELEMENT_EMOJI[def.element]}${def.name}` : s.artId;
                        }).join(' | ')
                      : '无'}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 一键学习全部神通 */}
            <div className="debug-row" style={{ marginTop: '0.5rem' }}>
              <button
                className="btn debug-btn"
                onClick={learnAllDivineArts}
                title="将六系神通全部学习（用于测试）"
              >
                🌟 学习全部神通
              </button>
            </div>

            {/* 快速设置资质 */}
            <div className="debug-row" style={{ marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.3rem' }}>
              <span className="debug-label">⚡ 快速设置：</span>
              <button className="btn debug-btn" onClick={() => setElementAptitude('fire', 100)} style={{ color: '#e74c3c' }}>
                🔥火=100
              </button>
              <button className="btn debug-btn" onClick={() => setElementAptitude('thunder', 60)} style={{ color: '#f1c40f' }}>
                ⚡雷=60
              </button>
              <button className="btn debug-btn" onClick={() => setElementAptitude('water', 50)} style={{ color: '#3498db' }}>
                💧水=50
              </button>
              <button className="btn debug-btn" onClick={() => setElementAptitude('wind', 50)} style={{ color: '#1abc9c' }}>
                🌪️风=50
              </button>
              <button className="btn debug-btn" onClick={() => setElementAptitude('earth', 50)} style={{ color: '#795548' }}>
                🪨土=50
              </button>
              <button className="btn debug-btn" onClick={() => setElementAptitude('wood', 50)} style={{ color: '#27ae60' }}>
                🌿木=50
              </button>
              <button className="btn debug-btn" onClick={() => setElementAptitude('metal', 60)} style={{ color: '#DAA520' }}>
                ⚔️金=60
              </button>
            </div>

            {/* 七系灵根资质当前数值（含金系，对应 T0056 五行） */}
            <div style={{ marginTop: '0.6rem' }}>
              <span className="debug-label" style={{ fontWeight: 'bold' }}>📊 七系灵根资质</span>
              {(['fire', 'water', 'thunder', 'wind', 'earth', 'wood', 'metal'] as const).map(el => {
                const val = (player.aptitudes as unknown as Record<string, number>)[el] ?? 0;
                return (
                  <div key={el} className="debug-row" style={{ marginTop: '0.25rem' }}>
                    <span className="debug-label" style={{ color: ELEMENT_COLOR[el] }}>
                      {ELEMENT_EMOJI[el]} {ELEMENT_CN[el]}灵根：<strong>{val}</strong>
                    </span>
                    <div className="debug-btns">
                      {[10, 30, 50].map(d => (
                        <button key={d} className="btn debug-btn" onClick={() => setElementAptitude(el, val + d)}>
                          +{d}
                        </button>
                      ))}
                      <input
                        type="number"
                        className="debug-input-sm"
                        placeholder="="
                        onKeyDown={e => {
                          if (e.key === 'Enter') setElementAptitude(el, Number((e.target as HTMLInputElement).value) || 0);
                        }}
                        onBlur={e => {
                          const v = Number(e.target.value);
                          if (v || v === 0) setElementAptitude(el, v);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'achievement' && (
          <div className="debug-stats">
            {/* 已解锁列表 */}
            <div className="debug-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
              <span className="debug-label" style={{ fontWeight: 'bold' }}>🏆 已解锁成就</span>
              <div style={{ fontSize: '0.72rem', color: '#FFD700', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {getAchievementState(player).unlockedIds.join(', ') || '（无）'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.1rem' }}>
                已解锁 {getAchievementState(player).unlockedIds.length} / {getAllAchievementDefs().length}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="debug-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem', marginTop: '0.4rem' }}>
              <span className="debug-label" style={{ fontWeight: 'bold' }}>🔧 成就操作</span>
              <div className="debug-btns" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
                <button className="btn debug-btn" onClick={unlockAllAchievements} title="解锁所有注册成就并叠加一次性加成">
                  🌟 解锁全部成就
                </button>
                <button className="btn debug-btn" onClick={clearAllAchievements} title="清空已解锁列表（仅测试用）">
                  🗑️ 清空所有成就
                </button>
                <button className="btn debug-btn" onClick={triggerAchievementCheck} title="立即检测当前 player 状态是否满足成就条件">
                  🔍 手动触发检测
                </button>
              </div>
            </div>

            {/* killCount / bossKillCount 快速编辑 */}
            <div className="debug-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem', marginTop: '0.4rem' }}>
              <span className="debug-label" style={{ fontWeight: 'bold' }}>⚔️ 战斗追踪</span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: '#aaa' }}>击杀: <strong>{player.tracking.killCount}</strong></span>
                <div className="debug-btns">
                  {[10, 50, 100].map(d => (
                    <button key={d} className="btn debug-btn" onClick={() => setKillCount(player.tracking.killCount + d)}>+{d}</button>
                  ))}
                  <input
                    type="number"
                    className="debug-input-sm"
                    placeholder="="
                    onKeyDown={e => { if (e.key === 'Enter') setKillCount(Number((e.target as HTMLInputElement).value) || 0); }}
                    onBlur={e => { const v = Number(e.target.value); if (v || v === 0) setKillCount(v); }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: '#aaa' }}>Boss击杀: <strong>{player.tracking.bossKillCount}</strong></span>
                <div className="debug-btns">
                  {[5, 10].map(d => (
                    <button key={d} className="btn debug-btn" onClick={() => setBossKillCount(player.tracking.bossKillCount + d)}>+{d}</button>
                  ))}
                  <input
                    type="number"
                    className="debug-input-sm"
                    placeholder="="
                    onKeyDown={e => { if (e.key === 'Enter') setBossKillCount(Number((e.target as HTMLInputElement).value) || 0); }}
                    onBlur={e => { const v = Number(e.target.value); if (v || v === 0) setBossKillCount(v); }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === 'changelog' && (
          <DebugChangelogTab />
        )}
      </div>
    </CollapsiblePanel>
  );
}

