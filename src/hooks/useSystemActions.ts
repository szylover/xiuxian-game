// ============================================================
// useSystemActions.ts — 系统行为 Hook（炼丹/炼器/装备/商店/背包/突破）
// 从 useGameEngine.ts 拆分，保持职责单一
// ============================================================

import { useCallback } from 'react';
import type { Player } from '../game/player';
import { useItem as inventoryUseItem } from '../game/inventory';
import { performAlchemy } from '../game/alchemy';
import { equipItem, unequipItem } from '../game/equipment';
import { buyItem, sellItem } from '../game/shop';
import { performSmithing } from '../game/smithing';
import { attemptBreakthrough as attemptBreakthroughFn } from '../game/breakthrough';
import { runTribulation as runTribulationFn } from '../game/tribulation';
import { learnTechnique, practiceTechnique, activateTechnique } from '../game/technique';
import type { EquipSlot } from '../game/registry';
import type { LogCategory } from './useGameLog';

export interface SystemActionDeps {
  player: Player | null;
  addLog: (msg: string, category?: LogCategory) => void;
  setPlayer: React.Dispatch<React.SetStateAction<Player | null>>;
  setGameOver: React.Dispatch<React.SetStateAction<boolean>>;
  setGameOverReason: React.Dispatch<React.SetStateAction<string>>;
}

export function useSystemActions(deps: SystemActionDeps) {
  const { player, addLog, setPlayer, setGameOver, setGameOverReason } = deps;

  // ── 通用模式：执行操作 → 更新 player → 写日志 ──
  const execAction = useCallback(
    (action: (p: Player) => { player: Player; message: string }, category: LogCategory = 'system') => {
      let msg = '';
      setPlayer(prev => {
        if (!prev) return prev;
        const result = action(prev);
        msg = result.message;
        return result.player;
      });
      if (msg) addLog(msg, category);
    },
    [addLog, setPlayer],
  );

  // ── C-1: 使用物品 ──
  const useItemAction = useCallback((itemId: string) => {
    execAction(p => inventoryUseItem(p, itemId));
  }, [execAction]);

  // ── T0013: 炼丹 ──
  const craft = useCallback((recipeId: string) => {
    execAction(p => performAlchemy(p, recipeId));
  }, [execAction]);

  // ── T0014: 装备 ──
  const equip = useCallback((equipId: string) => {
    execAction(p => equipItem(p, equipId));
  }, [execAction]);

  const unequip = useCallback((slot: EquipSlot) => {
    execAction(p => unequipItem(p, slot));
  }, [execAction]);

  // ── T0015: 商店 ──
  const buy = useCallback((itemId: string) => {
    execAction(p => buyItem(p, itemId));
  }, [execAction]);

  const sell = useCallback((itemId: string) => {
    execAction(p => sellItem(p, itemId));
  }, [execAction]);

  // ── T0016: 炼器 ──
  const smith = useCallback((recipeId: string) => {
    execAction(p => performSmithing(p, recipeId));
  }, [execAction]);

  // ── T0029: 突破系统重构 ──
  const breakthrough = useCallback(() => {
    if (!player) return;

    // 直接基于当前 player 计算结果，不使用 updater 函数
    const btResult = attemptBreakthroughFn(player);
    let finalPlayer = btResult.player;
    const allLogs = [...btResult.logs];

    if (btResult.triggerTribulation) {
      const tribResult = runTribulationFn(finalPlayer);
      finalPlayer = tribResult.player;
      allLogs.push(...tribResult.logs);

      if (!tribResult.success && finalPlayer.hp <= 0) {
        setGameOver(true);
        setGameOverReason('渡劫失败，形神俱灭！');
      }
    }

    setPlayer(finalPlayer);
    for (const log of allLogs) {
      addLog(log, 'system');
    }
  }, [player, addLog, setPlayer, setGameOver, setGameOverReason]);

  // ── T0017: 功法 ──
  const learn = useCallback((techniqueId: string) => {
    execAction(p => learnTechnique(p, techniqueId));
  }, [execAction]);

  const practice = useCallback((techniqueId: string) => {
    execAction(p => practiceTechnique(p, techniqueId));
  }, [execAction]);

  const activate = useCallback((techniqueId: string) => {
    execAction(p => activateTechnique(p, techniqueId));
  }, [execAction]);

  return {
    useItem: useItemAction,
    craft,
    equip,
    unequip,
    buy,
    sell,
    smith,
    breakthrough,
    learnTechnique: learn,
    practiceTechnique: practice,
    activateTechnique: activate,
  };
}
