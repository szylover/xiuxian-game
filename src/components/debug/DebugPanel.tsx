// ============================================================
// DebugPanel.tsx — 调试面板
// 仅在角色名为 "Debug" 时显示，提供修改数值/添加物品等功能
// ============================================================

import { useState } from 'react';
import type { Player } from '../../game/player';
import { recalcStats } from '../../game/player';
import { getAllItemDefs, getAllEquipDefs, getAllTechniqueDefs, getAllDivineArtDefs, getAllAchievementDefs, getAllBottleneckDefs } from '../../game/registry';
import { addItem } from '../../game/inventory';
import { getAllTechniquePassiveBonus } from '../../game/technique';
import { getDivineArtsState, ELEMENT_EMOJI, ELEMENT_CN, ELEMENT_COLOR } from '../../game/divine-arts';
import type { DivineArtsSystemState } from '../../game/divine-arts';
import { getAchievementState, checkAchievements, ONCE_BONUS_KEYS } from '../../game/achievement/engine';
import { activateBottleneck, unlockBottleneck, ensureBottleneckState } from '../../game/bottleneck';
import type { BottleneckState } from '../../game/types';

// 颜色映射（供模板字面量中使用）

import { CollapsiblePanel, TabBar } from '../shared';
import DebugStatsTab from './DebugStatsTab';
import DebugItemsTab from './DebugItemsTab';
import DebugChangelogTab from './DebugChangelogTab';
import DebugNpcTab from './DebugNpcTab';
import './DebugPanel.css';

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
  { key: 'bottleneck' as const, label: '瓶颈', icon: '🚧' },
  { key: 'npc' as const, label: 'NPC', icon: '👥' },
  { key: 'changelog' as const, label: '日志', icon: '📋' },
];

export default function DebugPanel({ player, onUpdate }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'stats' | 'items' | 'technique' | 'divine' | 'achievement' | 'bottleneck' | 'npc' | 'changelog'>('stats');
  const [itemQty, setItemQty] = useState<Record<string, number>>({});

  if (!player || player.name !== 'Debug') return null;

  const allItems = getAllItemDefs();
  const allEquips = getAllEquipDefs();

  const RECALC_KEYS = new Set(['realmIndex', 'bodyRealmIndex']);

  const setStat = (key: string, value: number) => {
    onUpdate(prev => {
      if (!prev) return prev;
      const p = { ...prev };
      (p as unknown as Record<string, number>)[key] = value;
      if (RECALC_KEYS.has(key)) return recalcStats(p);
      return p;
    });
  };

  const fullRestore = () => {
    onUpdate(prev => {
      if (!prev) return prev;
      return { ...prev, hp: prev.maxHp, mp: prev.maxMp, stamina: prev.maxStamina, mentalPower: prev.maxMentalPower, mood: 100, health: 100 };
    });
  };

  // T0021: Debug 区域传送（无视境界/精力限制）
  const debugTravel = (regionId: string) => {
    onUpdate(prev => {
      if (!prev) return prev;
      const systems = prev.systems ?? {};
      const mapState = systems['map'] as { currentRegionId: string; unlockedRegions: string[]; travelCount: number } | undefined;
      const unlocked = new Set(mapState?.unlockedRegions ?? ['core:qingyun_town']);
      unlocked.add(regionId);
      return {
        ...prev,
        systems: {
          ...systems,
          map: {
            currentRegionId: regionId,
            unlockedRegions: Array.from(unlocked),
            travelCount: (mapState?.travelCount ?? 0) + 1,
          },
        },
      };
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

  const setTrackingField = (key: string, v: number) => {
    onUpdate(prev => {
      if (!prev) return prev;
      return { ...prev, tracking: { ...prev.tracking, [key]: v } };
    });
  };

  // 物品/装备按品质排序
  const RARITY_ORDER: Record<string, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
  const sortedItems = [...allItems].sort((a, b) => (RARITY_ORDER[a.rarity] ?? 5) - (RARITY_ORDER[b.rarity] ?? 5));
  const sortedEquips = [...allEquips].sort((a, b) => (RARITY_ORDER[a.rarity] ?? 5) - (RARITY_ORDER[b.rarity] ?? 5));

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
          <DebugStatsTab player={player} onSetStat={setStat} onFullRestore={fullRestore} onDebugTravel={debugTravel} onSetTracking={setTrackingField} />
        )}

        {tab === 'items' && (
          <DebugItemsTab
            items={sortedItems}
            equips={sortedEquips}
            getQty={getQty}
            onQtyChange={setQty}
            onGive={giveItem}
          />
        )}

        {tab === 'technique' && (
          <div className="debug-stats">
            <div className="debug-row debug-row-column">
              <span className="debug-label debug-label-bold">🔮 功法被动调试</span>
              <div className="debug-btns debug-btns-wrap">
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
            <div className="debug-row debug-row-column debug-row-spaced">
              <span className="debug-label debug-label-bold">📊 当前被动加成汇总</span>
              <div className="debug-passive-summary">
                {Object.entries(getAllTechniquePassiveBonus(player))
                  .filter(([, v]) => v)
                  .map(([k, v]) => `${k}: +${v}`)
                  .join('  ') || '（无被动加成）'}
              </div>
            </div>

            {/* 各功法被动详情 */}
            <div className="debug-row-spaced">
              <span className="debug-label debug-label-bold">📖 各功法被动状态</span>
              {player.techniques.length === 0 && (
                <div className="debug-passive-list-row debug-text-muted">尚未习得任何功法</div>
              )}
              {player.techniques.map(slot => {
                const allDefs = getAllTechniqueDefs();
                const def = allDefs.find(d => d.id === slot.techniqueId);
                if (!def?.passiveEffects?.length) return null;
                const unlocked = def.passiveEffects.filter(pe => slot.level >= pe.minLevel);
                return (
                  <div key={slot.techniqueId} className="debug-passive-list-row">
                    <div className="debug-passive-tech-name">
                      {def.name} Lv.{slot.level}/{def.maxLevel}
                      <span className="debug-passive-level">
                        ({unlocked.length}/{def.passiveEffects.length} 已解锁)
                      </span>
                    </div>
                    {def.passiveEffects.map((pe, i) => {
                      const isUnlocked = slot.level >= pe.minLevel;
                      return (
                        <div key={i} className={isUnlocked ? 'debug-passive-unlocked' : 'debug-passive-locked'}>
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
            <div className="debug-row debug-row-column">
              <span className="debug-label debug-label-bold">🌟 神通系统状态</span>
              {(() => {
                const daState = getDivineArtsState(player);
                return (
                  <div className="debug-divine-state">
                    <div>激活神通：<span className="debug-divine-active">{daState.activeArtId ?? '无'}</span></div>
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
            <div className="debug-row debug-row-spaced">
              <button
                className="btn debug-btn"
                onClick={learnAllDivineArts}
                title="将六系神通全部学习（用于测试）"
              >
                🌟 学习全部神通
              </button>
            </div>

            {/* 快速设置资质 */}
            <div className="debug-row debug-row-spaced debug-row-wrap">
              <span className="debug-label">⚡ 快速设置：</span>
              <button className="btn debug-btn debug-btn-fire" onClick={() => setElementAptitude('fire', 100)}>
                🔥火=100
              </button>
              <button className="btn debug-btn debug-btn-thunder" onClick={() => setElementAptitude('thunder', 60)}>
                ⚡雷=60
              </button>
              <button className="btn debug-btn debug-btn-water" onClick={() => setElementAptitude('water', 50)}>
                💧水=50
              </button>
              <button className="btn debug-btn debug-btn-wind" onClick={() => setElementAptitude('wind', 50)}>
                🌪️风=50
              </button>
              <button className="btn debug-btn debug-btn-earth" onClick={() => setElementAptitude('earth', 50)}>
                🪨土=50
              </button>
              <button className="btn debug-btn debug-btn-wood" onClick={() => setElementAptitude('wood', 50)}>
                🌿木=50
              </button>
              <button className="btn debug-btn debug-btn-metal" onClick={() => setElementAptitude('metal', 60)}>
                ⚔️金=60
              </button>
            </div>

            {/* 七系灵根资质当前数值（含金系，对应 T0056 五行） */}
            <div className="debug-aptitude-section">
              <span className="debug-label debug-label-bold">📊 七系灵根资质</span>
              {(['fire', 'water', 'thunder', 'wind', 'earth', 'wood', 'metal'] as const).map(el => {
                const val = (player.aptitudes as unknown as Record<string, number>)[el] ?? 0;
                return (
                  <div key={el} className="debug-row debug-aptitude-row">
                    <span className="debug-label debug-element-label" style={{ '--element-color': ELEMENT_COLOR[el] } as React.CSSProperties}>
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
            <div className="debug-row debug-row-column">
              <span className="debug-label debug-label-bold">🏆 已解锁成就</span>
              <div className="debug-achievement-ids">
                {getAchievementState(player).unlockedIds.join(', ') || '（无）'}
              </div>
              <div className="debug-achievement-hint">
                已解锁 {getAchievementState(player).unlockedIds.length} / {getAllAchievementDefs().length}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="debug-row debug-row-column debug-row-spaced">
              <span className="debug-label debug-label-bold">🔧 成就操作</span>
              <div className="debug-btns debug-btns-wrap">
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
          </div>
        )}
        {tab === 'bottleneck' && (() => {
          const allBnDefs = getAllBottleneckDefs();
          const bnState = (player.systems.bottleneck ?? { active: {}, unlocked: {} }) as BottleneckState;
          return (
            <div className="debug-stats">
              <div className="debug-row debug-row-column">
                <span className="debug-label debug-label-bold">🚧 瓶颈系统调试</span>
                <div className="debug-bottleneck-info">
                  <div>已注册瓶颈：{allBnDefs.length}</div>
                  <div>激活中：{Object.keys(bnState.active).length}</div>
                  <div>已解锁：{Object.keys(bnState.unlocked).length}</div>
                </div>
              </div>
              <div className="debug-bottleneck-section">
                {allBnDefs.map(def => {
                  const isActive = !!bnState.active[def.id];
                  const isUnlocked = !!bnState.unlocked[def.id];
                  const status = isUnlocked ? '✅ 已解锁' : isActive ? '⚠️ 激活中' : '⬜ 未触发';
                  const progress = bnState.active[def.id]?.progress.persistenceCultivationCount ?? 0;
                  return (
                    <div key={def.id} className="debug-bottleneck-row">
                      <div className={isUnlocked ? 'debug-bottleneck-name-unlocked' : isActive ? 'debug-bottleneck-name-active' : 'debug-bottleneck-name-inactive'}>
                        {status} {def.name} ({def.id})
                      </div>
                      {isActive && <div className="debug-bottleneck-progress">坚韧进度：{progress}</div>}
                      <div className="debug-bottleneck-actions">
                        {!isActive && !isUnlocked && (
                          <button className="btn debug-btn" onClick={() => {
                            onUpdate(prev => {
                              if (!prev) return prev;
                              const res = activateBottleneck(ensureBottleneckState(prev), def.id);
                              return res.player;
                            });
                          }}>激活</button>
                        )}
                        {isActive && (
                          <button className="btn debug-btn" onClick={() => {
                            onUpdate(prev => {
                              if (!prev) return prev;
                              const res = unlockBottleneck(ensureBottleneckState(prev), def.id, 'persistence');
                              return res.player;
                            });
                          }}>强制解锁</button>
                        )}
                        {isUnlocked && (
                          <button className="btn debug-btn" onClick={() => {
                            onUpdate(prev => {
                              if (!prev) return prev;
                              const p = ensureBottleneckState(prev);
                              const st = (p.systems.bottleneck as BottleneckState);
                              const { [def.id]: _, ...rest } = st.unlocked;
                              return { ...p, systems: { ...p.systems, bottleneck: { ...st, unlocked: rest } } };
                            });
                          }}>重置为未触发</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {tab === 'npc' && (
          <DebugNpcTab player={player} onUpdate={onUpdate} />
        )}
        {tab === 'changelog' && (
          <DebugChangelogTab />
        )}
      </div>
    </CollapsiblePanel>
  );
}

