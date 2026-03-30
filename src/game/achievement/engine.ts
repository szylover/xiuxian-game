// ============================================================
// achievement/engine.ts — 成就检测引擎（T0031）
// ============================================================

import type { Player } from '../player';
import type { AchievementDef, AchievementRecalcBonus, AchievementSystemState, AchievementOnceBonus } from './types';
import { achievementRegistry } from '../registry/stores';

export const ONCE_BONUS_KEYS: (keyof AchievementOnceBonus)[] = ['luck', 'comprehension', 'charisma', 'lifespan'];
const RECALC_KEYS: (keyof AchievementRecalcBonus)[] = [
  'atk', 'def', 'speed', 'hp', 'mp', 'mentalPower',
  'critRate', 'critDmgMultiplier', 'critResist', 'moveSpeed',
];

export function initAchievementState(): AchievementSystemState {
  return { unlockedIds: [], pendingToast: [] };
}

export function getAchievementState(player: Player): AchievementSystemState {
  const s = player.systems?.achievement as AchievementSystemState | undefined;
  if (s && Array.isArray(s.unlockedIds)) return s;
  return initAchievementState();
}

export function checkAchievements(player: Player): { player: Player; newAchievements: AchievementDef[] } {
  const state = getAchievementState(player);
  const unlockedSet = new Set(state.unlockedIds);
  const newAchievements: AchievementDef[] = [];

  let p = { ...player, systems: { ...player.systems } };

  for (const ach of achievementRegistry.values()) {
    if (unlockedSet.has(ach.id)) continue;

    let condMet = false;
    try {
      condMet = ach.condition(p);
    } catch (e) {
      // 条件抛异常时跳过，不影响主流程
      console.warn(`[Achievement] condition error for ${ach.id}:`, e);
    }

    if (!condMet) continue;

    newAchievements.push(ach);
    unlockedSet.add(ach.id);

    // 一次性加成：直接叠加到 player
    if (ach.bonusStats) {
      for (const key of ONCE_BONUS_KEYS) {
        const val = (ach.bonusStats as Record<string, number | undefined>)[key];
        if (val) {
          (p as unknown as Record<string, number>)[key] =
            ((p as unknown as Record<string, number>)[key] ?? 0) + val;
        }
      }
    }
  }

  if (newAchievements.length === 0) {
    return { player, newAchievements: [] };
  }

  const newUnlockedIds = Array.from(unlockedSet);
  const newPendingToast = [...state.pendingToast, ...newAchievements.map(a => a.id)];

  p.systems = {
    ...p.systems,
    achievement: {
      unlockedIds: newUnlockedIds,
      pendingToast: newPendingToast,
    },
  };

  return { player: p, newAchievements };
}

export function getAchievementRecalcBonus(player: Player): AchievementRecalcBonus {
  const state = getAchievementState(player);
  const bonus: AchievementRecalcBonus = {};

  for (const id of state.unlockedIds) {
    const ach = achievementRegistry.get(id);
    if (!ach?.bonusStats) continue;
    for (const key of RECALC_KEYS) {
      const val = (ach.bonusStats as Record<string, number | undefined>)[key];
      if (val) {
        (bonus as Record<string, number>)[key] = ((bonus as Record<string, number>)[key] ?? 0) + val;
      }
    }
  }

  return bonus;
}

export function getAllAchievements(): AchievementDef[] {
  return Array.from(achievementRegistry.values());
}
