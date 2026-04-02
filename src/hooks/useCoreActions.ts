// ============================================================
// useCoreActions.ts — 核心游戏行为 Hook（修炼/战斗/探索/休息）
// 从 useGameEngine.ts 拆分，保持职责单一
// ============================================================

import { useCallback, useRef } from 'react';
import type { Player } from '../game/player';
import { getSpiritRootGrade } from '../game/player';
import { ACTION_COSTS, BASE_CULTIVATE_EXP } from '../game/data';
import { runCombat } from '../game/combat';
import type { CombatResult } from '../game/combat';
import { triggerExploreEvent } from '../game/events';
import { addItem } from '../game/inventory';
import { getItemDef, getAllMonsters } from '../game/registry';
import { getCurrentRegion } from '../game/map';
import { checkDeathTriggers, applyDeath, getDeathSystemState } from '../game/death';
import { restorePhysique, gainBodyRealmExp, tryBodyRealmBreakthrough } from '../game/body-cultivation';
import { getTechniqueDef } from '../game/registry';
import { ensureBottleneckState, getActiveBottlenecks, tickPersistenceCultivation, tryBattleUnlock, tryEpiphanyUnlock, tryOverflowUnlock } from '../game/bottleneck';
import type { DeathTriggerDef, DeathSeverity, RevivalMethodDef, RegionDef } from '../game/types';
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
  onCombatResult: (monsterName: string, monsterEmoji: string, result: CombatResult, loot: LootEntry[], deathInfo?: CombatDeathInfo, hpBefore?: number, mpBefore?: number) => void;
}

// ── T0022: 区域掉落表辅助函数 ──
const DEFAULT_EXPLORE_LOOT: [string, number][] = [
  ['core:iron_ore', 0.15],
  ['core:spirit_stone_shard', 0.20],
  ['core:herb_lingzhi', 0.08],
  ['core:herb_snow_lotus', 0.03],
  ['core:jade_slip', 0.05],
  ['core:hp_pill', 0.10],
  ['core:spirit_water', 0.06],
  ['core:map_fragment', 0.02],
];

function getRegionLootTable(region: RegionDef | undefined): [string, number][] {
  if (region?.lootTable?.length) {
    return region.lootTable.map(e => [e.itemId, e.chance]);
  }
  return DEFAULT_EXPLORE_LOOT;
}

export function useCoreActions(deps: CoreActionDeps) {
  const { addLog, addLogs, setPlayer, advanceTime, canAct, onCombatResult } = deps;
  // 收集日志用 ref，避免 React strict mode 重复
  const pendingRef = useRef<{ msgs: string[]; categories: LogCategory[] }>({ msgs: [], categories: [] });
  // 战斗结果暂存（setPlayer回调内收集，setTimeout中消费）
  const combatResultRef = useRef<{ monsterName: string; monsterEmoji: string; result: CombatResult; loot: LootEntry[]; deathInfo?: CombatDeathInfo; hpBefore: number; mpBefore: number } | null>(null);

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
      const cultivationMult = p.spiritRoots?.cultivationMultiplier ?? getSpiritRootGrade(p.aptitudes).multiplier;
      const moodBonus = 0.5 + (p.mood / 100);
      const expGain = Math.floor(BASE_CULTIVATE_EXP * compBonus * cultivationMult * moodBonus);
      p.exp += expGain;

      // T0062 根据激活功法类型决定锄体/修炼模式
      const activeDef = p.activeTechniqueId ? getTechniqueDef(p.activeTechniqueId) : null;
      const bodyRate = activeDef?.bodyExpRate ?? 0;
      let bodyMsg = '';

      // 修炼时也恢复少量体魄（练功也锻炼身体）
      const physiqueGain = Math.floor(p.maxPhysique * (bodyRate >= 0.6 ? 0.08 : 0.03));
      if (physiqueGain > 0) {
        p.physique = Math.min(p.maxPhysique, p.physique + physiqueGain);
      }

      if (bodyRate > 0) {
        const baseBodyExp = Math.floor(expGain * bodyRate * 0.5);
        const { player: p2, message: btMsg, actualGain } = gainBodyRealmExp(p, baseBodyExp);
        p = p2;
        if (actualGain > 0) bodyMsg = ` 💪体修修为+${actualGain}`;
        if (btMsg) bodyMsg += ` ${btMsg}`;
      }

      const isBodyMode = bodyRate >= 0.8;
      p.tracking = { ...p.tracking, consecutiveCultivates: p.tracking.consecutiveCultivates + 1, consecutiveRests: 0 };

      // T0064: 坚韧修炼 tick — 每次修炼推进所有激活瓶颈的坚韧进度
      p = ensureBottleneckState(p);
      const activeBottlenecks = getActiveBottlenecks(p);
      for (const { def, entry } of activeBottlenecks) {
        if (def.unlockMethods.some(m => m.type === 'persistence')) {
          const tickResult = tickPersistenceCultivation(p, entry.bottleneckId);
          p = tickResult.player;
          if (tickResult.unlocked && tickResult.log) {
            queueLog(tickResult.log, 'system');
          }
        }
      }

      // T0064: 修为溢出自动消除瓶颈
      const overflowResult = tryOverflowUnlock(p);
      if (overflowResult.triggered) {
        p = overflowResult.player;
        queueLog(overflowResult.log, 'system');
      }

      p = advanceTime(p, 'cultivate');

      pendingRef.current = { msgs: [], categories: [] };
      if (isBodyMode) {
        queueLog(`🧘 修炼一次，获得 ${expGain} 修为。${bodyMsg}`, 'system');
      } else {
        queueLog(`🧘 修炼一次，获得 ${expGain} 修为。（悟性×${compBonus.toFixed(1)} 灵根×${cultivationMult} 心情×${moodBonus.toFixed(1)}）${bodyMsg}`, 'system');
      }
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

      // T0021: 安全区禁止战斗
      const region = getCurrentRegion(prev);
      if (region?.safeZone) {
        pendingRef.current = { msgs: [], categories: [] };
        queueLog(`🛡️ ${region.emoji} ${region.name}是安全区域，无法战斗。`, 'system');
        return prev;
      }

      let p: Player = { ...prev };
      const cost = ACTION_COSTS.combat;
      p.stamina -= cost.stamina;

      // T0021: 按区域标签筛选妖兽
      const regionTags = region?.regionTags;
      const eligible = getAllMonsters().filter(m => {
        if (m.realmIndex < p.realmIndex - 1 || m.realmIndex > p.realmIndex) return false;
        if (regionTags && m.regionTags?.length) {
          if (!m.regionTags.some(t => regionTags.includes(t))) return false;
        }
        return true;
      });
      if (eligible.length === 0) {
        pendingRef.current = { msgs: [], categories: [] };
        queueLog('🔍 四周平静，没有发现妖兽。', 'combat');
        return p;
      }
      const monster = eligible[Math.floor(Math.random() * eligible.length)];
      const result = runCombat(p, monster);

      // 收集战利品用于弹窗展示
      const loot: LootEntry[] = [];

      // 记录战斗前 HP/MP 用于日志摘要
      const hpBefore = p.hp;
      const mpBefore = p.mp;

      p.hp = result.playerHpLeft;
      p.exp += result.expGained;
      p.gold += result.goldGained;

      // T0059 体修修为战斗结算
      if (result.bodyExpGained > 0) {
        const { player: p2 } = gainBodyRealmExp(p, result.bodyExpGained);
        p = p2;
      }

      // 扣减战斗中消耗的灵力
      if (result.mpUsed > 0) {
        p.mp = Math.max(0, p.mp - result.mpUsed);
      }

      if (result.winner === 'player') {
        p.tracking = { ...p.tracking, killCount: p.tracking.killCount + 1, consecutiveRests: 0, consecutiveCultivates: 0 };
        if (monster.realmIndex > p.realmIndex) {
          p.tracking = { ...p.tracking, defeatedHigherRealm: true };
        }

        // T0064: 战斗胜利后检查瓶颈解锁
        p = ensureBottleneckState(p);
        const battleUnlock = tryBattleUnlock(p, monster.id);
        if (battleUnlock.triggered) {
          p = battleUnlock.player;
          loot.push({ icon: '🎆', name: '瓶颈突破！道心通畅', amount: 0 });
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

        let localDeathInfo: CombatDeathInfo | undefined;

        if (deathCheck.triggered) {
          if (deathCheck.blocked) {
            // 护命道具拦截
            p = deathCheck.player;
            localDeathInfo = {
              blocked: true,
              saverName: deathCheck.blockedBy?.name,
              triggered: true,
            };
          } else {
            // 死亡触发
            const death = applyDeath(p, deathCheck.trigger!);
            p = death.player;
            // HP clamp to 1 for non-severe (player continues)
            if (death.severity !== 'severe') {
              p.hp = Math.max(1, Math.floor(p.maxHp * 0.1));
            }
            localDeathInfo = {
              blocked: false,
              triggered: true,
              severity: death.severity,
              penaltyLogs: death.logs,
              availableRevivals: death.availableRevivals,
              triggerDef: deathCheck.trigger!,
            };
          }
        } else {
          // 兜底：未触发死亡（理论上不会到这）
          p.health = Math.max(0, p.health - 20);
          p.hp = Math.max(1, Math.floor(p.maxHp * 0.1));
        }
        if (p.hp < p.maxHp * 0.1) {
          p.tracking = { ...p.tracking, hasBeenBelow10Hp: true };
        }
        combatResultRef.current = { monsterName: monster.name, monsterEmoji: monster.emoji, result, loot, deathInfo: localDeathInfo, hpBefore, mpBefore };
      }

      // 暂存战斗结果（玩家胜利 / 平局时 deathInfo 为空）
      if (!combatResultRef.current) {
        combatResultRef.current = { monsterName: monster.name, monsterEmoji: monster.emoji, result, loot, hpBefore, mpBefore };
      }

      p = advanceTime(p, 'combat');
      return p;
    });
    setTimeout(() => {
      if (combatResultRef.current) {
        const { monsterName, monsterEmoji, result, loot, deathInfo, hpBefore, mpBefore } = combatResultRef.current;
        onCombatResult(monsterName, monsterEmoji, result, loot, deathInfo, hpBefore, mpBefore);
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
      let exploreMsg = message;

      // T0064: 探索时尝试顿悟解锁瓶颈
      p = ensureBottleneckState(p);
      const currentRegion = getCurrentRegion(p);
      const locationTag = currentRegion?.id ?? '';
      const epiphanyResult = tryEpiphanyUnlock(p, locationTag);
      if (epiphanyResult.triggered && epiphanyResult.log) {
        p = epiphanyResult.player;
        exploreMsg += ` ✨${epiphanyResult.log}`;
      }

      // T0022: 优先使用区域专属掉落表，若区域无掉落表则使用默认表
      const exploreLoot = getRegionLootTable(currentRegion);
      for (const [itemId, chance] of exploreLoot) {
        if (Math.random() < chance) {
          const { player: p2, added } = addItem(p, itemId, 1);
          if (added > 0) {
            p = p2;
            const def = getItemDef(itemId);
            exploreMsg += `（获得${def?.name ?? itemId}×1）`;
          }
          break;
        }
      }

      queueLog(exploreMsg, exploreMsg.includes('【奇遇】') ? 'adventure' : 'explore');

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
      p.stamina = p.maxStamina;
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      p.health = Math.min(100, p.health + 5);
      p.mood = Math.min(100, p.mood + 3);
      // T0059 休息恢复体魄
      p = restorePhysique(p);
      // 体魄恢复后检查体修突破
      const btResult = tryBodyRealmBreakthrough(p);
      if (btResult.breakthrough) {
        p = btResult.player;
        queueLog(btResult.message, 'system');
      }
      p.tracking = { ...p.tracking, consecutiveRests: p.tracking.consecutiveRests + 1, consecutiveCultivates: 0 };
      p = advanceTime(p, 'rest');

      pendingRef.current = { msgs: [], categories: [] };
      queueLog(`💤 休息片刻，体力、灵力、精力完全恢复，健康/心情少量恢复。`, 'system');
      return p;
    });
    setTimeout(flushLogs, 0);
  }, [advanceTime, addLog, setPlayer]);

  return { cultivate, fight, explore, rest };
}
