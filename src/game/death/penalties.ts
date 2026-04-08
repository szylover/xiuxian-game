// ============================================================
// death/penalties.ts — 默认后果表 + 惩罚应用
// ============================================================

import type { Player } from '../player';
import { recalcStats } from '../player';
import { REALMS } from '../data';
import type { DeathSeverity, DeathPenaltyDef } from '../types';
import { DEATH_TEXTS } from '../../data/texts/death';

// ── 默认后果表 ──

export const DEFAULT_PENALTIES: Record<DeathSeverity, DeathPenaltyDef> = {
  light: {
    severity: 'light',
    expLossRate: 0.1,
    goldLossRate: 0.1,
    inventoryLossCount: 0,
    healthLoss: 20,
    moodLoss: 15,
    realmDrop: 0,
    gameOver: false,
  },
  moderate: {
    severity: 'moderate',
    expLossRate: 0.3,
    goldLossRate: 0.3,
    inventoryLossCount: 2,
    healthLoss: 40,
    moodLoss: 30,
    realmDrop: 1,
    gameOver: false,
  },
  severe: {
    severity: 'severe',
    expLossRate: 1.0,
    goldLossRate: 1.0,
    inventoryLossCount: 0,
    healthLoss: 0,
    moodLoss: 0,
    realmDrop: 0,
    gameOver: true,
  },
};

// ── 应用惩罚 ──

export function applyPenalty(player: Player, penalty: DeathPenaltyDef, logs: string[]): Player {
  let p = { ...player };

  // 修为损失
  if (penalty.expLossRate > 0) {
    const loss = Math.floor(p.exp * penalty.expLossRate);
    p.exp = Math.max(0, p.exp - loss);
    if (loss > 0) logs.push(DEATH_TEXTS.expLoss(loss));
  }

  // 灵石损失
  if (penalty.goldLossRate > 0) {
    const loss = Math.floor(p.gold * penalty.goldLossRate);
    p.gold = Math.max(0, p.gold - loss);
    if (loss > 0) logs.push(DEATH_TEXTS.goldLoss(loss));
  }

  // 随机丢失物品
  if (penalty.inventoryLossCount > 0 && p.inventory.length > 0) {
    let lost = 0;
    const inv = [...p.inventory.map(s => ({ ...s }))];
    for (let i = 0; i < penalty.inventoryLossCount && inv.length > 0; i++) {
      const idx = Math.floor(Math.random() * inv.length);
      inv.splice(idx, 1);
      lost++;
    }
    p = { ...p, inventory: inv };
    if (lost > 0) logs.push(DEATH_TEXTS.itemLoss(lost));
  }

  // 健康、心情损失
  if (penalty.healthLoss > 0) {
    p.health = Math.max(0, p.health - penalty.healthLoss);
    logs.push(DEATH_TEXTS.healthLoss(penalty.healthLoss));
  }
  if (penalty.moodLoss > 0) {
    p.mood = Math.max(0, p.mood - penalty.moodLoss);
    logs.push(DEATH_TEXTS.moodLoss(penalty.moodLoss));
  }

  // 降境界
  if (penalty.realmDrop > 0 && p.realmIndex > 0) {
    const drop = Math.min(penalty.realmDrop, p.realmIndex);
    p.realmIndex -= drop;
    p = recalcStats(p);
    p.hp = Math.max(1, Math.min(p.hp, p.maxHp));
    p.mp = Math.min(p.mp, p.maxMp);
    logs.push(DEATH_TEXTS.realmDrop(drop, REALMS[p.realmIndex].name));
  }

  return p;
}
