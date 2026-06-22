export type Alignment = 'righteous' | 'neutral' | 'evil';

export interface KarmaSystemState {
  totalGained: number;
  totalLost: number;
  lastChangeAge: number;
  majorEvents: string[];
}
