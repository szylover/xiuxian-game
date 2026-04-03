// ============================================================
// debug/DebugItemRow.tsx — 调试面板物品行（物品/装备共用）
// ============================================================

import { RARITY_COLORS } from '../shared';
import type { ItemRarity } from '../../game/registry';
import './DebugItemRow.css';

interface DebugItemRowProps {
  id: string;
  name: string;
  rarity: ItemRarity;
  qty: number;
  onQtyChange: (id: string, v: number) => void;
  onGive: (id: string) => void;
}

export default function DebugItemRow({ id, name, rarity, qty, onQtyChange, onGive }: DebugItemRowProps) {
  return (
    <div className="debug-item-row" style={{ '--rarity-color': RARITY_COLORS[rarity] } as React.CSSProperties}>
      <span className="debug-item-name">{name}</span>
      <input
        type="number"
        className="debug-qty-input"
        min={1}
        value={qty}
        onChange={e => onQtyChange(id, Number(e.target.value))}
      />
      <button className="btn debug-item-add" onClick={() => onGive(id)}>+</button>
    </div>
  );
}
