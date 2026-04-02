// ============================================================
// useCombatModal.ts — 战斗弹窗状态 + 回调
// 从 useGameEngine.ts 拆出，管理战斗/死亡弹窗的显示逻辑
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CombatResult } from '../game/combat';
import type { RoundSnapshot } from '../game/combat/types';
import type { DeathTriggerDef, DeathSeverity, RevivalMethodDef } from '../game/types';
import type { LootEntry, CombatDeathInfo } from './useCoreActions';
import type { Player } from '../game/player';
import { getDeathSystemState } from '../game/death';
import type { LogCategory } from './useGameLog';
import { COMBAT_TEXTS } from '../data/texts/combat';

export interface CombatModalState {
  phase: 'battle' | 'loot';
  monsterName: string;
  monsterEmoji: string;
  result: CombatResult;
  loot: LootEntry[];
  deathInfo?: CombatDeathInfo;
  playerHpBefore: number;
  playerMpBefore: number;
  playerAvatar: string;
  playerName: string;
  playerRealmIndex: number;
  playerMaxHp: number;
  playerMaxMp: number;
  monsterMaxHp: number;
  snapshots: RoundSnapshot[];
}

export interface DeathModalState {
  triggerDef: DeathTriggerDef;
  severity: DeathSeverity;
  availableRevivals: RevivalMethodDef[];
  playerSnapshot: {
    name: string;
    realmIndex: number;
    age: number;
    killCount: number;
    deathCount: number;
  };
}

export function useCombatModal(
  playerRef: React.RefObject<Player | null>,
  addLog: (msg: string, category?: LogCategory) => void,
  setGameOver: (v: boolean) => void,
  setGameOverReason: (v: string) => void,
  setDeathModal: (v: DeathModalState | null) => void,
) {
  const [combatModal, setCombatModal] = useState<CombatModalState | null>(null);
  const combatModalRef = useRef<CombatModalState | null>(null);
  useEffect(() => { combatModalRef.current = combatModal; }, [combatModal]);

  const onCombatResult = useCallback((
    monsterName: string, monsterEmoji: string, result: CombatResult,
    loot: LootEntry[], deathInfo?: CombatDeathInfo,
    hpBefore?: number, mpBefore?: number,
  ) => {
    const p = playerRef.current;
    setCombatModal({
      phase: 'battle',
      monsterName,
      monsterEmoji,
      result,
      loot,
      deathInfo,
      playerHpBefore: hpBefore ?? 0,
      playerMpBefore: mpBefore ?? 0,
      playerAvatar: p?.avatar ?? 'default',
      playerName: p?.name ?? '',
      playerRealmIndex: p?.realmIndex ?? 0,
      playerMaxHp: p?.maxHp ?? 100,
      playerMaxMp: p?.maxMp ?? 30,
      monsterMaxHp: result.monsterMaxHp,
      snapshots: result.snapshots,
    });
  }, [playerRef]);

  const handleCombatNext = useCallback(() => {
    setCombatModal(prev => prev ? { ...prev, phase: 'loot' } : null);
  }, []);

  const handleCombatClose = useCallback(() => {
    const modal = combatModalRef.current;
    if (!modal) return;
    const { monsterName, result, loot, deathInfo, playerHpBefore, playerMpBefore } = modal;

    if (result.winner === 'player') {
      const details: string[] = [];
      if (result.expGained > 0) details.push(COMBAT_TEXTS.detailExp(result.expGained));
      if (result.goldGained > 0) details.push(COMBAT_TEXTS.detailGold(result.goldGained));
      if (result.bodyExpGained > 0) details.push(COMBAT_TEXTS.detailBodyExp(result.bodyExpGained));
      const hpLost = playerHpBefore - result.playerHpLeft;
      if (hpLost > 0) details.push(`-${hpLost}HP`);
      if (result.mpUsed > 0) details.push(`-${result.mpUsed}MP`);
      if (loot.length > 0) details.push(COMBAT_TEXTS.detailLoot(loot.map(l => `${l.name}×${l.amount}`).join(' ')));
      addLog(COMBAT_TEXTS.modalVictory(monsterName, details.join(' ')), 'combat');
    } else if (result.winner === 'monster') {
      const details: string[] = [];
      const hpLost = playerHpBefore - result.playerHpLeft;
      if (hpLost > 0) details.push(`-${hpLost}HP`);
      if (result.mpUsed > 0) details.push(`-${result.mpUsed}MP`);
      if (result.bodyExpGained > 0) details.push(COMBAT_TEXTS.detailBodyExp(result.bodyExpGained));
      if (deathInfo?.blocked) {
        details.push(COMBAT_TEXTS.detailSaverBlocked(deathInfo.saverName ?? '护命道具'));
      } else if (deathInfo?.triggered && deathInfo.penaltyLogs?.length) {
        details.push(...deathInfo.penaltyLogs);
      } else {
        details.push(COMBAT_TEXTS.healthLoss);
      }
      addLog(COMBAT_TEXTS.modalDefeat(monsterName, details.join(' ')), 'combat');
    } else {
      const details: string[] = [];
      const hpLost = playerHpBefore - result.playerHpLeft;
      if (hpLost > 0) details.push(`-${hpLost}HP`);
      if (result.mpUsed > 0) details.push(`-${result.mpUsed}MP`);
      if (result.bodyExpGained > 0) details.push(COMBAT_TEXTS.detailBodyExp(result.bodyExpGained));
      addLog(COMBAT_TEXTS.modalDraw(monsterName, details.join(' ')), 'combat');
    }
    setCombatModal(null);

    // T0040: 战斗后死亡弹窗/游戏结束
    if (deathInfo?.triggered && !deathInfo.blocked && deathInfo.severity === 'severe') {
      if (deathInfo.availableRevivals && deathInfo.availableRevivals.length > 0 && deathInfo.triggerDef) {
        const p = playerRef.current;
        const ds = p ? getDeathSystemState(p) : { deathCount: 0, lastDeathCause: null, revivalCount: 0, lifeSaverTriggered: [], isLooseImmortal: false };
        setDeathModal({
          triggerDef: deathInfo.triggerDef,
          severity: deathInfo.severity,
          availableRevivals: deathInfo.availableRevivals,
          playerSnapshot: {
            name: p?.name ?? '',
            realmIndex: p?.realmIndex ?? 0,
            age: p?.age ?? 0,
            killCount: p?.tracking.killCount ?? 0,
            deathCount: ds.deathCount,
          },
        });
      } else {
        setGameOver(true);
        setGameOverReason(deathInfo.triggerDef?.description ?? COMBAT_TEXTS.deathFallback);
      }
    }
  }, [addLog, playerRef, setGameOver, setGameOverReason, setDeathModal]);

  return { combatModal, onCombatResult, handleCombatNext, handleCombatClose };
}
