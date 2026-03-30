// ============================================================
// App.tsx — 根组件
// ============================================================

import { useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { useGameLog } from './hooks/useGameLog';
import type { CreatePlayerOptions } from './game/player';
import StartScreen from './components/screens/StartScreen';
import GameOverScreen from './components/screens/GameOverScreen';
import GameLog from './components/hud/GameLog';
import ToastContainer from './components/hud/ToastContainer';
import ActionPanel from './components/panels/ActionPanel';
import DebugPanel from './components/debug/DebugPanel';
import GameLayout from './components/layout/GameLayout';
import LeftPanel from './components/layout/LeftPanel';
import RightPanel from './components/layout/RightPanel';
import CombatModal from './components/shared/CombatModal';
import DeathModal from './components/shared/DeathModal';
import type { PanelKey } from './components/layout/PanelButtons';
import './App.css';

export default function App() {
  const { logs, addLog, addLogs, clearLogs } = useGameLog();
  const engine = useGameEngine(addLog, addLogs);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);

  const hasSave = !!localStorage.getItem('xiuxian_save');

  // 切换面板：点击已选中的按钮则收起
  const handleSelectPanel = (key: PanelKey) => {
    setActivePanel(prev => prev === key ? null : key);
  };

  // 未开始游戏
  if (!engine.player) {
    return (
      <StartScreen
        onNewGame={(options: CreatePlayerOptions) => { clearLogs(); engine.newGame(options); }}
        onLoadGame={() => { clearLogs(); engine.loadGame(); }}
        hasSave={hasSave}
        dataReady={engine.dataReady}
        dataError={engine.dataError}
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
    <GameLayout
      topBar={<ToastContainer toast={engine.toast} onDismiss={engine.dismissToast} />}
      left={
        <LeftPanel
          player={engine.player}
        />
      }
      center={
        <>
          <ActionPanel
            player={engine.player}
            onCultivate={engine.cultivate}
            onFight={engine.fight}
            onExplore={engine.explore}
            onRest={engine.rest}
            onBreakthrough={engine.breakthrough}
            gameOver={engine.gameOver}
          />
          <GameLog logs={logs} currentYear={engine.player.gameYear} currentMonth={engine.player.gameMonth} />
        </>
      }
      right={
        <RightPanel
          player={engine.player}
          activePanel={activePanel}
          onSelectPanel={handleSelectPanel}
          onUseItem={engine.useItem}
          onCraft={engine.craft}
          onSmith={engine.smith}
          onEquip={engine.equip}
          onUnequip={engine.unequip}
          onBuy={engine.buy}
          onSell={engine.sell}
          onLearnTechnique={engine.learnTechnique}
          onPracticeTechnique={engine.practiceTechnique}
          onActivateTechnique={engine.activateTechnique}
        />
      }
      debug={<>
        <DebugPanel player={engine.player} onUpdate={engine.debugSetPlayer} />
        {engine.combatModal && (
          <CombatModal
            state={engine.combatModal}
            onNext={engine.handleCombatNext}
            onClose={engine.handleCombatClose}
          />
        )}
        {engine.deathModal && (
          <DeathModal
            state={engine.deathModal}
            onRevival={engine.handleRevival}
            onClose={engine.handleDeathModalClose}
          />
        )}
      </>}
    />
  );
}
