// ============================================================
// useCoreActions.ts — 核心游戏行为 Hook（修炼/战斗/探索/休息）
// 从 useGameEngine.ts 拆分，保持职责单一
// ============================================================

import { useCallback } from 'react';
import type { Player } from '../game/player';
import { getSpiritRootGrade } from '../game/player';
import { ACTION_COSTS, MONSTERS, BASE_CULTIVATE_EXP } from '../game/data';
import { runCombat } from '../game/combat';
import { triggerExploreEvent } from '../game/events';
import { addItem } from '../game/inventory';
import { getItemDef } from '../game/registry';
import type { LogCategory } from './useGameLog';

export interface CoreActionDeps {
  addLog: (msg: string, category?: LogCategory) => void;
  addLogs: (msgs: string[], category?: LogCategory) => void;
  setPlayer: React.Dispatch<React.SetStateAction<Player | null>>;
  advanceTime: (p: Player, actionKey: string) => Player;
  canAct: (actionKey: string) => boolean;
}

export function useCoreActions(deps: CoreActionDeps) {
  const { addLog, addLogs, setPlayer, advanceTime, canAct } = deps;

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
  }, [canAct, advanceTime, addLog, setPlayer]);

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
  }, [canAct, advanceTime, addLog, addLogs, setPlayer]);

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
  }, [canAct, advanceTime, addLog, setPlayer]);

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
  }, [advanceTime, addLog, setPlayer]);

  return { cultivate, fight, explore, rest };
}
