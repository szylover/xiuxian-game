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

  // ── C-1: 使用物品 ──
  const useItemAction = useCallback((itemId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = inventoryUseItem(prev, itemId);
      addLog(result.message, result.success ? 'system' : 'system');
      return result.player;
    });
  }, [addLog, setPlayer]);

  // ── T0013: 炼丹 ──
  const craft = useCallback((recipeId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = performAlchemy(prev, recipeId);
      addLog(result.message, 'system');
      return result.player;
    });
  }, [addLog, setPlayer]);

  // ── T0014: 装备 ──
  const equip = useCallback((equipId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = equipItem(prev, equipId);
      addLog(result.message, 'system');
      return result.player;
    });
  }, [addLog, setPlayer]);

  const unequip = useCallback((slot: EquipSlot) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = unequipItem(prev, slot);
      addLog(result.message, 'system');
      return result.player;
    });
  }, [addLog, setPlayer]);

  // ── T0015: 商店 ──
  const buy = useCallback((itemId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = buyItem(prev, itemId);
      addLog(result.message, 'system');
      return result.player;
    });
  }, [addLog, setPlayer]);

  const sell = useCallback((itemId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = sellItem(prev, itemId);
      addLog(result.message, 'system');
      return result.player;
    });
  }, [addLog, setPlayer]);

  // ── T0016: 炼器 ──
  const smith = useCallback((recipeId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = performSmithing(prev, recipeId);
      addLog(result.message, 'system');
      return result.player;
    });
  }, [addLog, setPlayer]);

  // ── T0029: 突破系统重构 ──
  const breakthrough = useCallback(() => {
    if (!player) return;

    setPlayer(prev => {
      if (!prev) return prev;

      // 先尝试普通突破
      const btResult = attemptBreakthroughFn(prev);
      for (const log of btResult.logs) {
        addLog(log, 'system');
      }

      if (btResult.triggerTribulation) {
        // 需要渡劫
        const tribResult = runTribulationFn(btResult.player);
        for (const log of tribResult.logs) {
          addLog(log, 'system');
        }

        if (!tribResult.success && tribResult.player.hp <= 0) {
          // 渡劫失败且判定为死亡
          setGameOver(true);
          setGameOverReason('渡劫失败，形神俱灭！');
        }

        return tribResult.player;
      }

      return btResult.player;
    });
  }, [player, addLog, setPlayer, setGameOver, setGameOverReason]);

  // ── T0017: 功法 ──
  const learn = useCallback((techniqueId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = learnTechnique(prev, techniqueId);
      addLog(result.message, 'system');
      return result.player;
    });
  }, [addLog, setPlayer]);

  const practice = useCallback((techniqueId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = practiceTechnique(prev, techniqueId);
      addLog(result.message, 'system');
      return result.player;
    });
  }, [addLog, setPlayer]);

  const activate = useCallback((techniqueId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = activateTechnique(prev, techniqueId);
      addLog(result.message, 'system');
      return result.player;
    });
  }, [addLog, setPlayer]);

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
