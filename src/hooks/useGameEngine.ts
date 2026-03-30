// ============================================================
// useGameEngine.ts — 游戏核心引擎 Hook（状态管理 + 存档 + 编排）
// 行为逻辑已拆分至 useCoreActions.ts / useSystemActions.ts
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPlayer, getSpiritRootGrade } from '../game/player';
import type { Player } from '../game/player';
import { REALMS, ACTION_COSTS } from '../game/data';
import { registerCoreEvents, triggerDailyEvent } from '../game/events';
import type { LogCategory } from './useGameLog';
import { useToast } from './useToast';
import { useCoreActions } from './useCoreActions';
import type { LootEntry, CombatDeathInfo } from './useCoreActions';
import { useSystemActions } from './useSystemActions';
import type { CombatResult } from '../game/combat';
import type { RoundSnapshot } from '../game/combat/types';
import { checkDeathTriggers, applyDeath, applyRevival, getDeathSystemState } from '../game/death';
import type { DeathCheckResult, DeathResult } from '../game/death';
import type { DeathTriggerDef, DeathSeverity, RevivalMethodDef } from '../game/types';

// 注册核心事件（模块加载时执行一次）
registerCoreEvents();

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

const SAVE_KEY = 'xiuxian_save';

function loadSave(): Player | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Player;
    // 向后兼容：旧存档缺少 inventory/equipped 字段
    if (!Array.isArray(p.inventory)) p.inventory = [];
    if (!p.inventoryCapacity) p.inventoryCapacity = 20 + (p.realmIndex || 0) * 5;
    if (!p.equipped) p.equipped = { weapon: null, helmet: null, armor: null, boots: null, accessory1: null, accessory2: null };
    if (!p.avatar) p.avatar = 'default';
    if (!Array.isArray(p.techniques)) p.techniques = [];
    if (p.activeTechniqueId === undefined) p.activeTechniqueId = null;
    // T0042: 历法向后兼容
    if (!p.gameYear) {
      const elapsed = p.age - 16;
      p.gameYear = Math.max(1, Math.floor(elapsed) + 1);
      p.gameMonth = Math.max(1, Math.min(12, Math.floor((elapsed - Math.floor(elapsed)) * 12) + 1));
    }
    // T0040: tracking 向后兼容
    if (p.tracking) {
      if (p.tracking.lowMoodStreak === undefined) p.tracking.lowMoodStreak = 0;
      if (p.tracking.consecutiveBreakthroughFails === undefined) p.tracking.consecutiveBreakthroughFails = 0;
    }
    return p;
  } catch { return null; }
}

function writeSave(player: Player): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(player));
}

export function useGameEngine(
  rawAddLog: (msg: string, category?: LogCategory, gameYear?: number, gameMonth?: number) => void,
  rawAddLogs: (msgs: string[], category?: LogCategory, gameYear?: number, gameMonth?: number) => void,
) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState('');
  const [combatModal, setCombatModal] = useState<CombatModalState | null>(null);
  const [deathModal, setDeathModal] = useState<DeathModalState | null>(null);
  const playerRef = useRef<Player | null>(null);
  const { toast, showToast, dismiss: dismissToast } = useToast();

  // 同步 playerRef
  useEffect(() => { playerRef.current = player; }, [player]);

  // 包装 addLog：自动注入 gameYear/gameMonth + 发 Toast
  // 以 ⚠️ 开头的消息只 Toast 不写日志（精力不足等即时提示）
  const addLog = useCallback((msg: string, category: LogCategory = 'default') => {
    showToast(msg, category);
    if (msg.startsWith('⚠️')) return; // toast-only
    const p = playerRef.current;
    rawAddLog(msg, category, p?.gameYear ?? 1, p?.gameMonth ?? 1);
  }, [rawAddLog, showToast]);

  const addLogs = useCallback((msgs: string[], category: LogCategory = 'default') => {
    const p = playerRef.current;
    rawAddLogs(msgs, category, p?.gameYear ?? 1, p?.gameMonth ?? 1);
    // 战斗多条日志：只 toast 最后一条摘要
    if (msgs.length > 0) {
      showToast(msgs[msgs.length - 1], category, msgs.length > 3 ? 4000 : 3000);
    }
  }, [rawAddLogs, showToast]);

  // ── 新游戏 ──
  const newGame = useCallback((name: string) => {
    const p = createPlayer(name);
    const root = getSpiritRootGrade(p.aptitudes);
    writeSave(p);
    setPlayer(p);
    setGameOver(false);
    setGameOverReason('');
    addLog(`🌟 ${p.name} 踏上修仙之路！`, 'system');
    addLog(`灵根品级：${root.grade}（修炼速度 ×${root.multiplier}）`, 'system');
    addLog(`幸运: ${p.luck} | 悟性: ${p.comprehension} | 魅力: ${p.charisma}`, 'system');
  }, [addLog]);

  // ── 加载存档 ──
  const loadGame = useCallback(() => {
    const saved = loadSave();
    if (saved) {
      setPlayer(saved);
      setGameOver(false);
      setGameOverReason('');
      addLog(`📂 读取存档成功！${saved.name}，${REALMS[saved.realmIndex].name}期。`, 'system');
      return true;
    }
    return false;
  }, [addLog]);

  // 自动存档
  useEffect(() => {
    if (player && !gameOver) {
      writeSave(player);
    }
  }, [player, gameOver]);

  // ── 通用：时间推进 + 死亡检测 (A-5 + T0042 历法 + T0040 死亡) ──
  const advanceTime = useCallback((p: Player, actionKey: string): Player => {
    const cost = ACTION_COSTS[actionKey];
    if (!cost) return p;

    // T0042: 月份推进
    let newMonth = p.gameMonth + cost.time;
    let newYear = p.gameYear;
    if (newMonth > 12) {
      newYear += Math.floor((newMonth - 1) / 12);
      newMonth = ((newMonth - 1) % 12) + 1;
    }

    let updated = {
      ...p,
      age: p.age + cost.time / 12,
      gameYear: newYear,
      gameMonth: newMonth,
    };

    // T0040: 心情低迷追踪
    if (updated.mood <= 10) {
      updated.tracking = { ...updated.tracking, lowMoodStreak: (updated.tracking.lowMoodStreak ?? 0) + 1 };
    } else {
      updated.tracking = { ...updated.tracking, lowMoodStreak: 0 };
    }

    // T0040: 寿元耗尽检查（通过死亡系统）
    if (updated.lifespan !== Infinity && updated.age >= updated.lifespan) {
      const deathCheck = checkDeathTriggers(updated, { source: 'time' });
      if (deathCheck.triggered && !deathCheck.blocked) {
        const death = applyDeath(deathCheck.player, deathCheck.trigger!);
        updated = death.player;
        setGameOver(true);
        setGameOverReason(death.gameOverReason || `寿元耗尽，享年 ${Math.floor(updated.age)} 岁，${REALMS[updated.realmIndex].name}期。`);
        addLog(`💀 寿元耗尽！享年 ${Math.floor(updated.age)} 岁。修仙之路到此为止…`, 'system');
      }
    }

    // T0040: 心魔检查
    if (!gameOver && updated.mood <= 10
      && (updated.tracking.lowMoodStreak ?? 0) >= 5
      && (updated.tracking.consecutiveBreakthroughFails ?? 0) >= 3) {
      const demonCheck = checkDeathTriggers(updated, { source: 'other' });
      if (demonCheck.triggered) {
        if (demonCheck.blocked) {
          updated = demonCheck.player;
          for (const log of demonCheck.logs) addLog(log, 'system');
        } else {
          const death = applyDeath(updated, demonCheck.trigger!);
          updated = death.player;
          for (const log of death.logs) addLog(log, 'system');
          if (death.gameOver) {
            if (death.availableRevivals.length > 0) {
              const ds = getDeathSystemState(updated);
              setDeathModal({
                triggerDef: demonCheck.trigger!,
                severity: death.severity,
                availableRevivals: death.availableRevivals,
                playerSnapshot: {
                  name: updated.name,
                  realmIndex: updated.realmIndex,
                  age: updated.age,
                  killCount: updated.tracking.killCount,
                  deathCount: ds.deathCount,
                },
              });
            } else {
              setGameOver(true);
              setGameOverReason(death.gameOverReason);
            }
          }
        }
      }
    }

    // T0040: 健康耗尽检查
    if (!gameOver && updated.health <= 0) {
      const healthCheck = checkDeathTriggers(updated, { source: 'other' });
      if (healthCheck.triggered) {
        if (healthCheck.blocked) {
          updated = healthCheck.player;
          for (const log of healthCheck.logs) addLog(log, 'system');
        } else {
          const death = applyDeath(updated, healthCheck.trigger!);
          updated = death.player;
          for (const log of death.logs) addLog(log, 'system');
          if (death.gameOver) {
            if (death.availableRevivals.length > 0) {
              const ds = getDeathSystemState(updated);
              setDeathModal({
                triggerDef: healthCheck.trigger!,
                severity: death.severity,
                availableRevivals: death.availableRevivals,
                playerSnapshot: {
                  name: updated.name,
                  realmIndex: updated.realmIndex,
                  age: updated.age,
                  killCount: updated.tracking.killCount,
                  deathCount: ds.deathCount,
                },
              });
            } else {
              setGameOver(true);
              setGameOverReason(death.gameOverReason);
            }
          }
        }
      }
    }

    // B-4: 日常事件（每次时间推进时有概率触发）
    if (!gameOver) {
      const daily = triggerDailyEvent(updated);
      if (daily) {
        updated = { ...daily.player };
        addLog(daily.message, 'daily');
      }
    }
    return updated;
  }, [addLog, gameOver]);

  // ── 精力检查 ──
  const canAct = useCallback((actionKey: string): boolean => {
    if (!player || gameOver) return false;
    const cost = ACTION_COSTS[actionKey];
    return player.stamina >= cost.stamina;
  }, [player, gameOver]);

  // ── 战斗弹窗回调（T0044 + T0040）──
  const onCombatResult = useCallback((monsterName: string, monsterEmoji: string, result: CombatResult, loot: LootEntry[], deathInfo?: CombatDeathInfo, hpBefore?: number, mpBefore?: number) => {
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
  }, []);

  const handleCombatNext = useCallback(() => {
    setCombatModal(prev => prev ? { ...prev, phase: 'loot' } : null);
  }, []);

  const combatModalRef = useRef<CombatModalState | null>(null);
  useEffect(() => { combatModalRef.current = combatModal; }, [combatModal]);

  const handleCombatClose = useCallback(() => {
    const modal = combatModalRef.current;
    if (!modal) return;
    const { monsterName, result, loot, deathInfo, playerHpBefore, playerMpBefore } = modal;

    if (result.winner === 'player') {
      const details: string[] = [];
      if (result.expGained > 0) details.push(`+${result.expGained}修为`);
      if (result.goldGained > 0) details.push(`+${result.goldGained}灵石`);
      const hpLost = playerHpBefore - result.playerHpLeft;
      if (hpLost > 0) details.push(`-${hpLost}HP`);
      if (result.mpUsed > 0) details.push(`-${result.mpUsed}MP`);
      if (loot.length > 0) details.push(`获得: ${loot.map(l => `${l.name}×${l.amount}`).join(' ')}`);
      addLog(`⚔️ 击败 ${monsterName}（${details.join(' ')}）`, 'combat');
    } else if (result.winner === 'monster') {
      const details: string[] = [];
      const hpLost = playerHpBefore - result.playerHpLeft;
      if (hpLost > 0) details.push(`-${hpLost}HP`);
      if (result.mpUsed > 0) details.push(`-${result.mpUsed}MP`);
      if (deathInfo?.blocked) {
        details.push(`${deathInfo.saverName ?? '护命道具'}救回一命`);
      } else if (deathInfo?.triggered && deathInfo.penaltyLogs?.length) {
        details.push(...deathInfo.penaltyLogs);
      } else {
        details.push('-20健康');
      }
      addLog(`💀 败于 ${monsterName}（${details.join(' ')}）`, 'combat');
    } else {
      const details: string[] = [];
      const hpLost = playerHpBefore - result.playerHpLeft;
      if (hpLost > 0) details.push(`-${hpLost}HP`);
      if (result.mpUsed > 0) details.push(`-${result.mpUsed}MP`);
      addLog(`⚔️ 与 ${monsterName} 缠斗超时，双方脱战（${details.join(' ')}）`, 'combat');
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
        setGameOverReason(deathInfo.triggerDef?.description ?? '战斗中身亡');
      }
    }
  }, [addLog]);

  // ── 子 Hook：核心行为（修炼/战斗/探索/休息）──
  const { cultivate, fight, explore, rest } = useCoreActions({
    addLog, addLogs, setPlayer, advanceTime, canAct, onCombatResult,
  });

  // ── 子 Hook：系统行为（炼丹/炼器/装备/商店/背包/突破/功法）──
  const {
    useItem, craft, equip, unequip, buy, sell, smith, breakthrough,
    learnTechnique, practiceTechnique, activateTechnique,
    learnDivineArt, activateDivineArt,
  } = useSystemActions({
    player, addLog, setPlayer, setGameOver, setGameOverReason, setDeathModal,
  });

  // ── T0040: 复活回调 ──
  const handleRevival = useCallback((method: RevivalMethodDef) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = applyRevival(prev, method);
      for (const log of result.logs) addLog(log, 'system');
      return result.player;
    });
    setDeathModal(null);
  }, [addLog, setPlayer]);

  // ── T0040: 死亡弹窗关闭（无复活→游戏结束）──
  const handleDeathModalClose = useCallback(() => {
    setDeathModal(null);
    setGameOver(true);
    setGameOverReason('修仙之路到此为止…');
  }, []);

  // ── 删档 ──
  const deleteSave = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    setPlayer(null);
    setGameOver(false);
    addLog('🗑️ 存档已删除。', 'system');
  }, [addLog]);

  return {
    player,
    gameOver,
    gameOverReason,
    newGame,
    loadGame,
    cultivate,
    fight,
    explore,
    rest,
    breakthrough,
    deleteSave,
    canAct,
    useItem,
    craft,
    equip,
    unequip,
    buy,
    sell,
    smith,
    learnTechnique,
    practiceTechnique,
    activateTechnique,
    learnDivineArt,
    activateDivineArt,
    toast,
    dismissToast,
    combatModal,
    handleCombatNext,
    handleCombatClose,
    deathModal,
    handleRevival,
    handleDeathModalClose,
    // Debug: 直接修改 player（仅 debug 模式使用）
    debugSetPlayer: setPlayer,
  };
}
