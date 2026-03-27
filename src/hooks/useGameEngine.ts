// ============================================================
// useGameEngine.ts — 游戏核心引擎 Hook
// A-1~A-5 + B-1~B-5 全部系统的状态管理 + 存档
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { createPlayer, recalcStats, getNextRealm, getSpiritRootGrade } from '../game/player';
import type { Player } from '../game/player';
import { REALMS, ACTION_COSTS, MONSTERS, BASE_CULTIVATE_EXP, BREAKTHROUGH_BASE_RATE, BREAKTHROUGH_COMP_BONUS, BREAKTHROUGH_LUCK_BONUS, BREAKTHROUGH_FAIL_EXP_LOSS } from '../game/data';
import { runCombat } from '../game/combat';
import { registerCoreEvents, triggerExploreEvent, triggerDailyEvent } from '../game/events';
import { useItem as inventoryUseItem, addItem } from '../game/inventory';
import { getItemDef } from '../game/registry';
import { performAlchemy } from '../game/alchemy';
import { equipItem, unequipItem } from '../game/equipment';
import { buyItem, sellItem } from '../game/shop';
import { performSmithing } from '../game/smithing';
import type { EquipSlot } from '../game/registry';
import type { LogCategory } from './useGameLog';

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

  // ── 通用：时间推进 + 寿元检测 (A-5) ──
  const advanceTime = useCallback((p: Player, actionKey: string): Player => {
    const cost = ACTION_COSTS[actionKey];
    if (!cost) return p;
    let updated = { ...p, age: p.age + cost.time };

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
  }, [addLog]);

  // ── 精力检查 ──
  const canAct = useCallback((actionKey: string): boolean => {
    if (!player || gameOver) return false;
    const cost = ACTION_COSTS[actionKey];
    return player.stamina >= cost.stamina;
  }, [player, gameOver]);

  // ── A-2: 修炼 ──
  const cultivate = useCallback(() => {
    if (!canAct('cultivate')) {
      addLog('⚠️ 精力不足，请先休息！', 'system');
      return;
    }
    setPlayer(prev => {
      if (!prev) return prev;
      let p: Player = { ...prev };
      const cost = ACTION_COSTS.cultivate;

      // 消耗精力
      p.stamina -= cost.stamina;

      // 经验计算：base × 悟性加成 × 灵根加成 × 心情加成
      const compBonus = 1 + p.comprehension / 50;
      const rootGrade = getSpiritRootGrade(p.aptitudes);
      const moodBonus = 0.5 + (p.mood / 100);
      const expGain = Math.floor(BASE_CULTIVATE_EXP * compBonus * rootGrade.multiplier * moodBonus);

      p.exp += expGain;

      // 追踪连续修炼
      p.tracking = { ...p.tracking, consecutiveCultivates: p.tracking.consecutiveCultivates + 1, consecutiveRests: 0 };

      // 推进时间
      p = advanceTime(p, 'cultivate');

      addLog(`🧘 修炼一次，获得 ${expGain} 修为。（悟性×${compBonus.toFixed(1)} 灵根×${rootGrade.multiplier} 心情×${moodBonus.toFixed(1)}）`, 'system');
      return p;
    });
  }, [canAct, advanceTime, addLog]);

  // ── A-3: 战斗 ──
  const fight = useCallback(() => {
    if (!canAct('combat')) {
      addLog('⚠️ 精力不足，请先休息！', 'system');
      return;
    }

    setPlayer(prev => {
      if (!prev) return prev;
      let p: Player = { ...prev };
      const cost = ACTION_COSTS.combat;
      p.stamina -= cost.stamina;

      // 选择同境界或 ±1 的随机妖兽
      const eligible = MONSTERS.filter(m =>
        m.realmIndex >= p.realmIndex - 1 && m.realmIndex <= p.realmIndex
      );
      if (eligible.length === 0) {
        addLog('🔍 四周平静，没有发现妖兽。', 'combat');
        return p;
      }
      const monster = eligible[Math.floor(Math.random() * eligible.length)];

      const result = runCombat(p, monster);
      addLogs(result.logs, 'combat');

      p.hp = result.playerHpLeft;
      p.exp += result.expGained;
      p.gold += result.goldGained;

      if (result.winner === 'player') {
        p.tracking = { ...p.tracking, killCount: p.tracking.killCount + 1, consecutiveRests: 0, consecutiveCultivates: 0 };
        // 检测是否击败高境界敌人
        if (monster.realmIndex > p.realmIndex) {
          p.tracking = { ...p.tracking, defeatedHigherRealm: true };
        }
        // C-1: 战斗掉落物品（30% 獠牙，10% 妖丹）
        if (Math.random() < 0.3) {
          const { player: p2, added } = addItem(p, 'core:monster_fang', 1);
          p = p2;
          if (added > 0) addLog('🦴 获得 妖兽獠牙 ×1', 'combat');
        }
        if (Math.random() < 0.1) {
          const { player: p2, added } = addItem(p, 'core:monster_core', 1);
          p = p2;
          if (added > 0) addLog('💎 获得 妖丹 ×1', 'combat');
        }
        // T0014: 战斗掉落装备（5% 按境界）
        if (Math.random() < 0.05) {
          const equipDrops: Record<number, string[]> = {
            0: ['core:iron_sword', 'core:cloth_hat', 'core:linen_robe', 'core:straw_shoes', 'core:jade_pendant'],
            1: ['core:spirit_sword', 'core:spirit_crown', 'core:spirit_robe', 'core:wind_boots', 'core:spirit_ring'],
            2: ['core:flame_blade', 'core:ice_helm', 'core:golden_armor', 'core:shadow_boots', 'core:dragon_amulet'],
            3: ['core:thunder_spear'],
          };
          const tier = Math.min(monster.realmIndex, 3);
          const pool = equipDrops[tier] || equipDrops[0];
          const dropId = pool[Math.floor(Math.random() * pool.length)];
          const { player: p2, added } = addItem(p, dropId, 1);
          if (added > 0) {
            p = p2;
            const eDef = getItemDef(dropId);
            addLog(`⚔️ 获得装备 ${eDef?.name ?? dropId}！`, 'combat');
          }
        }
      } else if (result.winner === 'monster') {
        // 战斗失败：健康 -20，重伤恢复少量 HP
        p.health = Math.max(0, p.health - 20);
        p.hp = Math.max(1, Math.floor(p.maxHp * 0.1));
        if (p.hp < p.maxHp * 0.1) {
          p.tracking = { ...p.tracking, hasBeenBelow10Hp: true };
        }
      }

      p = advanceTime(p, 'combat');
      return p;
    });
  }, [canAct, advanceTime, addLog, addLogs]);

  // ── 探索 ──
  const explore = useCallback(() => {
    if (!canAct('explore')) {
      addLog('⚠️ 精力不足，请先休息！', 'system');
      return;
    }

    setPlayer(prev => {
      if (!prev) return prev;
      let p: Player = { ...prev };
      const cost = ACTION_COSTS.explore;
      p.stamina -= cost.stamina;
      p.tracking = { ...p.tracking, consecutiveRests: 0, consecutiveCultivates: 0 };

      const { player: updated, message } = triggerExploreEvent(p);
      p = { ...updated };
      addLog(message, message.includes('【奇遇】') ? 'adventure' : 'explore');

      // C-1: 探索随机拾取物品
      const exploreLoot: [string, number][] = [
        ['core:iron_ore', 0.15],
        ['core:spirit_stone_shard', 0.20],
        ['core:herb_lingzhi', 0.08],
        ['core:herb_snow_lotus', 0.03],
        ['core:jade_slip', 0.05],
        ['core:hp_pill', 0.10],
        ['core:spirit_water', 0.06],
        ['core:map_fragment', 0.02],
      ];
      for (const [itemId, chance] of exploreLoot) {
        if (Math.random() < chance) {
          const { player: p2, added } = addItem(p, itemId, 1);
          if (added > 0) {
            p = p2;
            const def = getItemDef(itemId);
            addLog(`🎁 拾取 ${def?.name ?? itemId} ×1`, 'explore');
          }
          break; // 每次探索最多捡一个物品
        }
      }

      p = advanceTime(p, 'explore');
      return p;
    });
  }, [canAct, advanceTime, addLog]);

  // ── 休息 ──
  const rest = useCallback(() => {
    setPlayer(prev => {
      if (!prev) return prev;
      let p: Player = { ...prev };
      // 回复 30% 精力、少量 HP/MP
      const staminaRecover = Math.floor(p.maxStamina * 0.3);
      p.stamina = Math.min(p.maxStamina, p.stamina + staminaRecover);
      p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.1));
      p.mp = Math.min(p.maxMp, p.mp + Math.floor(p.maxMp * 0.1));
      p.health = Math.min(100, p.health + 5);
      p.mood = Math.min(100, p.mood + 3);

      p.tracking = { ...p.tracking, consecutiveRests: p.tracking.consecutiveRests + 1, consecutiveCultivates: 0 };

      p = advanceTime(p, 'rest');
      addLog(`💤 休息片刻，恢复 ${staminaRecover} 精力，HP/MP/健康/心情少量恢复。`, 'system');
      return p;
    });
  }, [advanceTime, addLog]);

  // ── A-4: 境界突破 ──
  const breakthrough = useCallback(() => {
    if (!player) return;
    const nextRealm = getNextRealm(player);
    if (!nextRealm) {
      addLog('🏔️ 你已到达当前版本的最高境界！', 'system');
      return;
    }
    if (player.exp < nextRealm.expReq) {
      addLog(`⚠️ 修为不足！突破 ${nextRealm.name} 需要 ${nextRealm.expReq} 修为（当前 ${player.exp}）。`, 'system');
      return;
    }

    setPlayer(prev => {
      if (!prev) return prev;
      let p: Player = { ...prev };
      const successRate = Math.min(0.95,
        BREAKTHROUGH_BASE_RATE + p.comprehension * BREAKTHROUGH_COMP_BONUS + p.luck * BREAKTHROUGH_LUCK_BONUS
      );

      const roll = Math.random();
      if (roll < successRate) {
        // 成功
        p.realmIndex += 1;
        const newRealm = REALMS[p.realmIndex];
        p.lifespan += newRealm.lifespanBonus;
        p = recalcStats(p);
        // 突破后满血满蓝
        p.hp = p.maxHp;
        p.mp = p.maxMp;
        p.stamina = p.maxStamina;
        p.mood = Math.min(100, p.mood + 20);

        addLog(`🎆 突破成功！晋升 ${newRealm.name}期！`, 'system');
        addLog(`寿限 +${newRealm.lifespanBonus}，属性全面提升！`, 'system');
      } else {
        // 失败：损失 10% 修为
        const expLoss = Math.floor(p.exp * BREAKTHROUGH_FAIL_EXP_LOSS);
        p.exp -= expLoss;
        p.mood = Math.max(0, p.mood - 20);
        p.health = Math.max(0, p.health - 10);

        addLog(`💥 突破失败！损失 ${expLoss} 修为，心情 -20，健康 -10。`, 'system');
        addLog(`（成功率 ${(successRate * 100).toFixed(1)}%，掷骰 ${(roll * 100).toFixed(1)}%）`, 'system');
      }
      return p;
    });
  }, [player, addLog]);

  // ── 删档 ──
  const deleteSave = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    setPlayer(null);
    setGameOver(false);
    addLog('🗑️ 存档已删除。', 'system');
  }, [addLog]);

  // ── C-1: 使用物品 ──
  const useItemAction = useCallback((itemId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = inventoryUseItem(prev, itemId);
      addLog(result.message, result.success ? 'system' : 'system');
      return result.player;
    });
  }, [addLog]);

  // ── T0013: 炼丹 ──
  const craft = useCallback((recipeId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = performAlchemy(prev, recipeId);
      addLog(result.message, 'system');
      return result.player;
    });
  }, [addLog]);

  // ── T0014: 装备 ──
  const equip = useCallback((equipId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = equipItem(prev, equipId);
      addLog(result.message, 'system');
      return result.player;
    });
  }, [addLog]);

  const unequip = useCallback((slot: EquipSlot) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = unequipItem(prev, slot);
      addLog(result.message, 'system');
      return result.player;
    });
  }, [addLog]);

  // ── T0015: 商店 ──
  const buy = useCallback((itemId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = buyItem(prev, itemId);
      addLog(result.message, 'system');
      return result.player;
    });
  }, [addLog]);

  const sell = useCallback((itemId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = sellItem(prev, itemId);
      addLog(result.message, 'system');
      return result.player;
    });
  }, [addLog]);

  // ── T0016: 炼器 ──
  const smith = useCallback((recipeId: string) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const result = performSmithing(prev, recipeId);
      addLog(result.message, 'system');
      return result.player;
    });
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
    useItem: useItemAction,
    craft,
    equip,
    unequip,
    buy,
    sell,
    smith,
  };
}
