// ============================================================
// useCoreActions.ts — 核心游戏行为 Hook（修炼/战斗/探索/休息）
// 从 useGameEngine.ts 拆分，保持职责单一
// ============================================================

import { useCallback, useRef } from 'react';
import type { Player } from '../game/player';
import { getSpiritRootGrade } from '../game/player';
import { ACTION_COSTS, MONSTERS, BASE_CULTIVATE_EXP } from '../game/data';
import { runCombat } from '../game/combat';
import type { CombatResult } from '../game/combat';
import { triggerExploreEvent } from '../game/events';
import { addItem } from '../game/inventory';
import { getItemDef } from '../game/registry';
import { checkDeathTriggers, applyDeath, getDeathSystemState } from '../game/death';
import type { DeathTriggerDef, DeathSeverity, RevivalMethodDef } from '../game/types';
import type { LogCategory } from './useGameLog';

export interface LootEntry {
  icon: string;
  name: string;
  amount: number;
}

export interface CombatDeathInfo {
  blocked: boolean;
  saverName?: string;
  triggered: boolean;
  severity?: DeathSeverity;
  penaltyLogs?: string[];
  availableRevivals?: RevivalMethodDef[];
  triggerDef?: DeathTriggerDef;
}

export interface CoreActionDeps {
  addLog: (msg: string, category?: LogCategory) => void;
  addLogs: (msgs: string[], category?: LogCategory) => void;
  setPlayer: React.Dispatch<React.SetStateAction<Player | null>>;
  advanceTime: (p: Player, actionKey: string) => Player;
  canAct: (actionKey: string) => boolean;
  onCombatResult: (monsterName: string, result: CombatResult, loot: LootEntry[], deathInfo?: CombatDeathInfo) => void;
}

export function useCoreActions(deps: CoreActionDeps) {
  const { addLog, addLogs, setPlayer, advanceTime, canAct, onCombatResult } = deps;
  // 收集日志用 ref，避免 React strict mode 重复
  const pendingRef = useRef<{ msgs: string[]; categories: LogCategory[] }>({ msgs: [], categories: [] });
  // 战斗结果暂存（setPlayer回调内收集，setTimeout中消费）
  const combatResultRef = useRef<{ monsterName: string; result: CombatResult; loot: LootEntry[]; deathInfo?: CombatDeathInfo } | null>(null);

  const flushLogs = () => {
    const { msgs, categories } = pendingRef.current;
    for (let i = 0; i < msgs.length; i++) {
      addLog(msgs[i], categories[i]);
    }
    pendingRef.current = { msgs: [], categories: [] };
  };

  const queueLog = (msg: string, cat: LogCategory = 'default') => {
    pendingRef.current.msgs.push(msg);
    pendingRef.current.categories.push(cat);
  };

  const queueLogs = (msgs: string[], cat: LogCategory = 'default') => {
    for (const m of msgs) {
      pendingRef.current.msgs.push(m);
      pendingRef.current.categories.push(cat);
    }
  };

  // ── A-2: 修炼 ──
  const cultivate = useCallback(() => {
    if (!canAct('cultivate')) {
      addLog('⚠️ 精力不足，请先休息！', 'system');
      return;
    }
    pendingRef.current = { msgs: [], categories: [] };
    setPlayer(prev => {
      if (!prev) return prev;
      let p: Player = { ...prev };
      const cost = ACTION_COSTS.cultivate;
      p.stamina -= cost.stamina;

      const compBonus = 1 + p.comprehension / 50;
      const rootGrade = getSpiritRootGrade(p.aptitudes);
      const moodBonus = 0.5 + (p.mood / 100);
      const expGain = Math.floor(BASE_CULTIVATE_EXP * compBonus * rootGrade.multiplier * moodBonus);
      p.exp += expGain;
      p.tracking = { ...p.tracking, consecutiveCultivates: p.tracking.consecutiveCultivates + 1, consecutiveRests: 0 };
      p = advanceTime(p, 'cultivate');

      pendingRef.current = { msgs: [], categories: [] };
      queueLog(`🧘 修炼一次，获得 ${expGain} 修为。（悟性×${compBonus.toFixed(1)} 灵根×${rootGrade.multiplier} 心情×${moodBonus.toFixed(1)}）`, 'system');
      return p;
    });
    setTimeout(flushLogs, 0);
  }, [canAct, advanceTime, addLog, setPlayer]);

  // ── A-3: 战斗 ──
  const fight = useCallback(() => {
    if (!canAct('combat')) {
      addLog('⚠️ 精力不足，请先休息！', 'system');
      return;
    }
    pendingRef.current = { msgs: [], categories: [] };
    combatResultRef.current = null;
    setPlayer(prev => {
      if (!prev) return prev;
      let p: Player = { ...prev };
      const cost = ACTION_COSTS.combat;
      p.stamina -= cost.stamina;

      const eligible = MONSTERS.filter(m =>
        m.realmIndex >= p.realmIndex - 1 && m.realmIndex <= p.realmIndex
      );
      if (eligible.length === 0) {
        pendingRef.current = { msgs: [], categories: [] };
        queueLog('🔍 四周平静，没有发现妖兽。', 'combat');
        return p;
      }
      const monster = eligible[Math.floor(Math.random() * eligible.length)];
      const result = runCombat(p, monster);

      // 收集战利品用于弹窗展示
      const loot: LootEntry[] = [];

      p.hp = result.playerHpLeft;
      p.exp += result.expGained;
      p.gold += result.goldGained;

      // 扣减战斗中消耗的灵力
      if (result.mpUsed > 0) {
        p.mp = Math.max(0, p.mp - result.mpUsed);
      }

      if (result.winner === 'player') {
        p.tracking = { ...p.tracking, killCount: p.tracking.killCount + 1, consecutiveRests: 0, consecutiveCultivates: 0 };
        if (monster.realmIndex > p.realmIndex) {
          p.tracking = { ...p.tracking, defeatedHigherRealm: true };
        }
        if (Math.random() < 0.3) {
          const { player: p2, added } = addItem(p, 'core:monster_fang', 1);
          p = p2;
          if (added > 0) loot.push({ icon: '🦴', name: '妖兽獠牙', amount: 1 });
        }
        if (Math.random() < 0.1) {
          const { player: p2, added } = addItem(p, 'core:monster_core', 1);
          p = p2;
          if (added > 0) loot.push({ icon: '💎', name: '妖丹', amount: 1 });
        }
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
            loot.push({ icon: '⚔️', name: eDef?.name ?? dropId, amount: 1 });
          }
        }
      } else if (result.winner === 'monster') {
        // T0040: 通过死亡系统处理战斗失败
        const isBoss = monster.realmIndex >= p.realmIndex + 2;
        const deathCheck = checkDeathTriggers(p, {
          source: 'combat',
          data: { monsterRealmIndex: monster.realmIndex, isBoss },
        });

        if (deathCheck.triggered) {
          if (deathCheck.blocked) {
            // 护命道具拦截
            p = deathCheck.player;
            combatResultRef.current = {
              monsterName: monster.name, result, loot,
              deathInfo: {
                blocked: true,
                saverName: deathCheck.blockedBy?.name,
                triggered: true,
              },
            };
          } else {
            // 死亡触发
            const death = applyDeath(p, deathCheck.trigger!);
            p = death.player;
            // HP clamp to 1 for non-severe (player continues)
            if (death.severity !== 'severe') {
              p.hp = Math.max(1, Math.floor(p.maxHp * 0.1));
            }
            combatResultRef.current = {
              monsterName: monster.name, result, loot,
              deathInfo: {
                blocked: false,
                triggered: true,
                severity: death.severity,
                penaltyLogs: death.logs,
                availableRevivals: death.availableRevivals,
                triggerDef: deathCheck.trigger!,
              },
            };
          }
        } else {
          // 兜底：未触发死亡（理论上不会到这）
          p.health = Math.max(0, p.health - 20);
          p.hp = Math.max(1, Math.floor(p.maxHp * 0.1));
          combatResultRef.current = { monsterName: monster.name, result, loot };
        }
        if (p.hp < p.maxHp * 0.1) {
          p.tracking = { ...p.tracking, hasBeenBelow10Hp: true };
        }
      }

      // 暂存战斗结果，不写日志
      combatResultRef.current = { monsterName: monster.name, result, loot };

      p = advanceTime(p, 'combat');
      return p;
    });
    setTimeout(() => {
      if (combatResultRef.current) {
        const { monsterName, result, loot, deathInfo } = combatResultRef.current;
        onCombatResult(monsterName, result, loot, deathInfo);
        combatResultRef.current = null;
      } else {
        flushLogs();
      }
    }, 0);
  }, [canAct, advanceTime, addLog, setPlayer, onCombatResult]);

  // ── 探索 ──
  const explore = useCallback(() => {
    if (!canAct('explore')) {
      addLog('⚠️ 精力不足，请先休息！', 'system');
      return;
    }
    pendingRef.current = { msgs: [], categories: [] };
    setPlayer(prev => {
      if (!prev) return prev;
      let p: Player = { ...prev };
      const cost = ACTION_COSTS.explore;
      p.stamina -= cost.stamina;
      p.tracking = { ...p.tracking, consecutiveRests: 0, consecutiveCultivates: 0 };

      const { player: updated, message } = triggerExploreEvent(p);
      p = { ...updated };

      pendingRef.current = { msgs: [], categories: [] };
      queueLog(message, message.includes('【奇遇】') ? 'adventure' : 'explore');

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
            queueLog(`🎁 拾取 ${def?.name ?? itemId} ×1`, 'explore');
          }
          break;
        }
      }

      p = advanceTime(p, 'explore');
      return p;
    });
    setTimeout(flushLogs, 0);
  }, [canAct, advanceTime, addLog, setPlayer]);

  // ── 休息 ──
  const rest = useCallback(() => {
    pendingRef.current = { msgs: [], categories: [] };
    setPlayer(prev => {
      if (!prev) return prev;
      let p: Player = { ...prev };
      const staminaRecover = Math.floor(p.maxStamina * 0.3);
      p.stamina = Math.min(p.maxStamina, p.stamina + staminaRecover);
      p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.1));
      p.mp = Math.min(p.maxMp, p.mp + Math.floor(p.maxMp * 0.1));
      p.health = Math.min(100, p.health + 5);
      p.mood = Math.min(100, p.mood + 3);
      p.tracking = { ...p.tracking, consecutiveRests: p.tracking.consecutiveRests + 1, consecutiveCultivates: 0 };
      p = advanceTime(p, 'rest');

      pendingRef.current = { msgs: [], categories: [] };
      queueLog(`💤 休息片刻，恢复 ${staminaRecover} 精力，HP/MP/健康/心情少量恢复。`, 'system');
      return p;
    });
    setTimeout(flushLogs, 0);
  }, [advanceTime, addLog, setPlayer]);

  return { cultivate, fight, explore, rest };
}
