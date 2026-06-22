// ============================================================
// App.tsx — 根组件
// ============================================================

import { useEffect, useState } from 'react';
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
import OnboardingOverlay from './components/hud/OnboardingOverlay';
import SoundControls from './components/hud/SoundControls';
import type { PanelKey } from './components/layout/PanelButtons';
import { playSound } from './game/audio';
import { ONBOARDING_TEXTS, UI_LABELS } from './data/texts';
import './App.css';

export default function App() {
  const { logs, addLog, addLogs, clearLogs } = useGameLog();
  const engine = useGameEngine(addLog, addLogs);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (engine.player && localStorage.getItem(ONBOARDING_TEXTS.storageKey) !== 'true') {
      setShowOnboarding(true);
    }
  }, [engine.player]);

  // 切换面板：点击已选中的按钮则收起
  const handleSelectPanel = (key: PanelKey) => {
    playSound('buttonClick');
    setActivePanel(prev => prev === key ? null : key);
  };

  const handleExitGame = () => {
    playSound('buttonClick');
    setShowExitConfirm(true);
  };

  const handleExitConfirm = () => {
    playSound('buttonClick');
    setShowExitConfirm(false);
    clearLogs();
    engine.exitGame();
  };

  // 未开始游戏
  if (!engine.player) {
    return (
      <StartScreen
        onNewGame={(options: CreatePlayerOptions & { slotIndex?: number; enabledDLCs?: string[] }) => { clearLogs(); engine.newGame(options); }}
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
            onAscend={engine.ascend}
            onOpenLog={() => setLogDrawerOpen(true)}
            onTravel={engine.travel}
            onSelectPanel={handleSelectPanel}
            onMeetNpc={engine.meetNpc}
            onGiveGift={engine.giveGift}
            onAcceptQuest={engine.acceptQuest}
            onTurnInQuest={engine.turnInQuest}
            onStartDialogue={engine.startDialogue}
            onDialogueSelectChoice={engine.dialogueSelectChoice}
            onDialogueAdvance={engine.dialogueAdvance}
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
            onStartDialogue={engine.startDialogue}
            onDialogueSelectChoice={engine.dialogueSelectChoice}
            onDialogueAdvance={engine.dialogueAdvance}
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

      <SoundControls onOpenOnboarding={() => setShowOnboarding(true)} />
      <OnboardingOverlay open={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* T0038: 退出确认弹窗 */}
      {showExitConfirm && (
        <div className="exit-confirm-overlay" onClick={() => setShowExitConfirm(false)}>
          <div className="exit-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="exit-confirm-title">{UI_LABELS.exitConfirmTitle}</div>
            <div className="exit-confirm-body">
              {UI_LABELS.exitConfirmBody}
            </div>
            <div className="exit-confirm-actions">
              <button className="btn btn-primary" onClick={handleExitConfirm}>{UI_LABELS.exitConfirmOk}</button>
              <button className="btn btn-secondary" onClick={() => setShowExitConfirm(false)}>{UI_LABELS.exitConfirmCancel}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
