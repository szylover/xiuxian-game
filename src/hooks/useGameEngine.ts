// ============================================================
// useGameEngine.ts — 游戏核心引擎 Hook
// A-1~A-5 全部系统的状态管理 + 存档
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { createPlayer, recalcStats, getNextRealm, getSpiritRootGrade } from '../game/player';
import type { Player } from '../game/player';
import { REALMS, ACTION_COSTS, MONSTERS, BASE_CULTIVATE_EXP, BREAKTHROUGH_BASE_RATE, BREAKTHROUGH_COMP_BONUS, BREAKTHROUGH_LUCK_BONUS, BREAKTHROUGH_FAIL_EXP_LOSS } from '../game/data';
import { runCombat } from '../game/combat';
import { triggerExploreEvent } from '../game/events';

const SAVE_KEY = 'xiuxian_save';

function loadSave(): Player | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeSave(player: Player): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(player));
}

export function useGameEngine(addLog: (msg: string) => void, addLogs: (msgs: string[]) => void) {
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
    addLog(`🌟 ${p.name} 踏上修仙之路！`);
    addLog(`灵根品级：${root.grade}（修炼速度 ×${root.multiplier}）`);
    addLog(`幸运: ${p.luck} | 悟性: ${p.comprehension} | 魅力: ${p.charisma}`);
  }, [addLog]);

  // ── 加载存档 ──
  const loadGame = useCallback(() => {
    const saved = loadSave();
    if (saved) {
      setPlayer(saved);
      setGameOver(false);
      setGameOverReason('');
      addLog(`📂 读取存档成功！${saved.name}，${REALMS[saved.realmIndex].name}期。`);
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
      addLog(`💀 寿元耗尽！享年 ${Math.floor(updated.age)} 岁。修仙之路到此为止…`);
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
      addLog('⚠️ 精力不足，请先休息！');
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

      addLog(`🧘 修炼一次，获得 ${expGain} 修为。（悟性×${compBonus.toFixed(1)} 灵根×${rootGrade.multiplier} 心情×${moodBonus.toFixed(1)}）`);
      return p;
    });
  }, [canAct, advanceTime, addLog]);

  // ── A-3: 战斗 ──
  const fight = useCallback(() => {
    if (!canAct('combat')) {
      addLog('⚠️ 精力不足，请先休息！');
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
        addLog('🔍 四周平静，没有发现妖兽。');
        return p;
      }
      const monster = eligible[Math.floor(Math.random() * eligible.length)];

      const result = runCombat(p, monster);
      addLogs(result.logs);

      p.hp = result.playerHpLeft;
      p.exp += result.expGained;
      p.gold += result.goldGained;

      if (result.winner === 'player') {
        p.tracking = { ...p.tracking, killCount: p.tracking.killCount + 1, consecutiveRests: 0, consecutiveCultivates: 0 };
        // 检测是否击败高境界敌人
        if (monster.realmIndex > p.realmIndex) {
          p.tracking = { ...p.tracking, defeatedHigherRealm: true };
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
      addLog('⚠️ 精力不足，请先休息！');
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
      addLog(message);

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
      addLog(`💤 休息片刻，恢复 ${staminaRecover} 精力，HP/MP/健康/心情少量恢复。`);
      return p;
    });
  }, [advanceTime, addLog]);

  // ── A-4: 境界突破 ──
  const breakthrough = useCallback(() => {
    if (!player) return;
    const nextRealm = getNextRealm(player);
    if (!nextRealm) {
      addLog('🏔️ 你已到达当前版本的最高境界！');
      return;
    }
    if (player.exp < nextRealm.expReq) {
      addLog(`⚠️ 修为不足！突破 ${nextRealm.name} 需要 ${nextRealm.expReq} 修为（当前 ${player.exp}）。`);
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

        addLog(`🎆 突破成功！晋升 ${newRealm.name}期！`);
        addLog(`寿限 +${newRealm.lifespanBonus}，属性全面提升！`);
      } else {
        // 失败：损失 10% 修为
        const expLoss = Math.floor(p.exp * BREAKTHROUGH_FAIL_EXP_LOSS);
        p.exp -= expLoss;
        p.mood = Math.max(0, p.mood - 20);
        p.health = Math.max(0, p.health - 10);

        addLog(`💥 突破失败！损失 ${expLoss} 修为，心情 -20，健康 -10。`);
        addLog(`（成功率 ${(successRate * 100).toFixed(1)}%，掷骰 ${(roll * 100).toFixed(1)}%）`);
      }
      return p;
    });
  }, [player, addLog]);

  // ── 删档 ──
  const deleteSave = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    setPlayer(null);
    setGameOver(false);
    addLog('🗑️ 存档已删除。');
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
  };
}
