// ============================================================
// layout/PanelButtons.tsx — 右栏功能按钮组（分组排列）
// ============================================================

import type { Player } from '../../game/player';
import { getInventoryEntries } from '../../game/inventory';

export type PanelKey = 'inventory' | 'shop' | 'crafting' | 'equipment' | 'technique';

interface PanelDef {
  key: PanelKey;
  icon: string;
  label: string;
  badge?: (player: Player) => string | null;
}

interface PanelGroup {
  label: string;
  panels: PanelDef[];
}

const PANEL_GROUPS: PanelGroup[] = [
  {
    label: '📦 物品经济',
    panels: [
      {
        key: 'inventory', icon: '🎒', label: '背包',
        badge: (p) => `${getInventoryEntries(p).length}/${p.inventoryCapacity}`,
      },
      {
        key: 'shop', icon: '🏪', label: '商店',
        badge: (p) => `💰${p.gold}`,
      },
    ],
  },
  {
    label: '⚔️ 修行',
    panels: [
      {
        key: 'technique', icon: '📖', label: '功法',
        badge: (p) => p.techniques.length > 0 ? `${p.techniques.length}` : null,
      },
      {
        key: 'crafting', icon: '🔥', label: '炼制',
        badge: (p) => `🧠${p.mentalPower}`,
      },
      { key: 'equipment', icon: '⚔️', label: '装备' },
    ],
  },
];

interface PanelButtonsProps {
  player: Player;
  activePanel: PanelKey | null;
  onSelect: (key: PanelKey) => void;
}

export default function PanelButtons({ player, activePanel, onSelect }: PanelButtonsProps) {
  return (
    <div className="panel-buttons">
      {PANEL_GROUPS.map(group => (
        <div key={group.label} className="panel-btn-group">
          <div className="panel-btn-group-label">{group.label}</div>
          <div className="panel-btn-row">
            {group.panels.map(panel => {
              const badge = panel.badge?.(player) ?? null;
              const isActive = activePanel === panel.key;
              return (
                <button
                  key={panel.key}
                  className={`panel-btn ${isActive ? 'panel-btn-active' : ''}`}
                  onClick={() => onSelect(panel.key)}
                >
                  <span className="panel-btn-icon">{panel.icon}</span>
                  <span className="panel-btn-label">{panel.label}</span>
                  {badge && <span className="panel-btn-badge">{badge}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
