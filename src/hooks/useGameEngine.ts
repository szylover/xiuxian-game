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
import { loadDLCs } from '../data/dlc';
import { triggerDailyEvent } from '../game/events';
import type { LogCategory } from './useGameLog';
import { useToast } from './useToast';
import { useCoreActions } from './useCoreActions';
import { useSystemActions } from './useSystemActions';
import { useCombatModal } from './useCombatModal';
import type { DeathModalState } from './useCombatModal';
import { checkDeathTriggers, applyDeath, applyRevival, getDeathSystemState } from '../game/death';
import type { RevivalMethodDef } from '../game/types';
import { checkAchievements } from '../game/achievement/engine';
import { loadSaveSlot, writeSaveSlot, deleteSaveSlot } from './useSaveLoad';
import { refreshUnlockedRegions } from '../game/map';
import { checkQuestTimeouts, checkQuestDiscovery, tickQuestObjectives, setTrackedQuest as setTrackedQuestFn } from '../game/quest';
import { UI_LABELS } from '../data/texts/ui-labels';
import { SPIRIT_ROOT_CN, SEPARATOR, NONE_TEXT } from '../data/texts/common';
import { tickAffinityDecay } from '../game/npc';
import { restoreGeneratedEquips } from '../game/procedural';
import { restoreTechniqueInstances } from '../game/procedural';
import { useChronicle } from './useChronicle';

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
  const currentSlotRef = useRef(0);
  const { toast, showToast, dismiss: dismissToast } = useToast();
  const chronicle = useChronicle();

  // T0074: 不再无条件加载 core DLC；改为 newGame/loadGame 时按需加载
  // dataReady 初始为 true（StartScreen 不需要等数据），实际加载在用户操作时触发
  useEffect(() => { setDataReady(true); }, []);

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
  const newGame = useCallback(async (options: CreatePlayerOptions & { slotIndex?: number; enabledDLCs?: string[] }) => {
    const dlcIds = options.enabledDLCs ?? ['core'];
    try {
      await loadDLCs(dlcIds);
    } catch (err) {
      console.error('[xiuxian] DLC 加载失败', err);
      setDataError(true);
      return;
    }
    const slotIndex = options.slotIndex ?? 0;
    currentSlotRef.current = slotIndex;
    let p = createPlayer({ ...options, enabledDLCs: dlcIds });
    const rootDisplay = getSpiritRootDisplay(p.spiritRoots);
    writeSaveSlot(slotIndex, p);
    setPlayer(p);
    setGameOver(false);
    setGameOverReason('');
    addLog(UI_LABELS.newGame(p.name), 'system');
    addLog(UI_LABELS.spiritRootGrade(rootDisplay.grade, String(rootDisplay.multiplier)), 'system');
    const rootList = p.spiritRoots.roots.map(r => {
      return `${SPIRIT_ROOT_CN[r.type] ?? r.type}(${r.affinity})`;
    }).join(SEPARATOR) || NONE_TEXT;
    addLog(UI_LABELS.spiritRootDetails(rootList), 'system');
    addLog(UI_LABELS.playerStats(p.luck, p.comprehension, p.charisma), 'system');
    // T0068: 开始新轮回
    chronicle.startNewIncarnation(p);
  }, [addLog, chronicle]);

  // ── 加载存档 ──
  const loadGame = useCallback(async (slotIndex = 0) => {
    currentSlotRef.current = slotIndex;
    const saved = loadSaveSlot(slotIndex);
    if (saved) {
      // T0074: 按存档中的 DLC 列表加载（旧存档默认 core）
      const dlcIds = saved.enabledDLCs ?? ['core'];
      try {
        await loadDLCs(dlcIds);
      } catch (err) {
        console.error('[xiuxian] DLC 加载失败', err);
        setDataError(true);
        return false;
      }
      // 补全旧存档的 enabledDLCs 字段
      if (!saved.enabledDLCs) saved.enabledDLCs = dlcIds;
      // T0021: 根据境界刷新解锁区域（旧存档可能境界已高）
      const withRegions = refreshUnlockedRegions(saved);
      // T0071: 恢复程序化装备实例到全局查询表
      restoreGeneratedEquips(withRegions);
      // T0073: 恢复程序化功法实例到全局查询表
      restoreTechniqueInstances(withRegions);
      setPlayer(withRegions);
      setGameOver(false);
      setGameOverReason('');
      addLog(UI_LABELS.loadSuccess(saved.name, REALMS[saved.realmIndex].name), 'system');
      // T0068: 加载存档时确保有当前轮回
      if (!chronicle.chronicle.current) {
        chronicle.startNewIncarnation(withRegions);
      }
      return true;
    }
    return false;
  }, [addLog, chronicle]);

  // 自动存档
  useEffect(() => {
    if (player && !gameOver) {
      writeSaveSlot(currentSlotRef.current, player);
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
      addLog(UI_LABELS.achievementUnlock(ach.name, bonus), 'system');
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

    // T0025: 跨年时触发 NPC 好感度衰减
    const crossedYear = newYear > p.gameYear;

    let updated = {
      ...p,
      age: p.age + cost.time,
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
          // T0068: 记录死亡事件（可能复活）
          chronicle.recordDeath();
          chronicle.recordEvent('death', death.player, death.gameOverReason);
        } else {
          setGameOver(true);
          setGameOverReason(death.gameOverReason);
          // T0068: 无复活手段，直接归档
          chronicle.recordDeath();
          chronicle.recordEvent('death', death.player, death.gameOverReason);
          chronicle.finalizeCurrentIncarnation(death.player, 'died');
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
        setGameOverReason(death.gameOverReason || UI_LABELS.lifespanDeathReason(Math.floor(updated.age), REALMS[updated.realmIndex].name));
        addLog(UI_LABELS.lifespanDeath(Math.floor(updated.age)), 'system');
        // T0068: 寿元耗尽归档
        chronicle.recordDeath();
        chronicle.recordEvent('death', updated, UI_LABELS.lifespanDeathReason(Math.floor(updated.age), REALMS[updated.realmIndex].name));
        chronicle.finalizeCurrentIncarnation(updated, 'died');
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

    // T0025: 跨年 NPC 好感度衰减
    if (crossedYear) {
      updated = tickAffinityDecay(updated);
    }

    // T0057: 任务超时检查
    const questTimeoutResult = checkQuestTimeouts(updated);
    updated = questTimeoutResult.player;
    for (const log of questTimeoutResult.logs) addLog(log, 'system');

    // T0057: 自动接取任务检查 → T0067: 任务发现检查
    const questDiscoverResult = checkQuestDiscovery(updated, { type: 'time_tick' as const });
    updated = questDiscoverResult.player;
    for (const log of questDiscoverResult.logs) addLog(log, 'system');

    // T0057: time_tick 触发（survive_months 目标）
    const questTickResult = tickQuestObjectives(updated, { type: 'time_tick' as const });
    updated = questTickResult.player;
    for (const log of questTickResult.logs) addLog(log, 'system');

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
    meetNpc, giveGift,
    acceptQuest, abandonQuest, deliverQuestItem, turnInQuest,
    startDialogue, dialogueSelectChoice, dialogueAdvance,
  } = useSystemActions({
    player, addLog, setPlayer, setGameOver, setGameOverReason, setDeathModal,
    chronicleHooks: { recordEvent: chronicle.recordEvent, syncSnapshot: chronicle.syncSnapshot },
  });

  // ── T0040: 复活回调 ──
  const handleRevival = useCallback((method: RevivalMethodDef) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = applyRevival(prev, method);
      for (const log of result.logs) addLog(log, 'system');
      // T0068: 记录复活事件
      chronicle.recordRevive();
      chronicle.recordEvent('revival', result.player, `复活（${method.name}）`, { revivalMethod: method.id });
      return result.player;
    });
    setDeathModal(null);
  }, [addLog, setPlayer, chronicle]);

  // ── T0040: 死亡弹窗关闭（无复活→游戏结束）──
  const handleDeathModalClose = useCallback(() => {
    setDeathModal(null);
    setGameOver(true);
    setGameOverReason(UI_LABELS.gameOverFallback);
    // T0068: 归档当前轮回
    if (playerRef.current) {
      chronicle.finalizeCurrentIncarnation(playerRef.current, 'died');
    }
  }, [chronicle]);

  // ── 删档 ──
  const deleteSave = useCallback(() => {
    deleteSaveSlot(currentSlotRef.current);
    setPlayer(null);
    setGameOver(false);
    addLog(UI_LABELS.deleteSave, 'system');
  }, [addLog]);

  // ── T0038: 退出到主菜单（不删档）──
  const exitGame = useCallback(() => {
    setPlayer(null);
    setGameOver(false);
    setGameOverReason('');
    setDeathModal(null);
  }, []);

  // ── T0067: 任务追踪 ──
  const setTrackedQuest = useCallback((questId: string | null) => {
    setPlayer(prev => {
      if (!prev) return prev;
      return setTrackedQuestFn(prev, questId);
    });
  }, [setPlayer]);

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
    meetNpc,
    giveGift,
    acceptQuest,
    abandonQuest,
    deliverQuestItem,
    turnInQuest,
    setTrackedQuest,
    startDialogue,
    dialogueSelectChoice,
    dialogueAdvance,
    toast,
    dismissToast,
    combatModal,
    handleCombatNext,
    handleCombatClose,
    deathModal,
    handleRevival,
    handleDeathModalClose,
    exitGame,
    currentSlot: currentSlotRef.current,
    // T0068: 修仙履历
    chronicle: chronicle.chronicle,
    chronicleActions: chronicle,
    // Debug: 直接修改 player（仅 debug 模式使用）
    debugSetPlayer: setPlayer,
  };
}
