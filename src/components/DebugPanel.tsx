// ============================================================
// DebugPanel.tsx — 调试面板
// 仅在角色名为 "Debug" 时显示，提供修改数值/添加物品等功能
// ============================================================

import { useState } from 'react';
import type { Player } from '../game/player';
import { REALMS } from '../game/data';
import { getAllItemDefs, getAllEquipDefs } from '../game/registry';
import type { ItemRarity } from '../game/registry';
import { addItem } from '../game/inventory';

interface DebugPanelProps {
  player: Player;
  onUpdate: (updater: (prev: Player | null) => Player | null) => void;
}

const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9E9E9E',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FFD700',
};

// 可编辑数值行：显示当前值 + 快捷递增按钮
function StatEditor({ label, value, deltas, onChange }: { label: string; value: number; deltas: number[]; onChange: (v: number) => void }) {
  return (
    <div className="debug-row">
      <span className="debug-label">{label}: <strong>{value}</strong></span>
      <div className="debug-btns">
        {deltas.map(d => (
          <button key={d} className="btn debug-btn" onClick={() => onChange(value + d)}>+{d}</button>
        ))}
        <input
          type="number"
          className="debug-input-sm"
          placeholder="="
          onKeyDown={e => { if (e.key === 'Enter') onChange(Number((e.target as HTMLInputElement).value) || 0); }}
          onBlur={e => { const v = Number(e.target.value); if (v || v === 0) onChange(v); }}
        />
      </div>
    </div>
  );
}

export default function DebugPanel({ player, onUpdate }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'stats' | 'items'>('stats');
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

  const giveItem = (itemId: string) => {
    const count = itemQty[itemId] || 1;
    onUpdate(prev => {
      if (!prev) return prev;
      const { player: p } = addItem(prev, itemId, count);
      return p;
    });
  };

  const getQty = (id: string) => itemQty[id] || 1;
  const setQty = (id: string, v: number) => setItemQty(prev => ({ ...prev, [id]: Math.max(1, v) }));

  // 所有可编辑属性 + 快捷递增值
  const statFields: { label: string; key: string; deltas: number[] }[] = [
    { label: '💰 灵石', key: 'gold', deltas: [100, 1000, 10000] },
    { label: '📈 修为', key: 'exp', deltas: [500, 5000, 50000] },
    { label: '❤️ HP', key: 'hp', deltas: [100, 500] },
    { label: '❤️ MaxHP', key: 'maxHp', deltas: [100, 500] },
    { label: '🔮 MP', key: 'mp', deltas: [50, 200] },
    { label: '🔮 MaxMP', key: 'maxMp', deltas: [50, 200] },
    { label: '⚡ 精力', key: 'stamina', deltas: [30, 100] },
    { label: '⚡ Max精力', key: 'maxStamina', deltas: [30, 100] },
    { label: '🧠 念力', key: 'mentalPower', deltas: [20, 100] },
    { label: '🧠 Max念力', key: 'maxMentalPower', deltas: [20, 100] },
    { label: '😊 心情', key: 'mood', deltas: [20, 50] },
    { label: '💚 健康', key: 'health', deltas: [20, 50] },
    { label: '🗡️ 攻击', key: 'atk', deltas: [10, 50, 200] },
    { label: '🛡️ 防御', key: 'def', deltas: [10, 50, 200] },
    { label: '👟 速度', key: 'speed', deltas: [5, 20] },
    { label: '💨 移速', key: 'moveSpeed', deltas: [5, 20] },
    { label: '💥 暴击率', key: 'critRate', deltas: [5, 10] },
    { label: '🛑 暴击抗', key: 'critResist', deltas: [5, 10] },
    { label: '🍀 幸运', key: 'luck', deltas: [10, 30] },
    { label: '🧠 悟性', key: 'comprehension', deltas: [10, 30] },
    { label: '💫 魅力', key: 'charisma', deltas: [10, 30] },
    { label: '📅 年龄', key: 'age', deltas: [10, 50] },
    { label: '📅 寿限', key: 'lifespan', deltas: [100, 500, 2000] },
    { label: '🎒 背包容量', key: 'inventoryCapacity', deltas: [5, 20, 50] },
  ];

  return (
    <div className="debug-panel">
      <button className="debug-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '🐛 收起调试' : '🐛 调试'}
      </button>

      {isOpen && (
        <div className="debug-content">
          <div className="debug-warning">⚠️ Debug Mode — 角色名 "Debug" 激活</div>

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
              {/* 境界 */}
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

              {/* 全满 */}
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

              {/* 所有数值 */}
              {statFields.map(({ label, key, deltas }) => (
                <StatEditor
                  key={key}
                  label={label}
                  value={(player as unknown as Record<string, number>)[key] ?? 0}
                  deltas={deltas}
                  onChange={v => setStat(key, v)}
                />
              ))}
            </div>
          )}

          {/* 物品添加 */}
          {tab === 'items' && (
            <div className="debug-items">
              <div className="debug-section-title">📦 物品（点击添加）</div>
              <div className="debug-item-list">
                {allItems.map(item => (
                  <div key={item.id} className="debug-item-row">
                    <span className="debug-item-name" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</span>
                    <input
                      type="number"
                      className="debug-qty-input"
                      min={1}
                      value={getQty(item.id)}
                      onChange={e => setQty(item.id, Number(e.target.value))}
                    />
                    <button className="btn debug-item-add" onClick={() => giveItem(item.id)}>+</button>
                  </div>
                ))}
              </div>
              {allEquips.length > 0 && (
                <>
                  <div className="debug-section-title">⚔️ 装备</div>
                  <div className="debug-item-list">
                    {allEquips.map(eq => (
                      <div key={eq.id} className="debug-item-row">
                        <span className="debug-item-name" style={{ color: RARITY_COLORS[eq.rarity] }}>{eq.name}</span>
                        <input
                          type="number"
                          className="debug-qty-input"
                          min={1}
                          value={getQty(eq.id)}
                          onChange={e => setQty(eq.id, Number(e.target.value))}
                        />
                        <button className="btn debug-item-add" onClick={() => giveItem(eq.id)}>+</button>
                      </div>
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
