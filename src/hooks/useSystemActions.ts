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
import { learnDivineArt as learnDivineArtFn, activateDivineArt as activateDivineArtFn, deactivateDivineArt as deactivateDivineArtFn } from '../game/divine-arts';
import { travelTo as travelToFn } from '../game/map';
import { tryBodyRealmBreakthrough } from '../game/body-cultivation';
import { meetNpc as meetNpcFn, giveGift as giveGiftFn } from '../game/npc';
import { recalcStats } from '../game/player';
import { checkDeathTriggers, applyDeath, getDeathSystemState } from '../game/death';
import { getEquipDef, getTechniqueDef } from '../game/registry';
import type { EquipSlot } from '../game/registry';
import type { LogCategory } from './useGameLog';
import type { DeathModalState } from './useGameEngine';
import { UI_LABELS } from '../data/texts/ui-labels';
import { BODY_CULTIVATION_TEXTS } from '../data/texts/body-cultivation';
import { BREAKTHROUGH_TEXTS } from '../data/texts/breakthrough';

export interface SystemActionDeps {
  player: Player | null;
  addLog: (msg: string, category?: LogCategory) => void;
  setPlayer: React.Dispatch<React.SetStateAction<Player | null>>;
  setGameOver: React.Dispatch<React.SetStateAction<boolean>>;
  setGameOverReason: React.Dispatch<React.SetStateAction<string>>;
  setDeathModal: React.Dispatch<React.SetStateAction<DeathModalState | null>>;
}

export function useSystemActions(deps: SystemActionDeps) {
  const { player, addLog, setPlayer, setGameOver, setGameOverReason, setDeathModal } = deps;

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
    // T0060：体修武器 techType 兼容性提示（装备后检查）
    if (player) {
      const def = getEquipDef(equipId);
      if (def?.techType?.length) {
        const activeTechDef = player.activeTechniqueId
          ? getTechniqueDef(player.activeTechniqueId)
          : null;
        if (!activeTechDef) {
          addLog(UI_LABELS.bodyWeaponHint(def.name, def.techType.join('/')), 'system');
        } else if (!def.techType.includes(activeTechDef.type)) {
          addLog(UI_LABELS.bodyWeaponMismatch(def.name, def.techType.join('/'), activeTechDef.name, activeTechDef.type), 'system');
        }
      }
    }
  }, [execAction, player, addLog]);

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

    const btResult = attemptBreakthroughFn(player);
    let finalPlayer = btResult.player;
    const allLogs = [...btResult.logs];

    if (btResult.triggerTribulation) {
      const tribResult = runTribulationFn(finalPlayer);
      finalPlayer = tribResult.player;
      allLogs.push(...tribResult.logs);

      if (!tribResult.success && finalPlayer.hp <= 0) {
        setGameOver(true);
        setGameOverReason(UI_LABELS.tribulationGameOver);
      }
    }

    setPlayer(finalPlayer);
    for (const log of allLogs) {
      addLog(log, btResult.blockedByBottleneck ? 'adventure' : 'system');
    }
    // 突破失败额外提示
    if (!btResult.success && !btResult.triggerTribulation) {
      if (btResult.blockedByBottleneck) {
        addLog(BREAKTHROUGH_TEXTS.bottleneckHint, 'system');
      }
    }
  }, [player, addLog, setPlayer, setGameOver, setGameOverReason]);

  // ── T0017: 功法 ──
  const learn = useCallback((techniqueId: string) => {
    execAction(p => learnTechnique(p, techniqueId));
  }, [execAction]);

  const practice = useCallback((techniqueId: string) => {
    execAction(p => {
      const result = practiceTechnique(p, techniqueId);
      // 修炼后重算属性以应用被动加成（T0019）
      return { player: recalcStats(result.player), message: result.message };
    });
  }, [execAction]);

  const activate = useCallback((techniqueId: string) => {
    execAction(p => activateTechnique(p, techniqueId));
  }, [execAction]);

  // ── T0020: 神通 ──
  const learnDivineArt = useCallback((artId: string) => {
    execAction(p => learnDivineArtFn(p, artId));
  }, [execAction]);

  const activateDivineArt = useCallback((artId: string) => {
    execAction(p => activateDivineArtFn(p, artId));
  }, [execAction]);

  const deactivateDivineArt = useCallback(() => {
    execAction(p => deactivateDivineArtFn(p));
  }, [execAction]);

  // ── T0021: 区域移动 ──
  const travel = useCallback((regionId: string) => {
    execAction(p => travelToFn(p, regionId));
  }, [execAction]);

  // ── T0059: 体修突破（手动） ──
  const bodyBreakthrough = useCallback(() => {
    execAction(p => {
      const result = tryBodyRealmBreakthrough(p);
      if (!result.breakthrough) {
        return { player: p, message: BODY_CULTIVATION_TEXTS.notReady };
      }
      return { player: result.player, message: result.message };
    });
  }, [execAction]);

  // ── T0025: NPC 邂逅 ──
  const meetNpc = useCallback((npcId: string) => {
    execAction(p => meetNpcFn(p, npcId));
  }, [execAction]);

  // ── T0025: NPC 赠礼 ──
  const giveGift = useCallback((npcId: string, itemId: string) => {
    execAction(p => {
      const result = giveGiftFn(p, npcId, itemId);
      return { player: result.player, message: result.message };
    });
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
    learnDivineArt,
    activateDivineArt,
    deactivateDivineArt,
    travel,
    bodyBreakthrough,
    meetNpc,
    giveGift,
  };
}
