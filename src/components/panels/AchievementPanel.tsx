// ============================================================
// panels/AchievementPanel.tsx — 成就面板（T0031）
// ============================================================

import { useState, useMemo } from 'react';
import './AchievementPanel.css';
import type { Player } from '../../game/player';
import { getAllAchievementDefs } from '../../game/registry';
import { getAchievementState, getAchievementRecalcBonus } from '../../game/achievement/engine';
import type { AchievementCategory, AchievementRecalcBonus, AchievementOnceBonus } from '../../game/achievement/types';
import { TabBar } from '../shared';

type TabKey = 'all' | AchievementCategory;

const CATEGORY_TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'combat', label: '战斗' },
  { key: 'cultivation', label: '修炼' },
  { key: 'alchemy', label: '炼丹' },
  { key: 'collection', label: '收集' },
  { key: 'misc', label: '综合' },
];

const RECALC_LABELS: Record<keyof AchievementRecalcBonus, string> = {
  atk: '攻击',
  def: '防御',
  speed: '速度',
  hp: '气血上限',
  mp: '灵力上限',
  mentalPower: '念力上限',
  critRate: '暴击率',
  critDmgMultiplier: '暴击倍率',
  critResist: '暴击抗性',
  moveSpeed: '移速',
};

const ONCE_LABELS: Record<keyof AchievementOnceBonus, string> = {
  luck: '幸运',
  comprehension: '悟性',
  charisma: '魅力',
  lifespan: '寿元',
};

interface AchievementPanelProps {
  player: Player;
}

export default function AchievementPanel({ player }: AchievementPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const allDefs = getAllAchievementDefs();
  const state = getAchievementState(player);
  const unlockedSet = new Set(state.unlockedIds);

  const filtered = activeTab === 'all' ? allDefs : allDefs.filter(a => a.category === activeTab);

  // Sort: unlocked first, then locked
  const sorted = [...filtered].sort((a, b) => {
    const aU = unlockedSet.has(a.id) ? 0 : 1;
    const bU = unlockedSet.has(b.id) ? 0 : 1;
    return aU - bU;
  });

  const recalcBonus = getAchievementRecalcBonus(player);

  // Compute once-bonus totals from unlocked achievements (memoized)
  const onceBonus = useMemo(() => {
    const result: Record<string, number> = {};
    for (const id of state.unlockedIds) {
      const def = allDefs.find(a => a.id === id);
      if (!def?.bonusStats) continue;
      for (const key of Object.keys(ONCE_LABELS) as (keyof AchievementOnceBonus)[]) {
        const val = (def.bonusStats as Record<string, number | undefined>)[key];
        if (val) result[key] = (result[key] ?? 0) + val;
      }
    }
    return result;
  }, [state.unlockedIds, allDefs]);

  const totalUnlocked = state.unlockedIds.length;
  const totalAll = allDefs.length;

  return (
    <div className="achievement-panel">
      <div className="achievement-header">
        <span className="achievement-progress">{totalUnlocked} / {totalAll}</span>
      </div>

      <TabBar
        tabs={CATEGORY_TABS}
        activeKey={activeTab}
        onChange={setActiveTab}
        className="achievement-tabs"
        tabClassName="achievement-tab"
      />

      <div className="achievement-list">
        {sorted.length === 0 && (
          <div className="inventory-empty">此分类暂无成就</div>
        )}
        {sorted.map(ach => {
          const isUnlocked = unlockedSet.has(ach.id);
          const showHidden = ach.hidden && !isUnlocked;

          return (
            <div
              key={ach.id}
              className={`achievement-card ${isUnlocked ? 'achievement-unlocked' : 'achievement-locked'}`}
            >
              <div className="achievement-card-icon">
                {ach.icon}
              </div>
              <div className="achievement-card-body">
                <div className="achievement-card-header">
                  <span className="achievement-card-name">
                    {showHidden ? '???' : ach.name}
                  </span>
                  <span className="achievement-card-status">
                    {isUnlocked ? '✅' : '🔒'}
                  </span>
                </div>
                <div className="achievement-card-desc">
                  {showHidden ? '???' : ach.description}
                </div>
                {ach.bonusDescription && (
                  <div className="achievement-card-bonus">
                    {ach.bonusDescription}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部加成汇总 */}
      <div className="achievement-summary">
        <div className="achievement-summary-title">永久加成合计</div>
        <div className="achievement-summary-values">
          {Object.entries(RECALC_LABELS).map(([key, label]) => {
            const val = (recalcBonus as Record<string, number | undefined>)[key];
            if (!val) return null;
            return <span key={key} className="achievement-summary-item">{label} +{val}</span>;
          })}
          {Object.entries(ONCE_LABELS).map(([key, label]) => {
            const val = onceBonus[key];
            if (!val) return null;
            const displayVal = key === 'lifespan' ? `${Math.floor(val / 12)}年` : val;
            return <span key={key} className="achievement-summary-item achievement-summary-once">{label} +{displayVal}</span>;
          })}
          {Object.values(recalcBonus).every(v => !v) && Object.values(onceBonus).every(v => !v) && (
            <span className="achievement-summary-empty">暂无永久加成</span>
          )}
        </div>
      </div>
    </div>
  );
}
