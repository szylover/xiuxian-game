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

// 可编辑数值输入行
function StatEditor({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="debug-row">
      <span className="debug-label">{label}</span>
      <input
        type="number"
        className="debug-input"
        value={value}
        onChange={e => onChange(Number(e.target.value) || 0)}
      />
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

  // 所有可编辑属性
  const statFields: { label: string; key: string }[] = [
    { label: '💰 灵石', key: 'gold' },
    { label: '📈 修为', key: 'exp' },
    { label: '❤️ HP', key: 'hp' },
    { label: '❤️ MaxHP', key: 'maxHp' },
    { label: '🔮 MP', key: 'mp' },
    { label: '🔮 MaxMP', key: 'maxMp' },
    { label: '⚡ 精力', key: 'stamina' },
    { label: '⚡ Max精力', key: 'maxStamina' },
    { label: '🧠 念力', key: 'mentalPower' },
    { label: '🧠 Max念力', key: 'maxMentalPower' },
    { label: '😊 心情', key: 'mood' },
    { label: '💚 健康', key: 'health' },
    { label: '🗡️ 攻击', key: 'atk' },
    { label: '🛡️ 防御', key: 'def' },
    { label: '👟 速度', key: 'speed' },
    { label: '💨 移速', key: 'moveSpeed' },
    { label: '💥 暴击率', key: 'critRate' },
    { label: '🛑 暴击抗', key: 'critResist' },
    { label: '🍀 幸运', key: 'luck' },
    { label: '🧠 悟性', key: 'comprehension' },
    { label: '💫 魅力', key: 'charisma' },
    { label: '📅 年龄', key: 'age' },
    { label: '📅 寿限', key: 'lifespan' },
    { label: '🎒 背包容量', key: 'inventoryCapacity' },
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
              {statFields.map(({ label, key }) => (
                <StatEditor
                  key={key}
                  label={label}
                  value={(player as unknown as Record<string, number>)[key] ?? 0}
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
