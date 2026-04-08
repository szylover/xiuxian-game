// ============================================================
// death/state.ts — 死亡系统状态管理 + 接口类型
// ============================================================

import type { Player } from '../player';
import type { DeathSeverity, DeathTriggerDef, LifeSaverDef, RevivalMethodDef, DeathSystemState } from '../types';

// ── 获取死亡系统子状态 ──

export function getDeathSystemState(player: Player): DeathSystemState {
  const state = player.systems.death as DeathSystemState | undefined;
  return state ?? {
    deathCount: 0,
    lastDeathCause: null,
    revivalCount: 0,
    lifeSaverTriggered: [],
    isLooseImmortal: false,
  };
}

export function setDeathSystemState(player: Player, state: DeathSystemState): Player {
  return { ...player, systems: { ...player.systems, death: state } };
}

// ── 死亡上下文 ──

export interface DeathContext {
  source: 'combat' | 'time' | 'tribulation' | 'alchemy' | 'other';
  data?: Record<string, unknown>;
}

// ── 死亡检查结果 ──

export interface DeathCheckResult {
  triggered: boolean;
  trigger: DeathTriggerDef | null;
  blocked: boolean;
  blockedBy: LifeSaverDef | null;
  player: Player;
  logs: string[];
}

// ── 死亡应用结果 ──

export interface DeathResult {
  player: Player;
  gameOver: boolean;
  availableRevivals: RevivalMethodDef[];
  logs: string[];
  severity: DeathSeverity;
  gameOverReason: string;
}

// ── 复活应用结果 ──

export interface RevivalResult {
  player: Player;
  logs: string[];
}
