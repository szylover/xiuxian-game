// ============================================================
// layout/PanelButtons.tsx — 右栏功能按钮组（分组排列）
// ============================================================

import type { Player } from '../../game/player';

export type PanelKey = 'inventory' | 'shop' | 'crafting' | 'equipment' | 'technique' | 'divine' | 'achievement' | 'status';

interface PanelDef {
  key: PanelKey;
  icon: string;
  label: string;
}

interface PanelGroup {
  label: string;
  panels: PanelDef[];
}

const PANEL_GROUPS: PanelGroup[] = [
  {
    label: '📦 物品经济',
    panels: [
      { key: 'inventory', icon: '🎒', label: '背包' },
      { key: 'shop', icon: '🏪', label: '商店' },
    ],
  },
  {
    label: '⚔️ 修行',
    panels: [
      { key: 'technique', icon: '📖', label: '功法' },
      { key: 'divine', icon: '✨', label: '神通' },
      { key: 'crafting', icon: '🔥', label: '炼制' },
      { key: 'equipment', icon: '⚔️', label: '装备' },
    ],
  },
  {
    label: '🏆 成就',
    panels: [
      { key: 'achievement', icon: '🏆', label: '成就' },
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
              const isActive = activePanel === panel.key;
              return (
                <button
                  key={panel.key}
                  className={`panel-btn ${isActive ? 'panel-btn-active' : ''}`}
                  onClick={() => onSelect(panel.key)}
                >
                  <span className="panel-btn-icon">{panel.icon}</span>
                  <span className="panel-btn-label">{panel.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
