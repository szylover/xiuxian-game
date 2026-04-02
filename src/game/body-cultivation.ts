// ============================================================
// game/body-cultivation.ts — 体修核心逻辑（T0059）
// 系统代码只读注册表，不硬编码任何数值。
// 所有体修境界、灵根加成均通过 DLC 数据注册。
// ============================================================

import type { Player } from './player';
import type { BodyRealmDef } from './types';
import { getBodyRealmDef, getSpiritRootBodyBonus } from './registry/queries';
import { checkBottleneck, activateBottleneck, ensureBottleneckState } from './bottleneck';

// ── 查询 ──

/** 获取下一个体修境界 */
export function getNextBodyRealm(player: Player): BodyRealmDef | undefined {
  return getBodyRealmDef(player.bodyRealmIndex + 1);
}

// ── 灵根体修加成计算（从注册表读取数据） ──

/** 计算玩家灵根对体修修为的总倍率 */
export function getSpiritRootBodyExpMultiplier(player: Player): number {
  let multiplier = 1.0;
  if (!player.spiritRoots?.roots) return multiplier;
  for (const root of player.spiritRoots.roots) {
    const bonus = getSpiritRootBodyBonus(root.type);
    if (bonus?.bodyExpMultiplier) {
      // 按亲和度加权：亲和度越高效果越强
      const affinityFactor = root.affinity / 100;
      multiplier += (bonus.bodyExpMultiplier - 1) * affinityFactor;
    }
  }
  return multiplier;
}

/** 计算灵根对体魄恢复的加成倍率 */
export function getSpiritRootRegenMultiplier(player: Player): number {
  let multiplier = 1.0;
  if (!player.spiritRoots?.roots) return multiplier;
  for (const root of player.spiritRoots.roots) {
    const bonus = getSpiritRootBodyBonus(root.type);
    if (bonus?.physiqueRegenRate) {
      const affinityFactor = root.affinity / 100;
      multiplier += (bonus.physiqueRegenRate - 1) * affinityFactor;
    }
  }
  return multiplier;
}

/** 计算灵根提供的额外减伤 */
export function getSpiritRootDmgReduceBonus(player: Player): number {
  let bonus = 0;
  if (!player.spiritRoots?.roots) return bonus;
  for (const root of player.spiritRoots.roots) {
    const def = getSpiritRootBodyBonus(root.type);
    if (def?.dmgReduceBonus) {
      bonus += def.dmgReduceBonus * (root.affinity / 100);
    }
  }
  return bonus;
}

/** 计算灵根提供的 HP 加成比例 */
export function getSpiritRootHpBonusRate(player: Player): number {
  let rate = 0;
  if (!player.spiritRoots?.roots) return rate;
  for (const root of player.spiritRoots.roots) {
    const def = getSpiritRootBodyBonus(root.type);
    if (def?.hpBonusRate) {
      rate += def.hpBonusRate * (root.affinity / 100);
    }
  }
  return rate;
}

// ── 体修境界突破状态查询 ──

export interface BodyBreakthroughStatus {
  canAttempt: boolean;
  nextRealm: BodyRealmDef | undefined;
  expReady: boolean;
  physiqueReady: boolean;
  physiqueRequired: number;
}

/** 获取体修突破状态（供 UI 显示突破按钮） */
export function getBodyBreakthroughStatus(player: Player): BodyBreakthroughStatus {
  const nextRealm = getBodyRealmDef(player.bodyRealmIndex + 1);
  if (!nextRealm) {
    return { canAttempt: false, nextRealm: undefined, expReady: false, physiqueReady: false, physiqueRequired: 0 };
  }
  const expReady = player.bodyRealmExp >= nextRealm.expReq;
  const physiqueRequired = Math.ceil(player.maxPhysique * 0.8);
  const physiqueReady = player.physique >= physiqueRequired;
  return {
    canAttempt: expReady && physiqueReady,
    nextRealm,
    expReady,
    physiqueReady,
    physiqueRequired,
  };
}

// ── 体修境界突破 ──

export function tryBodyRealmBreakthrough(player: Player): {
  player: Player;
  breakthrough: boolean;
  message: string;
  blockedByBottleneck?: boolean;
} {
  const nextRealm = getBodyRealmDef(player.bodyRealmIndex + 1);
  if (!nextRealm) {
    return { player, breakthrough: false, message: '' };
  }

  // 条件：体修修为 >= 下一阶要求 AND 体魄 >= 当前上限的 80%
  if (player.bodyRealmExp < nextRealm.expReq) {
    return { player, breakthrough: false, message: '' };
  }
  if (player.physique < player.maxPhysique * 0.8) {
    return { player, breakthrough: false, message: '' };
  }

  // T0064: 体修瓶颈检查
  let p = ensureBottleneckState(player);
  const bnResult = checkBottleneck(p, 'body_realm', p.bodyRealmIndex);
  if (bnResult.blocked && bnResult.bottleneckDef) {
    if (bnResult.isNewlyActivated) {
      const act = activateBottleneck(p, bnResult.bottleneckDef.id);
      p = act.player;
    }
    return {
      player: p,
      breakthrough: false,
      message: `🚧 体修瓶颈未破：${bnResult.bottleneckDef.name}。${bnResult.bottleneckDef.hint}`,
      blockedByBottleneck: true,
    };
  }

  p = { ...p };
  p.bodyRealmIndex = nextRealm.index;
  p.bodyRealmExp = 0;
  p.bodyTempering += 1;
  // maxPhysique 和 physiqueDmgReduce 在 recalcStats 中统一处理
  p.maxPhysique = nextRealm.maxPhysique;
  p.physiqueDmgReduce = nextRealm.physiqueDmgReduce;

  return {
    player: p,
    breakthrough: true,
    message: `🔥 体修突破！肉身淬炼至【${nextRealm.name}】！减伤 ${nextRealm.physiqueDmgReduce}%`,
  };
}

// ── 体修修为获取（应用灵根加成 + 功法 bodyExpRate） ──

/** 增加体修修为并自动检查突破 */
export function gainBodyRealmExp(
  player: Player,
  baseAmount: number,
): { player: Player; message: string; actualGain: number } {
  // 应用灵根体修修为倍率
  const multiplier = getSpiritRootBodyExpMultiplier(player);
  const actualGain = Math.floor(baseAmount * multiplier);
  if (actualGain <= 0) return { player, message: '', actualGain: 0 };

  let p = { ...player, bodyRealmExp: player.bodyRealmExp + actualGain };

  // 自动突破
  const btResult = tryBodyRealmBreakthrough(p);
  if (btResult.breakthrough) {
    return {
      player: btResult.player,
      message: btResult.message,
      actualGain,
    };
  }

  return { player: p, message: '', actualGain };
}

// ── 体修属性加成（供 recalcStats 调用） ──

export function getBodyRealmBonus(player: Player): {
  hp: number;
  atk: number;
  def: number;
  maxPhysique: number;
  physiqueDmgReduce: number;
} {
  const realm = getBodyRealmDef(player.bodyRealmIndex);
  if (!realm) return { hp: 0, atk: 0, def: 0, maxPhysique: 50, physiqueDmgReduce: 0 };

  // 灵根 HP 加成
  const hpBonusRate = getSpiritRootHpBonusRate(player);
  const hpBonus = Math.floor(realm.hpBonus * (1 + hpBonusRate));

  // 灵根额外减伤
  const rootDmgReduce = getSpiritRootDmgReduceBonus(player);

  return {
    hp: hpBonus,
    atk: realm.atkBonus,
    def: realm.defBonus,
    maxPhysique: realm.maxPhysique,
    physiqueDmgReduce: realm.physiqueDmgReduce + rootDmgReduce,
  };
}

// ── 体魄恢复（休息时调用） ──

export function restorePhysique(player: Player): Player {
  const regenMultiplier = getSpiritRootRegenMultiplier(player);
  const restore = Math.floor(player.maxPhysique * 0.1 * regenMultiplier);
  return {
    ...player,
    physique: Math.min(player.maxPhysique, player.physique + restore),
  };
}
