// ============================================================
// audio.ts — Web Audio API 合成音效管理器（T0037）
// ============================================================

export type SoundCue =
  | 'cultivateTick'
  | 'combatHit'
  | 'breakthroughSuccess'
  | 'breakthroughFailure'
  | 'itemGain'
  | 'buttonClick'
  | 'death';

export interface SoundSettings {
  muted: boolean;
  volume: number;
}

type SoundSettingsListener = (settings: SoundSettings) => void;

const SOUND_SETTINGS_KEY = 'xiuxian_sound_settings';
const DEFAULT_SETTINGS: SoundSettings = { muted: false, volume: 0.45 };
const listeners = new Set<SoundSettingsListener>();

let audioCtx: AudioContext | null = null;

interface WebkitAudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

interface ToneStep {
  frequency: number;
  duration: number;
  type?: OscillatorType;
}

const CUE_STEPS: Record<SoundCue, ToneStep[]> = {
  cultivateTick: [
    { frequency: 523.25, duration: 0.08, type: 'sine' },
    { frequency: 659.25, duration: 0.12, type: 'sine' },
  ],
  combatHit: [
    { frequency: 180, duration: 0.05, type: 'square' },
    { frequency: 95, duration: 0.08, type: 'sawtooth' },
  ],
  breakthroughSuccess: [
    { frequency: 523.25, duration: 0.09, type: 'triangle' },
    { frequency: 783.99, duration: 0.09, type: 'triangle' },
    { frequency: 1046.5, duration: 0.18, type: 'sine' },
  ],
  breakthroughFailure: [
    { frequency: 392, duration: 0.08, type: 'triangle' },
    { frequency: 246.94, duration: 0.18, type: 'sawtooth' },
  ],
  itemGain: [
    { frequency: 659.25, duration: 0.07, type: 'sine' },
    { frequency: 987.77, duration: 0.1, type: 'sine' },
  ],
  buttonClick: [
    { frequency: 440, duration: 0.035, type: 'triangle' },
  ],
  death: [
    { frequency: 220, duration: 0.12, type: 'sawtooth' },
    { frequency: 164.81, duration: 0.18, type: 'sawtooth' },
    { frequency: 110, duration: 0.24, type: 'sine' },
  ],
};

function clampVolume(volume: number): number {
  return Math.min(1, Math.max(0, volume));
}

export function getSoundSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(SOUND_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      muted: Boolean(parsed.muted),
      volume: clampVolume(typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_SETTINGS.volume),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function setSoundSettings(next: Partial<SoundSettings>): SoundSettings {
  const current = getSoundSettings();
  const settings = {
    muted: next.muted ?? current.muted,
    volume: clampVolume(next.volume ?? current.volume),
  };
  localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(settings));
  listeners.forEach(listener => listener(settings));
  return settings;
}

export function subscribeSoundSettings(listener: SoundSettingsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtor = window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext;
    if (!AudioCtor) return null;
    audioCtx = new AudioCtor();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

function playStep(ctx: AudioContext, step: ToneStep, startAt: number, volume: number): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = step.type ?? 'sine';
  oscillator.frequency.setValueAtTime(step.frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + step.duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + step.duration + 0.02);
}

export function playSound(cue: SoundCue): void {
  const settings = getSoundSettings();
  if (settings.muted || settings.volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  let cursor = ctx.currentTime;
  const volume = settings.volume * 0.18;
  for (const step of CUE_STEPS[cue]) {
    playStep(ctx, step, cursor, volume);
    cursor += step.duration;
  }
}
