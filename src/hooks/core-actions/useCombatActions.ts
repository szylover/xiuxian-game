import { useCallback, useRef } from 'react';
import type { Player } from '../../game/player';
import { ACTION_COSTS } from '../../game/data';
import { runCombat } from '../../game/combat';
import type { CombatResult } from '../../game/combat';
import { addItem } from '../../game/inventory';
import { getItemDef, getAllMonsters } from '../../game/registry';
import { getCurrentRegion } from '../../game/map';
import { generateMonsterVariant, generateEquip } from '../../game/procedural';
import { checkDeathTriggers, applyDeath } from '../../game/death';
import { gainBodyRealmExp } from '../../game/body-cultivation';
import { ensureBottleneckState, tryBattleUnlock } from '../../game/bottleneck';
import { tickQuestObjectives, checkQuestDiscovery } from '../../game/quest';
import type { CoreActionDeps, LootEntry, CombatDeathInfo, LogQueue } from './types';
import type { LogCategory } from '../useGameLog';
import { COMBAT_TEXTS } from '../../data/texts/combat';
import { EXPLORE_TEXTS } from '../../data/texts/explore';

export function useCombatActions(
  deps: CoreActionDeps,
  pendingRef: React.MutableRefObject<LogQueue>,
  flushLogs: () => void,
) {
  const { addLog, setPlayer, advanceTime, canAct, onCombatResult } = deps;
  // 战斗结果暂存（setPlayer回调内收集，setTimeout中消费）
  const combatResultRef = useRef<{ monsterName: string; monsterEmoji: string; result: CombatResult; loot: LootEntry[]; deathInfo?: CombatDeathInfo; hpBefore: number; mpBefore: number } | null>(null);

  const queueLogs = (msgs: string[], cat: LogCategory = 'default') => {
    for (const m of msgs) {
      pendingRef.current.msgs.push(m);
      pendingRef.current.categories.push(cat);
    }
  };

  const queueLog = (msg: string, cat: LogCategory = 'default') => {
    pendingRef.current.msgs.push(msg);
    pendingRef.current.categories.push(cat);
  };

  const fight = useCallback(() => {
    if (!canAct('combat')) {
      addLog(COMBAT_TEXTS.noStamina, 'system');
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
        queueLog(COMBAT_TEXTS.safeZone(region.emoji, region.name), 'system');
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

      // T0072: 50% 概率使用程序化妖兽变体
      let monster: import('../../game/types').MonsterDef | undefined;
      const procResult = Math.random() < 0.5
        ? generateMonsterVariant(p, { regionTags })
        : null;
      if (procResult) {
        p = procResult.player;
        monster = procResult.monster;
      } else if (eligible.length > 0) {
        monster = eligible[Math.floor(Math.random() * eligible.length)];
      }

      if (!monster) {
        pendingRef.current = { msgs: [], categories: [] };
        queueLog(COMBAT_TEXTS.noMonster, 'combat');
        return p;
      }
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
          loot.push({ icon: '🎆', name: EXPLORE_TEXTS.bottleneckBreak, amount: 0 });
        }

        if (Math.random() < 0.3) {
          const { player: p2, added } = addItem(p, 'core:monster_fang', 1);
          p = p2;
          if (added > 0) loot.push({ icon: '🦴', name: getItemDef('core:monster_fang')?.name ?? 'monster_fang', amount: 1 });
        }
        if (Math.random() < 0.1) {
          const { player: p2, added } = addItem(p, 'core:monster_core', 1);
          p = p2;
          if (added > 0) loot.push({ icon: '💎', name: getItemDef('core:monster_core')?.name ?? 'monster_core', amount: 1 });
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

        // T0071: 程序化装备掉落（8% 概率）
        if (Math.random() < 0.08) {
          const genResult = generateEquip(p);
          if (genResult) {
            p = genResult.player;
            const { player: p2, added } = addItem(p, genResult.instance.instanceId, 1);
            if (added > 0) {
              p = p2;
              loot.push({ icon: '🔮', name: genResult.instance.finalName, amount: 1 });
            }
          }
        }

        // T0057: 战斗胜利后推进任务目标（kill_monster + combat）
        const questKill = tickQuestObjectives(p, { type: 'kill_monster', monsterId: monster.id });
        p = questKill.player;
        queueLogs(questKill.logs, 'system');
        const questCombat = tickQuestObjectives(p, { type: 'combat' });
        p = questCombat.player;
        queueLogs(questCombat.logs, 'system');

        // T0067: 战斗胜利后检查可发现的任务
        const questDiscoverCombat = checkQuestDiscovery(p, { type: 'kill_monster', monsterId: monster.id });
        p = questDiscoverCombat.player;
        queueLogs(questDiscoverCombat.logs, 'system');
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

  return { fight };
}
