// ============================================================
// hud/SoundControls.tsx — 音效设置入口（T0037）
// ============================================================

import { useEffect, useState } from 'react';
import { AUDIO_TEXTS } from '../../data/texts';
import { getSoundSettings, playSound, setSoundSettings, subscribeSoundSettings } from '../../game/audio';
import './SoundControls.css';

interface SoundControlsProps {
  onOpenOnboarding: () => void;
}

export default function SoundControls({ onOpenOnboarding }: SoundControlsProps) {
  const [settings, setSettings] = useState(getSoundSettings);

  useEffect(() => subscribeSoundSettings(setSettings), []);

  const toggleMuted = () => {
    const next = setSoundSettings({ muted: !settings.muted });
    if (!next.muted) playSound('buttonClick');
  };

  const changeVolume = (value: number) => {
    const next = setSoundSettings({ volume: value, muted: value <= 0 ? true : settings.muted });
    if (!next.muted) playSound('buttonClick');
  };

  const volumePercent = Math.round(settings.volume * 100);

  const openOnboarding = () => {
    playSound('buttonClick');
    onOpenOnboarding();
  };

  return (
    <div className="sound-controls" aria-label={AUDIO_TEXTS.panelTitle}>
      <button className="sound-toggle" onClick={openOnboarding}>
        {AUDIO_TEXTS.guideButton}
      </button>
      <button className="sound-toggle" onClick={toggleMuted} title={AUDIO_TEXTS.panelTitle}>
        {settings.muted ? AUDIO_TEXTS.muteOn : AUDIO_TEXTS.muteOff}
      </button>
      <label className="sound-volume">
        <span>{AUDIO_TEXTS.volumeLabel}</span>
        <input
          type="range"
          min="0"
          max="100"
          value={volumePercent}
          onChange={event => changeVolume(Number(event.target.value) / 100)}
        />
        <span>{AUDIO_TEXTS.volumeValue(volumePercent)}</span>
      </label>
    </div>
  );
}
