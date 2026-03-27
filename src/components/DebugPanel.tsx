// ============================================================
// DebugPanel.tsx — 调试面板
// 仅在角色名为 "Debug" 时显示，提供修改数值/添加物品等功能
// ============================================================

import { useState } from 'react';
import type { Player } from '../game/player';
import { REALMS } from '../game/data';
import { getAllItemDefs, getAllEquipDefs } from '../game/registry';
import { addItem } from '../game/inventory';

interface DebugPanelProps {
  player: Player;
  onUpdate: (updater: (prev: Player | null) => Player | null) => void;
}

export default function DebugPanel({ player, onUpdate }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'stats' | 'items'>('stats');

  if (!player || player.name !== 'Debug') return null;

  const allItems = getAllItemDefs();
  const allEquips = getAllEquipDefs();

  const modStat = (key: string, delta: number) => {
    onUpdate(prev => {
      if (!prev) return prev;
      const p = { ...prev };
      const cur = typeof (p as unknown as Record<string, unknown>)[key] === 'number' ? ((p as unknown as Record<string, unknown>)[key] as number) : 0;
      (p as unknown as Record<string, number>)[key] = Math.max(0, cur + delta);
      return p;
    });
  };

  const setStat = (key: string, value: number) => {
    onUpdate(prev => {
      if (!prev) return prev;
      const p = { ...prev };
      (p as unknown as Record<string, number>)[key] = value;
      return p;
    });
  };

  const giveItem = (itemId: string, count: number = 1) => {
    onUpdate(prev => {
      if (!prev) return prev;
      const { player: p } = addItem(prev, itemId, count);
      return p;
    });
  };

  const statButtons = [
    { label: '💰 灵石', key: 'gold', deltas: [100, 1000, 10000] },
    { label: '❤️ HP', key: 'hp', deltas: [100, 1000] },
    { label: '🔮 MP', key: 'mp', deltas: [100, 1000] },
    { label: '⚡ 精力', key: 'stamina', deltas: [50, 100] },
    { label: '🧠 念力', key: 'mentalPower', deltas: [50, 100] },
    { label: '📈 修为', key: 'exp', deltas: [500, 5000, 50000] },
    { label: '😊 心情', key: 'mood', deltas: [20, 50] },
    { label: '💚 健康', key: 'health', deltas: [20, 50] },
  ];

  return (
    <div className="debug-panel">
      <button className="debug-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '🐛 收起调试' : '🐛 调试'}
      </button>

      {isOpen && (
        <div className="debug-content">
          <div className="debug-warning">⚠️ Debug Mode — 角色名 "Debug" 激活</div>

          {/* 标签 */}
          <div className="shop-tabs">
            <button className={`shop-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
              📊 数值
            </button>
            <button className={`shop-tab ${tab === 'items' ? 'active' : ''}`} onClick={() => setTab('items')}>
              📦 物品
            </button>
          </div>

          {/* 数值修改 */}
          {tab === 'stats' && (
            <div className="debug-stats">
              {/* 境界快速切换 */}
              <div className="debug-row">
                <span className="debug-label">🏔️ 境界</span>
                <div className="debug-btns">
                  {REALMS.map((r, i) => (
                    <button
                      key={i}
                      className={`btn debug-btn ${player.realmIndex === i ? 'debug-active' : ''}`}
                      onClick={() => setStat('realmIndex', i)}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 数值增减 */}
              {statButtons.map(({ label, key, deltas }) => (
                <div key={key} className="debug-row">
                  <span className="debug-label">{label}: {(player as unknown as Record<string, number>)[key]}</span>
                  <div className="debug-btns">
                    {deltas.map(d => (
                      <button key={d} className="btn debug-btn" onClick={() => modStat(key, d)}>+{d}</button>
                    ))}
                  </div>
                </div>
              ))}

              {/* 满血满蓝 */}
              <div className="debug-row">
                <button className="btn debug-btn debug-full" onClick={() => {
                  onUpdate(prev => {
                    if (!prev) return prev;
                    return { ...prev, hp: prev.maxHp, mp: prev.maxMp, stamina: prev.maxStamina, mentalPower: prev.maxMentalPower, mood: 100, health: 100 };
                  });
                }}>
                  🌟 全满
                </button>
              </div>
            </div>
          )}

          {/* 物品添加 */}
          {tab === 'items' && (
            <div className="debug-items">
              <div className="debug-section-title">📦 物品</div>
              <div className="debug-item-grid">
                {allItems.map(item => (
                  <button
                    key={item.id}
                    className="btn debug-item-btn"
                    onClick={() => giveItem(item.id, item.stackable ? 10 : 1)}
                    title={item.description}
                  >
                    {item.name} {item.stackable ? '×10' : '×1'}
                  </button>
                ))}
              </div>
              {allEquips.length > 0 && (
                <>
                  <div className="debug-section-title">⚔️ 装备</div>
                  <div className="debug-item-grid">
                    {allEquips.map(eq => (
                      <button
                        key={eq.id}
                        className="btn debug-item-btn"
                        onClick={() => giveItem(eq.id, 1)}
                        title={eq.description}
                      >
                        {eq.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
