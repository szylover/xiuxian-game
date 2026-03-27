// ============================================================
// panels/CraftingPanel.tsx — 炼制面板（炼丹 + 炼器 合并）
// 通过标签页切换
// ============================================================

import { useState } from 'react';
import type { Player } from '../../game/player';
import { TabBar } from '../shared';
import AlchemyPanel from './AlchemyPanel';
import SmithingPanel from './SmithingPanel';

interface CraftingPanelProps {
  player: Player;
  onCraft: (recipeId: string) => void;
  onSmith: (recipeId: string) => void;
}

const CRAFT_TABS = [
  { key: 'alchemy' as const, label: '炼丹', icon: '⚗️' },
  { key: 'smithing' as const, label: '炼器', icon: '🔨' },
];

type CraftTab = 'alchemy' | 'smithing';

export default function CraftingPanel({ player, onCraft, onSmith }: CraftingPanelProps) {
  const [tab, setTab] = useState<CraftTab>('alchemy');

  return (
    <div className="crafting-panel">
      <TabBar
        tabs={CRAFT_TABS}
        activeKey={tab}
        onChange={setTab}
        className="shop-tabs"
        tabClassName="shop-tab"
      />
      {tab === 'alchemy' && <AlchemyPanel player={player} onCraft={onCraft} />}
      {tab === 'smithing' && <SmithingPanel player={player} onSmith={onSmith} />}
    </div>
  );
}
