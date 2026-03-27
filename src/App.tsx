// ============================================================
// App.tsx — 根组件
// ============================================================

import { useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { useGameLog } from './hooks/useGameLog';
import StartScreen from './components/screens/StartScreen';
import StatusBar from './components/hud/StatusBar';
import StatusPanel from './components/panels/StatusPanel';
import InventoryPanel from './components/panels/InventoryPanel';
import AlchemyPanel from './components/panels/AlchemyPanel';
import EquipmentPanel from './components/panels/EquipmentPanel';
import ShopPanel from './components/panels/ShopPanel';
import SmithingPanel from './components/panels/SmithingPanel';
import ActionPanel from './components/panels/ActionPanel';
import DebugPanel from './components/debug/DebugPanel';
import GameLog from './components/hud/GameLog';
import GameOverScreen from './components/screens/GameOverScreen';
import './App.css';

export default function App() {
  const { logs, addLog, addLogs, clearLogs } = useGameLog();
  const engine = useGameEngine(addLog, addLogs);
  const [panelOpen, setPanelOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [alchemyOpen, setAlchemyOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [smithingOpen, setSmithingOpen] = useState(false);

  const hasSave = !!localStorage.getItem('xiuxian_save');

  // 未开始游戏
  if (!engine.player) {
    return (
      <StartScreen
        onNewGame={(name) => { clearLogs(); engine.newGame(name); }}
        onLoadGame={() => { clearLogs(); engine.loadGame(); }}
        hasSave={hasSave}
      />
    );
  }

  // 游戏结束
  if (engine.gameOver) {
    return (
      <GameOverScreen
        reason={engine.gameOverReason}
        logs={logs}
        onRestart={() => { clearLogs(); engine.deleteSave(); }}
      />
    );
  }

  return (
    <div className="game-container">
      <StatusBar player={engine.player} />
      <StatusPanel
        player={engine.player}
        isOpen={panelOpen}
        onToggle={() => setPanelOpen(!panelOpen)}
      />
      <InventoryPanel
        player={engine.player}
        isOpen={inventoryOpen}
        onToggle={() => setInventoryOpen(!inventoryOpen)}
        onUseItem={engine.useItem}
      />
      <AlchemyPanel
        player={engine.player}
        isOpen={alchemyOpen}
        onToggle={() => setAlchemyOpen(!alchemyOpen)}
        onCraft={engine.craft}
      />
      <EquipmentPanel
        player={engine.player}
        isOpen={equipmentOpen}
        onToggle={() => setEquipmentOpen(!equipmentOpen)}
        onEquip={engine.equip}
        onUnequip={engine.unequip}
      />
      <ShopPanel
        player={engine.player}
        isOpen={shopOpen}
        onToggle={() => setShopOpen(!shopOpen)}
        onBuy={engine.buy}
        onSell={engine.sell}
      />
      <SmithingPanel
        player={engine.player}
        isOpen={smithingOpen}
        onToggle={() => setSmithingOpen(!smithingOpen)}
        onSmith={engine.smith}
      />
      <ActionPanel
        player={engine.player}
        onCultivate={engine.cultivate}
        onFight={engine.fight}
        onExplore={engine.explore}
        onRest={engine.rest}
        onBreakthrough={engine.breakthrough}
        gameOver={engine.gameOver}
      />
      <GameLog logs={logs} />
      <DebugPanel player={engine.player} onUpdate={engine.debugSetPlayer} />
    </div>
  );
}
