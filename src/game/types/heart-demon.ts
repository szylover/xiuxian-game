export type HeartDemonSource = 'cultivation' | 'combat' | 'breakthrough_fail' | 'karma' | 'manual';

export interface HeartDemonDebuff {
  id: string;
  name: string;
  remainingMonths: number;
  cultivationSpeedMultiplier: number;
  breakthroughRatePenalty: number;
}

export interface HeartDemonSystemState {
  value: number;
  maxValue: number;
  suppressedUntilAge: number | null;
  lastTriggerAge: number;
  conqueredCount: number;
  failedCount: number;
  activeDebuffs: HeartDemonDebuff[];
  history: string[];
}

