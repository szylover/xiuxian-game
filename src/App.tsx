// ============================================================
// App.tsx — 根组件
// ============================================================

import { useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { useGameLog } from './hooks/useGameLog';
import StartScreen from './components/StartScreen';
import StatusBar from './components/StatusBar';
import StatusPanel from './components/StatusPanel';
import InventoryPanel from './components/InventoryPanel';
import AlchemyPanel from './components/AlchemyPanel';
import EquipmentPanel from './components/EquipmentPanel';
import ActionPanel from './components/ActionPanel';
import GameLog from './components/GameLog';
import './App.css';

export default function App() {
  const { logs, addLog, addLogs, clearLogs } = useGameLog();
  const engine = useGameEngine(addLog, addLogs);
  const [panelOpen, setPanelOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [alchemyOpen, setAlchemyOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);

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
      <div className="game-container">
        <div className="game-over">
          <h2>💀 游戏结束</h2>
          <p>{engine.gameOverReason}</p>
          <button className="btn btn-primary" onClick={() => { clearLogs(); engine.deleteSave(); }}>
            重新开始
          </button>
        </div>
        <GameLog logs={logs} />
      </div>
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
    </div>
  );
}
