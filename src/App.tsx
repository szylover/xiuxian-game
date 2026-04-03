// ============================================================
// App.tsx — 根组件
// ============================================================

import { useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { useGameLog } from './hooks/useGameLog';
import type { CreatePlayerOptions } from './game/player';
import StartScreen from './components/screens/StartScreen';
import GameOverScreen from './components/screens/GameOverScreen';
import LogDrawer from './components/hud/LogDrawer';
import ToastContainer from './components/hud/ToastContainer';
import SceneView from './components/panels/scene/SceneView';
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
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);

  // 切换面板：点击已选中的按钮则收起
  const handleSelectPanel = (key: PanelKey) => {
    setActivePanel(prev => prev === key ? null : key);
  };

  const handleExitGame = () => {
    setShowExitConfirm(true);
  };

  const handleExitConfirm = () => {
    setShowExitConfirm(false);
    clearLogs();
    engine.exitGame();
  };

  // 未开始游戏
  if (!engine.player) {
    return (
      <StartScreen
        onNewGame={(options: CreatePlayerOptions & { slotIndex?: number }) => { clearLogs(); engine.newGame(options); }}
        onLoadGame={(slotIndex: number) => { clearLogs(); engine.loadGame(slotIndex); }}
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
    <>
      <GameLayout
        topBar={<ToastContainer toast={engine.toast} onDismiss={engine.dismissToast} />}
        onExit={handleExitGame}
        left={
          <LeftPanel
            player={engine.player}
            activePanel={activePanel}
            onSelectPanel={handleSelectPanel}
          />
        }
        center={
          <SceneView
            player={engine.player}
            onCultivate={engine.cultivate}
            onFight={engine.fight}
            onExplore={engine.explore}
            onRest={engine.rest}
            onBreakthrough={engine.breakthrough}
            onBodyBreakthrough={engine.bodyBreakthrough}
            onOpenLog={() => setLogDrawerOpen(true)}
            onTravel={engine.travel}
            onSelectPanel={handleSelectPanel}
            onMeetNpc={engine.meetNpc}
            onGiveGift={engine.giveGift}
            onAcceptQuest={engine.acceptQuest}
            onTurnInQuest={engine.turnInQuest}
            gameOver={engine.gameOver}
          />
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
            onLearnDivineArt={engine.learnDivineArt}
            onActivateDivineArt={engine.activateDivineArt}
            onDeactivateDivineArt={engine.deactivateDivineArt}
            onTravel={engine.travel}
            onMeetNpc={engine.meetNpc}
            onGiveGift={engine.giveGift}
            onAcceptQuest={engine.acceptQuest}
            onAbandonQuest={engine.abandonQuest}
            onDeliverQuestItem={engine.deliverQuestItem}
            onTrackQuest={engine.setTrackedQuest}
            onTurnInQuest={engine.turnInQuest}
            chronicle={engine.chronicle}
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

      {/* T0069: 日志抽屉 */}
      <LogDrawer
        open={logDrawerOpen}
        onClose={() => setLogDrawerOpen(false)}
        logs={logs}
        currentYear={engine.player.gameYear}
        currentMonth={engine.player.gameMonth}
      />

      {/* T0038: 退出确认弹窗 */}
      {showExitConfirm && (
        <div className="exit-confirm-overlay" onClick={() => setShowExitConfirm(false)}>
          <div className="exit-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="exit-confirm-title">🏠 返回主菜单</div>
            <div className="exit-confirm-body">
              当前进度已自动存档，确定要返回主菜单吗？
            </div>
            <div className="exit-confirm-actions">
              <button className="btn btn-primary" onClick={handleExitConfirm}>确认返回</button>
              <button className="btn btn-secondary" onClick={() => setShowExitConfirm(false)}>继续修炼</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
