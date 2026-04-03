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
import { getEquipDef, getTechniqueDef, getRecipe, getSmithingRecipe } from '../game/registry';
import { tickQuestObjectives, acceptQuest as acceptQuestFn, abandonQuest as abandonQuestFn, deliverQuestItem as deliverQuestItemFn, checkQuestDiscovery, setTrackedQuest as setTrackedQuestFn, turnInQuest as turnInQuestFn } from '../game/quest';
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
    let craftMsg = '';
    setPlayer(prev => {
      if (!prev) return prev;
      const result = performAlchemy(prev, recipeId);
      craftMsg = result.message;
      let p = result.player;
      // T0057: 炼丹成功后推进 craft_item 目标
      if (result.message && !result.message.includes('❌') && !result.message.includes('⚠️')) {
        const recipeDef = getRecipe(recipeId);
        if (recipeDef) {
          const questResult = tickQuestObjectives(p, { type: 'craft_item', recipeId, outputItemId: recipeDef.outputItemId });
          p = questResult.player;
          for (const log of questResult.logs) addLog(log, 'system');
        }
      }
      return p;
    });
    if (craftMsg) addLog(craftMsg, 'system');
  }, [addLog, setPlayer]);

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
    let smithMsg = '';
    setPlayer(prev => {
      if (!prev) return prev;
      const result = performSmithing(prev, recipeId);
      smithMsg = result.message;
      let p = result.player;
      // T0057: 炼器成功后推进 craft_item 目标
      if (result.message && !result.message.includes('❌') && !result.message.includes('⚠️')) {
        const recipeDef = getSmithingRecipe(recipeId);
        if (recipeDef) {
          const questResult = tickQuestObjectives(p, { type: 'craft_item', recipeId, outputItemId: recipeDef.outputItemId });
          p = questResult.player;
          for (const log of questResult.logs) addLog(log, 'system');
        }
      }
      return p;
    });
    if (smithMsg) addLog(smithMsg, 'system');
  }, [addLog, setPlayer]);

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
    // T0067: 突破成功后检查可发现的任务
    if (btResult.success) {
      setPlayer(prev => {
        if (!prev) return prev;
        const questDiscover = checkQuestDiscovery(prev, { type: 'reach_realm', realmIndex: prev.realmIndex });
        for (const log of questDiscover.logs) addLog(log, 'system');
        return questDiscover.player;
      });
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
    let travelMsg = '';
    setPlayer(prev => {
      if (!prev) return prev;
      const result = travelToFn(prev, regionId);
      travelMsg = result.message;
      let p = result.player;
      // T0057: 移动后推进 reach_region 目标
        if (result.message && !result.message.includes('❌') && !result.message.includes('⚠️')) {
        const questResult = tickQuestObjectives(p, { type: 'reach_region', regionId });
        p = questResult.player;
        for (const log of questResult.logs) addLog(log, 'system');
        // T0067: 移动后检查可发现的任务
        const questDiscover = checkQuestDiscovery(p, { type: 'reach_region', regionId });
        p = questDiscover.player;
        for (const log of questDiscover.logs) addLog(log, 'system');
      }
      return p;
    });
    if (travelMsg) addLog(travelMsg, 'system');
  }, [addLog, setPlayer]);

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
    let meetMsg = '';
    setPlayer(prev => {
      if (!prev) return prev;
      const result = meetNpcFn(prev, npcId);
      meetMsg = result.message;
      let p = result.player;
      // T0057: NPC 交互后推进 talk_npc 目标
      const questResult = tickQuestObjectives(p, { type: 'talk_npc', npcId });
      p = questResult.player;
      for (const log of questResult.logs) addLog(log, 'system');
      // T0067: NPC 交互后检查可发现的任务
      const questDiscover = checkQuestDiscovery(p, { type: 'talk_npc', npcId });
      p = questDiscover.player;
      for (const log of questDiscover.logs) addLog(log, 'system');
      return p;
    });
    if (meetMsg) addLog(meetMsg, 'system');
  }, [addLog, setPlayer]);

  // ── T0025: NPC 赠礼 ──
  const giveGift = useCallback((npcId: string, itemId: string) => {
    execAction(p => {
      const result = giveGiftFn(p, npcId, itemId);
      return { player: result.player, message: result.message };
    });
  }, [execAction]);

  // ── T0057: 任务链操作 ──
  const acceptQuest = useCallback((questId: string) => {
    let questLogs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = acceptQuestFn(prev, questId);
      questLogs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of questLogs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  const abandonQuest = useCallback((questId: string) => {
    let questLogs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = abandonQuestFn(prev, questId);
      questLogs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of questLogs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  const deliverQuestItem = useCallback((questId: string, objectiveIndex: number) => {
    let questLogs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = deliverQuestItemFn(prev, questId, objectiveIndex);
      questLogs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of questLogs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  const turnInQuest = useCallback((questId: string) => {
    let questLogs: string[] = [];
    setPlayer(prev => {
      if (!prev) return prev;
      const result = turnInQuestFn(prev, questId);
      questLogs = result.logs;
      return result.player;
    });
    setTimeout(() => { for (const log of questLogs) addLog(log, 'system'); }, 0);
  }, [addLog, setPlayer]);

  const setTrackedQuest = useCallback((questId: string | null) => {
    setPlayer(prev => {
      if (!prev) return prev;
      return setTrackedQuestFn(prev, questId);
    });
  }, [setPlayer]);

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
    acceptQuest,
    abandonQuest,
    deliverQuestItem,
    turnInQuest,
    setTrackedQuest,
  };
}
