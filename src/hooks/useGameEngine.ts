// ============================================================
// useGameEngine.ts — 游戏核心引擎 Hook（状态管理 + 存档 + 编排）
// 拆分结构：
//   useSaveLoad.ts     — 存档读写 + 向后兼容
//   useCoreActions.ts  — 修炼/战斗/探索/休息
//   useSystemActions.ts — 炼丹/装备/商店/突破/功法等
//   useCombatModal.ts  — 战斗弹窗状态 + 回调
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPlayer, getSpiritRootDisplay } from '../game/player';
import type { Player } from '../game/player';
import type { CreatePlayerOptions } from '../game/player';
import { REALMS, ACTION_COSTS } from '../game/data';
import { registerCoreEvents, triggerDailyEvent } from '../game/events';
import type { LogCategory } from './useGameLog';
import { useToast } from './useToast';
import { useCoreActions } from './useCoreActions';
import { useSystemActions } from './useSystemActions';
import { useCombatModal } from './useCombatModal';
import type { DeathModalState } from './useCombatModal';
import { checkDeathTriggers, applyDeath, applyRevival, getDeathSystemState } from '../game/death';
import type { RevivalMethodDef } from '../game/types';
import { checkAchievements } from '../game/achievement/engine';
import { SAVE_KEY, loadSave, writeSave } from './useSaveLoad';
import { refreshUnlockedRegions } from '../game/map';

// Re-export types so existing imports still work
export type { CombatModalState, DeathModalState } from './useCombatModal';

export function useGameEngine(
  rawAddLog: (msg: string, category?: LogCategory, gameYear?: number, gameMonth?: number) => void,
  rawAddLogs: (msgs: string[], category?: LogCategory, gameYear?: number, gameMonth?: number) => void,
) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState('');
  const [deathModal, setDeathModal] = useState<DeathModalState | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState(false);
  const playerRef = useRef<Player | null>(null);
  const { toast, showToast, dismiss: dismissToast } = useToast();

  // 异步加载游戏数据（代码分割，仅首次调用）
  useEffect(() => {
    registerCoreEvents()
      .then(() => setDataReady(true))
      .catch((err) => {
        console.error('[xiuxian] 游戏数据加载失败', err);
        setDataError(true);
      });
  }, []);

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
  const newGame = useCallback((options: CreatePlayerOptions) => {
    const p = createPlayer(options);
    const rootDisplay = getSpiritRootDisplay(p.spiritRoots);
    writeSave(p);
    setPlayer(p);
    setGameOver(false);
    setGameOverReason('');
    addLog(`🌟 ${p.name} 踏上修仙之路！`, 'system');
    addLog(`灵根：${rootDisplay.grade}（修炼速度 ×${rootDisplay.multiplier}）`, 'system');
    const rootList = p.spiritRoots.roots.map(r => {
      const cn: Record<string, string> = { metal: '金', wood: '木', water: '水', fire: '火', earth: '土' };
      return `${cn[r.type] ?? r.type}(${r.affinity})`;
    }).join('、') || '无';
    addLog(`灵根详情：${rootList}`, 'system');
    addLog(`气运: ${p.luck} | 悟性: ${p.comprehension} | 魅力: ${p.charisma}`, 'system');
  }, [addLog]);

  // ── 加载存档 ──
  const loadGame = useCallback(() => {
    const saved = loadSave();
    if (saved) {
      // T0021: 根据境界刷新解锁区域（旧存档可能境界已高）
      const withRegions = refreshUnlockedRegions(saved);
      setPlayer(withRegions);
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

  // ── T0031: 成就检测副作用——每次 player 变化后自动检查并通知 ──
  // 用 ref 标记本次 setPlayer 来源于成就检测，避免二次触发
  const achPlayerRef = useRef<Player | null>(null);
  useEffect(() => {
    if (!player || gameOver) return;
    // 若 player 是我们自己设置的，跳过（已检测完毕）
    if (achPlayerRef.current === player) {
      achPlayerRef.current = null;
      return;
    }
    const { player: updated, newAchievements } = checkAchievements(player);
    if (newAchievements.length === 0) return;
    for (const ach of newAchievements) {
      const bonus = ach.bonusDescription ? ` — ${ach.bonusDescription}` : '';
      addLog(`🏆 解锁成就：${ach.name}${bonus}`, 'system');
    }
    // 清空 pendingToast 并持久化新状态
    const achState = updated.systems?.achievement as { unlockedIds: string[]; pendingToast: string[] };
    const newPlayer = {
      ...updated,
      systems: { ...updated.systems, achievement: { ...achState, pendingToast: [] } },
    };
    achPlayerRef.current = newPlayer;
    setPlayer(newPlayer);
  }, [player, gameOver, addLog]);

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

    // ── 死亡检测通用辅助 ──
    // 心魔/健康耗尽共用同一套 check → block/death → modal/gameOver 流程
    const runDeathCheck = (p: Player, source: 'time' | 'combat' | 'other'): Player => {
      const deathCheck = checkDeathTriggers(p, { source });
      if (!deathCheck.triggered) return p;
      if (deathCheck.blocked) {
        for (const log of deathCheck.logs) addLog(log, 'system');
        return deathCheck.player;
      }
      const death = applyDeath(p, deathCheck.trigger!);
      for (const log of death.logs) addLog(log, 'system');
      if (death.gameOver) {
        if (death.availableRevivals.length > 0) {
          const ds = getDeathSystemState(death.player);
          setDeathModal({
            triggerDef: deathCheck.trigger!,
            severity: death.severity,
            availableRevivals: death.availableRevivals,
            playerSnapshot: {
              name: death.player.name,
              realmIndex: death.player.realmIndex,
              age: death.player.age,
              killCount: death.player.tracking.killCount,
              deathCount: ds.deathCount,
            },
          });
        } else {
          setGameOver(true);
          setGameOverReason(death.gameOverReason);
        }
      }
      return death.player;
    };

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
      updated = runDeathCheck(updated, 'other');
    }

    // T0040: 健康耗尽检查
    if (!gameOver && updated.health <= 0) {
      updated = runDeathCheck(updated, 'other');
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

  // ── 战斗弹窗（拆分至 useCombatModal.ts）──
  const { combatModal, onCombatResult, handleCombatNext, handleCombatClose } =
    useCombatModal(playerRef, addLog, setGameOver, setGameOverReason, setDeathModal);

  // ── 子 Hook：核心行为（修炼/战斗/探索/休息）──
  const { cultivate, fight, explore, rest } = useCoreActions({
    addLog, addLogs, setPlayer, advanceTime, canAct, onCombatResult,
  });

  // ── 子 Hook：系统行为（炼丹/炼器/装备/商店/背包/突破/功法）──
  const {
    useItem, craft, equip, unequip, buy, sell, smith, breakthrough,
    learnTechnique, practiceTechnique, activateTechnique,
    learnDivineArt, activateDivineArt, deactivateDivineArt,
    travel, bodyBreakthrough,
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
    dataReady,
    dataError,
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
    deactivateDivineArt,
    travel,
    bodyBreakthrough,
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
