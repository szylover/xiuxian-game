import { useState } from 'react';
import type { Player } from '../../game/player';
import {
  getProceduralState,
  resetProceduralSeed,
  getProceduralStats,
  generateProceduralEvent,
} from '../../game/procedural';
import { PROCEDURAL_TEXTS } from '../../data/texts/procedural';
import './DebugProceduralTab.css';

interface Props {
  player: Player;
  onUpdate: (updater: (prev: Player | null) => Player | null) => void;
}

export default function DebugProceduralTab({ player, onUpdate }: Props) {
  const [lastResult, setLastResult] = useState<string | null>(null);

  const state = getProceduralState(player);
  const stats = getProceduralStats();

  const handleResetSeed = () => {
    onUpdate(prev => {
      if (!prev) return prev;
      return resetProceduralSeed(prev);
    });
    setLastResult(null);
  };

  const handleForceGenerate = () => {
    onUpdate(prev => {
      if (!prev) return prev;
      const result = generateProceduralEvent(prev);
      if (!result) {
        setLastResult(PROCEDURAL_TEXTS.debugGenerateFail);
        return prev;
      }
      const { event, player: updated } = result;
      const msg = event.message(updated);
      setLastResult(PROCEDURAL_TEXTS.debugGenerateSuccess(event.name) + '\n' + msg);
      return event.effect(updated);
    });
  };

  return (
    <div className="debug-stats">
      <div className="debug-row debug-tab-col">
        <span className="debug-label debug-label-bold">🎲 {PROCEDURAL_TEXTS.debugTitle}</span>
        <div className="debug-procedural-info">
          <div>{PROCEDURAL_TEXTS.debugSeedLabel}：<strong>{state.masterSeed}</strong></div>
          <div>{PROCEDURAL_TEXTS.debugCounterLabel}：<strong>{state.eventCounter}</strong></div>
          <div>{PROCEDURAL_TEXTS.debugTemplateCount(stats.templateCount)}</div>
          <div>{PROCEDURAL_TEXTS.debugPoolCount(stats.poolCount)}</div>
        </div>
      </div>

      <div className="debug-row debug-row-mt-sm debug-btns-wrap">
        <button className="btn debug-btn" onClick={handleResetSeed} title="随机生成新种子，重置计数器">
          🔄 {PROCEDURAL_TEXTS.debugResetSeed}
        </button>
        <button className="btn debug-btn" onClick={handleForceGenerate} title="强制生成一个程序化事件并应用效果">
          🎲 {PROCEDURAL_TEXTS.debugForceGenerate}
        </button>
      </div>

      {lastResult && (
        <div className="debug-row debug-row-mt-sm">
          <div className="debug-procedural-result">{lastResult}</div>
        </div>
      )}
    </div>
  );
}
