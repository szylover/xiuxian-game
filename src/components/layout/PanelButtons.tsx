// ============================================================
// layout/PanelButtons.tsx — 右栏功能按钮组（分组排列）
// ============================================================

import type { Player } from '../../game/player';
import { UI_LABELS } from '../../data/texts/ui-labels';

export type PanelKey = 'inventory' | 'shop' | 'crafting' | 'equipment' | 'technique' | 'divine' | 'achievement' | 'map' | 'npc' | 'quest' | 'bounty' | 'secretRealm' | 'chronicle' | 'ranking' | 'talent' | 'status';

interface PanelDef {
  key: PanelKey;
  icon: string;
  label: string;
}

interface PanelGroup {
  label: string;
  panels: PanelDef[];
}

const p = UI_LABELS.panels;
const g = UI_LABELS.panelGroups;

const PANEL_GROUPS: PanelGroup[] = [
  {
    label: g.economy,
    panels: [
      { key: 'inventory', icon: p.inventory.icon, label: p.inventory.title },
      { key: 'shop', icon: p.shop.icon, label: p.shop.title },
    ],
  },
  {
    label: g.cultivation,
    panels: [
      { key: 'technique', icon: p.technique.icon, label: p.technique.title },
      { key: 'divine', icon: p.divine.icon, label: p.divine.title },
      { key: 'talent', icon: p.talent.icon, label: p.talent.title },
      { key: 'crafting', icon: p.crafting.icon, label: p.crafting.title },
      { key: 'equipment', icon: p.equipment.icon, label: p.equipment.title },
    ],
  },
  {
    label: g.achievement,
    panels: [
      { key: 'achievement', icon: p.achievement.icon, label: p.achievement.title },
      { key: 'chronicle', icon: p.chronicle.icon, label: p.chronicle.title },
      { key: 'ranking', icon: p.ranking.icon, label: p.ranking.title },
    ],
  },
  {
    label: g.world,
    panels: [
      { key: 'quest', icon: p.quest.icon, label: p.quest.title },
      { key: 'bounty', icon: p.bounty.icon, label: p.bounty.title },
      { key: 'secretRealm', icon: p.secretRealm.icon, label: p.secretRealm.title },
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
