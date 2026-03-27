// ============================================================
// useGameEngine.ts — 游戏核心引擎 Hook（状态管理 + 存档 + 编排）
// 行为逻辑已拆分至 useCoreActions.ts / useSystemActions.ts
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { createPlayer, getSpiritRootGrade } from '../game/player';
import type { Player } from '../game/player';
import { REALMS, ACTION_COSTS } from '../game/data';
import { registerCoreEvents, triggerDailyEvent } from '../game/events';
import type { LogCategory } from './useGameLog';
import { useCoreActions } from './useCoreActions';
import { useSystemActions } from './useSystemActions';

// 注册核心事件（模块加载时执行一次）
registerCoreEvents();

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
    return p;
  } catch { return null; }
}

function writeSave(player: Player): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(player));
}

export function useGameEngine(addLog: (msg: string, category?: LogCategory) => void, addLogs: (msgs: string[], category?: LogCategory) => void) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState('');

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

  // ── 通用：时间推进 + 寿元检测 (A-5 + T0042 历法) ──
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

    // 寿元耗尽检查
    if (updated.lifespan !== Infinity && updated.age >= updated.lifespan) {
      setGameOver(true);
      setGameOverReason(`寿元耗尽，享年 ${Math.floor(updated.age)} 岁，${REALMS[updated.realmIndex].name}期。`);
      addLog(`💀 寿元耗尽！享年 ${Math.floor(updated.age)} 岁。修仙之路到此为止…`, 'system');
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

  // ── 子 Hook：核心行为（修炼/战斗/探索/休息）──
  const { cultivate, fight, explore, rest } = useCoreActions({
    addLog, addLogs, setPlayer, advanceTime, canAct,
  });

  // ── 子 Hook：系统行为（炼丹/炼器/装备/商店/背包/突破/功法）──
  const {
    useItem, craft, equip, unequip, buy, sell, smith, breakthrough,
    learnTechnique, practiceTechnique, activateTechnique,
  } = useSystemActions({
    player, addLog, setPlayer, setGameOver, setGameOverReason,
  });

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
    // Debug: 直接修改 player（仅 debug 模式使用）
    debugSetPlayer: setPlayer,
  };
}
